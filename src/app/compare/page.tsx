"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { Brain, Database, GitCompareArrows, RotateCcw, X } from "lucide-react";
import type { EnrichedCompany } from "@/lib/fundamentals/provider";
import { buildPeerComparisonSummary, medianDelta, qualityScore, qualityView } from "@/lib/fundamentals/quality-score";
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
  const loading = sourceLabel === "読み込み中";
  const resetSelection = () => setSelected(companies.slice(0, 3).map((company) => company.ticker));
  const peerSummary = buildPeerComparisonSummary(selectedCompanies);
  const factRows = [
    { label: "売上", values: selectedCompanies.map((c) => c.latest.revenue.toLocaleString()) },
    { label: "営業利益", values: selectedCompanies.map((c) => c.latest.operatingIncome.toLocaleString()) },
    { label: "営業利益率", values: selectedCompanies.map((c) => `${c.latest.operatingMargin}%`) },
    { label: "純利益", values: selectedCompanies.map((c) => c.latest.netIncome.toLocaleString()) },
    { label: "時価総額", values: selectedCompanies.map((c) => c.metrics.marketCap.toLocaleString()) },
  ];
  const intelligenceRows = [
    { label: "ROE", values: selectedCompanies.map((c) => `${c.latest.roe}% (${medianDelta(c.latest.roe, peerSummary.medians.roe)})`) },
    { label: "営業利益率差", values: selectedCompanies.map((c) => `${c.latest.operatingMargin}% (${medianDelta(c.latest.operatingMargin, peerSummary.medians.operatingMargin)})`) },
    { label: "PER確認", values: selectedCompanies.map((c) => `${c.metrics.per}倍 (${medianDelta(c.metrics.per, peerSummary.medians.per)})`) },
    { label: "PBR確認", values: selectedCompanies.map((c) => `${c.metrics.pbr}倍 (${medianDelta(c.metrics.pbr, peerSummary.medians.pbr)})`) },
    { label: "判断メモ", values: selectedCompanies.map((c) => qualityView(c).judgement) },
    { label: "バリュエーション", values: selectedCompanies.map((c) => qualityView(c).valuationNote) },
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

      {loading && (
        <div className="card state-panel" style={{ marginBottom: 14 }}>
          <div className="state-panel-head">
            <div>
              <div className="stat-label">Loading</div>
              <div className="state-panel-title">比較データを読み込み中</div>
              <p className="state-panel-copy">企業マスターと財務指標を取得しています。</p>
            </div>
            <span className="badge badge-outline">読み込み中</span>
          </div>
          <div className="skeleton-grid">
            {[0, 1, 2].map((item) => (
              <div key={item} className="skeleton-card">
                <div className="skeleton-line short" />
                <div className="skeleton-line long" />
                <div className="skeleton-line medium" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="semantic-icon"><GitCompareArrows size={18} /></span>
            <div>
              <div style={{ fontWeight: 600 }}>比較する企業</div>
              <p className="meaning-note">最大5社まで選択できます。</p>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={resetSelection} type="button"><RotateCcw size={14} />初期化</button>
        </div>
        <div className="selection-summary">
          <div>
            <div className="stat-label">選択中</div>
            <div className="selection-summary-title">{selectedCompanies.length ? selectedCompanies.map((company) => company.name).join(" / ") : "未選択"}</div>
          </div>
          <span className="badge badge-outline">{selectedCompanies.length}/5社</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
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
                {active && <X size={11} />}
              </button>
            );
          })}
        </div>
      </div>}

      {!loading && selectedCompanies.length > 0 && <div className="decision-lanes">
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
      </div>}

      {!loading && selectedCompanies.length > 0 && peerSummary.warning && (
        <div className="card" style={{ marginBottom: 14, borderColor: "rgba(194,91,36,0.32)", background: "#fff8f1" }}>
          <div className="stat-label">比較条件</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{peerSummary.industryLabel}</div>
          <p className="meaning-note">{peerSummary.warning}</p>
        </div>
      )}

      {!loading && selectedCompanies.length === 0 && (
        <div className="card card-dashed empty-state empty-state-compact">
          <div>
            <h2>比較する企業を選択してください</h2>
            <p>上の企業チップから1社以上を選ぶと、ファクトとインテリジェンスの比較表が表示されます。</p>
          </div>
        </div>
      )}

      {!loading && selectedCompanies.length > 0 && <div className="card compare-matrix">
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
      </div>}
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

const th = { textAlign: "left" as const };
