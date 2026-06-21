import { NextRequest, NextResponse } from "next/server";
import { runMockScan } from "@/lib/mock/provider";
import { generateExternalPack } from "@/lib/security/external-pack";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  try {
    const result = await runMockScan();
    const target = symbol
      ? result.scoredSymbols.find((s) => s.symbol.symbol === symbol)
      : result.strongSignals[0] ?? result.entryCandidates[0] ?? result.scoredSymbols[0];

    if (!target) return NextResponse.json({ error: "No signal data" }, { status: 404 });

    const pack = generateExternalPack(target, null, { anonymize: true, includeScores: true, includeScenario: true, includeLlmAnalysis: false });

    return new NextResponse(pack, {
      headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="signal-analysis-${target.symbol.symbol}.md"` },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate pack" }, { status: 500 });
  }
}
