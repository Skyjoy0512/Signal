import crypto from "crypto";
import type { Symbol, LayerCondition as DbLayerCondition, MarketSnapshot, Signal as DbSignal, LlmRun } from "../supabase/types";
import type { SymbolSnapshot, LayerCondition } from "../intelligence/types";
import type { IndicatorInput } from "../indicators/types";
import type { ScoredSymbol, DailyScanResult } from "./types";

import { YFinanceAdapter } from "../data-sources/adapters/yfinance";
import { computeAllIndicators, computeDataConfidence } from "../indicators/calculator";
import { computeAllLayers } from "../intelligence/orchestrator";
import { InvestmentAnalysisEngine, buildAnalysisInputSnapshot, buildLlmInputSnapshot } from "../analysis";
import type { AnalysisSubject } from "../analysis";
import {
  getForbiddenSymbols, getActiveEvents,
  insertMarketSnapshots, insertLayerConditions, insertSignal, insertTradeScenario,
  insertLlmRun, insertAnalysisRun, insertScoreSnapshot,
  getLatestStorylineSet, insertStorylineSet, insertStorylineScenarios,
} from "../supabase/repository";
import { NotificationEngine } from "../notifications/engine";
import type { MorningBriefData } from "../notifications/types";
import { getLlmRuntimeConfig } from "../llm/settings";
import { LLM_PROMPT_VERSION } from "../llm/prompts";
import type { LlmRunResult } from "../llm/types";
import { generateStorylineSet } from "../storylines";
import type { PreviousStorylineSet, StorylineSet } from "../storylines";
import { SCORE_ENGINE_VERSION, SCORING_CONFIG_VERSION } from "../scoring/config";

export interface DailyScanOptions {
  symbols: Symbol[];
  benchmarks?: string[];
  sectors?: Record<string, string[]>;
  themes?: Record<string, string[]>;
  lookbackDays?: number;
  scanDate?: Date;
  /** Enable LLM analysis for top-N strong/entry candidates. */
  llmTopN?: number;
  /** Enable LINE notification after scan. */
  enableNotifications?: boolean;
  /** Persist results to DB. */
  persistToDb?: boolean;
  /** Generate best/base/conservative/worst storylines for the top filtered symbols. */
  enableStorylines?: boolean;
  /** Number of non-avoid symbols to simulate storylines for. */
  storylineTopN?: number;
}

const DEFAULT_LOOKBACK = 260;
const DATA_MAX_AGE_HOURS = 24;

