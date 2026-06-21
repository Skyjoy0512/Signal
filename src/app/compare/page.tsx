"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { Brain, Database, GitCompareArrows } from "lucide-react";
import type { EnrichedCompany } from "@/lib/fundamentals/provider";
import { ScoreRing } from "@/components/visual-primitives";

export default function ComparePage() {
  const [companies, setCompanies] = useState<EnrichedCompany[]>([]);
  const [sourceLabel, setSourceLabel] = useState("読み込み中");
  const [selected, setSelected] = useState<string[]>(["7203.T", "8035.T", "4568.T"]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch("/api/fundamentals");
      const data = await response.json() as { companies?: EnrichedCompany[]; sourceLabel?: string };
      if (cancelled) return;
      const loaded = data.companies ?? [];
      setCompanies(loaded);
      setSourceLabel(data.sourceLabel ?? "不明");
      setSelected((current) => current.some((ticker) => loaded.some((company) => company.ticker === ticker))
        ? current
        : loaded.slice(0, 3).map((company) => company.ticker));
    }
    load().catch(() => {
      if (!cancelled) setSourceLabel("読み込み失敗");
    });
    return () => { cancelled = true; };
  }, []);
  const selectedCompanies = companies.filter((company) => selected.includes(company.ticker));
  const factRows = [
    { label: "売上", values: selectedCompanies.map((c) => c.latest.revenue.toLocaleString()) },
    { label: "営業利益", values: selectedCompanies.map((c) => c.latest.operatingIncome.toLocaleString()) },
    { label: "営業利益率", values: selectedCompanies.map((c) => `${c.latest.operatingMargin}%`) },
    { label: "純利益", values: selectedCompanies.map((c) => c.latest.netIncome.toLocaleString()) },
    { label: "時価総額", values: selectedCompanies.map((c) => c.metrics.marketCap.toLocaleString()) },
  ];
  const intelligenceRows = [
    { label: "ROE", values: selectedCompanies.map((c) => `${c.latest.roe}%`) },
    { label: "PER", values: selectedCompanies.map((c) => `${c.metrics.per}倍`) },
    { label: "PBR", values: selectedCompanies.map((c) => `${c.metrics.pbr}倍`) },
    { label: "判断メモ", values: selectedCompanies.map((c) => judgement(c)) },
  ];
  const avgScore = selectedCompanies.length
    ? Math.round(selectedCompanies.reduce((sum, company) => sum + qualityScore(company), 0) / selectedCompanies.length)
    : 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">企業比較</h1>
        <p className="page-subtitle">複数企業を同じ指標で横並び比較します。</p>
        <p className="meaning-note">データソース: {sourceLabel}</p>
      </div>

      <div className="image-context-grid">
        <ContextCard
          title="ファクト比較"
          copy="売上、利益、時価総額など観測データを横並びで確認"
          image="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=900&q=80&fit=crop"
        />
        <ContextCard
          title="質の比較"
          copy="ROEと利益率で、単なる規模ではない企業の強さを見る"
          image="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&q=80&fit=crop"
        />
        <ContextCard
          title="割高度"
          copy="PER/PBRを見て、候補を深掘りする順番を決める"
          image="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=900&q=80&fit=crop"
        />
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span className="semantic-icon"><GitCompareArrows size={18} /></span>
          <div>
            <div style={{ fontWeight: 600 }}>比較する企業</div>
            <p className="meaning-note">最大5社まで選択できます。</p>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {companies.map((company) => {
            const active = selected.includes(company.ticker);
            return (
              <button
                key={company.ticker}
                className="badge badge-outline"
                style={{ cursor: "pointer", background: active ? "var(--color-deep-charcoal)" : undefined, color: active ? "#fff" : undefined }}
                onClick={() => setSelected((current) => active ? current.filter((ticker) => ticker !== company.ticker) : current.length >= 5 ? current : [...current, company.ticker])}
              >
                {company.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="decision-lanes">
        <section className="card lane-card">
          <div className="lane-header">
            <div>
              <div className="lane-label"><Database size={14} />ファクト</div>
              <h2 className="lane-title">横並びの観測データ</h2>
            </div>
            <span className="badge badge-outline">{selectedCompanies.length}社</span>
          </div>
          <p className="meaning-note">規模と収益の実績値です。まずここで同じ土俵に乗せます。</p>
        </section>
        <section className="card lane-card">
          <div className="lane-header">
            <div>
              <div className="lane-label"><Brain size={14} />インテリジェンス</div>
              <h2 className="lane-title">比較後の判断材料</h2>
            </div>
            <ScoreRing value={avgScore} label="平均品質" />
          </div>
          <p className="meaning-note">ROE、PER、PBRから優先確認すべき企業をざっくり分けます。</p>
        </section>
      </div>

      <div className="card compare-matrix">
        <table>
          <thead>
            <tr>
              <th style={th}>指標</th>
              {selectedCompanies.map((company) => <th key={company.ticker} style={th}>{company.name}<br /><span className="font-mono" style={{ color: "var(--color-muted-clay)", fontSize: 11 }}>{company.ticker}</span></th>)}
            </tr>
          </thead>
          <tbody>
            <tr className="compare-section-row"><td colSpan={selectedCompanies.length + 1}>ファクト</td></tr>
            {factRows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                {row.values.map((value, index) => <td key={`${row.label}-${index}`} className="font-mono">{value}</td>)}
              </tr>
            ))}
            <tr className="compare-section-row"><td colSpan={selectedCompanies.length + 1}>インテリジェンス</td></tr>
            {intelligenceRows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                {row.values.map((value, index) => <td key={`${row.label}-${index}`} className="font-mono">{value}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
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

function qualityScore(company: EnrichedCompany) {
  return Math.max(0, Math.min(100, Math.round((company.latest.roe * 5 + company.latest.operatingMargin * 4 + (100 - company.metrics.per * 2)) / 3)));
}

function judgement(company: EnrichedCompany) {
  const score = qualityScore(company);
  if (score >= 70) return "優先確認";
  if (score >= 50) return "比較対象";
  return "慎重確認";
}

const th = { textAlign: "left" as const };
