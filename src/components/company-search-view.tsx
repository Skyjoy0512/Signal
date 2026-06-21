"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
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

      <div className="image-context-grid">
        <ContextCard
          title="企業名で探す"
          copy="社名や証券コードから、詳細画面へすばやく移動します"
          image="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900&q=80&fit=crop"
        />
        <ContextCard
          title="業界から入る"
          copy="同業比較を前提に、規模・収益性・割高度を確認します"
          image="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&q=80&fit=crop"
        />
        <ContextCard
          title="事業テーマで広げる"
          copy="半導体、医薬品、銀行などのキーワードで候補を広げます"
          image="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&q=80&fit=crop"
        />
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
          <span className="search-count">{filtered.length}件</span>
          {query && <button type="button" className="search-clear" onClick={() => setQuery("")}>クリア</button>}
        </label>
      </div>

      <div className="card data-table">
        <div className="company-table-head">
          {["企業", "業種", "売上", "営業利益率", "ROE", "詳細"].map((label) => <div key={label} className="stat-label">{label}</div>)}
        </div>
        {filtered.length === 0 && (
          <div className="empty-state empty-state-compact">
            <div>
              <h2>該当する企業がありません</h2>
              <p>銘柄コード、業種、事業キーワードを短くして再検索してください。</p>
            </div>
          </div>
        )}
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

function ContextCard({ title, copy, image }: { title: string; copy: string; image: string }) {
  return (
    <div className="context-card" style={{ "--context-image": `url(${image})` } as CSSProperties}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
        <div style={{ color: "#dfe8dc", fontSize: 12, lineHeight: 1.55, marginTop: 5 }}>{copy}</div>
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
