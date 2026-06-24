import { describe, it, expect } from "vitest";
import { REASONING_SCHEMA, CRITIC_SCHEMA, validateSchema, extractJson } from "./schemas";
import { buildReasoningPrompt, buildCriticPrompt } from "./prompts";
import type { LlmInputSnapshot, ReasoningOutput } from "./types";

describe("REASONING_SCHEMA", () => {
  const valid = JSON.parse('{"action_suggestion":"entry_candidate","confidence":72,"bull_case":"Good","bear_case":"Bad","key_risks":["Risk A"],"do_not_enter_if":["Cond X"],"invalidation_condition":"Below MA","target_review":{"conservative_target_is_reasonable":true,"base_target_is_reasonable":true,"bull_target_is_reasonable":false,"comment":"OK"},"stop_review":{"stop_is_reasonable":true,"comment":"OK"},"score_adjustments":{"opportunity":3,"entry_timing":-2,"risk":0,"conviction":5,"reason":"Slight adjust"},"evidence_refs":[{"type":"contribution","component":"risk","feature":"volatility"}],"final_comment":"OK"}') as ReasoningOutput;
  
  it("passes valid output", () => {
    expect(validateSchema(valid, REASONING_SCHEMA)).toBeNull();
  });
  it("detects missing required keys", () => {
    const b: Partial<ReasoningOutput> = { ...valid };
    delete b.bull_case;
    expect(validateSchema(b, REASONING_SCHEMA)).not.toBeNull();
  });
  it("detects score_adjustments out of range", () => {
    const b = { ...valid, score_adjustments: { ...valid.score_adjustments, opportunity: 25 } };
    expect(validateSchema(b, REASONING_SCHEMA)).not.toBeNull();
  });
  it("detects malformed array item types", () => {
    const b = { ...valid, key_risks: ["Risk A", 42] };
    expect(validateSchema(b, REASONING_SCHEMA)).toContain("key_risks[1]: expected string");
  });
  it("detects too many risk items", () => {
    const b = { ...valid, key_risks: Array.from({ length: 9 }, (_, i) => `Risk ${i + 1}`) };
    expect(validateSchema(b, REASONING_SCHEMA)).toContain("key_risks: too many items");
  });
  it("detects low confidence strong action", () => {
    const b = { ...valid, action_suggestion: "strong_entry_candidate", confidence: 60 };
    expect(validateSchema(b, REASONING_SCHEMA)).toContain("action_suggestion: strong entry requires confidence >= 70");
  });
  it("detects low confidence numeric score adjustment", () => {
    const b = { ...valid, confidence: 42, score_adjustments: { ...valid.score_adjustments, opportunity: 1 } };
    expect(validateSchema(b, REASONING_SCHEMA)).toContain("score_adjustments: low confidence output must not adjust numeric scores");
  });
  it("detects unexpected properties", () => {
    const b = { ...valid, debug_notes: "remove me" };
    expect(validateSchema(b, REASONING_SCHEMA)).toContain("debug_notes: unexpected property");
  });
  it("requires evidence refs for entry-oriented output", () => {
    const b = { ...valid, score_adjustments: { opportunity: 0, entry_timing: 0, risk: 0, conviction: 0, reason: "No adjust" }, evidence_refs: [] };
    expect(validateSchema(b, REASONING_SCHEMA)).toContain("evidence_refs: entry-oriented action requires evidence references");
  });
  it("detects non-object input", () => {
    expect(validateSchema("nope", REASONING_SCHEMA)).not.toBeNull();
  });
});

