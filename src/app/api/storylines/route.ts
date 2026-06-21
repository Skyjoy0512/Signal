import { NextRequest, NextResponse } from "next/server";
import { runMockScan } from "@/lib/mock/provider";
import { getStorylineHistory } from "@/lib/supabase/repository";
import { storylineSetFromRows } from "@/lib/storylines";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim() || undefined;
  const source = req.nextUrl.searchParams.get("source") ?? "mock";
  const limit = parseLimit(req.nextUrl.searchParams.get("limit"));

  try {
    if (source === "db") {
      const rows = await getStorylineHistory({ symbol, limit });
      return NextResponse.json({
        source: "db",
        symbol: symbol ?? null,
        storylines: rows.map((row) => storylineSetFromRows(row.set, row.scenarios)),
      });
    }

    const result = await runMockScan();
    const storylines = result.storylineSets
      .filter((storyline) => !symbol || storyline.symbol === symbol)
      .slice(0, limit);

    return NextResponse.json({
      source: "mock",
      symbol: symbol ?? null,
      date: result.context.date,
      storylines,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load storylines" },
      { status: 500 },
    );
  }
}

function parseLimit(value: string | null): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 20;
  return Math.min(Math.round(n), 100);
}
