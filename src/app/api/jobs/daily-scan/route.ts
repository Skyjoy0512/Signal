import { NextResponse } from "next/server";
import { runMockScan } from "@/lib/mock/provider";

export async function POST() {
  try {
    const result = await runMockScan();

    return NextResponse.json({
      success: true,
      date: result.context.date,
      summary: {
        strong: result.strongSignals.length,
        entry: result.entryCandidates.length,
        watch: result.watchList.length,
        avoided: result.avoided.length,
        storylines: result.storylineSets.length,
      },
      errors: result.errors,
    });
  } catch {
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
