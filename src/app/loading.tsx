export default function Loading() {
  return (
    <div className="page-container" style={{ textAlign: "center", paddingTop: 72 }}>
      <div style={{ width: 160, height: 20, borderRadius: 4, background: "var(--color-card-stone)", margin: "0 auto 8px" }} />
      <div style={{ width: 240, height: 12, borderRadius: 3, background: "var(--color-card-stone)", margin: "0 auto", opacity: 0.6 }} />
    </div>
  );
}
