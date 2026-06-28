"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { EnrichedCompany, IndustrySummary } from "@/lib/fundamentals/provider";

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
      const res = await fetch("/api/fundamentals");
      const data = await res.json() as { companies?: EnrichedCompany[]; industries?: IndustrySummary[]; sourceLabel?: string };
      if (cancelled) return;
      setRows(data.companies ?? []);
      setIndustries(data.industries ?? []);
      setSourceLabel(data.sourceLabel ?? "不明");
    }
    load().catch(() => { if (!cancelled) setSourceLabel("読み込み失敗"); });
    return () => { cancelled = true; };
  }, []);

  const filtered = rows.filter((c) => {
    if (industry !== "ALL" && c.industryCode !== industry) return false;
    if (c.latest.revenue < minRevenue) return false;
    if (c.latest.operatingMargin < minMargin) return false;
    if (c.latest.roe < minRoe) return false;
    if (c.metrics.per > maxPer) return false;
    return true;
  });

  const loading = sourceLabel === "読み込み中";
  const activeFilters = [
    industry !== "ALL" ? `業種: ${industries.find((r) => r.code === industry)?.name ?? industry}` : null,
    minRevenue > 0 ? `売上 >= ${minRevenue.toLocaleString()}` : null,
    minMargin > 0 ? `営業利益率 >= ${minMargin}%` : null,
    minRoe > 0 ? `ROE >= ${minRoe}%` : null,
    maxPer < 50 ? `PER <= ${maxPer}倍` : null,
  ].filter(Boolean) as string[];

  const reset = () => { setIndustry("ALL"); setMinRevenue(0); setMinMargin(0); setMinRoe(0); setMaxPer(50); };

  return (
    <>
      <header className="app-header">
        <div className="app-header-left">
          <span style={{ fontWeight: 600, fontSize: 16 }}>条件検索</span>
        </div>
      </header>

      <div className="page-header">
        <h1>条件検索</h1>
        <p>業種、売上、営業利益率、ROE、PERで企業を絞り込みます / {sourceLabel}</p>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-10)" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "var(--space-2)" }}>条件検索データを読み込み中</h3>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>企業マスターと業界一覧を取得しています。</p>
        </div>
      ) : (
        <>
          <div className="stats-grid mb-6">
            <div className="card card-sm">
              <div className="stat-label">ファクト条件</div>
              <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>観測データで絞る</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
                <div className="form-group">
                  <label className="form-label">業種</label>
                  <select className="form-input w-full" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                    <option value="ALL">すべて</option>
                    {industries.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">売上下限</label>
                  <input type="number" className="form-input w-full" value={minRevenue || ""} onChange={(e) => setMinRevenue(Number(e.target.value))} placeholder="0" style={{ fontFamily: "var(--font-mono)" }} />
                </div>
                <div className="form-group">
                  <label className="form-label">営業利益率下限(%)</label>
                  <input type="number" className="form-input w-full" value={minMargin || ""} onChange={(e) => setMinMargin(Number(e.target.value))} placeholder="0" style={{ fontFamily: "var(--font-mono)" }} />
                </div>
              </div>
            </div>
            <div className="card card-sm">
              <div className="stat-label">インテリジェンス条件</div>
              <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>質と割高度で並べる</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
                <div className="form-group">
                  <label className="form-label">ROE下限(%)</label>
                  <input type="number" className="form-input w-full" value={minRoe || ""} onChange={(e) => setMinRoe(Number(e.target.value))} placeholder="0" style={{ fontFamily: "var(--font-mono)" }} />
                </div>
                <div className="form-group">
                  <label className="form-label">PER上限(倍)</label>
                  <input type="number" className="form-input w-full" value={maxPer || ""} onChange={(e) => setMaxPer(Number(e.target.value))} placeholder="50" style={{ fontFamily: "var(--font-mono)" }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", marginBottom: "var(--space-6)" }}>
            <button className="btn btn-sm btn-ghost" onClick={reset}>初期化</button>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              {activeFilters.length ? activeFilters.join(" / ") : "条件なし"} / <strong>{filtered.length}件</strong>
            </span>
          </div>
        </>
      )}

      {!loading && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>企業</th><th>業種</th><th>売上</th><th>ROE</th><th>PER</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: "var(--space-8)" }}>条件に合う企業がありません</td></tr>
              ) : (
                filtered.slice(0, 50).map((c) => (
                  <tr key={c.ticker}>
                    <td style={{ fontWeight: 500 }}>{c.name}<div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{c.ticker}</div></td>
                    <td>{c.industry}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{c.latest.revenue.toLocaleString()}</td>
                    <td><span className={`badge ${c.latest.roe >= 10 ? "badge-success" : c.latest.roe >= 5 ? "badge-neutral" : "badge-warn"}`}>{c.latest.roe}%</span></td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{c.metrics.per}倍</td>
                    <td><Link href={`/companies/${encodeURIComponent(c.ticker)}`} className="btn btn-ghost btn-sm">詳細</Link></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
