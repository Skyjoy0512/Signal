import Link from "next/link";
import { notFound } from "next/navigation";
import { getIndustryRows } from "@/lib/fundamentals/provider";

export default async function IndustryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { dataset, industry, rows } = await getIndustryRows(id);
  if (!industry) notFound();
  const [, name] = industry;
  const avgMargin = rows.length ? rows.reduce((s, c) => s + c.latest.operatingMargin, 0) / rows.length : 0;
  const avgRoe = rows.length ? rows.reduce((s, c) => s + c.latest.roe, 0) / rows.length : 0;

  return (
    <>
      <header className="app-header">
        <div className="app-header-left">
          <span style={{ fontWeight: 600, fontSize: 16 }}>{name}</span>
        </div>
      </header>

      <div className="page-header">
        <h1>{name}</h1>
        <p>{rows.length}社 / {dataset.sourceLabel}</p>
      </div>

      <div className="stats-grid mb-8">
        <div className="stat-card">
          <div className="stat-label">収録企業</div>
          <div className="stat-value">{rows.length}<span style={{ fontSize: 16, color: "var(--muted)" }}>社</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">平均営業利益率</div>
          <div className="stat-value">{rows.length ? avgMargin.toFixed(1) : "--"}<span style={{ fontSize: 16, color: "var(--muted)" }}>%</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">平均ROE</div>
          <div className="stat-value">{rows.length ? avgRoe.toFixed(1) : "--"}<span style={{ fontSize: 16, color: "var(--muted)" }}>%</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">リーダー</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{rows[0]?.name ?? "--"}</div>
          <div className="stat-change">{rows[0]?.ticker}</div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>順位</th><th>企業</th><th>売上</th><th>営業利益率</th><th>ROE</th><th>PER</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--muted)", padding: "var(--space-8)" }}>この業界はまだサンプル企業未取得です。</td></tr>
            ) : (
              rows.map((c, i) => (
                <tr key={c.ticker}>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{c.name}<div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{c.ticker}</div></td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{c.latest.revenue.toLocaleString()}</td>
                  <td><span className={`badge ${c.latest.operatingMargin >= 10 ? "badge-success" : c.latest.operatingMargin >= 5 ? "badge-neutral" : "badge-warn"}`}>{c.latest.operatingMargin}%</span></td>
                  <td><span className={`badge ${c.latest.roe >= 10 ? "badge-success" : c.latest.roe >= 5 ? "badge-neutral" : "badge-warn"}`}>{c.latest.roe}%</span></td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{c.metrics.per}倍</td>
                  <td><Link href={`/companies/${encodeURIComponent(c.ticker)}`} className="btn btn-ghost btn-sm">詳細</Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
