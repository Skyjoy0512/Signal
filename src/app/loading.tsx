export default function Loading() {
  return (
    <div className="page-container" style={{ paddingTop: 72 }}>
      <div className="card state-panel">
        <div className="state-panel-head">
          <div>
            <div className="stat-label">Loading</div>
            <div className="state-panel-title">データを読み込み中</div>
            <p className="state-panel-copy">画面に必要な情報を準備しています。</p>
          </div>
          <span className="badge badge-outline">読み込み中</span>
        </div>
        <div className="skeleton-grid">
          {[0, 1, 2].map((item) => (
            <div key={item} className="skeleton-card">
              <div className="skeleton-line short" />
              <div className="skeleton-line long" />
              <div className="skeleton-line medium" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
