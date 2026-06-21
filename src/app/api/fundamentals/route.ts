import { NextResponse } from "next/server";
import { getFundamentalDataset } from "@/lib/fundamentals/provider";

export async function GET() {
  try {
    const dataset = await getFundamentalDataset();
    return NextResponse.json({
      source: dataset.source,
      sourceLabel: dataset.sourceLabel,
      generatedAt: dataset.generatedAt,
      companies: dataset.companies,
      industries: dataset.industries,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load fundamentals" },
      { status: 500 },
    );
  }
}
