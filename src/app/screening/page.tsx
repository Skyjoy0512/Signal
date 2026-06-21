"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, Database, Filter, Save } from "lucide-react";
import type { EnrichedCompany, IndustrySummary } from "@/lib/fundamentals/provider";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/visual-primitives";

export default function ScreeningPage() {
  const [rows, setRows] = useState<EnrichedCompany[]>([]);
  const [industries, setIndustries] = useState<IndustrySummary[]>([]);
  const [sourceLabel, setSourceLabel] = useState("読み込み中");
  const [industry, setIndustry] = useState("ALL");
  const [minRevenue, setMinRevenue] = useState(0);
  const [minMargin, setMinMargin] = useState(0);
  const [minRoe, setMinRoe] = useState(0);
  const [maxPer, setMaxPer] = useState(50);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch("/api/fundamentals");
      const data = await response.json() as { companies?: EnrichedCompany[]; industries?: IndustrySummary[]; sourceLabel?: string };
      if (cancelled) return;
      setRows(data.companies ?? []);
      setIndustries(data.industries ?? []);
      setSourceLabel(data.sourceLabel ?? "不明");
    }
    load().catch(() => {
      if (!cancelled) setSourceLabel("読み込み失敗");
    });
    return () => { cancelled = true; };
  }, []);
  const filtered = rows.filter((company) => {
    if (industry !== "ALL" && company.industryCode !== industry) return false;
    if (company.latest.revenue < minRevenue) return false;
    if (company.latest.operatingMargin < minMargin) return false;
    if (company.latest.roe < minRoe) return false;
    if (company.metrics.per > maxPer) return false;
    return true;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">条件検索</h1>
        <p className="page-subtitle">業種、売上、営業利益率、ROE、PERで企業を絞り込みます。</p>
        <p className="meaning-note">データソース: {sourceLabel}</p>
      </div>

      <div className="image-context-grid">
        <ContextCard
          title="数字で絞る"
          copy="売上、利益率、ROE、PERを同じ尺度でフィルタします"
          image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&q=80&fit=crop"
        />
        <ContextCard
          title="業界で探す"
          copy="業種別の地合いや同業比較へ自然につなげます"
          image="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900&q=80&fit=crop"
        />
        <ContextCard
          title="判断順を作る"
          copy="ファクトで絞り、インテリジェンスで深掘り順を決めます"
          image="https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=900&q=80&fit=crop"
        />
      </div>

      <div className="filter-shell">
        <section className="card lane-card">
          <div className="lane-header">
            <div>
              <div className="lane-label"><Database size={14} />ファクト条件</div>
              <h2 className="lane-title">観測データで絞る</h2>
            </div>
            <span className="badge badge-outline">{filtered.length}件</span>
          </div>
          <div className="filter-grid">
            <label><div className="stat-label">業種</div><select value={industry} onChange={(e) => setIndustry(e.target.value)} style={inputStyle}><option value="ALL">すべて</option>{industries.map((row) => <option key={row.code} value={row.code}>{row.name}</option>)}</select></label>
            <NumberFilter label="売上下限" value={minRevenue} onChange={setMinRevenue} />
            <NumberFilter label="営業利益率下限" value={minMargin} onChange={setMinMargin} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <Button variant="outline" size="sm"><Save size={14} />条件保存</Button>
            <Button variant="ghost" size="sm"><Filter size={14} />{filtered.length}件表示</Button>
          </div>
        </section>
        <section className="card lane-card">
          <div className="lane-header">
            <div>
              <div className="lane-label"><Brain size={14} />インテリジェンス条件</div>
              <h2 className="lane-title">質と割高度で並べる</h2>
            </div>
          </div>
          <div className="filter-grid">
            <NumberFilter label="ROE下限" value={minRoe} onChange={setMinRoe} />
            <NumberFilter label="PER上限" value={maxPer} onChange={setMaxPer} />
          </div>
          <p className="meaning-note">ROEは質、PERは割高度の目安です。候補の深掘り順を作るための条件として扱います。</p>
        </section>
      </div>

      <div className="card data-table">
        <div className="company-table-head">
          {["企業", "業種", "売上", "ROE", "PER", "詳細"].map((label) => <div key={label} className="stat-label">{label}</div>)}
        </div>
        {filtered.map((company) => (
          <div key={company.ticker} className="company-table-row">
            <div className="company-cell-main">
              <div>
                <div className="company-name">{company.name}</div>
                <div className="font-mono" style={{ color: "var(--color-muted-clay)", fontSize: 12 }}>{company.ticker}</div>
              </div>
            </div>
            <div className="company-table-cell"><span className="company-table-label">業種</span>{company.industry}</div>
            <div className="company-table-cell font-mono"><span className="company-table-label">売上</span>{company.latest.revenue.toLocaleString()}</div>
            <div className="company-table-cell"><span className="company-table-label">ROE</span><StatusPill value={company.latest.roe * 5} label={`${company.latest.roe}%`} /></div>
            <div className="company-table-cell font-mono"><span className="company-table-label">PER</span>{company.metrics.per}倍</div>
            <div className="company-table-cell"><span className="company-table-label">詳細</span><Link className="link" href={`/companies/${encodeURIComponent(company.ticker)}`}>詳細</Link></div>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle = { width: "100%", border: "1px solid var(--color-border-sand)", borderRadius: 8, padding: "8px 10px", background: "#fff" };

function NumberFilter({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label><div className="stat-label">{label}</div><input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} style={inputStyle} /></label>;
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
