import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-container" style={{ textAlign: "center", paddingTop: 72 }}>
      <div className="font-mono" style={{ fontSize: 56, fontWeight: 500, color: "var(--color-border-sand)", letterSpacing: "-0.03em", marginBottom: 8 }}>404</div>
      <h1 style={{ fontSize: 18, fontWeight: 400, letterSpacing: "-0.005em" }}>ページが見つかりません</h1>
      <p style={{ fontSize: 13, color: "var(--color-muted-clay)", marginTop: 4, marginBottom: 20 }}>お探しのページは存在しません。</p>
      <Link href="/" className="btn btn-primary no-underline" style={{ display: "inline-flex" }}>ホームに戻る</Link>
    </div>
  );
}
