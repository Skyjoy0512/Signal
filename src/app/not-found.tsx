import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-container" style={{ paddingTop: 72 }}>
      <div className="card state-panel">
        <div className="state-panel-head">
          <div>
            <div className="stat-label">404</div>
            <div className="state-panel-title">ページが見つかりません</div>
            <p className="state-panel-copy">URLが変わったか、存在しないページを開いています。</p>
          </div>
          <Link href="/" className="btn btn-primary no-underline">ホームに戻る</Link>
        </div>
      </div>
    </div>
  );
}
