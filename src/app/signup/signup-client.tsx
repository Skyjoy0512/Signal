"use client";

type Props = {
  next: string;
  error: string;
  info: string;
  googleEnabled: boolean;
};

export function SignupClient({ next, error, info, googleEnabled }: Props) {
  return (
    <div className="auth-right">
      <div className="auth-form-wrap">
        <h2>アカウント作成</h2>
        <p className="auth-subtitle">
          データに基づく投資判断を、今日から始めましょう。
        </p>

        {info ? <div className="auth-info">{info}</div> : null}
        {error ? <div className="auth-error">{error}</div> : null}

        <form action="/api/auth/signup" method="post" className="auth-form">
          <input type="hidden" name="next" value={next} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--od-space-4)" }}>
            <div className="od-form-group">
              <label className="od-form-label" htmlFor="first-name">
                名
              </label>
              <input
                className="od-form-input"
                id="first-name"
                name="first_name"
                type="text"
                placeholder="太郎"
                autoComplete="given-name"
                required
              />
            </div>
            <div className="od-form-group">
              <label className="od-form-label" htmlFor="last-name">
                姓
              </label>
              <input
                className="od-form-input"
                id="last-name"
                name="last_name"
                type="text"
                placeholder="山田"
                autoComplete="family-name"
                required
              />
            </div>
          </div>

          <div className="od-form-group">
            <label className="od-form-label" htmlFor="email">
              メールアドレス
            </label>
            <input
              className="od-form-input"
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              autoFocus
              required
            />
          </div>

          <div className="od-form-group">
            <label className="od-form-label" htmlFor="password">
              パスワード
            </label>
            <input
              className="od-form-input"
              id="password"
              name="password"
              type="password"
              placeholder="パスワードを作成"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <span className="od-form-hint">
              8文字以上で、数字と特殊文字を含めてください。
            </span>
          </div>

          <div className="od-form-group">
            <label className="od-form-label" htmlFor="password-confirm">
              パスワード（確認）
            </label>
            <input
              className="od-form-input"
              id="password-confirm"
              name="password_confirm"
              type="password"
              placeholder="パスワードを再入力"
              autoComplete="new-password"
              required
            />
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              fontSize: 13,
              cursor: "pointer",
              lineHeight: 1.4,
              color: "var(--od-muted)",
            }}
          >
            <input
              type="checkbox"
              name="terms"
              value="1"
              style={{ accentColor: "var(--od-accent)", marginTop: 2 }}
              required
            />
            <span>
              <a href="#" style={{ fontWeight: 500, color: "var(--od-fg)", textDecoration: "none" }}>
                利用規約
              </a>
              および
              <a href="#" style={{ fontWeight: 500, color: "var(--od-fg)", textDecoration: "none" }}>
                プライバシーポリシー
              </a>
              に同意します
            </span>
          </label>

          <button className="od-btn-primary" type="submit">
            アカウント作成
          </button>

          <div className="auth-divider">または</div>

          {googleEnabled ? (
            <form action="/api/auth/google" method="post">
              <input type="hidden" name="next" value={next} />
              <button className="od-btn-google" type="submit">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Googleで続ける
              </button>
            </form>
          ) : null}
        </form>

        <p className="auth-footer">
          すでにアカウントをお持ちですか？{" "}
          <a href={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}>
            ログイン
          </a>
        </p>
      </div>
    </div>
  );
}
