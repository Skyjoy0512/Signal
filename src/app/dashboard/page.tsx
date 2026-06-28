export default function DashboardPage() {
  return (
    <>
      <header className="app-header">
        <div className="app-header-left">
          <span style={{ fontWeight: 600, fontSize: 16 }}>ダッシュボード</span>
        </div>
        <div className="app-header-right">
          <button className="btn btn-primary btn-sm">スキャン実行</button>
        </div>
      </header>

      <div className="stats-grid mb-8">
        <div className="stat-card">
          <div className="stat-label">本日のシグナル</div>
          <div className="stat-value">24</div>
          <div className="stat-change up">+6 前日比</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">最優先レビュー</div>
          <div className="stat-value">5</div>
          <div className="stat-change up">S/A tier</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">勝率</div>
          <div className="stat-value">68<span style={{ fontSize: 16, color: "var(--muted)" }}>%</span></div>
          <div className="stat-change up">+3.2% 前月比</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">市場レジーム</div>
          <div className="stat-value" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>強気<span className="badge badge-neutral">リスクオン</span></div>
          <div className="stat-change" style={{ color: "var(--muted)" }}>TOPIX +0.8%</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-6)" }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "var(--space-4)" }}>シグナル分布</h3>
          {[
            { label: "S tier", pct: 78, count: 8, color: "#4ade80" },
            { label: "A tier", pct: 56, count: 6, color: "#60a5fa" },
            { label: "B tier", pct: 34, count: 4, color: "#fbbf24" },
            { label: "C tier", pct: 18, count: 2, color: "#f87171" },
          ].map((bar) => (
            <div key={bar.label} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
              <span style={{ width: 100, fontSize: 13, color: "var(--muted)", textAlign: "right", flexShrink: 0 }}>{bar.label}</span>
              <div style={{ flex: 1, height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${bar.pct}%`, background: bar.color, borderRadius: 4 }} />
              </div>
              <span style={{ width: 32, fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--muted)", flexShrink: 0 }}>{bar.count}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "var(--space-4)" }}>保留中レビュー</h3>
          {["7203 トヨタ自動車", "6758 ソニーG", "9984 ソフトバンクG", "8035 東エレク", "6861 キーエンス"].map((name) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-2) 0", borderBottom: "1px solid var(--border-light)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />
              <span style={{ fontSize: 14 }}>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
