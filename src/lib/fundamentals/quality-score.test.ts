import { describe, expect, it } from "vitest";
import type { EnrichedCompany } from "./provider";
import { buildPeerComparisonSummary, medianDelta, qualityScore, qualityView } from "./quality-score";

function company(overrides: Partial<EnrichedCompany> = {}): EnrichedCompany {
  return {
    id: "sym-1",
    ticker: "7203.T",
    name: "Toyota",
    market: "prime",
    exchange: "TSE",
    industry: "自動車",
    industryCode: "3700",
    themeTags: [],
    description: "test company",
    fiscalMonth: 3,
    latest: {
      year: "2026E",
      revenue: 1000,
      operatingIncome: 120,
      netIncome: 80,
      assets: 2000,
      equity: 1000,
      liabilities: 1000,
      operatingCashFlow: 100,
      roe: 12,
      operatingMargin: 12,
    },
    metrics: {
      ticker: "7203.T",
      stockPrice: 3000,
      marketCap: 10000,
      enterpriseValue: 11000,
      per: 18,
      pbr: 1.5,
      evEbitda: 8,
      psr: 1,
      dividendYield: 2,
      roe: 12,
      roic: 10,
      roa: 5,
    },
    ...overrides,
  };
}

describe("fundamental quality score", () => {
  it("scores profitable and disciplined valuation companies higher", () => {
    const strong = company({ latest: { ...company().latest, roe: 22, operatingMargin: 21 }, metrics: { ...company().metrics, per: 16, pbr: 1.4 } });
    const stretched = company({ latest: { ...company().latest, roe: 6, operatingMargin: 5 }, metrics: { ...company().metrics, per: 60, pbr: 6 } });
    expect(qualityScore(strong)).toBeGreaterThan(qualityScore(stretched));
    expect(qualityView(stretched).valuationNote).toBe("バリュエーション確認要");
  });

  it("detects mixed-industry comparisons", () => {
    const summary = buildPeerComparisonSummary([
      company({ industryCode: "3700", industry: "自動車" }),
      company({ ticker: "8035.T", industryCode: "3650", industry: "半導体", latest: { ...company().latest, roe: 20 }, metrics: { ...company().metrics, per: 35 } }),
    ]);
    expect(summary.sameIndustry).toBe(false);
    expect(summary.warning).toContain("比較条件が揃っていません");
  });

  it("formats median deltas", () => {
    expect(medianDelta(14.2, 12)).toBe("+2.2");
    expect(medianDelta(11.9, 12)).toBe("-0.1");
    expect(medianDelta(12, 12)).toBe("中央値並み");
  });
});
