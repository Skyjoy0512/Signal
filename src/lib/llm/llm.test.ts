import { describe, it, expect } from "vitest";
import { REASONING_SCHEMA, CRITIC_SCHEMA, validateSchema, extractJson } from "./schemas";
import { buildReasoningPrompt, buildCriticPrompt } from "./prompts";
import type { LlmInputSnapshot, ReasoningOutput } from "./types";

describe("REASONING_SCHEMA", () => {
  const valid = JSON.parse('{"action_suggestion":"entry_candidate","confidence":72,"bull_case":"Good","bear_case":"Bad","key_risks":["Risk A"],"do_not_enter_if":["Cond X"],"invalidation_condition":"Below MA","target_review":{"conservative_target_is_reasonable":true,"base_target_is_reasonable":true,"bull_target_is_reasonable":false,"comment":"OK"},"stop_review":{"stop_is_reasonable":true,"comment":"OK"},"score_adjustments":{"opportunity":3,"entry_timing":-2,"risk":0,"conviction":5,"reason":"Slight adjust"},"final_comment":"OK"}') as ReasoningOutput;
  
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
  it("detects non-object input", () => {
    expect(validateSchema("nope", REASONING_SCHEMA)).not.toBeNull();
  });
});

describe("CRITIC_SCHEMA", () => {
  it("passes valid critic output", () => {
    expect(validateSchema({ critic_pass: true, major_concerns: [], required_downgrade: false, downgrade_to: null, reason: "OK" }, CRITIC_SCHEMA)).toBeNull();
  });
});

describe("extractJson", () => {
  it("parses plain JSON", () => expect(extractJson('{"a":1}')).toEqual({ a: 1 }));
  it("extracts from markdown fence", () => expect(extractJson('```json\n{"k":"v"}\n```')).toEqual({ k: "v" }));
  it("returns null for non-JSON", () => expect(extractJson("hello")).toBeNull());
});

describe("prompts", () => {
  const snap: LlmInputSnapshot = { symbol: "7203.T", symbolName: "Toyota", scores: { opportunity: 72, entryTiming: 65, risk: 40, conviction: 70, finalEntry: 78 }, strategyTags: ["trend_follow"], layers: { market: { layerName: "market", scopeKey: "JP_MARKET", condition: "bullish", trend: "improving", strength: 68, risk: 45, confidence: 75, impact: "upgrade", reason: "OK" } }, dataConfidence: 85, eventBlockerActive: false };
  it("builds reasoning prompt", () => {
    expect(buildReasoningPrompt(snap)).toContain("7203.T");
  });
  it("builds critic prompt", () => {
    const r: ReasoningOutput = { action_suggestion: "entry_candidate", confidence: 72, bull_case: "OK", bear_case: "Risk", key_risks: ["R"], do_not_enter_if: ["C"], invalidation_condition: "x", target_review: { conservative_target_is_reasonable: true, base_target_is_reasonable: true, bull_target_is_reasonable: true, comment: "OK" }, stop_review: { stop_is_reasonable: true, comment: "OK" }, score_adjustments: { opportunity: 0, entry_timing: 0, risk: 0, conviction: 0, reason: "" }, final_comment: "OK" };
    expect(buildCriticPrompt(r, snap)).toContain("Critic");
  });
});
