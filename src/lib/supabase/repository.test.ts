import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  builders: [] as MockBuilder[],
  nextRows: [] as unknown[],
  nextSingle: null as unknown,
}));

class MockBuilder {
  table: string;
  calls: Array<{ method: string; args: unknown[] }> = [];

  constructor(table: string) {
    this.table = table;
  }

  insert(payload: unknown) { this.calls.push({ method: "insert", args: [payload] }); return this; }
  upsert(payload: unknown, options?: unknown) { this.calls.push({ method: "upsert", args: [payload, options] }); return this; }
  select(columns?: unknown) { this.calls.push({ method: "select", args: columns === undefined ? [] : [columns] }); return this; }
  single() { this.calls.push({ method: "single", args: [] }); return Promise.resolve({ data: mockState.nextSingle, error: null }); }
  eq(column: string, value: unknown) { this.calls.push({ method: "eq", args: [column, value] }); return this; }
  order(column: string, options?: unknown) { this.calls.push({ method: "order", args: [column, options] }); return this; }
  limit(value: number) { this.calls.push({ method: "limit", args: [value] }); return this; }
  is(column: string, value: unknown) { this.calls.push({ method: "is", args: [column, value] }); return this; }
  then(resolve: (value: { data: unknown[]; error: null }) => void) {
    resolve({ data: mockState.nextRows, error: null });
  }
}

vi.mock("./server", () => ({
  createClient: vi.fn(async () => ({
    from(table: string) {
      const builder = new MockBuilder(table);
      mockState.builders.push(builder);
      return builder;
    },
  })),
}));

import {
  getPriceObservations,
  getReviewEvents,
  getSignalOutcomes,
  insertLlmRun,
  insertPriceObservation,
  insertReviewEvent,
  insertSignalOutcome,
} from "./repository";

afterEach(() => {
  mockState.builders = [];
  mockState.nextRows = [];
  mockState.nextSingle = null;
});

function insertPayload<T extends { id: string; created_at: string }>(row: T): Omit<T, "id" | "created_at"> {
  const { id, created_at, ...input } = row;
  void id;
  void created_at;
  return input;
}

describe("outcome repository mappings", () => {
  it("upserts price observations using the source uniqueness key", async () => {
    const row = { id: "po-1", symbol_id: "sym-1", symbol: "7203.T", observed_at: "2026-06-22T00:00:00.000Z", timeframe: "daily", open: null, high: 3200, low: 3000, close: 3150, adjusted_close: 3150, volume: 1000, source: "yfinance", source_as_of: null, raw_json: null, created_at: "now" };
    mockState.nextSingle = row;
    await expect(insertPriceObservation(insertPayload(row))).resolves.toEqual(row);
    expect(mockState.builders[0].table).toBe("price_observations");
    expect(mockState.builders[0].calls.find((call) => call.method === "upsert")?.args[1]).toEqual({ onConflict: "symbol_id,timeframe,observed_at,source" });
  });

  it("filters price observations by symbol and timeframe", async () => {
    mockState.nextRows = [{ id: "po-1", symbol: "7203.T" }];
    await expect(getPriceObservations({ symbol: "7203.T", timeframe: "daily", limit: 5 })).resolves.toHaveLength(1);
    expect(mockState.builders[0].table).toBe("price_observations");
    expect(mockState.builders[0].calls).toEqual(expect.arrayContaining([
      { method: "eq", args: ["symbol", "7203.T"] },
      { method: "eq", args: ["timeframe", "daily"] },
      { method: "limit", args: [5] },
    ]));
  });

  it("inserts and filters signal outcomes", async () => {
    const row = { id: "out-1", score_snapshot_id: "snap-1", analysis_run_id: null, symbol_id: "sym-1", horizon: "1m", entry_reference_price: 3100, price_at_horizon: null, max_favorable_excursion_pct: null, max_adverse_excursion_pct: null, return_pct: null, benchmark_return_pct: null, excess_return_pct: null, hit_target_base: null, hit_stop: null, rr_realized: null, outcome_label: null, evaluated_at: null, created_at: "now" };
    mockState.nextSingle = row;
    await expect(insertSignalOutcome(insertPayload(row))).resolves.toEqual(row);
    expect(mockState.builders[0].table).toBe("signal_outcomes");

    mockState.builders = [];
    mockState.nextRows = [row];
    await expect(getSignalOutcomes({ scoreSnapshotId: "snap-1", horizon: "1m" })).resolves.toEqual([row]);
    expect(mockState.builders[0].calls).toEqual(expect.arrayContaining([
      { method: "eq", args: ["score_snapshot_id", "snap-1"] },
      { method: "eq", args: ["horizon", "1m"] },
    ]));
  });

  it("inserts and filters unresolved review events", async () => {
    const row = { id: "rev-1", symbol_id: "sym-1", score_snapshot_id: null, storyline_set_id: null, event_type: "risk_worsened", severity: "high", title: "Risk worsened", details_json: { score: 80 }, resolved_at: null, created_at: "now" };
    mockState.nextSingle = row;
    await expect(insertReviewEvent(insertPayload(row))).resolves.toEqual(row);
    expect(mockState.builders[0].table).toBe("review_events");

    mockState.builders = [];
    mockState.nextRows = [row];
    await expect(getReviewEvents({ symbolId: "sym-1", eventType: "risk_worsened", unresolvedOnly: true })).resolves.toEqual([row]);
    expect(mockState.builders[0].calls).toEqual(expect.arrayContaining([
      { method: "eq", args: ["symbol_id", "sym-1"] },
      { method: "eq", args: ["event_type", "risk_worsened"] },
      { method: "is", args: ["resolved_at", null] },
    ]));
  });

  it("inserts extended LLM run metadata", async () => {
    const row = {
      id: "llm-1",
      task_type: "analysis",
      run_role: "reasoning",
      status: "completed",
      input_snapshot_json: { symbol: "7203.T" },
      output_json: { action_suggestion: "watch" },
      input_tokens: 100,
      output_tokens: 50,
      estimated_cost: 0.001,
      latency_ms: 1200,
      error_message: null,
      provider: "deepseek",
      model: "deepseek-chat",
      prompt_version: "llm-prompts-v1",
      schema_version: "analysis-input-v1",
      temperature: 0.3,
      max_tokens: 4096,
      repair_attempt_count: 0,
      critic_enabled: true,
      finish_reason: "stop",
      estimated_cost_usd: 0.001,
      request_id: "chatcmpl-1",
      input_hash: "abc",
      output_hash: "def",
      created_at: "now",
    };
    mockState.nextSingle = row;
    await expect(insertLlmRun(insertPayload(row))).resolves.toEqual(row);
    expect(mockState.builders[0].table).toBe("llm_runs");
    const payload = mockState.builders[0].calls.find((call) => call.method === "insert")?.args[0];
    expect(payload).toMatchObject({
      provider: "deepseek",
      model: "deepseek-chat",
      prompt_version: "llm-prompts-v1",
      repair_attempt_count: 0,
      input_hash: "abc",
      output_hash: "def",
    });
  });
});

