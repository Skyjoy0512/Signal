export default function ReviewPage() {
  return (
    <>
      <header className="app-header">
        <div className="app-header-left">
          <span style={{ fontWeight: 600, fontSize: 16 }}>レビュー</span>
        </div>
      </header>

      <div className="page-header">
        <h1>投資レビュー</h1>
        <p>1週間・1ヶ月・3ヶ月の投資判断を振り返り</p>
      </div>

      <div className="stats-grid mb-8">
        <div className="stat-card"><div className="stat-label">勝率</div><div className="stat-value">68%</div><div className="stat-change up">+3.2% 前月比</div></div>
        <div className="stat-card"><div className="stat-label">累積リターン</div><div className="stat-value">+12.4%</div><div className="stat-change up">TOPIX比 +5.2%</div></div>
        <div className="stat-card"><div className="stat-label">平均RR</div><div className="stat-value">2.4</div><div className="stat-change up">目標 2.0以上</div></div>
        <div className="stat-card"><div className="stat-label">レビュー待ち</div><div className="stat-value">5</div><div className="stat-change" style={{ color: "var(--warn)" }}>期限切れ 2件</div></div>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>銘柄</th><th>エントリー日</th><th>結果</th><th>リターン</th><th>RR</th><th>レビュー期限</th><th>ステータス</th></tr></thead>
          <tbody>
            {[
              { name: "7203 トヨタ", date: "06-18", result: "利益確定", ret: "+8.2%", rr: "3.1", due: "06-25", status: "完了" },
              { name: "6758 ソニーG", date: "06-15", result: "利益確定", ret: "+5.4%", rr: "2.8", due: "06-22", status: "完了" },
              { name: "9984 SBG", date: "06-10", result: "ストップロス", ret: "-3.1%", rr: "1.5", due: "06-17", status: "要確認" },
              { name: "8035 東エレク", date: "06-22", result: "保有中", ret: "+1.2%", rr: "-", due: "06-29", status: "保留中" },
              { name: "6861 キーエンス", date: "06-20", result: "保有中", ret: "-0.8%", rr: "-", due: "06-27", status: "保留中" },
            ].map((row) => (
              <tr key={row.name}>
                <td style={{ fontWeight: 500 }}>{row.name}</td>
                <td style={{ fontFamily: "var(--font-mono)" }}>{row.date}</td>
                <td>{row.result}</td>
                <td style={{ fontFamily: "var(--font-mono)", color: row.ret.startsWith("+") ? "var(--success)" : row.ret.startsWith("-") ? "var(--danger)" : "var(--muted)" }}>{row.ret}</td>
                <td style={{ fontFamily: "var(--font-mono)" }}>{row.rr}</td>
                <td style={{ fontFamily: "var(--font-mono)" }}>{row.due}</td>
                <td><span className={`badge ${row.status === "完了" ? "badge-success" : row.status === "要確認" ? "badge-warn" : "badge-neutral"}`}>{row.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