export async function runDailyScan(options: DailyScanOptions): Promise<DailyScanResult> {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  let totalCostUsd = 0;
  const scanDate = options.scanDate ?? new Date();
  const capturedAt = scanDate.toISOString();
  const dateStr = scanDate.toISOString().split("T")[0];
  const persist = options.persistToDb ?? false;
  const notify = options.enableNotifications ?? false;
  const llmTopN = options.llmTopN ?? 3;
  const enableStorylines = options.enableStorylines ?? true;
  const storylineTopN = options.storylineTopN ?? 10;

  const adapter = new YFinanceAdapter();
  const symbols = options.symbols;
  const benchmarkSymbols = options.benchmarks ?? ["^N225"];
  const sectors = options.sectors ?? {};
  const themes = options.themes ?? {};
  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK;
  const from = new Date(scanDate);
  from.setDate(from.getDate() - lookbackDays);

  // =========================================
  // 0. Pre-load forbidden symbols & events
  // =========================================
  const forbiddenTickers: Set<string> = new Set();
  const blockedSymbols: Set<string> = new Set(); // event-blocked
  try {
    const forbidden = await getForbiddenSymbols();
    for (const f of forbidden) forbiddenTickers.add(f.symbol);
  } catch (e) { errors.push(`Forbidden symbols fetch error: ${e instanceof Error ? e.message : "Unknown"}`); }
  try {
    const events = await getActiveEvents(symbols.map((s) => s.id), dateStr);
    for (const e of events) {
      if (e.impact_level === "critical" || e.impact_level === "high") {
        const sym = symbols.find((s) => s.id === e.symbol_id);
        if (sym) blockedSymbols.add(sym.symbol);
      }
    }
  } catch (e) { errors.push(`Events fetch error: ${e instanceof Error ? e.message : "Unknown"}`); }

  // =========================================
  // 1. Fetch OHLCV data
  // =========================================
  const allTickers = [...symbols.map((s) => s.symbol), ...benchmarkSymbols];
  const { bars, errors: fetchErrors } = await adapter.fetchDailyBars(allTickers, from, scanDate);
  for (const e of fetchErrors) errors.push(`OHLCV: ${e.symbol} - ${e.message}`);

  const barsBySymbol = new Map<string, IndicatorInput[]>();
  for (const bar of bars) {
    const arr = barsBySymbol.get(bar.symbol) ?? [];
    arr.push({ date: bar.date, open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume });
    barsBySymbol.set(bar.symbol, arr);
  }

  // =========================================
  // 2-3. Indicators + Snapshots
  // =========================================
  const snapshots: Record<string, SymbolSnapshot> = {};
  const benchmarkSnapshots: Record<string, SymbolSnapshot[]> = {};
  const dataConfidence: Record<string, number> = {};
  const expectedBars = Math.min(lookbackDays, 60);
  const marketSnapshotRows: Array<Omit<MarketSnapshot, "id" | "created_at">> = [];

  for (const sym of symbols) {
    const b = barsBySymbol.get(sym.symbol);
    if (!b || b.length === 0) { errors.push(`No data for ${sym.symbol}`); dataConfidence[sym.symbol] = 0; continue; }
    b.sort((a, ca) => a.date.localeCompare(ca.date));
    const indicators = computeAllIndicators(b);
    const lastInd = indicators.indicators[indicators.indicators.length - 1];
    const confResult = computeDataConfidence({ bars: b, expectedBars, maxAgeHours: DATA_MAX_AGE_HOURS, now: scanDate });
    dataConfidence[sym.symbol] = confResult.score;
    if (!lastInd) { errors.push(`No indicators for ${sym.symbol}`); continue; }
    const lastBar = b[b.length - 1];
    snapshots[sym.symbol] = {
      symbol: sym.symbol, close: lastBar.close,
      sma20: lastInd.sma20, sma50: lastInd.sma50, sma200: lastInd.sma200,
      rsi14: lastInd.rsi14, volumeRatio20d: lastInd.volumeRatio20d,
      return5d: lastInd.return5d, return20d: lastInd.return20d,
      distanceFrom52wHighPct: lastInd.distanceFrom52wHighPct,
      drawdownFromRecentHighPct: lastInd.drawdownFromRecentHighPct,
    };
    marketSnapshotRows.push({ adjusted_close: null, atr14: null, atr20: null, return_1d: null, return_5d: null, return_20d: null, return_60d: null, high_52w: null, low_52w: null, distance_from_52w_high_pct: null, drawdown_from_recent_high_pct: null, fundamentals_json: null, catalyst_json: null, raw_json: null, turnover: null,
      symbol_id: sym.id, timeframe: "1D", captured_at: capturedAt,
      open: lastBar.open, high: lastBar.high, low: lastBar.low, close: lastBar.close,
      volume: lastBar.volume, sma20: lastInd.sma20, sma50: lastInd.sma50, sma200: lastInd.sma200,
      rsi14: lastInd.rsi14, volume_20d_avg: lastInd.volume20dAvg, volume_ratio_20d: lastInd.volumeRatio20d,
      data_confidence: confResult.score, data_confidence_reason: confResult.reason,
    });
  }

  for (const bench of benchmarkSymbols) {
    const bb = barsBySymbol.get(bench);
    if (!bb || bb.length === 0) continue;
    bb.sort((a, ca) => a.date.localeCompare(ca.date));
    const ind = computeAllIndicators(bb);
    const lastInd = ind.indicators[ind.indicators.length - 1];
    const lastBar = bb[bb.length - 1];
    if (lastInd && lastBar) {
      benchmarkSnapshots[bench] = [{ symbol: bench, close: lastBar.close, sma20: lastInd.sma20, sma50: lastInd.sma50, sma200: lastInd.sma200, rsi14: lastInd.rsi14, volumeRatio20d: lastInd.volumeRatio20d, return5d: lastInd.return5d, return20d: lastInd.return20d, distanceFrom52wHighPct: lastInd.distanceFrom52wHighPct, drawdownFromRecentHighPct: lastInd.drawdownFromRecentHighPct }];
    }
  }

  // =========================================
  // 4. Layered Market Intelligence
  // =========================================
  const layerResults = computeAllLayers({ symbolSnapshots: snapshots, benchmarkSnapshots, sectors, themes, timeframe: "1D", capturedAt });
  const symbolLayerMap = new Map<string, LayerCondition>();
  for (const lc of layerResults.symbols) symbolLayerMap.set(lc.scope_key, lc);
  const symbolSectorMap = new Map<string, string>();
  for (const [sn, sl] of Object.entries(sectors)) for (const s of sl) symbolSectorMap.set(s, sn);
  const symbolThemeMap = new Map<string, string>();
  for (const [tn, tl] of Object.entries(themes)) for (const s of tl) symbolThemeMap.set(s, tn);

  // Build DB layer condition rows
  const layerConditionRows: Array<Omit<DbLayerCondition, "id" | "created_at">> = [];
  if (layerResults.market) {
    const m = layerResults.market;
    layerConditionRows.push({ layer_name: m.layer_name, scope_key: m.scope_key, timeframe: m.timeframe, captured_at: m.captured_at, condition: m.condition, trend: m.trend, strength: m.strength, risk: m.risk, confidence: m.confidence, impact: m.impact, reason: m.reason, data_confidence: m.data_confidence, inputs_json: null });
  }
  for (const l of [...layerResults.sectors, ...layerResults.themes, ...layerResults.symbols]) {
    layerConditionRows.push({ layer_name: l.layer_name, scope_key: l.scope_key, timeframe: l.timeframe, captured_at: l.captured_at, condition: l.condition, trend: l.trend, strength: l.strength, risk: l.risk, confidence: l.confidence, impact: l.impact, reason: l.reason, data_confidence: l.data_confidence, inputs_json: null });
  }

  // =========================================
  // 5. Scoring + Signal Detection
  // =========================================
  const scoredSymbols: ScoredSymbol[] = [];
  const analysisEngine = new InvestmentAnalysisEngine();
  let llmAnalysisEngine = new InvestmentAnalysisEngine({ llm: { enabled: true } });
  let llmRuntimeMetadata: Record<string, unknown> = {};
  let llmRunConfig = {
    provider: process.env.LLM_PROVIDER ?? "deepseek",
    reasoningModel: process.env.LLM_REASONING_MODEL ?? process.env.LLM_MODEL ?? "deepseek-chat",
    workerModel: process.env.LLM_WORKER_MODEL ?? process.env.LLM_MODEL ?? "deepseek-chat",
    criticModel: process.env.LLM_CRITIC_MODEL ?? process.env.LLM_REASONING_MODEL ?? process.env.LLM_MODEL ?? "deepseek-chat",
    reasoningTemperature: Number(process.env.LLM_REASONING_TEMPERATURE ?? 0.3),
    criticTemperature: Number(process.env.LLM_CRITIC_TEMPERATURE ?? 0.5),
    enableCritic: false,
  };
  try {
    const runtime = await getLlmRuntimeConfig();
    llmAnalysisEngine = new InvestmentAnalysisEngine({ llm: { enabled: true, provider: runtime.provider, ...runtime.config } });
    llmRunConfig = {
      provider: runtime.settings.provider,
      reasoningModel: runtime.settings.reasoningModel,
      workerModel: runtime.settings.workerModel,
      criticModel: runtime.settings.criticModel,
      reasoningTemperature: runtime.settings.reasoningTemperature,
      criticTemperature: runtime.settings.criticTemperature,
      enableCritic: runtime.settings.enableCritic,
    };
    llmRuntimeMetadata = {
      provider: runtime.settings.provider,
      reasoningModel: runtime.settings.reasoningModel,
      workerModel: runtime.settings.workerModel,
      criticModel: runtime.settings.criticModel,
      promptVersion: LLM_PROMPT_VERSION,
      schemaVersion: "analysis-input-v1",
      source: runtime.settings.source,
    };
  } catch (e) {
    errors.push(`LLM settings load failed: ${e instanceof Error ? e.message : "Unknown"}`);
  }

  for (const sym of symbols) {
    const snapshot = snapshots[sym.symbol];
    if (!snapshot) continue;
    const subject = buildAnalysisSubject(sym, snapshot);
    const analysis = analysisEngine.analyzeWithRules(subject);

    scoredSymbols.push({
      symbol: sym, snapshot,
      layer: subject.symbolLayer ?? { layer_name: "symbol", scope_key: sym.symbol, timeframe: "1D", captured_at: capturedAt, condition: "neutral", trend: "stable", strength: 50, risk: 50, confidence: 30, impact: "neutral", reason: "no evaluation", data_confidence: 0 },
      scores: analysis.scores,
      classification: analysis.classification,
    });
  }

  // Sort by final entry score desc
  scoredSymbols.sort((a, b) => b.scores.finalEntryScore - a.scores.finalEntryScore);

  const strongSignals = scoredSymbols.filter((s) => s.classification.action === "strong_entry_candidate");
  const entryCandidates = scoredSymbols.filter((s) => s.classification.action === "entry_candidate");
  const watchList = scoredSymbols.filter((s) => s.classification.action === "watch");
  const avoided = scoredSymbols.filter((s) => s.classification.action === "avoid");

  // =========================================
  // 6. LLM Analysis (top-N strong + entry)
  // =========================================
  const llmCandidates = [...strongSignals, ...entryCandidates].slice(0, llmTopN);
  for (const sc of llmCandidates) {
    try {
      const subject = buildAnalysisSubject(sc.symbol, sc.snapshot);
      const logicBeforeLlm = analysisEngine.analyzeWithRules(subject);
      const llmInput = buildLlmInputSnapshot(subject, logicBeforeLlm);
      const llmResult = await llmAnalysisEngine.analyzeWithLlm(subject);
      totalCostUsd += llmResult.costUsd;

      if (llmResult.llm?.analysis) {
        sc.scores = llmResult.scores;
        sc.classification = llmResult.classification;

        if (persist) {
          try {
            await insertLlmRun(buildLlmRunInsert({
              taskType: "analysis",
              runRole: "reasoning",
              run: llmResult.llm.reasoning,
              inputSnapshot: llmInput,
              outputJson: llmResult.llm.analysis,
              provider: llmRunConfig.provider,
              model: llmResult.llm.reasoning.model ?? llmRunConfig.reasoningModel,
              temperature: llmRunConfig.reasoningTemperature,
              maxTokens: 4096,
              criticEnabled: llmRunConfig.enableCritic || llmResult.llm.analysis.action_suggestion === "strong_entry_candidate",
            }));
            if (llmResult.llm.critic) {
              await insertLlmRun(buildLlmRunInsert({
                taskType: "analysis",
                runRole: "critic",
                run: llmResult.llm.critic,
                inputSnapshot: llmInput,
                outputJson: llmResult.llm.criticOutput,
                provider: llmRunConfig.provider,
                model: llmResult.llm.critic.model ?? llmRunConfig.criticModel,
                temperature: llmRunConfig.criticTemperature,
                maxTokens: 2048,
                criticEnabled: true,
              }));
            }
            // insertSignal would need to come before this - deferred to persist block below
          } catch {}
        }
      }
    } catch (e) {
      errors.push(`LLM analysis failed for ${sc.symbol.symbol}: ${e instanceof Error ? e.message : "Unknown"}`);
    }
  }

  // =========================================
  // 7. Storyline Simulation
  // =========================================
  const storylineSets: StorylineSet[] = [];
  if (enableStorylines) {
    const storylineCandidates = [...strongSignals, ...entryCandidates, ...watchList].slice(0, storylineTopN);
    for (const sc of storylineCandidates) {
      try {
        const previous = persist ? await loadPreviousStoryline(sc.symbol.symbol) : null;
        storylineSets.push(generateStorylineSet({
          scored: sc,
          dataConfidence: dataConfidence[sc.symbol.symbol] ?? 50,
          generatedAt: capturedAt,
          previous,
        }));
      } catch (e) {
        errors.push(`Storyline generation failed for ${sc.symbol.symbol}: ${e instanceof Error ? e.message : "Unknown"}`);
      }
    }
  }

  // =========================================
  // 8. Persist to DB
  // =========================================
  if (persist) {
    let analysisRunId: string | null = null;
    try {
      const analysisRun = await insertAnalysisRun({
        run_type: "daily_scan",
        run_key: dateStr,
        status: "completed",
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        engine_version: SCORE_ENGINE_VERSION,
        scoring_config_version: SCORING_CONFIG_VERSION,
        feature_schema_version: "analysis-input-v1",
        prompt_version: LLM_PROMPT_VERSION,
        llm_schema_version: "analysis-input-v1",
        universe_type: "daily_scan",
        config_json: { llmTopN, lookbackDays, benchmarks: benchmarkSymbols, llm: llmRuntimeMetadata, enableStorylines, storylineTopN } as never,
        metadata_json: { symbolCount: symbols.length, strongCount: strongSignals.length, entryCount: entryCandidates.length, watchCount: watchList.length, avoidedCount: avoided.length, storylineCount: storylineSets.length } as never,
        data_source_summary_json: { ohlcv: "yfinance", benchmarkSymbols, dataMaxAgeHours: DATA_MAX_AGE_HOURS } as never,
      });
      analysisRunId = analysisRun.id;
    } catch (e) { errors.push(`Analysis run persist: ${e instanceof Error ? e.message : "Unknown"}`); }

    try { await insertMarketSnapshots(marketSnapshotRows); } catch (e) { errors.push(`Market snapshots persist: ${e instanceof Error ? e.message : "Unknown"}`); }
    try { await insertLayerConditions(layerConditionRows); } catch (e) { errors.push(`Layer conditions persist: ${e instanceof Error ? e.message : "Unknown"}`); }

    // Persist signals for strong + entry candidates
    for (const sc of [...strongSignals, ...entryCandidates]) {
      try {
        const sig = await insertSignal({
          symbol_id: sc.symbol.id, signal_type: sc.classification.action,
          action_suggestion: sc.classification.action as DbSignal["action_suggestion"],
          tier: sc.classification.tier as DbSignal["tier"],
          opportunity_score: sc.scores.opportunityScore, entry_timing_score: sc.scores.entryTimingScore,
          risk_score: sc.scores.riskScore, conviction_score: sc.scores.convictionScore,
          final_entry_score: sc.scores.finalEntryScore, data_confidence: dataConfidence[sc.symbol.symbol] ?? 50,
          tier_reason: sc.classification.tierReason, blocker_reason: sc.classification.blockerReason ?? null,
          strategy_tags_json: sc.scores.strategyTags, strategy_fit_scores_json: sc.scores.strategyFitScores,
          detected_at: capturedAt, status: "active",
        });
        if (sc.classification.scenario) {
          try {
            await insertTradeScenario({ signal_id: sig.id, entry_price: sc.classification.scenario.entryPrice, stop_price: sc.classification.scenario.stopPrice, target_base: sc.classification.scenario.targetBase, risk_reward_base: sc.classification.scenario.riskRewardBase });
          } catch {}
        }
        try {
          const snapshotSubject = buildAnalysisSubject(sc.symbol, sc.snapshot);
          await insertScoreSnapshot({
            analysis_run_id: analysisRunId,
            signal_id: sig.id,
            symbol_id: sc.symbol.id,
            symbol: sc.symbol.symbol,
            captured_at: capturedAt,
            action_suggestion: sc.classification.action,
            tier: sc.classification.tier,
            opportunity_score: sc.scores.opportunityScore,
            entry_timing_score: sc.scores.entryTimingScore,
            risk_score: sc.scores.riskScore,
            conviction_score: sc.scores.convictionScore,
            final_entry_score: sc.scores.finalEntryScore,
            data_confidence: dataConfidence[sc.symbol.symbol] ?? 50,
            score_breakdown_json: sc.scores.breakdown as never,
            score_contributions_json: sc.scores.contributions as never,
            gate_details_json: sc.classification.gateDetails as never,
            decision_reasons_json: sc.classification.reasons as never,
            strategy_tags_json: sc.scores.strategyTags,
            strategy_fit_scores_json: sc.scores.strategyFitScores,
            input_snapshot_json: buildAnalysisInputSnapshot(snapshotSubject, {
              scores: sc.scores,
              classification: sc.classification,
              scoringInput: analysisEngine.analyzeWithRules(snapshotSubject).scoringInput,
            }) as never,
            score_engine_version: SCORE_ENGINE_VERSION,
            scoring_config_version: SCORING_CONFIG_VERSION,
            market_data_as_of: capturedAt,
            scenario_quality_json: (sc.classification.scenario?.scenarioQuality ?? { atrSource: "unavailable", confidence: dataConfidence[sc.symbol.symbol] ?? 50, warnings: ["trade scenario is unavailable"] }) as never,
            feature_availability_json: { technical: true, fundamentals: false, scenario: Boolean(sc.classification.scenario) } as never,
            score_calibration_version: "score-calibration-v1",
          });
        } catch (e) { errors.push(`Score snapshot persist ${sc.symbol.symbol}: ${e instanceof Error ? e.message : "Unknown"}`); }
      } catch (e) { errors.push(`Signal persist ${sc.symbol.symbol}: ${e instanceof Error ? e.message : "Unknown"}`); }
    }

    for (const storyline of storylineSets) {
      const symbolRow = symbols.find((s) => s.symbol === storyline.symbol);
      try {
        const set = await insertStorylineSet({
          analysis_run_id: analysisRunId,
          symbol_id: symbolRow?.id ?? null,
          symbol: storyline.symbol,
          generated_at: storyline.generatedAt,
          status: storyline.status,
          active_scenario: storyline.activeScenario,
          revision_summary: storyline.revisionSummary,
          revision_reasons_json: storyline.revisionReasons as never,
          score_snapshot_json: storyline.scoreSnapshot as never,
          storyline_engine_version: "storyline-engine-v1",
          scenario_probability_method: storyline.probabilityMethod,
          data_quality_json: { dataConfidence: storyline.scoreSnapshot.dataConfidence } as never,
        });
        await insertStorylineScenarios(storyline.scenarios.map((scenario) => ({
          storyline_set_id: set.id,
          scenario_kind: scenario.kind,
          label: scenario.label,
          probability_pct: scenario.probabilityPct,
          raw_weight: scenario.rawWeight ?? scenario.probabilityPct,
          normalized_probability_pct: scenario.normalizedProbabilityPct ?? scenario.probabilityPct,
          horizon: scenario.horizon,
          thesis: scenario.thesis,
          expected_return_pct: scenario.expectedReturnPct,
          target_price: scenario.targetPrice,
          stop_price: scenario.stopPrice,
          key_drivers_json: scenario.keyDrivers as never,
          confirmation_signals_json: scenario.confirmationSignals as never,
          invalidation_signals_json: scenario.invalidationSignals as never,
          risk_notes_json: scenario.riskNotes as never,
        })));
      } catch (e) { errors.push(`Storyline persist ${storyline.symbol}: ${e instanceof Error ? e.message : "Unknown"}`); }
    }
  }

  // =========================================
  // 9. LINE Notification
  // =========================================
  if (notify) {
    try {
      const engine = new NotificationEngine();
      if (engine.isConfigured) {
        const brief: MorningBriefData = {
          date: dateStr, marketCondition: layerResults.market?.condition ?? "neutral", marketStrength: layerResults.market?.strength ?? 50,
          strongSignals: strongSignals.map((s) => ({
            symbol: s.symbol.symbol, name: s.symbol.name ?? s.symbol.symbol, tier: s.classification.tier, action: s.classification.action,
            entryPrice: s.classification.scenario?.entryPrice ?? s.snapshot.close,
            targetBase: s.classification.scenario?.targetBase ?? 0,
            stopPrice: s.classification.scenario?.stopPrice ?? 0,
            rr: s.classification.scenario?.riskRewardBase ?? 0,
            keyReason: s.classification.tierReason,
          })),
          entryCandidates: entryCandidates.map((s) => ({
            symbol: s.symbol.symbol, name: s.symbol.name ?? s.symbol.symbol, tier: s.classification.tier, action: s.classification.action,
            entryPrice: s.classification.scenario?.entryPrice ?? s.snapshot.close,
            rr: s.classification.scenario?.riskRewardBase ?? 0,
          })),
          watchCount: watchList.length,
          systemHealth: { dataFetched: fetchErrors.length === 0, errors: errors.slice(0, 5) },
          dailyCostUsd: totalCostUsd,
        };
        const sent = await engine.sendMorningBrief(brief);
        if (!sent.success) errors.push(`Morning brief: ${sent.error}`);
      }
    } catch (e) { errors.push(`Notification error: ${e instanceof Error ? e.message : "Unknown"}`); }
  }

  const finishedAt = new Date().toISOString();
  return {
    context: { date: dateStr, symbols, snapshots, benchmarkSnapshots, sectors, themes, layerResults, dataConfidence },
    scoredSymbols, strongSignals, entryCandidates, watchList, avoided, storylineSets,
    totalCostUsd, errors, startedAt, finishedAt,
  };

  async function loadPreviousStoryline(symbol: string): Promise<PreviousStorylineSet | null> {
    try {
      const latest = await getLatestStorylineSet(symbol);
      if (!latest) return null;
      const scoreSnapshot = latest.score_snapshot_json as { finalEntryScore?: number; riskScore?: number; entryTimingScore?: number };
      return {
        symbol: latest.symbol,
        activeScenario: latest.active_scenario as PreviousStorylineSet["activeScenario"],
        finalEntryScore: Number(scoreSnapshot.finalEntryScore ?? 0),
        riskScore: Number(scoreSnapshot.riskScore ?? 0),
        entryTimingScore: Number(scoreSnapshot.entryTimingScore ?? 0),
        generatedAt: latest.generated_at,
      };
    } catch (e) {
      errors.push(`Previous storyline load failed for ${symbol}: ${e instanceof Error ? e.message : "Unknown"}`);
      return null;
    }
  }

  function buildAnalysisSubject(sym: Symbol, snapshot: SymbolSnapshot): AnalysisSubject {
    const sectorName = symbolSectorMap.get(sym.symbol);
    const themeName = symbolThemeMap.get(sym.symbol);
    return {
      symbol: sym.symbol,
      name: sym.name,
      snapshot,
      market: layerResults.market,
      sector: sectorName ? layerResults.sectors.find((l) => l.scope_key === sectorName) ?? null : null,
      theme: themeName ? layerResults.themes.find((l) => l.scope_key === themeName) ?? null : null,
      symbolLayer: symbolLayerMap.get(sym.symbol) ?? null,
      dataConfidence: dataConfidence[sym.symbol] ?? 50,
      eventBlockerActive: blockedSymbols.has(sym.symbol),
      isForbidden: forbiddenTickers.has(sym.symbol),
    };
  }

  function buildLlmRunInsert(input: {
    taskType: string;
    runRole: string;
    run: LlmRunResult;
    inputSnapshot: unknown;
    outputJson: unknown;
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
    criticEnabled: boolean;
  }): Omit<LlmRun, "id" | "created_at"> {
    const outputJson = input.outputJson ?? input.run.outputJson;
    return {
      task_type: input.taskType,
      run_role: input.runRole,
      status: input.run.status,
      input_snapshot_json: input.inputSnapshot as never,
      output_json: outputJson as never,
      input_tokens: input.run.inputTokens,
      output_tokens: input.run.outputTokens,
      estimated_cost: input.run.estimatedCost,
      latency_ms: input.run.latencyMs,
      error_message: input.run.errorMessage ?? null,
      provider: input.provider,
      model: input.model,
      prompt_version: LLM_PROMPT_VERSION,
      schema_version: "analysis-input-v1",
      temperature: input.temperature,
      max_tokens: input.maxTokens,
      repair_attempt_count: input.run.repairAttemptCount ?? 0,
      critic_enabled: input.criticEnabled,
      finish_reason: input.run.finishReason ?? null,
      estimated_cost_usd: input.run.estimatedCost,
      request_id: input.run.requestId ?? null,
      input_hash: hashStable(input.inputSnapshot),
      output_hash: hashStable(outputJson),
    };
  }

  function hashStable(value: unknown): string {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
  }
}