describe("0007 outcome migration", () => {
  it("creates outcome tables with service role RLS policies", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/0007_analysis_outcomes.sql"), "utf8");
    for (const table of ["price_observations", "signal_outcomes", "storyline_outcomes", "storyline_revisions", "user_decisions", "review_events", "data_quality_observations"]) {
      expect(sql).toContain(`create table if not exists public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`grant select, insert, update, delete on table public.${table} to service_role`);
      expect(sql).toContain(`'${table}'`);
    }
    expect(sql).toContain("policy_name := table_name || '_service_role_all'");
    expect(sql).toContain("for all to service_role using (true) with check (true)");
    expect(sql).toContain("score_engine_version");
    expect(sql).toContain("scenario_probability_method");
    expect(sql).toContain("alter table public.llm_runs");
    expect(sql).toContain("repair_attempt_count");
    expect(sql).toContain("input_hash");
  });
});

describe("migration security posture", () => {
  it("uses unique migration version prefixes", () => {
    const migrationDir = join(process.cwd(), "supabase/migrations");
    const versions = migrationFiles(migrationDir).map((file) => file.split("_")[0]);
    expect(new Set(versions).size).toBe(versions.length);
  });

  it("uses explicit service_role policies and grants for public tables", () => {
    const migrationDir = join(process.cwd(), "supabase/migrations");
    const files = migrationFiles(migrationDir);

    for (const file of files) {
      const sql = readFileSync(join(migrationDir, file), "utf8");
      expect(sql).not.toContain("auth.role()");
      const tableMatches = [...sql.matchAll(/create table if not exists public\.([a-z_]+)/g)].map((match) => match[1]);
      for (const table of tableMatches) {
        expect(sql).toContain(`alter table public.${table} enable row level security`);
        expect(sql).toContain(`grant select, insert, update, delete on table public.${table} to service_role`);
      }
    }
  });

  it("does not reference public tables before they are created in migration order", () => {
    const migrationDir = join(process.cwd(), "supabase/migrations");
    const created = new Set<string>();

    for (const file of migrationFiles(migrationDir)) {
      const sql = readFileSync(join(migrationDir, file), "utf8");
      const events = [
        ...[...sql.matchAll(/create table if not exists public\.([a-z_]+)/g)].map((match) => ({ index: match.index ?? 0, type: "create" as const, table: match[1] })),
        ...[...sql.matchAll(/references public\.([a-z_]+)/g)].map((match) => ({ index: match.index ?? 0, type: "reference" as const, table: match[1] })),
      ].sort((a, b) => a.index - b.index);

      for (const event of events) {
        if (event.type === "create") {
          created.add(event.table);
        } else {
          expect(created.has(event.table), `${file} references public.${event.table} before it is created`).toBe(true);
        }
      }
    }
  });

  it("creates every Supabase table used by application code", () => {
    const migrationDir = join(process.cwd(), "supabase/migrations");
    const sourceDirs = ["src/lib", "src/app", "scripts"];
    const migrationSql = migrationFiles(migrationDir)
      .map((file) => readFileSync(join(migrationDir, file), "utf8"))
      .join("\n");
    const createdTables = new Set([...migrationSql.matchAll(/create table if not exists public\.([a-z_]+)/g)].map((match) => match[1]));
    const usedTables = new Set<string>();

    for (const dir of sourceDirs) {
      for (const file of sourceFiles(join(process.cwd(), dir))) {
        const source = readFileSync(file, "utf8");
        for (const match of source.matchAll(/\bfrom\("([a-z_]+)"\)/g)) {
          usedTables.add(match[1]);
        }
      }
    }

    expect([...usedTables].sort()).toEqual([...usedTables].filter((table) => createdTables.has(table)).sort());
  });
});

function migrationFiles(migrationDir: string): string[] {
  return readdirSync(migrationDir).filter((file) => file.endsWith(".sql")).sort();
}

function sourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    return /\.(mjs|ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}
