"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Database, Search } from "lucide-react";
import type { EnrichedCompany, IndustrySummary } from "@/lib/fundamentals/provider";
import { ScoreRing, StatusPill } from "@/components/visual-primitives";

export function CompanySearchView({
  companies,
  industries,
  sourceLabel,
}: {
  companies: EnrichedCompany[];
  industries: IndustrySummary[];
  sourceLabel: string;
}) {
  const [query, setQuery] = useState("");
  const activeIndustryCount = useMemo(() => industries.filter((industry) => industry.count > 0).length, [industries]);
  const filtered = companies.filter((company) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [
      company.name,
      company.ticker,
      company.industry,
      company.themeTags.join(" "),
      company.description,
    ].some((value) => value.toLowerCase().includes(q));
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">企業検索</h1>
        <p className="page-subtitle">会社名、銘柄コード、業種、事業キーワードから企業を探します。</p>
        <p className="meaning-note">
          データソース: {sourceLabel}。Supabase銘柄マスターが有効なら自動でそちらを読み、未設定時はデモデータにフォールバックします。
        </p>
      </div>

      <div className="grid-stats" style={{ marginBottom: 14 }}>
        <SourceCard label="収録銘柄" value={`${companies.length}社`} sub="検索対象ユニバース" />
        <SourceCard label="収録業界" value={`${activeIndustryCount}業界`} sub="銘柄が紐づく東証33業種" />
        <SourceCard label="表示件数" value={`${filtered.length}件`} sub="現在の検索条件" />
        <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div className="stat-label">カバレッジ</div>
            <div className="stat-value stat-value-sm">{Math.round((activeIndustryCount / 33) * 100)}%</div>
            <div className="stat-sub">33業種ベース</div>
          </div>
          <ScoreRing value={(activeIndustryCount / 33) * 100} label="業界" />
        </div>
      </div>

      <div className="card search-panel">
        <label className="search-field">
          <Search size={18} style={{ color: "var(--color-edge-ash)" }} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="例: 半導体、医薬品、7203、トヨタ"
          />
        </label>
      </div>

      <div className="card data-table">
        <div className="company-table-head">
          {["企業", "業種", "売上", "営業利益率", "ROE", "詳細"].map((label) => <div key={label} className="stat-label">{label}</div>)}
        </div>
        {filtered.map((company) => (
          <div key={company.ticker} className="company-table-row">
            <div className="company-cell-main">
              <span className="semantic-icon"><Building2 size={18} /></span>
              <div>
                <div className="company-name">{company.name}</div>
                <div className="font-mono" style={{ fontSize: 12, color: "var(--color-muted-clay)" }}>{company.ticker} · {company.market}</div>
              </div>
            </div>
            <div className="company-table-cell"><span className="company-table-label">業種</span>{company.industry}</div>
            <div className="company-table-cell font-mono"><span className="company-table-label">売上</span>{company.latest.revenue.toLocaleString()}</div>
            <div className="company-table-cell"><span className="company-table-label">営業利益率</span><StatusPill value={company.latest.operatingMargin * 5} label={`${company.latest.operatingMargin}%`} /></div>
            <div className="company-table-cell"><span className="company-table-label">ROE</span><StatusPill value={company.latest.roe * 5} label={`${company.latest.roe}%`} /></div>
            <div className="company-table-cell"><span className="company-table-label">詳細</span><Link className="link" href={`/companies/${encodeURIComponent(company.ticker)}`}>企業詳細</Link></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SourceCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="semantic-icon"><Database size={18} /></span>
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value stat-value-sm">{value}</div>
        </div>
      </div>
      <div className="stat-sub" style={{ marginTop: 8 }}>{sub}</div>
    </div>
  );
}
