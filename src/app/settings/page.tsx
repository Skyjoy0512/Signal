export default function SettingsPage() {
  return (
    <>
      <header className="app-header">
        <div className="app-header-left">
          <span style={{ fontWeight: 600, fontSize: 16 }}>設定</span>
        </div>
      </header>
      <div className="page-header"><h1>設定</h1><p>プロフィール、LLMプロバイダー、通知設定</p></div>

      <div className="card mb-6">
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "var(--space-4)" }}>プロフィール</h3>
        <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
          <label className="form-label">表示名</label>
          <input className="form-input w-full" defaultValue="アレックス・キム" />
        </div>
        <div className="form-group">
          <label className="form-label">メールアドレス</label>
          <input className="form-input w-full" defaultValue="alex@signal.app" type="email" />
        </div>
      </div>

      <div className="card mb-6">
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "var(--space-4)" }}>LLMプロバイダー</h3>
        <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
          <label className="form-label">プロバイダー</label>
          <select className="form-input w-full" defaultValue="openai">
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="deepseek">DeepSeek</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">APIキー</label>
          <input className="form-input w-full" type="password" defaultValue="sk-••••••••" />
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "var(--space-4)" }}>通知</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {["LINE通知", "メール通知", "マーケットアラート"].map((label) => (
            <label key={label} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", cursor: "pointer", fontSize: 14 }}>
              <input type="checkbox" defaultChecked style={{ accentColor: "var(--accent)" }} />
              {label}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
