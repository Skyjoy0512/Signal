export const REASONING_SCHEMA = {
  type: "object",
  required: ["action_suggestion","confidence","bull_case","bear_case","key_risks","do_not_enter_if","invalidation_condition","target_review","stop_review","score_adjustments","evidence_refs","final_comment"],
  additionalProperties: false,
  properties: {
    action_suggestion: { type: "string", enum: ["strong_entry_candidate","entry_candidate","watch","wait_for_pullback","avoid"] },
    confidence: { type: "number", minimum: 0, maximum: 100 },
    bull_case: { type: "string", minLength: 1, maxLength: 2000 },
    bear_case: { type: "string", minLength: 1, maxLength: 2000 },
    key_risks: { type: "array", maxItems: 8, items: { type: "string", minLength: 1, maxLength: 240 } },
    do_not_enter_if: { type: "array", maxItems: 8, items: { type: "string", minLength: 1, maxLength: 240 } },
    invalidation_condition: { type: "string", minLength: 1, maxLength: 500 },
    target_review: { type: "object", required: ["conservative_target_is_reasonable","base_target_is_reasonable","bull_target_is_reasonable","comment"], additionalProperties: false, properties: { conservative_target_is_reasonable: { type: "boolean" }, base_target_is_reasonable: { type: "boolean" }, bull_target_is_reasonable: { type: "boolean" }, comment: { type: "string", maxLength: 800 } } },
    stop_review: { type: "object", required: ["stop_is_reasonable","comment"], additionalProperties: false, properties: { stop_is_reasonable: { type: "boolean" }, comment: { type: "string", maxLength: 800 } } },
    score_adjustments: { type: "object", required: ["opportunity","entry_timing","risk","conviction","reason"], additionalProperties: false, properties: { opportunity: { type: "number", minimum: -10, maximum: 10 }, entry_timing: { type: "number", minimum: -10, maximum: 10 }, risk: { type: "number", minimum: -10, maximum: 10 }, conviction: { type: "number", minimum: -10, maximum: 10 }, reason: { type: "string", maxLength: 500 } } },
    evidence_refs: { type: "array", maxItems: 12, items: { type: "object", required: ["type"], additionalProperties: false, properties: { type: { type: "string", enum: ["gate","contribution","scenario","score","feature","layer","decision_reason"] }, key: { type: "string", maxLength: 120 }, component: { type: "string", maxLength: 80 }, feature: { type: "string", maxLength: 120 }, field: { type: "string", maxLength: 120 } } } },
    final_comment: { type: "string", minLength: 1, maxLength: 2000 }
  }
};

export const CRITIC_SCHEMA = {
  type: "object", required: ["critic_pass","major_concerns","required_downgrade","downgrade_to","block_positive_adjustment","reasons","evidence_refs","reason"],
  additionalProperties: false,
  properties: {
    critic_pass: { type: "boolean" },
    major_concerns: { type: "array", maxItems: 8, items: { type: "string", minLength: 1, maxLength: 240 } },
    required_downgrade: { type: "boolean" },
    downgrade_to: { enum: ["entry_candidate","watch","avoid",null] },
    block_positive_adjustment: { type: "boolean" },
    reasons: { type: "array", maxItems: 8, items: { type: "string", minLength: 1, maxLength: 240 } },
    evidence_refs: { type: "array", maxItems: 12, items: { type: "object", required: ["type"], additionalProperties: false, properties: { type: { type: "string", enum: ["gate","contribution","scenario","score","feature","layer","decision_reason"] }, key: { type: "string", maxLength: 120 }, component: { type: "string", maxLength: 80 }, feature: { type: "string", maxLength: 120 }, field: { type: "string", maxLength: 120 } } } },
    reason: { type: "string", minLength: 1, maxLength: 1000 },
  }
};

interface PropSchema {
  type?: string | string[];
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  maxItems?: number;
  required?: string[];
  properties?: Record<string, PropSchema>;
  items?: PropSchema;
  additionalProperties?: boolean;
}
interface SchemaDef {
  type?: string;
  required?: string[];
  properties?: Record<string, PropSchema>;
  additionalProperties?: boolean;
}

export function validateSchema(data: unknown, schema: SchemaDef, path: string = ""): string[] | null {
  const errors: string[] = [];
  if (typeof data !== "object" || data === null) return [`${path || "root"}: not an object`];
  const obj = data as Record<string, unknown>;
  if (schema.required) for (const key of schema.required) if (!(key in obj)) errors.push(`${path}.${key}: missing`);
  if (schema.additionalProperties === false && schema.properties) {
    for (const key of Object.keys(obj)) {
      if (!(key in schema.properties)) errors.push(`${path ? `${path}.` : ""}${key}: unexpected property`);
    }
  }
  if (schema.properties) for (const [key, ps] of Object.entries(schema.properties)) {
    if (!(key in obj)) continue;
    const v = obj[key], vp = path ? `${path}.${key}` : key;
    if (ps.type === "array" && !Array.isArray(v)) errors.push(`${vp}: expected array`);
    else if (ps.type === "number" && typeof v !== "number") errors.push(`${vp}: expected number`);
    else if (ps.type === "string" && typeof v !== "string") errors.push(`${vp}: expected string`);
    else if (ps.type === "boolean" && typeof v !== "boolean") errors.push(`${vp}: expected boolean`);
    if (ps.enum && !ps.enum.includes(v)) errors.push(`${vp}: not in enum`);
    if (ps.minimum !== undefined && typeof v === "number" && v < ps.minimum) errors.push(`${vp}: below min`);
    if (ps.maximum !== undefined && typeof v === "number" && v > ps.maximum) errors.push(`${vp}: above max`);
    if (ps.minLength !== undefined && typeof v === "string" && v.length < ps.minLength) errors.push(`${vp}: below min length`);
    if (ps.maxLength !== undefined && typeof v === "string" && v.length > ps.maxLength) errors.push(`${vp}: above max length`);
    if (ps.maxItems !== undefined && Array.isArray(v) && v.length > ps.maxItems) errors.push(`${vp}: too many items`);
    if (Array.isArray(v) && ps.items) {
      for (let i = 0; i < v.length; i++) {
        errors.push(...validateValue(v[i], ps.items, `${vp}[${i}]`));
      }
    }
    if (ps.type === "object" && typeof v === "object" && v !== null && !Array.isArray(v) && ps.properties) {
      const nested = validateSchema(v, ps as SchemaDef, vp); if (nested) errors.push(...nested);
    }
  }
  errors.push(...validateSemanticRules(obj, schema, path));
  return errors.length > 0 ? errors : null;
}

