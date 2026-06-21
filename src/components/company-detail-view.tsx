"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import Link from "next/link";
import { BarChart3, Brain, Database, FileText, Info, LineChart, Users } from "lucide-react";
import { FundamentalTrendCharts } from "@/components/candidate-visuals";
import { PeerMetricBars } from "@/components/fundamental-visuals";
import { Company, FinancialPoint, financialsFor, MarketMetric, metricsFor } from "@/lib/fundamentals/mock";
import { ScoreRing, StatusPill } from "@/components/visual-primitives";

export function CompanyDetailView({
  company,
  financials,
  metrics,
  peers,
  sourceLabel,
}: {
  company: Company;
  financials: FinancialPoint[];
  metrics: MarketMetric;
  peers: Company[];
  sourceLabel?: string;
}) {
  const [tab, setTab] = useState("overview");
  const latest = financials[financials.length - 1];
  const peerRows = [company, ...peers]
    .map((peer) => ({
      ...peer,
      latest: peer.ticker === company.ticker ? latest : financialsFor(peer.ticker).at(-1) ?? latest,
      metrics: peer.ticker === company.ticker ? metrics : metricsFor(peer.ticker),
    }))
    .sort((a, b) => b.latest.revenue - a.latest.revenue);
  const revenueRank = peerRows.findIndex((peer) => peer.ticker === company.ticker) + 1;
  const qualityScore = Math.min(100, latest.roe * 6);
  const valuationScore = Math.max(0, Math.min(100, 100 - metrics.per * 2));
  const intelligenceScore = Math.round((qualityScore + valuationScore + latest.operatingMargin * 4) / 3);
  const heroImage = imageForIndustry(company.industry);
  const tabs = [
    ["overview", "概要", Info],
    ["financials", "業績", LineChart],
    ["metrics", "指標", LineChart],
    ["peers", "同業比較", BarChart3],
    ["shareholders", "大株主", Users],
    ["documents", "IR資料", FileText],
  ] as const;

  return (
    <div className="page-container">
      <section
        className="visual-brief"
        style={{ "--brief-image": `url(${heroImage})` } as CSSProperties}
      >
        <div className="visual-brief-inner">
          <div>
            <div className="hero-kicker">Company Brief</div>
            <h1 className="visual-brief-title">{company.name}</h1>
            <p className="visual-brief-copy">
              企業の観測データと、投資判断に使う解釈を分けて確認します。数字はファクト、順位や示唆はインテリジェンスとして扱います。
            </p>
            <div className="visual-brief-meta">
              <Link className="badge badge-outline no-underline" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.28)" }} href={`/industries/${company.industryCode}`}>業界ページ</Link>
              <span className="badge badge-outline" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.28)" }}>{company.ticker}</span>
              <span className="badge badge-outline" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.28)" }}>{company.industry}</span>
              {sourceLabel && (
                <span className="badge badge-outline" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#fff", borderColor: "rgba(255,255,255,0.28)" }}>
                  <Database size={12} />
                  {sourceLabel}
                </span>
              )}
            </div>
          </div>
          <div className="brief-side-panel">
            <div className="brief-side-row">
              <span className="brief-side-label">売上順位</span>
              <span className="brief-side-value">{revenueRank}/{peerRows.length}</span>
            </div>
            <div className="brief-side-row">
              <span className="brief-side-label">財務品質</span>
              <span className="brief-side-value">{Math.round(qualityScore)}</span>
            </div>
            <div className="brief-side-row">
              <span className="brief-side-label">割安度</span>
              <span className="brief-side-value">{Math.round(valuationScore)}</span>
            </div>
            <div className="brief-side-row">
              <span className="brief-side-label">判断メモ</span>
              <span className="brief-side-value">{intelligenceScore >= 70 ? "優先確認" : intelligenceScore >= 50 ? "比較対象" : "慎重確認"}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="decision-lanes">
        <section className="card lane-card">
          <div className="lane-header">
            <div>
              <div className="lane-label"><Database size={14} />ファクト</div>
              <h2 className="lane-title">観測された企業データ</h2>
            </div>
            <span className="badge badge-outline">Fact</span>
          </div>
          <div className="fact-grid">
            <FactTile label="売上" value={latest.revenue.toLocaleString()} />
            <FactTile label="営業利益率" value={`${latest.operatingMargin}%`} />
            <FactTile label="ROE" value={`${latest.roe}%`} />
            <FactTile label="PER" value={`${metrics.per}倍`} />
          </div>
        </section>
        <section className="card lane-card">
          <div className="lane-header">
            <div>
              <div className="lane-label"><Brain size={14} />インテリジェンス</div>
              <h2 className="lane-title">判断に使う解釈</h2>
            </div>
            <ScoreRing value={intelligenceScore} label="判断" />
          </div>
          <div className="intelligence-grid">
            <IntelTile label="業界内の規模" value={`${revenueRank}位`} />
            <IntelTile label="財務品質" value={qualityScore >= 70 ? "高い" : qualityScore >= 50 ? "標準" : "弱い"} />
            <IntelTile label="株価評価" value={valuationScore >= 70 ? "割安寄り" : valuationScore >= 45 ? "中立" : "割高寄り"} />
            <IntelTile label="次の確認" value="同業比較" />
          </div>
        </section>
      </div>

      <div className="grid-stats" style={{ marginBottom: 14 }}>
        <MetricCard label="売上" value={latest.revenue.toLocaleString()} sub="百万円換算のモック" />
        <MetricCard label="営業利益率" value={`${latest.operatingMargin}%`} sub="本業の稼ぐ力" score={latest.operatingMargin * 5} />
        <MetricCard label="ROE" value={`${latest.roe}%`} sub="資本効率" score={latest.roe * 5} />
        <MetricCard label="PER" value={`${metrics.per}倍`} sub="株価の割高度" score={100 - metrics.per * 2} />
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {tabs.map(([key, label, Icon]) => (
            <button key={key} onClick={() => setTab(key)} className="btn btn-ghost" style={{ background: tab === key ? "var(--color-deep-charcoal)" : undefined, color: tab === key ? "#fff" : undefined }}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <div className="drilldown-content-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 14 }}>
          <div className="card">
            <div className="section-kicker">Fact Profile</div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>企業概要</h2>
            <p style={{ marginTop: 10, lineHeight: 1.8 }}>{company.description}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
              {company.themeTags.map((tag) => <span key={tag} className="badge badge-outline">{tag}</span>)}
            </div>
          </div>
          <div className="card">
            <div className="section-kicker">Intelligence Context</div>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>同業企業</h2>
            <p className="meaning-note">業界内で比較されやすい企業です。企業詳細へ移動して同じ指標を横並びで確認できます。</p>
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {peers.map((peer) => (
                <Link key={peer.ticker} href={`/companies/${encodeURIComponent(peer.ticker)}`} className="card-hover semantic-list-button no-underline">
                  <div style={{ fontWeight: 600 }}>{peer.name}</div>
                  <div className="font-mono" style={{ color: "var(--color-muted-clay)", fontSize: 12 }}>{peer.ticker}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "financials" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
            <div>
              <div className="section-kicker">Financials</div>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>業績・財務</h2>
              <p className="meaning-note">MVPでは通期5年分の売上、利益、BS、収益性を表示します。</p>
            </div>
            <button className="btn btn-ghost">CSV</button>
          </div>
          <FundamentalTrendCharts data={financials} />
        </div>
      )}

      {tab === "metrics" && (
        <div className="grid-stats">
          {[
            ["株価", metrics.stockPrice.toLocaleString(), "現在の株価水準"],
            ["時価総額", metrics.marketCap.toLocaleString(), "企業規模"],
            ["企業価値", metrics.enterpriseValue.toLocaleString(), "有利子負債などを含む価値"],
            ["PER", `${metrics.per}倍`, "利益に対する株価の割高さ"],
            ["PBR", `${metrics.pbr}倍`, "純資産に対する株価の割高さ"],
            ["EV/EBITDA", `${metrics.evEbitda}倍`, "買収価値に対する収益力"],
            ["PSR", `${metrics.psr}倍`, "売上に対する株価評価"],
            ["配当利回り", `${metrics.dividendYield}%`, "配当リターンの目安"],
            ["ROIC", `${metrics.roic}%`, "事業投資の効率"],
            ["ROA", `${metrics.roa}%`, "総資産の収益性"],
          ].map(([label, value, description]) => (
            <div key={label} className="card">
              <div className="stat-label">{label}</div>
              <div className="stat-value stat-value-sm">{value}</div>
              <p className="meaning-note">{description}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "peers" && (
        <div className="visual-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 14 }}>
          <div className="card">
            <div className="section-kicker">Peer Revenue</div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>同業売上比較</h2>
            <p className="meaning-note">業界内での規模感です。選択中企業はオレンジで表示します。</p>
            <PeerMetricBars rows={peerRows} activeTicker={company.ticker} metric="revenue" />
          </div>
          <div className="card">
            <div className="section-kicker">Peer Quality</div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>同業ROE比較</h2>
            <p className="meaning-note">資本効率の比較です。高いほど少ない自己資本で利益を出している状態です。</p>
            <PeerMetricBars rows={[...peerRows].sort((a, b) => b.latest.roe - a.latest.roe)} activeTicker={company.ticker} metric="roe" />
          </div>
          <div className="card">
            <div className="section-kicker">Valuation</div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>PER比較</h2>
            <p className="meaning-note">低いほど割安に見えますが、成長率・利益の質・リスクとセットで確認します。</p>
            <PeerMetricBars rows={[...peerRows].sort((a, b) => a.metrics.per - b.metrics.per)} activeTicker={company.ticker} metric="per" />
          </div>
          <div className="card">
            <div className="section-kicker">Intelligence Readout</div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>比較の見方</h2>
            <p style={{ marginTop: 10, fontSize: 13, lineHeight: 1.8 }}>
              {company.name}は同業{peerRows.length}社中、売上規模で{revenueRank}位です。ROEは{latest.roe}%、PERは{metrics.per}倍です。
              規模、資本効率、割高度を同時に見ることで、単なる大型株か、質の高い割安候補かを分けて判断できます。
            </p>
          </div>
        </div>
      )}

      {tab === "shareholders" && (
        <div className="card">
          <div className="section-kicker">Shareholders</div>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>大株主</h2>
          {["信託銀行", "海外機関投資家", "創業家/関連会社"].map((name, index) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--color-border-sand)" }}>
              <span>{index + 1}. {name}</span>
              <span className="font-mono">{(12 - index * 2.3).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}

      {tab === "documents" && (
        <div className="card">
          <div className="section-kicker">IR Documents</div>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>資料・開示</h2>
          {["決算短信", "有価証券報告書", "統合報告書", "中期経営計画"].map((title) => (
            <div key={title} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--color-border-sand)" }}>
              <span>{title}</span>
              <span className="badge badge-outline">モック</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub, score }: { label: string; value: string; sub: string; score?: number }) {
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className="stat-value stat-value-sm">{value}</div>
      <div className="stat-sub">{sub}</div>
      {score != null && <div style={{ marginTop: 8 }}><StatusPill value={score} label="評価" /></div>}
    </div>
  );
}

function FactTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact-tile">
      <div className="fact-value">{value}</div>
      <div className="fact-label">{label}</div>
    </div>
  );
}

function IntelTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="intel-tile">
      <div className="intel-value">{value}</div>
      <div className="intel-label">{label}</div>
    </div>
  );
}

function imageForIndustry(industry: string) {
  if (/Transportation|輸送|自動車/i.test(industry)) return "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1600&q=82&fit=crop";
  if (/Electric|電気|半導体|Appliances/i.test(industry)) return "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=82&fit=crop";
  if (/Bank|銀行|Finance|金融/i.test(industry)) return "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1600&q=82&fit=crop";
  if (/Pharmaceutical|医薬/i.test(industry)) return "https://images.unsplash.com/photo-1576671081837-49000212a370?w=1600&q=82&fit=crop";
  if (/Information|通信|Telecom/i.test(industry)) return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1600&q=82&fit=crop";
  return "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1600&q=82&fit=crop";
}
