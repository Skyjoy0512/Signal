"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, AlertTriangle, Building2, ChartColumnIncreasing, CheckCircle2, Gauge, RefreshCw, RotateCcw, Target } from "lucide-react";
import { SignalCard } from "@/components/signal-card";
import { FundamentalTrendCharts, ScoreRiskScatter, SectorStrengthChart, type FundamentalPoint } from "@/components/candidate-visuals";
import { Button } from "@/components/ui/button";
import { MeaningNote, ScoreRing, SectorIcon, StatusPill, ThemeIcon } from "@/components/visual-primitives";
import { displaySector, displayTheme, finalScoreInsight, industryCodeForSector, riskTone, scoreTone, themeDescription } from "@/lib/market-display";

interface SignalData {
  symbol: string; name: string | null; action: string; tier: string;
  sector: string; industry: string | null; themes: string[];
  scores: { opportunity: number; entryTiming: number; risk: number; conviction: number; final: number };
  scenario: { entryPrice: number; stopPrice: number; targetBase: number; riskRewardBase: number; scenarioQuality?: { confidence: number; warnings: string[] } } | null;
  reason: string;
  decisionReasons: Array<{ code: string; message: string; severity: "blocker" | "warning" | "info" }>;
  gateDetails: Array<{ key: string; label: string; passed: boolean; severity: "blocker" | "warning" | "info"; reason: string }>;
  dataConfidence: number;
  eventBlockerActive: boolean;
  analysisSummary: string;
  snapshot: {
    close: number; rsi14: number | null; volumeRatio20d: number | null; return5d: number | null; return20d: number | null;
    distanceFrom52wHighPct: number | null; drawdownFromRecentHighPct: number | null;
  };
  fundamentals: FundamentalPoint[];
  layers: {
    symbol: LayerData | null;
    sector: LayerData | null;
    theme: LayerData | null;
  };
}

interface LayerData {
  scope_key: string; condition: string; trend: string; strength: number; risk: number; confidence: number; reason: string;
}

interface LayerGroup {
  key: string; symbols: string[]; signalCount: number; layer: LayerData | null;
}

interface SignalResponse {
  signals: SignalData[];
  market: string;
  date?: string;
  layers?: {
    market: LayerData | null;
    sectors: LayerGroup[];
    themes: LayerGroup[];
  };
}

