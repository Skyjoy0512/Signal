import { Bell, Bot, Database, KeyRound, LineChart, ShieldAlert } from "lucide-react";

export default function SettingsPage() {
  const vars = [
    { key: "SUPABASE_URL", desc: "Postgresデータベース接続先", required: true },
    { key: "SUPABASE_ANON_KEY", desc: "クライアント側読み取り用", required: true },
    { key: "SUPABASE_SERVICE_ROLE_KEY", desc: "サーバー側全権限", required: true },
    { key: "DEEPSEEK_API_KEY", desc: "LLM推論・ワーカーモデル用", required: true },
    { key: "LINE_CHANNEL_ACCESS_TOKEN", desc: "プッシュメッセージ認証", required: true },
    { key: "LINE_CHANNEL_SECRET", desc: "Webhook署名検証", required: true },
    { key: "LINE_USER_ID", desc: "通知の送信先", required: true },
    { key: "YFINANCE_PROXY_URL", desc: "市場データ取得プロキシ", required: false },
    { key: "DAILY_LLM_COST_LIMIT_USD", desc: "LLMコスト上限（既定: $3.00）", required: false },
  ];

  const sys = [
    { title: "LLMプロバイダー", desc: "DeepSeek V4 Pro（推論）/ Flash（ワーカー）。JSON Schema検証 + 修復パイプライン。", icon: Bot },
    { title: "通知", desc: "LINE Messaging API。朝まとめ + 即時通知。予算: 10件/日、クールダウン: 1時間/銘柄。", icon: Bell },
    { title: "市場データ", desc: "YFinance v8 chart API。日本株は .T サフィックスを自動付加。プロキシ対応。", icon: LineChart },
    { title: "キルスイッチ", desc: "3連敗 → 警告、5連敗 → ブロック。日次損失閾値でもブロック。手動解除可能。", icon: ShieldAlert },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">設定</h1>
        <p className="page-subtitle">
          <code className="font-mono" style={{ background: "var(--color-border-sand)", padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>.env.local</code> に環境変数を設定してください
        </p>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="semantic-icon"><Database size={18} /></span>
          <div>
            <div className="stat-label">環境変数一覧</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>外部サービス接続に必要なキー</div>
            <p className="meaning-note">必須キーが揃うと、DB保存・LLMレビュー・LINE通知・市場データ取得が有効になります。</p>
          </div>
        </div>
        <div className="system-list">
          {vars.map((v, i) => (
            <div key={i} className="system-row">
              <div className="system-key">
                <KeyRound size={13} style={{ display: "inline", marginRight: 6, color: "var(--color-edge-ash)" }} />
                <code>{v.key}</code>
                <span>{v.desc}</span>
              </div>
              <span className={v.required ? "badge badge-dark" : "badge badge-outline"}>{v.required ? "必須" : "任意"}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-cards">
        {sys.map((s, i) => (
          <div key={i} className="card animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span className="semantic-icon"><s.icon size={18} /></span>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--color-muted-clay)", lineHeight: 1.5 }}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
