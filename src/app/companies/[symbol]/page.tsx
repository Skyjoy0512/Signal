import { notFound } from "next/navigation";
import { getCompanyBundle } from "@/lib/fundamentals/provider";

export default async function CompanyPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const bundle = await getCompanyBundle(decodeURIComponent(symbol));
  if (!bundle) notFound();

  const c = bundle.company;
  const latest = c.latest;

  return (
    <>
      <header className="app-header">
        <div className="app-header-left">
          <span style={{ fontWeight: 600, fontSize: 16 }}>{c.name}</span>
        </div>
      </header>

      <div className="page-header">
        <h1>{c.name}</h1>
        <p>{c.ticker} / {c.industry} / {bundle.sourceLabel}</p>
      </div>

      <div className="stats-grid mb-8">
        <div className="stat-card">
          <div className="stat-label">PER</div>
          <div className="stat-value">{c.metrics.per}<span style={{ fontSize: 16, color: "var(--muted)" }}>倍</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">PBR</div>
          <div className="stat-value">{c.metrics.pbr}<span style={{ fontSize: 16, color: "var(--muted)" }}>倍</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">ROE</div>
          <div className="stat-value">{latest.roe}<span style={{ fontSize: 16, color: "var(--muted)" }}>%</span></div>
          <div className="stat-change up">営業利益率: {latest.operatingMargin}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">売上</div>
          <div className="stat-value" style={{ fontSize: 24 }}>{latest.revenue.toLocaleString()}</div>
          <div className="stat-change">純利益: {latest.netIncome.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)" }}>
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "var(--space-4)" }}>財務指標</h3>
          <div className="table-wrap">
            <table>
              <tbody>
                {[
                  ["売上高", latest.revenue.toLocaleString()],
                  ["営業利益", latest.operatingIncome.toLocaleString()],
                  ["純利益", latest.netIncome.toLocaleString()],
                  ["営業利益率", `${latest.operatingMargin}%`],
                  ["ROE", `${latest.roe}%`],
                  ["総資産", latest.assets.toLocaleString()],
                  ["自己資本", latest.equity.toLocaleString()],
                  ["営業CF", latest.operatingCashFlow.toLocaleString()],
                ].map(([label, value]) => (
                  <tr key={label as string}>
                    <td style={{ fontWeight: 500, color: "var(--muted)", width: "40%" }}>{label}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "var(--space-4)" }}>バリュエーション</h3>
          <div className="table-wrap">
            <table>
              <tbody>
                {[
                  ["PER", `${c.metrics.per}倍`],
                  ["PBR", `${c.metrics.pbr}倍`],
                  ["時価総額", c.metrics.marketCap?.toLocaleString() ?? "--"],
                  ["EV", c.metrics.enterpriseValue?.toLocaleString() ?? "--"],
                  ["EV/EBITDA", `${c.metrics.evEbitda ?? "--"}倍`],
                  ["株価", c.metrics.stockPrice?.toLocaleString() ?? "--"],
                ].map(([label, value]) => (
                  <tr key={label as string}>
                    <td style={{ fontWeight: 500, color: "var(--muted)", width: "40%" }}>{label}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
