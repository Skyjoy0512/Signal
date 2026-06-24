"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, DatabaseZap, ListChecks, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type GateDetail = { key: string; label: string; passed: boolean; severity: "blocker" | "warning" | "info"; reason: string };
type DecisionReason = { code: string; message: string; severity: "blocker" | "warning" | "info" };
type ReviewSignal = {
  symbol: string;
  name: string | null;
  action: string;
  tier: string;
  reason: string;
  dataConfidence: number;
  eventBlockerActive: boolean;
  scores: { final: number; risk: number; entryTiming: number; conviction: number };
  scenario: { riskRewardBase: number; targetBase: number; stopPrice: number; entryPrice: number; scenarioQuality?: { confidence: number; warnings: string[] } } | null;
  decisionReasons: DecisionReason[];
  gateDetails: GateDetail[];
};

type SignalsResponse = { signals: ReviewSignal[]; date: string };

const ACTION_LABEL: Record<string, string> = {
  strong_entry_candidate: "最優先レビュー候補",
  entry_candidate: "追加確認候補",
  watch: "監視",
  avoid: "見送り",
};

export function ReviewQueue() {
  const [data, setData] = useState<SignalsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/signals", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("signals api failed")))
      .then((json: SignalsResponse) => { if (active) setData(json); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "取得に失敗しました"); });
    return () => { active = false; };
  }, []);

  const queue = useMemo(() => buildQueue(data?.signals ?? []), [data]);

  if (error) {
    return <div className="card card-dashed empty-state"><div className="empty-state-title">確認キューを取得できません</div><div className="empty-state-copy">{error}</div></div>;
  }
  if (!data) {
    return <div className="card card-dashed empty-state"><div className="empty-state-title">確認キューを作成中</div><div className="empty-state-copy">最新のスキャン結果から優先レビュー候補を整理しています。</div></div>;
  }

  return (
    <section style={{ display: "grid", gap: 14, marginBottom: 14 }}>
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <div>
            <div className="stat-label">今日の確認キュー</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{queue.length}件のレビュー観点</div>
          </div>
          <span className="semantic-icon"><ListChecks size={18} /></span>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {queue.slice(0, 8).map((item, index) => (
            <QueueRow key={`${item.signal.symbol}-${item.reasonCode}-${index}`} item={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function QueueRow({ item, index }: { item: QueueItem; index: number }) {
  const Icon = item.icon;
  return (
    <div className="review-step" style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", alignItems: "center", gap: 12 }}>
      <span className="semantic-icon" style={{ color: item.color }}><Icon size={17} /></span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className="badge badge-outline">{index + 1}</span>
          <strong style={{ fontSize: 13 }}>{item.signal.name ?? item.signal.symbol}</strong>
          <span className="font-mono" style={{ fontSize: 11, color: "var(--color-muted-clay)" }}>{item.signal.symbol}</span>
          <span className="badge badge-dark">{ACTION_LABEL[item.signal.action] ?? item.signal.action}</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--color-muted-clay)", lineHeight: 1.55, marginTop: 5 }}>{item.title}</div>
        <div style={{ fontSize: 11, color: "var(--color-muted-clay)", marginTop: 3 }}>{item.detail}</div>
      </div>
      <div className="font-mono" style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{Math.round(item.priority)}</div>
    </div>
  );
}

type QueueItem = {
  signal: ReviewSignal;
  reasonCode: string;
  title: string;
  detail: string;
  priority: number;
  color: string;
  icon: LucideIcon;
};

function buildQueue(signals: ReviewSignal[]): QueueItem[] {
  const items: QueueItem[] = [];
  for (const signal of signals) {
    if (signal.action === "strong_entry_candidate" || signal.action === "entry_candidate") {
      items.push({
        signal,
        reasonCode: "new_candidate",
        title: signal.reason,
        detail: `候補度 ${signal.scores.final} / リスク ${signal.scores.risk} / RR ${signal.scenario?.riskRewardBase?.toFixed(1) ?? "未算出"}`,
        priority: signal.scores.final + (signal.action === "strong_entry_candidate" ? 12 : 6),
        color: "var(--color-signal-green)",
        icon: CheckCircle2,
      });
    }
    if (signal.scores.risk >= 70 || signal.decisionReasons.some((reason) => reason.code === "high_risk")) {
      items.push({
        signal,
        reasonCode: "risk_worsened",
        title: "リスク確認が必要なため、候補度より警戒を優先",
        detail: failedGate(signal, "riskGate")?.reason ?? `リスクスコア ${signal.scores.risk}`,
        priority: 90 + signal.scores.risk,
        color: "var(--color-ember-orange)",
        icon: TrendingDown,
      });
    }
    if (signal.eventBlockerActive) {
      items.push({
        signal,
        reasonCode: "event_blocker",
        title: "決算/イベント前後のため参考扱い",
        detail: failedGate(signal, "eventBlockerGate")?.reason ?? "イベントブロッカーあり",
        priority: 95,
        color: "var(--color-ember-orange)",
        icon: CalendarClock,
      });
    }
    if (signal.dataConfidence < 65) {
      items.push({
        signal,
        reasonCode: "low_data",
        title: "データ不足のため確認が必要",
        detail: failedGate(signal, "dataConfidenceGate")?.reason ?? `データ信頼度 ${signal.dataConfidence}`,
        priority: 85 - signal.dataConfidence,
        color: "var(--color-muted-clay)",
        icon: DatabaseZap,
      });
    }
    const scenarioWarnings = signal.scenario?.scenarioQuality?.warnings ?? [];
    if (scenarioWarnings.length > 0) {
      items.push({
        signal,
        reasonCode: "scenario_quality",
        title: "参考ターゲット/無効化ラインの根拠確認",
        detail: scenarioWarnings.slice(0, 2).join(" / "),
        priority: 70 + (100 - (signal.scenario?.scenarioQuality?.confidence ?? 50)),
        color: "var(--color-brass-gold)",
        icon: AlertTriangle,
      });
    }
  }
  return items.sort((a, b) => b.priority - a.priority);
}

function failedGate(signal: ReviewSignal, key: string): GateDetail | undefined {
  return signal.gateDetails.find((gate) => gate.key === key && !gate.passed);
}
