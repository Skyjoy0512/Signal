import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/api/auth";
import { errorResponse } from "@/lib/api/response";
import { runMockScan } from "@/lib/mock/provider";

export async function POST(request: Request) {
  const unauthorized = requireAdminRequest(request);
  if (unauthorized) return unauthorized;
  try {
    const result = await runMockScan();

    return NextResponse.json({
      ok: true,
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
    return errorResponse("daily_scan_failed", "Scan failed", 500);
  }
}
