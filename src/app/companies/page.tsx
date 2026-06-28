import Link from "next/link";
import { getFundamentalDataset } from "@/lib/fundamentals/provider";

export default async function CompaniesPage() {
  const dataset = await getFundamentalDataset();
  const companies = dataset.companies.slice(0, 50);

  return (
    <>
      <header className="app-header">
        <div className="app-header-left">
          <span style={{ fontWeight: 600, fontSize: 16 }}>企業検索</span>
        </div>
      </header>

      <div className="page-header">
        <h1>企業検索</h1>
        <p>{dataset.sourceLabel} / {companies.length}社</p>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>企業名</th>
              <th>ティッカー</th>
              <th>業種</th>
              <th>売上</th>
              <th>ROE</th>
              <th>PER</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.ticker}>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--muted)" }}>{c.ticker}</td>
                <td>{c.industry}</td>
                <td style={{ fontFamily: "var(--font-mono)" }}>{c.latest.revenue.toLocaleString()}</td>
                <td><span className={`badge ${c.latest.roe >= 10 ? "badge-success" : c.latest.roe >= 5 ? "badge-neutral" : "badge-warn"}`}>{c.latest.roe}%</span></td>
                <td style={{ fontFamily: "var(--font-mono)" }}>{c.metrics.per}倍</td>
                <td><Link href={`/companies/${encodeURIComponent(c.ticker)}`} className="btn btn-ghost btn-sm">詳細</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
