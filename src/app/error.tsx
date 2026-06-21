"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page-container" style={{ textAlign: "center", paddingTop: 72 }}>
      <div className="font-mono" style={{ fontSize: 32, color: "var(--color-border-sand)", marginBottom: 12 }}>&#9888;</div>
      <h1 style={{ fontSize: 18, fontWeight: 400, letterSpacing: "-0.005em" }}>エラーが発生しました</h1>
      <p style={{ fontSize: 13, color: "var(--color-muted-clay)", marginTop: 4, marginBottom: 20 }}>{error.message || "予期せぬエラーです。"}</p>
      <button onClick={reset} className="btn btn-primary">再試行</button>
    </div>
  );
}
