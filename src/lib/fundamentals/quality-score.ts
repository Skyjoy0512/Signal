import type { EnrichedCompany } from "./provider";

export interface CompanyQualityView {
  qualityScore: number;
  judgement: "優先確認" | "比較対象" | "慎重確認";
  valuationNote: string;
}

export interface PeerComparisonSummary {
  sameIndustry: boolean;
  industryLabel: string;
  warning: string | null;
  medians: {
    roe: number;
    operatingMargin: number;
    per: number;
    pbr: number;
  };
}

export function qualityScore(company: EnrichedCompany): number {
  const profitability = scoreRange(company.latest.roe, 4, 18);
  const margin = scoreRange(company.latest.operatingMargin, 4, 18);
  const valuationDiscipline = inverseScoreRange(company.metrics.per, 12, 45);
  return clamp(Math.round(profitability * 0.42 + margin * 0.34 + valuationDiscipline * 0.24));
}

export function qualityView(company: EnrichedCompany): CompanyQualityView {
  const score = qualityScore(company);
  return {
    qualityScore: score,
    judgement: score >= 70 ? "優先確認" : score >= 50 ? "比較対象" : "慎重確認",
    valuationNote: valuationNote(company),
  };
}

export function buildPeerComparisonSummary(companies: EnrichedCompany[]): PeerComparisonSummary {
  const industryCodes = new Set(companies.map((company) => company.industryCode).filter(Boolean));
  const sameIndustry = industryCodes.size <= 1;
  return {
    sameIndustry,
    industryLabel: sameIndustry ? companies[0]?.industry ?? "同業種" : "複数業種",
    warning: sameIndustry ? null : "比較条件が揃っていません。PER/PBRや利益率は業種差を前提に確認してください。",
    medians: {
      roe: median(companies.map((company) => company.latest.roe)),
      operatingMargin: median(companies.map((company) => company.latest.operatingMargin)),
      per: median(companies.map((company) => company.metrics.per)),
      pbr: median(companies.map((company) => company.metrics.pbr)),
    },
  };
}

export function medianDelta(value: number, medianValue: number): string {
  const delta = Math.round((value - medianValue) * 10) / 10;
  if (Math.abs(delta) < 0.1) return "中央値並み";
  return `${delta > 0 ? "+" : ""}${delta}`;
}

function valuationNote(company: EnrichedCompany): string {
  const per = company.metrics.per;
  const pbr = company.metrics.pbr;
  if (per >= 45 || pbr >= 5) return "バリュエーション確認要";
  if (per <= 12 && pbr <= 1.2) return "低倍率だが理由確認";
  return "倍率は比較確認";
}

function scoreRange(value: number, low: number, high: number): number {
  if (high <= low) return 50;
  return clamp(Math.round(((value - low) / (high - low)) * 100));
}

function inverseScoreRange(value: number, low: number, high: number): number {
  return 100 - scoreRange(value, low, high);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return Math.round(value * 10) / 10;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}
