import Link from "next/link";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const error = params.error === "1" || params.error === "unauthorized" ? "トークンが一致しません。" : "";

  return (
    <div className="auth-shell">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-icon">S</div>
          Signal
        </div>
        <div className="auth-left-content">
          <div className="auth-stars">
            {[...Array(5)].map((_, i) => (
              <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            ))}
          </div>
          <p className="auth-quote">
            「毎朝5分で市場全体を把握。感情ではなくデータで判断できるようになりました。」
          </p>
          <div className="auth-quote-author">
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              background: "#374151", color: "#d1d5db",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 600, flexShrink: 0,
            }}>
              TK
            </div>
            田中 健一 &mdash; 個人投資家
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap">
          <h2>管理者ログイン</h2>
          <p className="auth-subtitle">管理用トークンを入力してください。</p>

          {error ? <div className="auth-error">{error}</div> : null}

          <form action="/api/auth/login" method="post" className="auth-form">
            <input type="hidden" name="next" value={next} />
            <div className="od-form-group">
              <label className="od-form-label" htmlFor="admin-token">
                Admin token
              </label>
              <input
                className="od-form-input"
                id="admin-token"
                name="token"
                type="password"
                autoComplete="current-password"
                autoFocus
                required
              />
            </div>
            <button className="od-btn-primary" type="submit">
              続行
            </button>
          </form>

          <p className="auth-footer">
            <Link href={`/login${next !== "/" ? `?next=${next}` : ""}`}>
              ログインに戻る
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function safeNext(value?: string) {
  if (!value || value === "/" || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}
