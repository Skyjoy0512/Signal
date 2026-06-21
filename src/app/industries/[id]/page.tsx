import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { BarChart3, Building2, TrendingUp } from "lucide-react";
import { IndustryRevenueRankingChart, ProfitabilityScatter } from "@/components/fundamental-visuals";
import { getIndustryRows } from "@/lib/fundamentals/provider";
import { ScoreRing, StatusPill } from "@/components/visual-primitives";

export default async function IndustryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { dataset, industry, rows } = await getIndustryRows(id);
  if (!industry) notFound();
  const [, name] = industry;
  const totalRevenue = rows.reduce((sum, company) => sum + company.latest.revenue, 0);
  const avgMargin = rows.length ? rows.reduce((sum, company) => sum + company.latest.operatingMargin, 0) / rows.length : 0;
  const avgRoe = rows.length ? rows.reduce((sum, company) => sum + company.latest.roe, 0) / rows.length : 0;
  const leader = rows[0];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">{name}</h1>
        <p className="page-subtitle">業界別売上ランキング、利益率、ROE、PER/PBRを横断確認します。</p>
        <p className="meaning-note">データソース: {dataset.sourceLabel}</p>
      </div>

      <div className="grid-stats" style={{ marginBottom: 14 }}>
        <IndustryKpi icon={<Building2 size={18} />} label="収録企業" value={`${rows.length}社`} sub="現在のサンプルユニバース" />
        <IndustryKpi icon={<BarChart3 size={18} />} label="業界売上" value={totalRevenue ? totalRevenue.toLocaleString() : "--"} sub="収録企業の合算" />
        <IndustryKpi icon={<TrendingUp size={18} />} label="平均営業利益率" value={rows.length ? `${avgMargin.toFixed(1)}%` : "--"} sub="本業の稼ぐ力" />
        <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div className="stat-label">業界品質</div>
            <div className="stat-value stat-value-sm">{rows.length ? `${avgRoe.toFixed(1)}%` : "--"}</div>
            <div className="stat-sub">平均ROE</div>
          </div>
          <ScoreRing value={Math.min(100, avgRoe * 6)} label="ROE" />
        </div>
      </div>

      {rows.length > 0 && (
        <div className="visual-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 14, marginBottom: 14 }}>
          <div className="card">
            <div className="section-kicker">Revenue Ranking</div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>業界別売上ランキング</h2>
            <p className="meaning-note">売上規模の比較です。横棒が長いほど業界内での規模が大きく、上位3社を青で強調しています。</p>
            <IndustryRevenueRankingChart rows={rows} />
          </div>
          <div className="card">
            <div className="section-kicker">Profitability Map</div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>収益性マップ</h2>
            <p className="meaning-note">右に行くほど営業利益率が高く、上に行くほどROEが高い企業です。規模は時価総額の目安です。</p>
            <ProfitabilityScatter rows={rows} />
          </div>
        </div>
      )}

      {leader && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="section-kicker">Insight</div>
          <h2 style={{ fontSize: 17, fontWeight: 600 }}>示唆</h2>
          <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.8 }}>
            {name}では売上規模トップは{leader.name}です。平均営業利益率は{avgMargin.toFixed(1)}%、平均ROEは{avgRoe.toFixed(1)}%で、
            規模を見るなら売上ランキング、質を見るなら収益性マップの右上企業を優先確認します。
          </p>
        </div>
      )}

      <div className="card industry-table">
        <div className="industry-table-head">
          {["順位", "企業", "売上", "営業利益率", "ROE", "PER", "詳細"].map((label) => <div key={label} className="stat-label">{label}</div>)}
        </div>
        {rows.length === 0 && (
          <div style={{ padding: 24, color: "var(--color-muted-clay)" }}>この業界はまだサンプル企業未取得です。</div>
        )}
        {rows.map((company, index) => (
          <div key={company.ticker} className="industry-table-row">
            <div className="industry-table-cell"><span className="industry-cell-label">順位</span><span className="industry-rank">{index + 1}</span></div>
            <div className="industry-table-cell">
              <span className="industry-cell-label">企業</span>
              <div>
              <div style={{ fontWeight: 600 }}>{company.name}</div>
              <div className="font-mono" style={{ fontSize: 12, color: "var(--color-muted-clay)" }}>{company.ticker}</div>
              </div>
            </div>
            <div className="industry-table-cell font-mono"><span className="industry-cell-label">売上</span>{company.latest.revenue.toLocaleString()}</div>
            <div className="industry-table-cell"><span className="industry-cell-label">営業利益率</span><StatusPill value={company.latest.operatingMargin * 5} label={`${company.latest.operatingMargin}%`} /></div>
            <div className="industry-table-cell"><span className="industry-cell-label">ROE</span><StatusPill value={company.latest.roe * 5} label={`${company.latest.roe}%`} /></div>
            <div className="industry-table-cell font-mono"><span className="industry-cell-label">PER</span>{company.metrics.per}倍</div>
            <div className="industry-table-cell"><span className="industry-cell-label">詳細</span><Link className="link" href={`/companies/${encodeURIComponent(company.ticker)}`}>見る</Link></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IndustryKpi({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="semantic-icon">{icon}</span>
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value stat-value-sm">{value}</div>
        </div>
      </div>
      <div className="stat-sub" style={{ marginTop: 8 }}>{sub}</div>
    </div>
  );
}
