"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { RefreshCw, ShieldAlert, ShieldCheck, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/visual-primitives";

function PositionRow({ sym, pnl, pnlPct, status }: { sym: string; pnl: number; pnlPct: number; status: string }) {
  const isWin = pnl >= 0;
  return (
    <div className="position-row">
      <div>
        <span className="position-symbol">{sym}</span>
        <div className="position-meta">
          <span className="badge badge-outline">{status}</span>
          <span className="stat-sub">手動 / ペーパー</span>
        </div>
      </div>
      <div className="position-pnl">
        <span style={{ fontSize: 12, fontWeight: 500, color: isWin ? "var(--color-deep-moss)" : "var(--color-ember-orange)" }}>
          {isWin ? "+" : ""}¥{pnl.toLocaleString()}
        </span>
        <span style={{ fontSize: 11, color: isWin ? "var(--color-deep-moss)" : "var(--color-ember-orange)", marginLeft: 6 }}>
          {isWin ? "+" : ""}{pnlPct}%
        </span>
      </div>
    </div>
  );
}

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
      } catch {
        // Keep the local demo state when the scan endpoint is unavailable.
      }
    }

    void loadInitialState();
    return () => {
      ignore = true;
    };
  }, []);

  const totalPnl = positions.reduce((sum, p) => sum + (p.current - p.entry) * p.qty, 0);
  const totalPnlPct = positions.reduce((sum, p) => sum + ((p.current - p.entry) / p.entry) * 100, 0) / positions.length;

  return (
    <div className="page-container">
      <div className="page-header page-header-actions">
        <div className="page-header-copy">
          <h1 className="page-title">ポジション</h1>
          <p className="page-subtitle">手動・ペーパー取引の管理</p>
        </div>
        <div className="page-action-stack">
          <Button onClick={fetchState} variant="outline" size="sm"><RefreshCw size={14} />更新</Button>
        </div>
      </div>

      <div className="grid-stats" style={{ marginBottom: 14 }}>
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div className="stat-label">キルスイッチ</div>
              <div className="stat-value stat-value-sm" style={{ color: ks.allowed ? "var(--color-signal-green)" : "#dc2626" }}>
                {ks.allowed ? "正常" : "ブロック中"}
              </div>
              <div className="stat-sub">連敗・日次損失の安全装置</div>
            </div>
            <span className="semantic-icon">{ks.allowed ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}</span>
          </div>
          {ks.reason && <div className="stat-sub" style={{ color: "var(--color-ember-orange)" }}>{ks.reason}</div>}
        </div>
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div className="stat-label">保有中</div>
              <div className="stat-value stat-value-sm">{positions.length}</div>
              <div className="stat-sub">{showPositions ? "データあり" : "更新してください"}</div>
            </div>
            <span className="semantic-icon"><WalletCards size={18} /></span>
          </div>
        </div>
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div className="stat-label">評価損益</div>
              <div className="stat-value stat-value-sm font-mono" style={{ color: totalPnl >= 0 ? "var(--color-deep-moss)" : "#dc2626" }}>
                {totalPnl >= 0 ? "+" : ""}¥{totalPnl.toLocaleString()}
              </div>
              <div className="stat-sub" style={{ color: totalPnlPct >= 0 ? "var(--color-deep-moss)" : "#dc2626" }}>
                {totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(1)}%
              </div>
            </div>
            <span className="semantic-icon">{totalPnl >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}</span>
          </div>
        </div>
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div className="stat-label">勝率</div>
              <div className="stat-value stat-value-sm" style={{ color: "var(--color-muted-clay)" }}>--</div>
              <div className="stat-sub">取引データ不足</div>
            </div>
            <ScoreRing value={0} label="準備中" />
          </div>
        </div>
      </div>

      {/* Positions list */}
      {showPositions && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="stat-label">ポジション一覧</div>
          <div className="position-list">
            {positions.map((p, i) => {
              const pnl = (p.current - p.entry) * p.qty;
              const pnlPct = ((p.current - p.entry) / p.entry * 100).toFixed(1);
              return <PositionRow key={i} sym={p.sym} pnl={pnl} pnlPct={Number(pnlPct)} status="open" />;
            })}
          </div>
        </div>
      )}

      {!showPositions && (
        <div className="card card-dashed empty-state">
          <div className="empty-state-media">
            <Image
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=440&q=80&fit=crop"
              alt=""
              fill
              sizes="220px"
            />
          </div>
          <div className="empty-state-title">「更新」を押してデータを読み込んでください</div>
          <div className="empty-state-copy">スキャン実行後にポジションデータが表示されます。評価損益と安全装置をここで確認します。</div>
        </div>
      )}
    </div>
  );
}
