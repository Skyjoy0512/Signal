"use client";

import { useState, useEffect, useCallback } from "react";

export default function PositionsPage() {
  const [ks, setKs] = useState<{ allowed: boolean; reason?: string }>({ allowed: true });
  const [positions] = useState([
    { sym: "7203.T", entry: 3080, current: 3120, qty: 100, opened: "2024-06-15" },
    { sym: "8035.T", entry: 34200, current: 35100, qty: 10, opened: "2024-06-18" },
  ]);
  const [showPositions, setShowPositions] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs/daily-scan", { method: "POST" });
      const data = await res.json();
      if (data.success) setShowPositions(true);
      setKs(data.blocked ? { allowed: false, reason: data.reason } : { allowed: true });
    } catch { /* keep */ }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadInitialState() {
      try {
        const res = await fetch("/api/jobs/daily-scan", { method: "POST" });
        const data = await res.json();
        if (ignore) return;
        if (data.success) setShowPositions(true);
        setKs(data.blocked ? { allowed: false, reason: data.reason } : { allowed: true });
      } catch { /* keep local demo state */ }
    }
    void loadInitialState();
    return () => { ignore = true; };
  }, []);

  const totalPnl = positions.reduce((sum, p) => sum + (p.current - p.entry) * p.qty, 0);
  const totalPnlPct = positions.reduce((sum, p) => sum + ((p.current - p.entry) / p.entry) * 100, 0) / positions.length;

  return (
    <>
      <header className="app-header">
        <div className="app-header-left">
          <span style={{ fontWeight: 600, fontSize: 16 }}>ポジション</span>
        </div>
        <div className="app-header-right">
          <button className="btn btn-primary btn-sm" onClick={fetchState}>更新</button>
        </div>
      </header>

      <div className="stats-grid mb-8">
        <div className="stat-card">
          <div className="stat-label">キルスイッチ</div>
          <div className="stat-value" style={{ fontSize: 20, color: ks.allowed ? "var(--success)" : "var(--danger)" }}>
            {ks.allowed ? "正常" : "ブロック中"}
          </div>
          <div className="stat-change">連敗・日次損失の安全装置</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">保有中</div>
          <div className="stat-value">{positions.length}</div>
          <div className="stat-change">{showPositions ? "データあり" : "更新してください"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">評価損益</div>
          <div className="stat-value" style={{ fontSize: 24, color: totalPnl >= 0 ? "var(--success)" : "var(--danger)" }}>
            {totalPnl >= 0 ? "+" : ""}¥{totalPnl.toLocaleString()}
          </div>
          <div className={`stat-change ${totalPnlPct >= 0 ? "up" : "down"}`}>
            {totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(1)}%
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">勝率</div>
          <div className="stat-value" style={{ color: "var(--muted)" }}>--</div>
          <div className="stat-change">取引データ不足</div>
        </div>
      </div>

      {!showPositions ? (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-10)" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "var(--space-2)" }}>「更新」を押してデータを読み込んでください</h3>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>スキャン実行後にポジションデータが表示されます。</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>銘柄</th>
                <th>エントリー価格</th>
                <th>現在価格</th>
                <th>数量</th>
                <th>損益</th>
                <th>損益率</th>
                <th>ステータス</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p, i) => {
                const pnl = (p.current - p.entry) * p.qty;
                const pnlPct = ((p.current - p.entry) / p.entry * 100).toFixed(1);
                const isWin = pnl >= 0;
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{p.sym}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>¥{p.entry.toLocaleString()}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>¥{p.current.toLocaleString()}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{p.qty}</td>
                    <td style={{ fontFamily: "var(--font-mono)", color: isWin ? "var(--success)" : "var(--danger)" }}>
                      {isWin ? "+" : ""}¥{pnl.toLocaleString()}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", color: isWin ? "var(--success)" : "var(--danger)" }}>
                      {isWin ? "+" : ""}{pnlPct}%
                    </td>
                    <td><span className="badge badge-neutral">open</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