function validateValue(value: unknown, schema: PropSchema, path: string): string[] {
  const errors: string[] = [];
  if (schema.type === "array" && !Array.isArray(value)) errors.push(`${path}: expected array`);
  else if (schema.type === "number" && typeof value !== "number") errors.push(`${path}: expected number`);
  else if (schema.type === "string" && typeof value !== "string") errors.push(`${path}: expected string`);
  else if (schema.type === "boolean" && typeof value !== "boolean") errors.push(`${path}: expected boolean`);
  else if (schema.type === "object" && (typeof value !== "object" || value === null || Array.isArray(value))) errors.push(`${path}: expected object`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: not in enum`);
  if (schema.minimum !== undefined && typeof value === "number" && value < schema.minimum) errors.push(`${path}: below min`);
  if (schema.maximum !== undefined && typeof value === "number" && value > schema.maximum) errors.push(`${path}: above max`);
  if (schema.minLength !== undefined && typeof value === "string" && value.length < schema.minLength) errors.push(`${path}: below min length`);
  if (schema.maxLength !== undefined && typeof value === "string" && value.length > schema.maxLength) errors.push(`${path}: above max length`);
  if (schema.maxItems !== undefined && Array.isArray(value) && value.length > schema.maxItems) errors.push(`${path}: too many items`);
  if (Array.isArray(value) && schema.items) {
    for (let i = 0; i < value.length; i++) errors.push(...validateValue(value[i], schema.items, `${path}[${i}]`));
  }
  if (schema.type === "object" && typeof value === "object" && value !== null && !Array.isArray(value) && schema.properties) {
    const nested = validateSchema(value, schema as SchemaDef, path);
    if (nested) errors.push(...nested);
  }
  return errors;
}

function validateSemanticRules(obj: Record<string, unknown>, schema: SchemaDef, path: string): string[] {
  if (schema === REASONING_SCHEMA) return validateReasoningSemantics(obj, path);
  if (schema === CRITIC_SCHEMA) return validateCriticSemantics(obj, path);
  return [];
}

function validateReasoningSemantics(obj: Record<string, unknown>, path: string): string[] {
  const errors: string[] = [];
  const prefix = path ? `${path}.` : "";
  const action = obj.action_suggestion;
  const confidence = obj.confidence;
  const adjustments = obj.score_adjustments;
  if (action === "strong_entry_candidate" && typeof confidence === "number" && confidence < 70) {
    errors.push(`${prefix}action_suggestion: strong entry requires confidence >= 70`);
  }
  if (typeof confidence === "number" && confidence < 50 && hasNonZeroScoreAdjustment(adjustments)) {
    errors.push(`${prefix}score_adjustments: low confidence output must not adjust numeric scores`);
  }
  if ((action === "strong_entry_candidate" || action === "entry_candidate") && !hasEvidenceRefs(obj.evidence_refs)) {
    errors.push(`${prefix}evidence_refs: entry-oriented action requires evidence references`);
  }
  if (hasNonZeroScoreAdjustment(adjustments) && !hasEvidenceRefs(obj.evidence_refs)) {
    errors.push(`${prefix}evidence_refs: score adjustments require evidence references`);
  }
  return errors;
}

function validateCriticSemantics(obj: Record<string, unknown>, path: string): string[] {
  const errors: string[] = [];
  const prefix = path ? `${path}.` : "";
  if (obj.required_downgrade === true && obj.downgrade_to == null) {
    errors.push(`${prefix}downgrade_to: required when required_downgrade is true`);
  }
  if (obj.critic_pass === false && Array.isArray(obj.major_concerns) && obj.major_concerns.length === 0) {
    errors.push(`${prefix}major_concerns: required when critic_pass is false`);
  }
  if ((obj.required_downgrade === true || obj.block_positive_adjustment === true) && !hasEvidenceRefs(obj.evidence_refs)) {
    errors.push(`${prefix}evidence_refs: critical critic action requires evidence references`);
  }
  return errors;
}

function hasNonZeroScoreAdjustment(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const adjustments = value as Record<string, unknown>;
  return ["opportunity", "entry_timing", "risk", "conviction"].some((key) => {
    const n = adjustments[key];
    return typeof n === "number" && n !== 0;
  });
}

function hasEvidenceRefs(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

export function extractJson(text: string): unknown | null {
  try { return JSON.parse(text); } catch { /* empty */ }
  const fm = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fm) try { return JSON.parse(fm[1].trim()); } catch { /* empty */ }
  const bm = text.match(/\{[\s\S]*\}/);
  if (bm) try { return JSON.parse(bm[0]); } catch { /* empty */ }
  return null;
}
