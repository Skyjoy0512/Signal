"use client";

import { motion } from "framer-motion";
import { SectorIcon, StatusPill } from "@/components/visual-primitives";
import { displaySector, finalScoreInsight, riskTone } from "@/lib/market-display";

interface SignalData {
  symbol: string;
  name: string | null;
  sector?: string;
  industry?: string | null;
  action: string;
  tier: string;
  scores: { opportunity: number; entryTiming: number; risk: number; conviction: number; final: number };
  scenario: { entryPrice: number; stopPrice: number; targetBase: number; riskRewardBase: number } | null;
  reason: string;
}

const ACTION: Record<string, string> = {
  strong_entry_candidate: "Strong Entry",
  entry_candidate: "Entry候補",
  watch: "監視",
  avoid: "見送り",
};

export function SignalCard({ signal }: { signal: SignalData }) {
  const scoreCells = [
    { label: "最終", value: signal.scores.final, color: signal.scores.final >= 70 ? "var(--color-signal-green)" : "var(--color-espresso-ink)" },
    { label: "機会", value: signal.scores.opportunity, color: "var(--color-brass-gold)" },
    { label: "時機", value: signal.scores.entryTiming, color: "var(--color-deep-moss)" },
    { label: "安全", value: 100 - signal.scores.risk, color: signal.scores.risk >= 60 ? "var(--color-brass-gold)" : "var(--color-signal-green)" },
    { label: "確信", value: signal.scores.conviction, color: "var(--color-ember-orange)" },
  ];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`card card-hover tier-${signal.tier}`}
      style={{ transition: "box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease" }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            {signal.sector && <SectorIcon sector={signal.sector} />}
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-espresso-ink)" }}>
                {signal.name ?? signal.symbol}
              </span>
              <span className="font-mono" style={{ fontSize: 11, color: "var(--color-muted-clay)", marginLeft: 6 }}>{signal.symbol}</span>
              {signal.sector && <div style={{ fontSize: 11, color: "var(--color-muted-clay)" }}>{displaySector(signal.sector)} · {signal.industry ?? "業種未分類"}</div>}
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--color-muted-clay)" }}>{ACTION[signal.action] ?? signal.action} - {signal.reason}</div>
        </div>
        <span className="badge badge-dark font-mono" style={{ fontSize: 11, padding: "2px 8px" }}>{signal.tier}</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        <StatusPill value={signal.scores.final} label="最終" />
        <StatusPill value={signal.scores.opportunity} label="機会" />
        <StatusPill value={signal.scores.entryTiming} label="タイミング" />
        <span className="status-pill" style={{ color: riskTone(signal.scores.risk).color, background: riskTone(signal.scores.risk).bg }}>リスク: {riskTone(signal.scores.risk).label}</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--color-muted-clay)", lineHeight: 1.5, marginBottom: 8 }}>
        {finalScoreInsight(signal.scores.final)}
      </div>
      <div className="signal-score-grid">
        {scoreCells.map((score) => (
          <div key={score.label} className="signal-score-cell">
            <span>{score.label}</span>
            <strong className="font-mono" style={{ color: score.color }}>{Math.round(score.value)}</strong>
          </div>
        ))}
      </div>

      {signal.scenario && (
        <>
          <div className="divider" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {[
              { label: "Entry", val: signal.scenario.entryPrice.toLocaleString() },
              { label: "損切", val: signal.scenario.stopPrice.toLocaleString() },
              { label: "目標", val: signal.scenario.targetBase.toLocaleString() },
              { label: "RR", val: signal.scenario.riskRewardBase.toFixed(1) },
            ].map((s, i) => (
              <div key={i} className="font-mono" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "var(--color-muted-clay)", letterSpacing: "0.04em", marginBottom: 1 }}>{s.label}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-espresso-ink)" }}>{s.val}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
