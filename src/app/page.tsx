import Link from "next/link";
import {
  Activity,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  FileText,
  Layers3,
  ShieldCheck,
  Target,
  type LucideIcon,
} from "lucide-react";

const modules = [
  { title: "階層分析", desc: "市場・セクター・テーマ・銘柄の4層で地合いを数値化", href: "/dashboard", meta: "Market", icon: Layers3, image: "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=520&q=80&fit=crop" },
  { title: "候補銘柄", desc: "機械式スコアとLLMレビューで確認候補を整理", href: "/candidates", meta: "Signals", icon: Activity, image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=520&q=80&fit=crop" },
  { title: "条件検索", desc: "売上・利益率・ROE・PERなどで銘柄を抽出", href: "/screening", meta: "Screening", icon: Target, image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=520&q=80&fit=crop" },
  { title: "企業比較", desc: "複数企業を売上・利益率・指標で横並び比較", href: "/compare", meta: "Compare", icon: Activity, image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=520&q=80&fit=crop" },
  { title: "LINE通知", desc: "朝まとめ・即時通知・予算管理・クールダウン", href: "/settings", meta: "Alerts", icon: Bell, image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=520&q=80&fit=crop" },
  { title: "取引記録", desc: "手動・ペーパー取引を記録し、結果を追跡", href: "/positions", meta: "Journal", icon: BookOpen, image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=520&q=80&fit=crop" },
  { title: "企業検索", desc: "会社名・銘柄コード・事業キーワードから企業詳細へ移動", href: "/companies", meta: "Search", icon: BriefcaseBusiness, image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=520&q=80&fit=crop" },
  { title: "外部分析パック", desc: "匿名化MarkdownでChatGPT等に外部レビューを依頼", href: "/review", meta: "Review", icon: FileText, image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=520&q=80&fit=crop" },
  { title: "業界ランキング", desc: "東証33業種と業界別売上ランキングを確認", href: "/industries", meta: "Industries", icon: Layers3, image: "https://images.unsplash.com/photo-1554224155-1696413565d3?w=520&q=80&fit=crop" },
  { title: "キルスイッチ", desc: "3連敗で警告・5連敗でブロック・日次損失制限", href: "/positions", meta: "Risk", icon: ShieldCheck, image: "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=520&q=80&fit=crop" },
];

const deskRows = [
  ["Market Regime", "Scan pending", "neutral"],
  ["Signal Engine", "Ready", "ready"],
  ["Risk Control", "Normal", "ready"],
  ["External Review", "Pack enabled", "neutral"],
];

const flow = [
  ["Market", "日経平均", Layers3],
  ["Sector", "業界", BriefcaseBusiness],
  ["Signal", "候補", Target],
  ["Risk", "制御", ShieldCheck],
] satisfies [string, string, LucideIcon][];

const deskActions = [
  { label: "1. 地合い", title: "市場と業界の強弱を見る", href: "/dashboard" },
  { label: "2. 候補", title: "候補銘柄をファクトで絞る", href: "/candidates" },
  { label: "3. 比較", title: "同業比較で判断を固める", href: "/compare" },
  { label: "4. 管理", title: "ポジションと安全装置を確認", href: "/positions" },
];

export default function Home() {
  return (
    <div className="page-container">
      <section className="hero-shell">
        <div className="hero-content">
          <div className="hero-copy-column">
            <div className="hero-kicker">
              <span className="live-dot" />
              Japan Equity Signal Desk
            </div>
            <h1 className="hero-title" style={{ marginTop: 14 }}>Signal</h1>
            <p className="hero-copy">
              日本株の地合い、候補度、想定水準、リスク制御を朝の確認順にまとめます。
            </p>
            <div className="hero-actions">
              <Link href="/dashboard" className="btn btn-primary no-underline">ダッシュボードを開く</Link>
              <Link href="/candidates" className="btn btn-ghost no-underline">候補銘柄を見る</Link>
            </div>
            <div className="hero-metrics" aria-label="Signal current status">
              <div>
                <span className="metric-value">4層</span>
                <span className="metric-label">市場ドリルダウン</span>
              </div>
              <div>
                <span className="metric-value">2段階</span>
                <span className="metric-label">スコア + LLM確認</span>
              </div>
              <div>
                <span className="metric-value">5連敗</span>
                <span className="metric-label">自動ブロック基準</span>
              </div>
            </div>
          </div>

          <div className="market-panel" aria-label="Signal overview">
            <div className="panel-topline">
              <span>Today&apos;s workflow</span>
              <span className="panel-chip">Ready</span>
            </div>
            <div className="workflow-map" aria-label="Market drilldown flow">
              {flow.map(([label, value, FlowIcon], index) => (
                <div key={label} className="workflow-node">
                  <div className="workflow-icon"><FlowIcon size={18} strokeWidth={1.8} /></div>
                  <div>
                    <div className="market-label">{label}</div>
                    <div className="market-value">{value}</div>
                  </div>
                  {index < 3 && <span className="workflow-arrow" aria-hidden="true" />}
                </div>
              ))}
            </div>
            {deskRows.map(([label, value, tone]) => (
              <div key={label} className="market-line">
                <span className="market-label">{label}</span>
                <span className="market-value" data-tone={tone}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="desk-action-strip" aria-label="今日の確認順">
        {deskActions.map((action) => (
          <Link key={action.label} href={action.href} className="desk-action-item no-underline">
            <span className="stat-label">{action.label}</span>
            <strong>{action.title}</strong>
          </Link>
        ))}
      </section>

      <div className="home-section-head">
        <div>
          <div className="section-kicker">Modules</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.25 }}>判断、通知、振り返りまでを一列に</h2>
        </div>
        <Link href="/dashboard" className="link" style={{ fontSize: 13, whiteSpace: "nowrap" }}>全体を見る</Link>
      </div>

      <div className="grid-cards" style={{ marginBottom: 20 }}>
        {modules.map((m, i) => {
          const ModuleIcon = m.icon;

          return (
          <Link key={i} href={m.href} className="card card-hover no-underline animate-fade-in"
            style={{ animationDelay: `${i * 40}ms` }}>
            <div className="module-card-media" style={{ backgroundImage: `linear-gradient(180deg, rgba(11,18,32,0.08), rgba(11,18,32,0.68)), url(${m.image})` }}>
              <span className="module-card-icon"><ModuleIcon size={19} strokeWidth={1.8} /></span>
              <span className="module-card-index font-mono">0{i + 1}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 12, marginBottom: 6 }}>
              <div className="stat-label">{m.meta}</div>
              <ModuleIcon size={18} strokeWidth={1.8} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-espresso-ink)", marginBottom: 5 }}>{m.title}</div>
            <div style={{ fontSize: 12, color: "var(--color-muted-clay)", lineHeight: 1.5 }}>{m.desc}</div>
          </Link>
          );
        })}
      </div>

      <div className="card card-dashed" style={{ textAlign: "center", padding: "18px 24px" }}>
        <p style={{ fontSize: 12, color: "var(--color-muted-clay)" }}>
          Sprint 0-11 実装完了 / <Link href="/dashboard" className="link">ダッシュボード</Link>
        </p>
      </div>
    </div>
  );
}
