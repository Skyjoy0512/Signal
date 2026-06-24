import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/api/auth";
import { errorResponse } from "@/lib/api/response";
import { runMockScan } from "@/lib/mock/provider";
import { generateExternalPack } from "@/lib/security/external-pack";

export async function GET(req: NextRequest) {
  const unauthorized = requireAdminRequest(req);
  if (unauthorized) return unauthorized;
  const symbol = req.nextUrl.searchParams.get("symbol");
  return generatePackResponse(symbol);
}

export async function POST(req: NextRequest) {
  const unauthorized = requireAdminRequest(req);
  if (unauthorized) return unauthorized;
  const body = await req.json().catch(() => ({}));
  const symbol = typeof body.symbol === "string" ? body.symbol : null;
  return generatePackResponse(symbol);
}

async function generatePackResponse(symbol: string | null) {
  try {
    const result = await runMockScan();
    const target = symbol
      ? result.scoredSymbols.find((s) => s.symbol.symbol === symbol)
      : result.strongSignals[0] ?? result.entryCandidates[0] ?? result.scoredSymbols[0];

    if (!target) return errorResponse("signal_data_not_found", "No signal data", 404);

    const pack = generateExternalPack(target, null, { anonymize: true, includeScores: true, includeScenario: true, includeLlmAnalysis: false });

    return new NextResponse(pack, {
      headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="signal-analysis-${target.symbol.symbol}.md"` },
    });
  } catch {
    return errorResponse("external_pack_failed", "Failed to generate pack", 500);
  }
}
