import Image from "next/image";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const message = errorMessage(params.error);
  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand">
          <Image src="/images/signal-logo.svg" alt="Signal" width={200} height={48} priority style={{ height: 38, width: "auto" }} />
          <span className="badge badge-outline">Private</span>
        </div>
        <div>
          <h1 className="page-title">ログイン</h1>
          <p className="page-subtitle">Signalは個人用のレビュー支援ツールです。</p>
        </div>
        {message ? <div className="login-error">{message}</div> : null}
        <form action="/api/auth/google" method="post" className="login-form">
          <input type="hidden" name="next" value={next} />
          <button className="btn btn-primary" type="submit">Googleでログイン</button>
        </form>
        <div className="divider" />
        <form action="/api/auth/login" method="post" className="login-form">
          <input type="hidden" name="next" value={next} />
          <label style={{ display: "grid", gap: 6 }}>
            <span className="stat-label">Admin token</span>
            <input className="settings-input" name="token" type="password" autoComplete="current-password" autoFocus />
          </label>
          <button className="btn btn-primary" type="submit">続行</button>
        </form>
      </section>
    </main>
  );
}

function safeNext(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function errorMessage(value?: string) {
  if (value === "forbidden") return "このGoogleアカウントは許可されていません。";
  if (value === "oauth") return "Googleログインに失敗しました。";
  if (value) return "トークンが一致しません。";
  return "";
}
