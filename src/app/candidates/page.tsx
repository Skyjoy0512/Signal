export default function CandidatesPage() {
  return (
    <>
      <header className="app-header">
        <div className="app-header-left">
          <span style={{ fontWeight: 600, fontSize: 16 }}>候補銘柄</span>
        </div>
        <div className="app-header-right">
          <button className="btn btn-secondary btn-sm">絞り込み</button>
        </div>
      </header>

      <div className="page-header">
        <h1>候補銘柄</h1>
        <p>シグナル検出された全銘柄のスコアリング詳細</p>
      </div>

      <div className="mb-4" style={{ display: "flex", gap: "var(--space-2)" }}>
        {["すべて", "S", "A", "B", "C", "D"].map((t) => (
          <button key={t} className={`btn btn-sm ${t === "すべて" ? "btn-primary" : "btn-ghost"}`}>{t === "すべて" ? "すべて (24)" : `Tier ${t}`}</button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>銘柄</th><th>ティア</th><th>候補度</th><th>タイミング</th><th>リスク</th><th>確信度</th><th>戦略</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: "7203 トヨタ自動車", tier: "S", s: 92, t: 88, r: 18, c: 85, tag: "トレンドフォロー" },
              { name: "6758 ソニーG", tier: "S", s: 89, t: 82, r: 22, c: 90, tag: "モメンタム" },
              { name: "9984 ソフトバンクG", tier: "A", s: 82, t: 75, r: 30, c: 78, tag: "リバーサル" },
              { name: "8035 東エレク", tier: "A", s: 78, t: 80, r: 25, c: 82, tag: "トレンドフォロー" },
              { name: "6861 キーエンス", tier: "A", s: 76, t: 72, r: 28, c: 80, tag: "ブレイクアウト" },
              { name: "8306 三菱UFJ", tier: "B", s: 65, t: 60, r: 40, c: 68, tag: "バリュー" },
              { name: "9433 KDDI", tier: "B", s: 62, t: 58, r: 35, c: 70, tag: "ディフェンシブ" },
              { name: "4502 武田薬品", tier: "C", s: 48, t: 45, r: 50, c: 55, tag: "待機" },
            ].map((row) => (
              <tr key={row.name}>
                <td style={{ fontWeight: 500 }}>{row.name}</td>
                <td><span className={`badge ${row.tier === "S" ? "badge-success" : row.tier === "A" ? "badge-success" : row.tier === "C" ? "badge-warn" : "badge-neutral"}`}>{row.tier}</span></td>
                <td style={{ fontFamily: "var(--font-mono)" }}>{row.s}</td>
                <td style={{ fontFamily: "var(--font-mono)" }}>{row.t}</td>
                <td style={{ fontFamily: "var(--font-mono)" }}>{row.r}</td>
                <td style={{ fontFamily: "var(--font-mono)" }}>{row.c}</td>
                <td><span style={{ fontSize: 13, color: "var(--muted)" }}>{row.tag}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
