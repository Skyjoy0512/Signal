import Link from "next/link";

export default function LandingPage() {
  return (
    <>
      {/* Nav */}
      <nav className="landing-nav">
        <Link href="/" className="landing-nav-brand">
          <div className="auth-brand-icon" style={{ width: 24, height: 24, fontSize: 12 }}>S</div>
          Signal
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="landing-nav-links">
            <Link href="#features">機能</Link>
            <Link href="#about">概要</Link>
            <Link href="/login">ログイン</Link>
            <Link href="/signup" className="ld-btn-primary" style={{ padding: "6px 12px", fontSize: 13, borderRadius: 6 }}>はじめる</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <h1>毎朝の投資判断を、<br />データで変える</h1>
        <p>Signal は個人投資家のための日本株分析プラットフォームです。テクニカル指標、財務分析、LLMインサイトを統合し、感情ではなくデータに基づく投資判断を支援します。</p>
        <div className="landing-hero-actions">
          <Link href="/signup" className="ld-btn-primary">無料トライアルを始める</Link>
          <Link href="/dashboard" className="ld-btn-secondary">デモを見る</Link>
        </div>
      </section>

      {/* Logo bar */}
      <section style={{ padding: "0 32px 64px", maxWidth: 1000, margin: "0 auto" }}>
        <p style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "var(--od-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 24 }}>3,500人以上の個人投資家が利用</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 48, flexWrap: "wrap", opacity: 0.35, filter: "grayscale(1)" }}>
          {["NIKKEI", "TOYOKEIZAI", "KABUTAN", "SBI", "MATSUI"].map((name) => (
            <span key={name} style={{ fontFamily: "var(--od-font-display)", fontWeight: 700, fontSize: 18 }}>{name}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="landing-section" id="features">
        <div className="landing-section-label">機能</div>
        <h2>投資判断に必要なすべてを、<br />一つのプラットフォームに</h2>
        <p className="lead">テクニカル指標、財務分析、LLMインサイトを統合。個人投資家が感情ではなくデータで判断するためのツールです。</p>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="feature-card-icon" dangerouslySetInnerHTML={{ __html: f.icon }} />
              <h4>{f.title}</h4>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="landing-section" id="about">
        <div className="landing-section-label">概要</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
          <div>
            <h2 style={{ marginBottom: 24 }}>Signal について</h2>
            <p style={{ fontSize: 15, color: "var(--od-muted)", lineHeight: 1.7, marginBottom: 16 }}>Signalは、2024年に誕生した日本株分析プラットフォームです。個人投資家が「感情」ではなく「データ」に基づいて判断できるように、テクニカル分析・財務分析・大規模言語モデル（LLM）によるインサイトを一つのダッシュボードに統合しました。</p>
            <p style={{ fontSize: 15, color: "var(--od-muted)", lineHeight: 1.7 }}>毎朝のルーティンをわずか5分に短縮し、プロのアナリストと同じレベルの情報を、誰でも手軽に活用できる環境を提供します。</p>
          </div>
          <div style={{ display: "flex", gap: 32 }}>
            {[{ num: "3,500+", label: "アクティブユーザー" }, { num: "33", label: "カバレッジ業種" }, { num: "4.8", label: "ユーザー評価" }].map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: "var(--od-font-display)", fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--od-fg)" }}>{s.num}</div>
                <div style={{ fontSize: 13, color: "var(--od-muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <h2>毎朝の判断を、データで変えませんか。</h2>
        <p>Signal で感情ではなくデータに基づく投資判断を始めましょう。</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/signup" className="ld-btn-primary">無料で始める</Link>
          <Link href="/dashboard" className="ld-btn-secondary">デモを見る</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <span>&copy; 2026 Signal</span>
        <div style={{ display: "flex", gap: 24 }}>
          <a href="#" style={{ fontSize: 13, color: "var(--od-muted)", textDecoration: "none" }}>プライバシー</a>
          <a href="#" style={{ fontSize: 13, color: "var(--od-muted)", textDecoration: "none" }}>利用規約</a>
          <a href="#" style={{ fontSize: 13, color: "var(--od-muted)", textDecoration: "none" }}>ステータス</a>
        </div>
      </footer>
    </>
  );
}

const FEATURES = [
  {
    title: "シグナル検出",
    desc: "テクニカル指標と独自スコアリングでエントリー候補を自動検出。毎朝のルーティンを5分に。",
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  },
  {
    title: "企業分析",
    desc: "財務諸表、バリュエーション、業界比較を統合。深掘りたい銘柄をあらゆる角度から検証。",
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  },
  {
    title: "結果レビュー",
    desc: "1週間・1ヶ月・3ヶ月のサイクルで投資判断を振り返り。勝率・リターンを可視化して次の一手に活かす。",
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  },
  {
    title: "業界マップ",
    desc: "東証33業種をカバレッジ。売上高・利益率・ROEで業界の立ち位置を把握。",
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
  },
  {
    title: "スマート通知",
    desc: "LINEで毎朝の市場サマリーを配信。重要なシグナルはリアルタイム通知で見逃さない。",
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  },
  {
    title: "キルスイッチ",
    desc: "連続損失の自動検知と日次損失制限で、感情的なオーバートレードを防止。",
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
  },
];
