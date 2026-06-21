"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page-container" style={{ paddingTop: 72 }}>
      <div className="card state-panel">
        <div className="state-panel-head">
          <div>
            <div className="stat-label">Error</div>
            <div className="state-panel-title">エラーが発生しました</div>
            <p className="state-panel-copy">{error.message || "予期せぬエラーです。"}</p>
          </div>
          <button onClick={reset} className="btn btn-primary">再試行</button>
        </div>
      </div>
    </div>
  );
}
