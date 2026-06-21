export const REASONING_SCHEMA = {
  type: "object",
  required: ["action_suggestion","confidence","bull_case","bear_case","key_risks","do_not_enter_if","invalidation_condition","target_review","stop_review","score_adjustments","final_comment"],
  properties: {
    action_suggestion: { type: "string", enum: ["strong_entry_candidate","entry_candidate","watch","wait_for_pullback","avoid"] },
    confidence: { type: "number", minimum: 0, maximum: 100 },
    bull_case: { type: "string" }, bear_case: { type: "string" },
    key_risks: { type: "array", items: { type: "string" } },
    do_not_enter_if: { type: "array", items: { type: "string" } },
    invalidation_condition: { type: "string" },
    target_review: { type: "object", required: ["conservative_target_is_reasonable","base_target_is_reasonable","bull_target_is_reasonable","comment"], properties: { conservative_target_is_reasonable: { type: "boolean" }, base_target_is_reasonable: { type: "boolean" }, bull_target_is_reasonable: { type: "boolean" }, comment: { type: "string" } } },
    stop_review: { type: "object", required: ["stop_is_reasonable","comment"], properties: { stop_is_reasonable: { type: "boolean" }, comment: { type: "string" } } },
    score_adjustments: { type: "object", required: ["opportunity","entry_timing","risk","conviction","reason"], properties: { opportunity: { type: "number", minimum: -10, maximum: 10 }, entry_timing: { type: "number", minimum: -10, maximum: 10 }, risk: { type: "number", minimum: -10, maximum: 10 }, conviction: { type: "number", minimum: -10, maximum: 10 }, reason: { type: "string" } } },
    final_comment: { type: "string" }
  }
};

export const CRITIC_SCHEMA = {
  type: "object", required: ["critic_pass","major_concerns","required_downgrade","downgrade_to","reason"],
  properties: { critic_pass: { type: "boolean" }, major_concerns: { type: "array", items: { type: "string" } }, required_downgrade: { type: "boolean" }, downgrade_to: { enum: ["entry_candidate","watch","avoid",null] }, reason: { type: "string" } }
};

interface PropSchema { type?: string | string[]; enum?: unknown[]; minimum?: number; maximum?: number; required?: string[]; properties?: Record<string, PropSchema>; items?: PropSchema; }
interface SchemaDef { type?: string; required?: string[]; properties?: Record<string, PropSchema>; }

export function validateSchema(data: unknown, schema: SchemaDef, path: string = ""): string[] | null {
  const errors: string[] = [];
  if (typeof data !== "object" || data === null) return [`${path || "root"}: not an object`];
  const obj = data as Record<string, unknown>;
  if (schema.required) for (const key of schema.required) if (!(key in obj)) errors.push(`${path}.${key}: missing`);
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
    if (ps.type === "object" && typeof v === "object" && v !== null && !Array.isArray(v) && ps.properties) {
      const nested = validateSchema(v, ps as SchemaDef, vp); if (nested) errors.push(...nested);
    }
  }
  return errors.length > 0 ? errors : null;
}

export function extractJson(text: string): unknown | null {
  try { return JSON.parse(text); } catch { /* empty */ }
  const fm = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fm) try { return JSON.parse(fm[1].trim()); } catch { /* empty */ }
  const bm = text.match(/\{[\s\S]*\}/);
  if (bm) try { return JSON.parse(bm[0]); } catch { /* empty */ }
  return null;
}
