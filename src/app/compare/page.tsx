export default function ComparePage() {
  return (
    <>
      <header className="app-header">
        <div className="app-header-left">
          <span style={{ fontWeight: 600, fontSize: 16 }}>比較</span>
        </div>
        <div className="app-header-right">
          <button className="btn btn-secondary btn-sm">銘柄を追加</button>
        </div>
      </header>
      <div className="page-header"><h1>銘柄比較</h1><p>最大5銘柄の財務指標を横比較</p></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>指標</th><th>7203 トヨタ</th><th>6758 ソニーG</th><th>9984 SBG</th><th>8035 東エレク</th></tr></thead>
          <tbody>
            {[
              ["PER", "10.2x", "18.5x", "25.3x", "22.1x"],
              ["PBR", "1.1x", "2.4x", "1.8x", "3.2x"],
              ["ROE", "10.8%", "12.3%", "7.2%", "15.6%"],
              ["売上高成長率", "+12.4%", "+8.7%", "+5.2%", "+18.3%"],
              ["営業利益率", "10.2%", "12.8%", "15.3%", "22.4%"],
              ["配当利回り", "3.2%", "0.6%", "0.4%", "1.1%"],
              ["時価総額", "¥48.2T", "¥17.8T", "¥14.5T", "¥15.2T"],
            ].map((row) => (
              <tr key={row[0]}>
                <td style={{ fontWeight: 500, color: "var(--muted)" }}>{row[0]}</td>
                {row.slice(1).map((val, i) => (
                  <td key={i} style={{ fontFamily: "var(--font-mono)" }}>{val}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
