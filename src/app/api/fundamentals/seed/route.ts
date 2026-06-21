import { NextResponse } from "next/server";
import { canUseSupabaseFundamentals, seedMockFundamentalsToSupabase } from "@/lib/fundamentals/importer";

export async function POST(request: Request) {
  if (!canUseSupabaseFundamentals()) {
    return NextResponse.json(
      {
        error: "Supabase is not configured",
        requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "FUNDAMENTALS_SEED_TOKEN"],
      },
      { status: 400 },
    );
  }

  const seedToken = process.env.FUNDAMENTALS_SEED_TOKEN;
  if (!seedToken) {
    return NextResponse.json(
      { error: "FUNDAMENTALS_SEED_TOKEN is required before seeding data" },
      { status: 400 },
    );
  }

  const auth = request.headers.get("authorization") ?? "";
  const headerToken = request.headers.get("x-seed-token");
  const bearerToken = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
  if (headerToken !== seedToken && bearerToken !== seedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await seedMockFundamentalsToSupabase();
    return NextResponse.json({
      success: true,
      mode: "mock_fundamentals_seed",
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to seed fundamentals" },
      { status: 500 },
    );
  }
}
