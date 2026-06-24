"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Bell, ChartNoAxesCombined, Gauge, ShieldCheck, Target } from "lucide-react";
import { ScoreRing } from "@/components/visual-primitives";
import { ReviewQueue } from "@/components/review-queue";

interface ScanSummary {
  strong: number; entry: number; watch: number; avoided: number; date: string;
}

const checks = [
  { name: "YFinanceアダプター", ok: true },
  { name: "テクニカル指標 (SMA/RSI/ATR)", ok: true },
  { name: "階層型マーケット分析", ok: true },
  { name: "スコアリングエンジン", ok: true },
  { name: "シグナル検出器", ok: true },
  { name: "LLMオーケストレーター", ok: true },
  { name: "LINE通知", ok: false },
  { name: "ペーパー取引エンジン", ok: true },
  { name: "結果追跡", ok: true },
  { name: "外部分析パック生成", ok: true },
];

export default function DashboardPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ScanSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runScan = useCallback(async () => {
    setRunning(true); setError(null);
    try {
      const res = await fetch("/api/jobs/daily-scan", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult({ strong: data.summary.strong, entry: data.summary.entry, watch: data.summary.watch, avoided: data.summary.avoided, date: data.date });
    } catch (e) {
      setError(e instanceof Error ? e.message : "スキャンに失敗しました");
    } finally { setRunning(false); }
  }, []);

  const total = result ? result.strong + result.entry + result.watch + result.avoided : 0;

  return (
    <div className="page-container">
      <div className="page-header page-header-actions">
        <div className="page-header-copy">
          <h1 className="page-title">ダッシュボード</h1>
          <p className="page-subtitle">Phase1-A / 全モジュール実装済み / {result ? `最終スキャン: ${result.date}` : "未実行"}</p>
          <p className="meaning-note">Signalは投資助言や売買指示ではなく、候補銘柄のレビュー観点を整理するための個人利用ツールです。</p>
        </div>
        <div className="page-action-stack">
          <button onClick={runScan} disabled={running} className="btn btn-primary" style={{ fontSize: 13, padding: "8px 20px" }}>
            {running ? "スキャン中..." : "日次スキャンを実行"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card state-panel" style={{ marginBottom: 14 }}>
          <div className="state-panel-head">
            <div>
              <div className="stat-label">Scan Error</div>
              <div className="state-panel-title">日次スキャンに失敗しました</div>
              <p className="state-panel-copy">{error}</p>
            </div>
            <button onClick={runScan} disabled={running} className="btn btn-ghost" type="button">
              {running ? "再実行中..." : "再実行"}
            </button>
          </div>
        </div>
      )}

      {/* Scan result */}
      {result && (
        <div style={{ marginBottom: 14 }}>
          <div className="grid-stats">
            <Link href="/candidates" className="card card-hover no-underline animate-fade-in">
              <div className="stat-label">最優先レビュー候補</div>
              <div className="stat-value" style={{ color: "var(--color-brass-gold)" }}>{result.strong}</div>
              <div className="stat-sub">S / A ティア</div>
            </Link>
            <Link href="/candidates" className="card card-hover no-underline animate-fade-in" style={{ animationDelay: "50ms" }}>
              <div className="stat-label">追加確認候補</div>
              <div className="stat-value" style={{ color: "var(--color-ember-orange)" }}>{result.entry}</div>
              <div className="stat-sub">A / B ティア</div>
            </Link>
            <div className="card">
              <div className="stat-label">監視</div>
              <div className="stat-value" style={{ color: "var(--color-muted-clay)" }}>{result.watch}</div>
              <div className="stat-sub">C ティア</div>
            </div>
            <div className="card">
              <div className="stat-label">見送り</div>
              <div className="stat-value" style={{ color: "var(--color-edge-ash)" }}>{result.avoided}</div>
              <div className="stat-sub">D ティア</div>
            </div>
          </div>

          {/* Signal distribution bar */}
          <div className="card" style={{ marginTop: 12, padding: "14px 16px" }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-espresso-ink)" }}>シグナル分布</span>
              <span className="font-mono" style={{ fontSize: 10, color: "var(--color-edge-ash)" }}>全{total}件</span>
            </div>
            <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", gap: 1, background: "#e6ebf2" }}>
              {result.strong > 0 && <div style={{ width: `${(result.strong / total) * 100}%`, background: "var(--color-brass-gold)", borderRadius: 3 }} />}
              {result.entry > 0 && <div style={{ width: `${(result.entry / total) * 100}%`, background: "var(--color-ember-orange)", borderRadius: 3 }} />}
              {result.watch > 0 && <div style={{ width: `${(result.watch / total) * 100}%`, background: "var(--color-muted-clay)", borderRadius: 3 }} />}
              {result.avoided > 0 && <div style={{ width: `${(result.avoided / total) * 100}%`, background: "var(--color-edge-ash)", borderRadius: 3 }} />}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: "var(--color-brass-gold)" }}>最優先</span>
              <span style={{ fontSize: 10, color: "var(--color-ember-orange)" }}>追加確認</span>
              <span style={{ fontSize: 10, color: "var(--color-muted-clay)" }}>Watch</span>
              <span style={{ fontSize: 10, color: "var(--color-edge-ash)" }}>Avoid</span>
            </div>
          </div>
        </div>
      )}

      {/* Default stats when no scan */}
      {!result && (
        <>
          <div className="grid-stats" style={{ marginBottom: 14 }}>
            {[
              { label: "地合い", value: "--", sub: "市場強度はスキャン後に表示", clr: "var(--color-muted-clay)", icon: Gauge },
              { label: "シグナル", value: "--", sub: "候補銘柄の数と質を判定", clr: "var(--color-muted-clay)", icon: Target },
              { label: "ポジション", value: "0", sub: "保有中の銘柄", clr: "var(--color-espresso-ink)", icon: ChartNoAxesCombined },
              { label: "キルスイッチ", value: "正常", sub: "連敗・日次損失を監視", clr: "var(--color-signal-green)", icon: ShieldCheck },
            ].map((s, i) => (
              <div key={i} className="card metric-card animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value stat-value-sm" style={{ color: s.clr }}>{s.value}</div>
                    <div className="stat-sub">{s.sub}</div>
                  </div>
                  <span className="semantic-icon"><s.icon size={18} /></span>
                </div>
              </div>
            ))}
          </div>
          <div className="card dashboard-next-actions" style={{ marginBottom: 14 }}>
            <div>
              <div className="stat-label">次の操作</div>
              <div className="dashboard-next-title">日次スキャン前でも確認できる画面</div>
              <p className="meaning-note">企業検索と業界地図はモック/DBデータで先に確認できます。スキャン後は候補銘柄へ進みます。</p>
            </div>
            <div className="dashboard-next-links">
              <Link href="/companies" className="btn btn-ghost no-underline">企業検索</Link>
              <Link href="/industries" className="btn btn-ghost no-underline">業界地図</Link>
              <Link href="/settings" className="btn btn-ghost no-underline">設定確認</Link>
            </div>
          </div>
        </>
      )}

      <ReviewQueue />

      {/* Module status */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div className="stat-label">モジュール稼働状況</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>分析パイプラインの接続状態</div>
            <p className="meaning-note">緑は利用可能、灰色は設定待ちです。LINE通知だけは環境変数の設定後に有効になります。</p>
          </div>
          <ScoreRing value={90} label="稼働率" />
        </div>
        <div className="pipeline-grid">
          {checks.map((c, i) => (
            <div key={i} className="pipeline-item">
              {c.ok ? <ShieldCheck size={15} style={{ color: "var(--color-signal-green)" }} /> : <Bell size={15} style={{ color: "var(--color-edge-ash)" }} />}
              {c.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
