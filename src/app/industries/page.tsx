import Link from "next/link";
import type { CSSProperties } from "react";
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

      <div className="image-context-grid">
        <ContextCard
          title="業界の地合いを見る"
          copy="個別銘柄に入る前に、業界ごとの規模と収益性を確認します"
          image="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=900&q=80&fit=crop"
        />
        <ContextCard
          title="同業比較へ進む"
          copy="企業詳細では、売上・ROE・PERを同じ業界内で比べます"
          image="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=900&q=80&fit=crop"
        />
        <ContextCard
          title="未取得業界を把握"
          copy="データが薄い業界も残して、ユニバース拡張の余地を見える化します"
          image="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&q=80&fit=crop"
        />
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

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div className="font-mono" style={{ fontSize: 12 }}>{value}</div>
    </div>
  );
}