describe("CRITIC_SCHEMA", () => {
  it("passes valid critic output", () => {
    expect(validateSchema({ critic_pass: true, major_concerns: [], required_downgrade: false, downgrade_to: null, block_positive_adjustment: false, reasons: ["OK"], evidence_refs: [], reason: "OK" }, CRITIC_SCHEMA)).toBeNull();
  });
  it("requires downgrade target when downgrade is required", () => {
    expect(validateSchema({ critic_pass: false, major_concerns: ["too optimistic"], required_downgrade: true, downgrade_to: null, block_positive_adjustment: true, reasons: ["Risk ignored"], evidence_refs: [{ type: "gate", key: "riskGate" }], reason: "Risk ignored" }, CRITIC_SCHEMA)).toContain("downgrade_to: required when required_downgrade is true");
  });
  it("requires major concerns when critic fails", () => {
    expect(validateSchema({ critic_pass: false, major_concerns: [], required_downgrade: false, downgrade_to: null, block_positive_adjustment: false, reasons: ["No pass"], evidence_refs: [], reason: "No pass" }, CRITIC_SCHEMA)).toContain("major_concerns: required when critic_pass is false");
  });
  it("requires evidence refs when critic blocks positive adjustment", () => {
    expect(validateSchema({ critic_pass: true, major_concerns: [], required_downgrade: false, downgrade_to: null, block_positive_adjustment: true, reasons: ["Risk caution"], evidence_refs: [], reason: "Risk caution" }, CRITIC_SCHEMA)).toContain("evidence_refs: critical critic action requires evidence references");
  });
});

describe("extractJson", () => {
  it("parses plain JSON", () => expect(extractJson('{"a":1}')).toEqual({ a: 1 }));
  it("extracts from markdown fence", () => expect(extractJson('```json\n{"k":"v"}\n```')).toEqual({ k: "v" }));
  it("returns null for non-JSON", () => expect(extractJson("hello")).toBeNull());
});

describe("prompts", () => {
  const snap: LlmInputSnapshot = {
    schemaVersion: "analysis-input-v1",
    scoreEngineVersion: "test-engine",
    scoringConfigVersion: "test-config",
    capturedAt: "2026-06-21T00:00:00.000Z",
    symbol: "7203.T",
    symbolName: "Toyota",
    scores: { opportunity: 72, entryTiming: 65, risk: 40, conviction: 70, finalEntry: 78 },
    strategyTags: ["trend_follow"],
    scenario: {
      entryPrice: 3100,
      stopPrice: 3000,
      targetBase: 3300,
      riskRewardBase: 2,
      expectedHoldingPeriod: "1-6M",
      calculationMethod: "atr_estimated_trend_follow_v2",
      scenarioQuality: {
        atrSource: "estimated",
        swingHighSource: "missing",
        swingLowSource: "missing",
        confidence: 50,
        warnings: ["ATR is estimated"],
      },
    },
    layers: { market: { layerName: "market", scopeKey: "JP_MARKET", condition: "bullish", trend: "improving", strength: 68, risk: 45, confidence: 75, impact: "upgrade", reason: "OK" } },
    dataConfidence: 85,
    eventBlockerActive: false,
  };
  it("builds reasoning prompt", () => {
    const prompt = buildReasoningPrompt(snap);
    expect(prompt).toContain("7203.T");
    expect(prompt).toContain("Prompt Version");
    expect(prompt).toContain("scenario.scenarioQuality");
    expect(prompt).toContain("参考ターゲットを強く扱わず");
    expect(prompt).toContain("evidence_refs");
  });
  it("builds critic prompt", () => {
    const r: ReasoningOutput = { action_suggestion: "entry_candidate", confidence: 72, bull_case: "OK", bear_case: "Risk", key_risks: ["R"], do_not_enter_if: ["C"], invalidation_condition: "x", target_review: { conservative_target_is_reasonable: true, base_target_is_reasonable: true, bull_target_is_reasonable: true, comment: "OK" }, stop_review: { stop_is_reasonable: true, comment: "OK" }, score_adjustments: { opportunity: 0, entry_timing: 0, risk: 0, conviction: 0, reason: "" }, evidence_refs: [{ type: "gate", key: "rrGate" }], final_comment: "OK" };
    const prompt = buildCriticPrompt(r, snap);
    expect(prompt).toContain("Critic");
    expect(prompt).toContain("scenario.scenarioQuality");
    expect(prompt).toContain("required_downgrade");
    expect(prompt).toContain("block_positive_adjustment");
  });
});