export default function CandidatesPage() {
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [layers, setLayers] = useState<SignalResponse["layers"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [market, setMarket] = useState<string>("--");
  const [selectedSector, setSelectedSector] = useState<string>("ALL");
  const [selectedTheme, setSelectedTheme] = useState<string>("ALL");
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const fetchSignals = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/signals");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SignalResponse = await res.json();
      setSignals(data.signals ?? []);
      setLayers(data.layers ?? null);
      setMarket(data.market ?? "--");
      setSelectedSymbol((current) => current && data.signals?.some((s) => s.symbol === current) ? current : data.signals?.[0]?.symbol ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void fetchSignals();
    }, 0);
    return () => window.clearTimeout(id);
  }, [fetchSignals]);

  const marketLabel: Record<string, string> = {
    strong_bullish: "強気", bullish: "やや強気", neutral: "中立", bearish: "やや弱気", strong_bearish: "弱気",
  };

  const filteredSignals = signals.filter((signal) => {
    const sectorOk = selectedSector === "ALL" || signal.sector === selectedSector;
    const themeOk = selectedTheme === "ALL" || signal.themes.includes(selectedTheme);
    return sectorOk && themeOk;
  });
  const selectedSignal = signals.find((signal) => signal.symbol === selectedSymbol) ?? filteredSignals[0] ?? signals[0] ?? null;
  const relatedSignals = selectedSignal
    ? signals.filter((signal) => signal.symbol !== selectedSignal.symbol && (
      signal.sector === selectedSignal.sector || signal.themes.some((theme) => selectedSignal.themes.includes(theme))
    )).slice(0, 5)
    : [];
  const marketStrength = layers?.market?.strength ?? 0;
  const marketRisk = layers?.market?.risk ?? 0;
  const marketConfidence = layers?.market?.confidence ?? 0;
  const selectedIndustryCode = selectedSignal ? industryCodeForSector(selectedSignal.sector) : null;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">候補銘柄</h1>
          <p className="page-subtitle">日経平均相当の市場レイヤーから、業界・関連テーマ・個別銘柄へドリルダウン</p>
          <p className="meaning-note">現在はモックの大型株サンプル{signals.length || 30}銘柄です。全上場銘柄ではなく、API/DB連携後に対象ユニバースを拡張できます。</p>
          <p className="meaning-note">Signalは投資助言や売買指示ではなく、候補銘柄のレビュー観点を整理するための個人利用ツールです。</p>
        </div>
        <Button onClick={fetchSignals} variant="outline" size="sm">
          <RefreshCw size={14} />
          再計算
        </Button>
      </div>

      {loading && (
        <div className="card state-panel">
          <div className="state-panel-head">
            <div>
              <div className="stat-label">Loading</div>
              <div className="state-panel-title">シグナルを計算中</div>
              <p className="state-panel-copy">市場、業界、テーマ、銘柄の順に読み込みます。</p>
            </div>
            <span className="badge badge-outline">計算中</span>
          </div>
          <div className="skeleton-grid">
            {[0, 1, 2].map((item) => (
              <div key={item} className="skeleton-card">
                <div className="skeleton-line short" />
                <div className="skeleton-line long" />
                <div className="skeleton-line medium" />
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="card state-panel">
          <div className="state-panel-head">
            <div>
              <div className="stat-label">Error</div>
              <div className="state-panel-title">候補銘柄を読み込めませんでした</div>
              <p className="state-panel-copy">{error}</p>
            </div>
            <Button onClick={fetchSignals} variant="outline" size="sm">再試行</Button>
          </div>
        </div>
      )}

      {!loading && !error && signals.length === 0 && (
        <div className="card card-dashed empty-state">
          <div className="empty-state-media">
            <Image
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=440&q=80&fit=crop"
              alt=""
              fill
              sizes="220px"
            />
          </div>
          <div className="empty-state-title">シグナルはまだありません</div>
          <div className="empty-state-copy">日次スキャンを実行すると、確認候補とレビュー観点がここに表示されます。</div>
        </div>
      )}

      {!loading && !error && signals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
        >
          <section className="card" style={{ marginBottom: 14, padding: 0, overflow: "hidden" }}>
            <div className="drilldown-hero-grid" style={{ display: "grid", gridTemplateColumns: "minmax(240px, 0.72fr) minmax(0, 1.28fr)", gap: 0 }}>
              <div style={{ background: "var(--color-deep-charcoal)", color: "#f8fafc", padding: 18 }}>
                <div className="section-kicker" style={{ color: "#dbe7d8" }}>Market Overview</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="semantic-icon" style={{ background: "rgba(194,91,36,0.16)", borderColor: "rgba(248,225,210,0.24)", color: "#f8e1d2" }}><Activity size={18} /></span>
                      <div style={{ fontSize: 20, fontWeight: 600 }}>日経平均 / 日本株市場</div>
                    </div>
                    <div style={{ color: "#cbd5e1", fontSize: 12, marginTop: 4 }}>地合い: {marketLabel[market] ?? market}</div>
                  </div>
                  <span className="badge" style={{ color: "#f8e1d2", border: "1px solid rgba(248,225,210,0.26)" }}>{signals.length}銘柄</span>
                </div>
                <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  <ScoreRing value={marketStrength} label="市場強度" dark />
                  <ScoreRing value={100 - marketRisk} label="安全度" dark />
                  <ScoreRing value={marketConfidence} label="信頼度" dark />
                </div>
                <p style={{ color: "#cbd5e1", fontSize: 12, lineHeight: 1.6, marginTop: 12 }}>
                  市場強度は日経平均相当のトレンド/モメンタム評価です。安全度はリスクが低いほど高く表示します。
                </p>
              </div>

              <div style={{ padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                  <div>
                    <div className="section-kicker">Industry Drilldown</div>
                    <div style={{ fontSize: 14, color: "var(--color-muted-clay)" }}>業界強度 = 業界内銘柄の平均最終スコア。緑は強い、赤は弱い業界です。</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setSelectedSector("ALL"); setSelectedTheme("ALL"); }}>
                    <RotateCcw size={13} />
                    解除
                  </Button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                  <DrilldownButton
                    active={selectedSector === "ALL"}
                    title="市場全体"
                    meta={`${signals.length}銘柄 / 全サンプル`}
                    icon={<Gauge size={18} />}
                    strength={layers?.market?.strength}
                    ring
                    onClick={() => setSelectedSector("ALL")}
                  />
                  {(layers?.sectors ?? []).map((sector) => (
                    <DrilldownButton
                      key={sector.key}
                      active={selectedSector === sector.key}
                      title={displaySector(sector.key)}
                      meta={`${sector.symbols.length}銘柄 / 候補${sector.signalCount}`}
                      icon={<SectorIcon sector={sector.key} />}
                      strength={sector.layer?.strength}
                      ring
                      onClick={() => { setSelectedSector(sector.key); setSelectedSymbol(sector.symbols[0] ?? null); }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="visual-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 14, marginBottom: 14 }}>
            <div className="card">
              <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                <div>
                  <div className="section-kicker">Sector Heat</div>
                  <h2 style={{ fontSize: 16, fontWeight: 600 }}>業界別スコア</h2>
                  <MeaningNote>青は業界内の平均最終スコア、緑/灰は候補銘柄数です。ラベルは日本語化しています。</MeaningNote>
                </div>
                <span className="badge badge-outline">クリックで絞込</span>
              </div>
              <SectorStrengthChart
                sectors={layers?.sectors ?? []}
                selectedSector={selectedSector}
                onSelect={(sector) => {
                  setSelectedSector(sector);
                  setSelectedSymbol((layers?.sectors ?? []).find((s) => s.key === sector)?.symbols[0] ?? null);
                }}
              />
            </div>
            <div className="card">
              <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                <div>
                  <div className="section-kicker">Score Map</div>
                  <h2 style={{ fontSize: 16, fontWeight: 600 }}>最終スコア × リスク制御</h2>
                  <MeaningNote>右に行くほど候補度が高く、上に行くほどリスク制御が良好です。点を押すと銘柄詳細に移ります。</MeaningNote>
                </div>
                <span className="badge badge-outline">{filteredSignals.length}銘柄</span>
              </div>
              <ScoreRiskScatter
                signals={filteredSignals}
                selectedSymbol={selectedSignal?.symbol ?? null}
                onSelect={setSelectedSymbol}
              />
            </div>
          </section>

          <section className="drilldown-content-grid" style={{ display: "grid", gridTemplateColumns: "minmax(260px, 0.72fr) minmax(0, 1.28fr)", gap: 14, marginBottom: 14 }}>
            <div className="card">
              <div className="section-kicker">Related Themes</div>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>関連テーマ</h2>
              <MeaningNote>同じ材料や需給で連動しやすい銘柄群です。テーマを選ぶと候補リストを絞り込みます。</MeaningNote>
              <div style={{ display: "grid", gap: 8 }}>
                <DrilldownButton
                  active={selectedTheme === "ALL"}
                  title="全テーマ"
                  meta="テーマ絞り込みなし"
                  icon={<Target size={18} />}
                  strength={undefined}
                  onClick={() => setSelectedTheme("ALL")}
                />
                {(layers?.themes ?? []).map((theme) => (
                  <DrilldownButton
                    key={theme.key}
                    active={selectedTheme === theme.key}
                    title={displayTheme(theme.key)}
                    meta={`${theme.symbols.length}銘柄 / 候補${theme.signalCount} · ${themeDescription(theme.key)}`}
                    icon={<ThemeIcon theme={theme.key} />}
                    strength={theme.layer?.strength}
                    onClick={() => setSelectedTheme(theme.key)}
                  />
                ))}
              </div>
            </div>

            <div className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                <div>
                  <div className="section-kicker">Symbol Analysis</div>
                  <div style={{ fontSize: 14, color: "var(--color-muted-clay)" }}>銘柄を選ぶと、最終スコアの示唆・リスク・短期モメンタムを確認できます。</div>
                </div>
                <span className="font-mono" style={{ fontSize: 12, color: "var(--color-edge-ash)" }}>{filteredSignals.length} / {signals.length}</span>
              </div>
              <div className="symbol-analysis-grid" style={{ display: "grid", gridTemplateColumns: "minmax(220px, 0.9fr) minmax(0, 1.1fr)", gap: 14 }}>
                <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
                  {filteredSignals.map((signal) => (
                    <button
                      key={signal.symbol}
                      onClick={() => setSelectedSymbol(signal.symbol)}
                      className="card-hover"
                      style={{
                        appearance: "none",
                        textAlign: "left",
                        border: `1px solid ${selectedSignal?.symbol === signal.symbol ? "var(--color-deep-charcoal)" : "var(--color-border-sand)"}`,
                        background: selectedSignal?.symbol === signal.symbol ? "#f8fafc" : "#ffffff",
                        borderRadius: 8,
                        padding: 10,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}><SectorIcon sector={signal.sector} />{signal.name ?? signal.symbol}</span>
                        <span className="badge badge-dark font-mono">{signal.tier}</span>
                      </div>
                      <div className="font-mono" style={{ fontSize: 11, color: "var(--color-muted-clay)", marginTop: 2 }}>{signal.symbol} · {signal.industry ?? displaySector(signal.sector)}</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
                        <StatusPill value={signal.scores.final} label="最終" />
                        <span style={{ fontSize: 11, color: "var(--color-muted-clay)" }}>{finalScoreInsight(signal.scores.final)}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {selectedSignal && (
                  <motion.div
                    key={selectedSignal.symbol}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="selected-analysis-panel"
                  >
                    <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <SectorIcon sector={selectedSignal.sector} />
                          <div>
                            <div style={{ fontSize: 18, fontWeight: 600 }}>{selectedSignal.name ?? selectedSignal.symbol}</div>
                            <div className="font-mono" style={{ color: "var(--color-muted-clay)", fontSize: 12 }}>{selectedSignal.symbol} · {displaySector(selectedSignal.sector)}</div>
                          </div>
                        </div>
                      </div>
                      <ScoreRing value={selectedSignal.scores.final} label="最終スコア" />
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                      <StatusPill value={selectedSignal.scores.opportunity} label="機会" />
                      <StatusPill value={selectedSignal.scores.entryTiming} label="タイミング" />
                      <span className="status-pill" style={{ color: riskTone(selectedSignal.scores.risk).color, background: riskTone(selectedSignal.scores.risk).bg }}>リスク: {riskTone(selectedSignal.scores.risk).label}</span>
                    </div>
                    <div className="decision-lanes" style={{ marginTop: 12, marginBottom: 0 }}>
                      <section className="lane-card fact-tile">
                        <div className="lane-label">ファクト</div>
                        <div className="fact-grid" style={{ marginTop: 8 }}>
                          <FactCell label="株価" value={selectedSignal.snapshot.close.toLocaleString()} />
                          <FactCell label="5D" value={formatPct(selectedSignal.snapshot.return5d)} />
                          <FactCell label="20D" value={formatPct(selectedSignal.snapshot.return20d)} />
                          <FactCell label="RSI" value={selectedSignal.snapshot.rsi14 != null ? Math.round(selectedSignal.snapshot.rsi14).toString() : "--"} />
                        </div>
                      </section>
                      <section className="lane-card intel-tile">
                        <div className="lane-label">インテリジェンス</div>
                        <div className="intelligence-grid" style={{ marginTop: 8 }}>
                          <FactCell label="最終" value={Math.round(selectedSignal.scores.final).toString()} />
                          <FactCell label="機会" value={Math.round(selectedSignal.scores.opportunity).toString()} />
                          <FactCell label="確信度" value={Math.round(selectedSignal.scores.conviction).toString()} />
                          <FactCell label="判断" value={selectedSignal.tier} />
                        </div>
                      </section>
                    </div>
                    <p style={{ marginTop: 12, fontSize: 13, lineHeight: 1.7, color: scoreTone(selectedSignal.scores.final).color, fontWeight: 600 }}>{finalScoreInsight(selectedSignal.scores.final)}</p>
                    <p style={{ marginTop: 10, fontSize: 13, lineHeight: 1.7, color: "var(--color-espresso-ink)" }}>{selectedSignal.analysisSummary}</p>
                    <GateSummary signal={selectedSignal} />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                      <Button asChild size="sm">
                        <Link href={`/companies/${encodeURIComponent(selectedSignal.symbol)}`}>
                          <Building2 size={14} />
                          企業詳細
                        </Link>
                      </Button>
                      {selectedIndustryCode && (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/industries/${selectedIndustryCode}`}>
                            <ChartColumnIncreasing size={14} />
                            業界ランキング
                          </Link>
                        </Button>
                      )}
                    </div>
                    {selectedSignal.fundamentals?.length > 0 && (
                      <div style={{ marginTop: 16, borderTop: "1px solid var(--color-border-sand)", paddingTop: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                          <div>
                            <div className="section-kicker">Financials</div>
                            <h3 style={{ fontSize: 15, fontWeight: 600 }}>業績・BS/PL推移</h3>
                            <p className="meaning-note">現時点ではUI検証用のモック財務です。DB連携後は実績値/予想値に差し替えます。</p>
                          </div>
                          <span className="badge badge-outline">モック財務</span>
                        </div>
                        <FundamentalTrendCharts data={selectedSignal.fundamentals} />
                      </div>
                    )}
                    {relatedSignals.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div className="stat-label">関連銘柄</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                          {relatedSignals.map((signal) => (
                            <button key={signal.symbol} onClick={() => setSelectedSymbol(signal.symbol)} className="badge badge-outline" style={{ cursor: "pointer" }}>
                              {signal.symbol}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>

          <div className="candidate-list-head">
            <div>
              <div className="section-kicker">Candidate Cards</div>
              <h2>候補カード一覧</h2>
            </div>
            <span className="badge badge-outline">{filteredSignals.length}件</span>
          </div>

          <motion.div className="grid-signals" style={{ marginTop: 10 }} layout>
            {filteredSignals.map((s, i) => <SignalCard key={i} signal={s} />)}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function DrilldownButton({
  active,
  title,
  meta,
  icon,
  strength,
  ring,
  onClick,
}: {
  active: boolean;
  title: string;
  meta: string;
  icon: ReactNode;
  strength: number | undefined;
  ring?: boolean;
  onClick: () => void;
}) {
  const tone = strength == null ? null : scoreTone(strength);
  return (
    <button
      onClick={onClick}
      className="card-hover semantic-list-button"
      data-active={active}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {icon}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-espresso-ink)" }}>{title}</div>
          <div style={{ fontSize: 11, color: "var(--color-muted-clay)", marginTop: 2, lineHeight: 1.35 }}>{meta}</div>
        </div>
      </div>
      {strength != null && (
        ring ? (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 9 }}>
            <ScoreRing value={strength} label="強度" />
          </div>
        ) : (
          <div className="score-readout">
            <span>強度</span>
            <strong className="font-mono" style={{ color: tone?.color }}>{Math.round(strength)}</strong>
          </div>
        )
      )}
    </button>
  );
}

function FactCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div className="font-mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-espresso-ink)" }}>{value}</div>
    </div>
  );
}

function formatPct(value: number | null) {
  if (value == null) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function GateSummary({ signal }: { signal: SignalData }) {
  const focusGates = ["finalEntryScoreGate", "riskGate", "rrGate", "dataConfidenceGate", "eventBlockerGate"];
  const gates = focusGates
    .map((key) => signal.gateDetails.find((gate) => gate.key === key))
    .filter((gate): gate is NonNullable<typeof gate> => Boolean(gate));
  const cautionReasons = signal.decisionReasons.filter((reason) => reason.severity !== "info").slice(0, 3);
  const scenarioWarnings = signal.scenario?.scenarioQuality?.warnings ?? [];

  return (
    <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
      <div className="review-step">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div className="stat-label">Gate Summary</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>判断前に見る確認ゲート</div>
          </div>
          <span className="badge badge-outline">信頼度 {signal.dataConfidence}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(116px, 1fr))", gap: 8, marginTop: 10 }}>
          {gates.map((gate) => (
            <div key={gate.key} style={{ border: "1px solid var(--color-border-sand)", borderRadius: 8, padding: 8, background: gate.passed ? "#fbfdfb" : "#fff8f1" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                {gate.passed ? <CheckCircle2 size={14} color="var(--color-signal-green)" /> : <AlertTriangle size={14} color="var(--color-ember-orange)" />}
                <span style={{ fontSize: 12, fontWeight: 700 }}>{gate.label}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--color-muted-clay)", lineHeight: 1.4 }}>{gate.reason}</div>
            </div>
          ))}
        </div>
      </div>

      {(cautionReasons.length > 0 || scenarioWarnings.length > 0) && (
        <div className="review-step">
          <div className="stat-label">Caution Drivers</div>
          <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
            {cautionReasons.map((reason) => (
              <div key={reason.code} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12, color: "var(--color-espresso-ink)", lineHeight: 1.5 }}>
                <AlertTriangle size={14} color={reason.severity === "blocker" ? "var(--color-ember-orange)" : "var(--color-brass-gold)"} style={{ marginTop: 2, flex: "0 0 auto" }} />
                <span>{reason.message}</span>
              </div>
            ))}
            {scenarioWarnings.slice(0, 2).map((warning) => (
              <div key={warning} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12, color: "var(--color-espresso-ink)", lineHeight: 1.5 }}>
                <AlertTriangle size={14} color="var(--color-brass-gold)" style={{ marginTop: 2, flex: "0 0 auto" }} />
                <span>シナリオ品質: {warning}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
