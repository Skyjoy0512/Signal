export default function IndustriesPage() {
  return (
    <>
      <header className="app-header">
        <div className="app-header-left">
          <span style={{ fontWeight: 600, fontSize: 16 }}>業界</span>
        </div>
      </header>
      <div className="page-header"><h1>業界分析</h1><p>東証33業種分類別の指標分布</p></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>業種</th><th>銘柄数</th><th>平均PER</th><th>平均PBR</th><th>平均ROE</th><th>売上高成長</th><th>配当利回り</th></tr></thead>
          <tbody>
            {[
              ["電気機器", 142, "18.5x", "2.1x", "11.8%", "+8.3%", "1.5%"],
              ["輸送用機器", 82, "10.2x", "1.1x", "10.2%", "+12.4%", "2.8%"],
              ["情報・通信", 78, "22.4x", "2.8x", "13.2%", "+6.8%", "1.2%"],
              ["化学", 65, "15.8x", "1.5x", "9.5%", "+4.2%", "2.1%"],
              ["医薬品", 48, "25.6x", "3.2x", "14.8%", "+7.5%", "1.8%"],
              ["小売", 55, "20.1x", "2.4x", "11.2%", "+5.1%", "1.4%"],
              ["銀行", 42, "8.5x", "0.6x", "7.2%", "+3.2%", "3.5%"],
              ["建設", 38, "12.4x", "1.0x", "8.8%", "+2.8%", "2.8%"],
            ].map((row) => (
              <tr key={row[0]}>
                <td style={{ fontWeight: 500 }}>{row[0]}</td>
                {row.slice(1).map((val, i) => (
                  <td key={i} style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}>{String(val)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
