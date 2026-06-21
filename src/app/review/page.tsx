import Image from "next/image";
import { BarChart3, CalendarClock, Scale, Target, Trophy } from "lucide-react";
import { ScoreRing } from "@/components/visual-primitives";

export default function ReviewPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">レビュー / 結果</h1>
        <p className="page-subtitle">1週間 · 1ヶ月 · 3ヶ月の結果追跡とベンチマーク比較</p>
      </div>

      <div className="grid-stats" style={{ marginBottom: 14 }}>
        {[
          { label: "勝率", color: "var(--color-muted-clay)", icon: Trophy, sub: "勝ちトレード比率" },
          { label: "平均リターン", color: "var(--color-muted-clay)", icon: BarChart3, sub: "1取引あたり損益" },
          { label: "対ベンチマーク", color: "var(--color-muted-clay)", icon: Scale, sub: "日経平均との差" },
          { label: "平均RR達成率", color: "var(--color-muted-clay)", icon: Target, sub: "想定RRの達成度" },
        ].map((s, i) => (
          <div key={i} className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value stat-value-sm" style={{ color: s.color }}>--</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
              <span className="semantic-icon"><s.icon size={18} /></span>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div className="stat-label">レビュー予定</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span className="semantic-icon"><CalendarClock size={18} /></span>
              <div style={{ fontSize: 14, fontWeight: 600 }}>保有後の定点観測</div>
            </div>
            <p className="meaning-note">1週間 / 1ヶ月 / 3ヶ月の節目で、最大含み益(MFE)・最大含み損(MAE)・日経平均比較を確認します。</p>
          </div>
          <ScoreRing value={0} label="準備中" />
        </div>
        <div className="review-timeline">
          {[
            { label: "1W", title: "初動確認", copy: "Entry後の値動きと損切りライン接近を確認" },
            { label: "1M", title: "仮説検証", copy: "材料継続、業界地合い、ベンチマーク差を確認" },
            { label: "3M", title: "結果判定", copy: "MFE / MAE とRR達成度を次回判断へ反映" },
          ].map((step) => (
            <div key={step.label} className="review-step">
              <span className="badge badge-outline">{step.label}</span>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{step.title}</div>
              <div className="stat-sub" style={{ marginTop: 4 }}>{step.copy}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card card-dashed empty-state">
        <div className="empty-state-media">
          <Image
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=440&q=80&fit=crop"
            alt=""
            fill
            sizes="220px"
          />
        </div>
        <div className="empty-state-title">レビューデータはまだありません</div>
        <div className="empty-state-copy">ポジションを保有すると、1週間・1ヶ月・3ヶ月のタイミングで結果が自動追跡されます。</div>
      </div>
    </div>
  );
}
