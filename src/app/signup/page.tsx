import { SignupClient } from "./signup-client";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const error = errorMessage(params.error);
  const info = infoMessage(params.message);
  const googleEnabled = process.env.SIGNAL_GOOGLE_AUTH_ENABLED === "true";

  return (
    <div className="auth-shell">
      {/* Left branding panel */}
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
            「データに基づく投資判断が、これほど簡単になったことはありません。週末の分析が平日のルーティンに変わりました。」
          </p>
          <div className="auth-quote-author">
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              background: "#374151", color: "#d1d5db",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 600, flexShrink: 0,
            }}>
              SM
            </div>
            佐藤 美咲 &mdash; 会社員兼投資家
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <SignupClient
        next={next}
        error={error}
        info={info}
        googleEnabled={googleEnabled}
      />
    </div>
  );
}

function safeNext(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function infoMessage(value?: string) {
  if (value === "check_email")
    return "確認メールを送信しました。受信トレイをご確認ください。";
  return "";
}

function errorMessage(value?: string) {
  if (value === "missing_fields")
    return "すべての項目を入力してください。";
  if (value === "weak_password")
    return "パスワードは8文字以上で入力してください。";
  if (value === "passwords_dont_match")
    return "パスワードが一致しません。";
  if (value === "terms_not_accepted")
    return "利用規約に同意してください。";
  if (value === "email_in_use")
    return "このメールアドレスは既に登録されています。";
  if (value === "signup_failed") return "登録に失敗しました。";
  if (value === "forbidden")
    return "このアカウントは許可されていません。";
  if (value) return "登録に失敗しました。";
  return "";
}
