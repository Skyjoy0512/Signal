"use client";

import { useState } from "react";

type Props = {
  next: string;
  error: string;
  info: string;
  googleEnabled: boolean;
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function SocialButtons({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  return (
    <>
      <div className="auth-divider">または</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--od-space-2)" }}>
        {googleEnabled ? (
          <form action="/api/auth/google" method="post">
            <input type="hidden" name="next" value={next} />
            <button className="od-btn-google" type="submit">
              <GoogleIcon />
              Googleで続ける
            </button>
          </form>
        ) : null}
        <div style={{ display: "flex", gap: "var(--od-space-2)" }}>
          <form action="/api/auth/github" method="post" style={{ flex: 1 }}>
            <input type="hidden" name="next" value={next} />
            <button className="od-btn-google" type="submit" style={{ gap: 8, fontSize: 14 }}>
              <GitHubIcon />
              GitHub
            </button>
          </form>
          <form action="/api/auth/twitter" method="post" style={{ flex: 1 }}>
            <input type="hidden" name="next" value={next} />
            <button className="od-btn-google" type="submit" style={{ gap: 8, fontSize: 14 }}>
              <XIcon />
              X
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export function AuthClient({ next, error, info, googleEnabled }: Props) {
  const [tab, setTab] = useState<"magiclink" | "password">("magiclink");

  return (
    <div className="auth-right">
      <div className="auth-form-wrap">
        <h2>お帰りなさい</h2>
        <p className="auth-subtitle">
          アカウントにアクセスするには認証情報を入力してください。
        </p>

        {info ? <div className="auth-info">{info}</div> : null}
        {error ? <div className="auth-error">{error}</div> : null}

        <div className="auth-tabs">
          <button
            className={`auth-tab${tab === "magiclink" ? " active" : ""}`}
            onClick={() => setTab("magiclink")}
          >
            マジックリンクを送信
          </button>
          <button
            className={`auth-tab${tab === "password" ? " active" : ""}`}
            onClick={() => setTab("password")}
          >
            パスワード
          </button>
        </div>

        <div className="auth-form">
          <div className={`auth-form-panel${tab === "magiclink" ? " active" : ""}`}>
            <form action="/api/auth/magiclink" method="post">
              <input type="hidden" name="next" value={next} />
              <div className="od-form-group" style={{ marginBottom: "var(--od-space-5)" }}>
                <label className="od-form-label" htmlFor="email-magic">
                  メールアドレス
                </label>
                <input
                  className="od-form-input"
                  id="email-magic"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>
              <button className="od-btn-primary" type="submit">
                マジックリンクを送信
              </button>
            </form>
          </div>

          <div className={`auth-form-panel${tab === "password" ? " active" : ""}`}>
            <form action="/api/auth/signin" method="post">
              <input type="hidden" name="next" value={next} />
              <div className="od-form-group">
                <label className="od-form-label" htmlFor="email-pw">
                  メールアドレス
                </label>
                <input
                  className="od-form-input"
                  id="email-pw"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
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
                  placeholder="パスワードを入力"
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="auth-form-row">
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    name="remember"
                    value="1"
                    style={{ accentColor: "var(--od-accent)" }}
                  />
                  ログイン状態を保存
                </label>
                <a
                  href="#"
                  style={{ fontSize: 13, fontWeight: 500, color: "var(--od-fg)", textDecoration: "none" }}
                  onClick={(e) => { e.preventDefault(); }}
                >
                  パスワードをお忘れですか？
                </a>
              </div>
              <button className="od-btn-primary" type="submit">
                ログイン
              </button>
            </form>
            <SocialButtons next={next} googleEnabled={googleEnabled} />
          </div>
        </div>

        <p className="auth-footer">
          アカウントをお持ちでないですか？{" "}
          <a href={`/signup${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}>
            アカウント作成
          </a>
        </p>

        <p className="auth-footer" style={{ marginTop: "var(--od-space-2)" }}>
          <a href={`/login/admin${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}>
            管理者ログイン
          </a>
        </p>
      </div>
    </div>
  );
}
