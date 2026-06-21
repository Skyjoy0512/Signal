import Link from "next/link";
import { getFundamentalDataset } from "@/lib/fundamentals/provider";
import { IndustryIcon, ScoreRing } from "@/components/visual-primitives";

export default async function IndustriesPage() {
  const dataset = await getFundamentalDataset();
  const rows = dataset.industries;
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">業界地図</h1>
        <p className="page-subtitle">東証33業種を常時表示し、サンプル企業がある業界は売上・利益率・ROEを集計します。</p>
        <p className="meaning-note">データソース: {dataset.sourceLabel}</p>
      </div>

      <div className="grid-cards">
        {rows.map((industry) => (
          <Link key={industry.code} href={`/industries/${industry.code}`} className="card card-hover no-underline">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <IndustryIcon code={industry.code} title={industry.name} />
                <div>
                  <div style={{ fontWeight: 600 }}>{industry.name}</div>
                  <div className="stat-sub">{industry.count > 0 ? `${industry.count}社収録` : "未取得"}</div>
                </div>
              </div>
              <ScoreRing value={Math.min(100, industry.avgRoe * 6)} label="ROE" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 12 }}>
              <Mini label="売上" value={industry.revenue ? industry.revenue.toLocaleString() : "--"} />
              <Mini label="営業率" value={industry.count ? `${industry.avgMargin}%` : "--"} />
              <Mini label="ROE" value={industry.count ? `${industry.avgRoe}%` : "--"} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div className="font-mono" style={{ fontSize: 12 }}>{value}</div>
    </div>
  );
}
