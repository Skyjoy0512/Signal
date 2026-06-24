"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { displaySector, finalScoreInsight } from "@/lib/market-display";

interface LayerData {
  scope_key: string;
  condition: string;
  trend: string;
  strength: number;
  risk: number;
  confidence: number;
  reason: string;
}

interface LayerGroup {
  key: string;
  symbols: string[];
  signalCount: number;
  layer: LayerData | null;
}

interface SignalData {
  symbol: string;
  name: string | null;
  sector: string;
  tier: string;
  scores: { risk: number; final: number };
}

export interface FundamentalPoint {
  year: string;
  revenue: number;
  operatingIncome: number;
  netIncome: number;
  assets: number;
  equity: number;
  liabilities: number;
  operatingCashFlow: number;
  roe: number;
  operatingMargin: number;
}

export function SectorStrengthChart({
  sectors,
  selectedSector,
  onSelect,
}: {
  sectors: LayerGroup[];
  selectedSector: string;
  onSelect: (sector: string) => void;
}) {
  const data = sectors.map((sector) => ({
    name: displaySector(sector.key),
    key: sector.key,
    strength: Math.round(sector.layer?.strength ?? sector.signalCount * 12),
    active: sector.signalCount,
  }));

  return (
    <ChartContainer className="h-72">
      {({ width, height }) => (
        <BarChart width={width} height={height} data={data} layout="vertical" margin={{ top: 8, right: 18, left: 44, bottom: 0 }}>
          <CartesianGrid stroke="#e5eaf1" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} domain={[0, 100]} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#334155" }} tickLine={false} axisLine={false} width={86} />
          <Tooltip
            cursor={{ fill: "rgba(15,23,42,0.04)" }}
            contentStyle={{ borderRadius: 8, border: "1px solid #d7dee8", boxShadow: "0 12px 28px rgba(15,23,42,0.12)" }}
            formatter={(value, name) => [value, name === "strength" ? "業界強度（平均最終スコア）" : "候補銘柄数"]}
          />
          <Bar
            dataKey="strength"
            radius={[0, 6, 6, 0]}
            fill="#0ea5e9"
            onClick={(entry) => {
              const key = String((entry as { key?: string }).key ?? "");
              if (key) onSelect(key);
            }}
            style={{ cursor: "pointer" }}
          />
          <Bar
            dataKey="active"
            radius={[0, 6, 6, 0]}
            fill={selectedSector === "ALL" ? "#94a3b8" : "#059669"}
            onClick={(entry) => {
              const key = String((entry as { key?: string }).key ?? "");
              if (key) onSelect(key);
            }}
            style={{ cursor: "pointer" }}
          />
        </BarChart>
      )}
    </ChartContainer>
  );
}

export function FundamentalTrendCharts({ data }: { data: FundamentalPoint[] }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <div className="stat-label">PL推移</div>
        <p className="meaning-note">売上と営業利益の推移です。売上が伸び、営業利益率も上がるほど質の高い成長として見ます。</p>
        <ChartContainer className="h-56">
          {({ width, height }) => (
            <ComposedChart width={width} height={height} data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#e5eaf1" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #d7dee8" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="revenue" name="売上" fill="#0ea5e9" radius={[5, 5, 0, 0]} />
              <Line dataKey="operatingIncome" name="営業利益" type="monotone" stroke="#059669" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line dataKey="netIncome" name="純利益" type="monotone" stroke="#d97706" strokeWidth={2.2} dot={{ r: 3 }} />
            </ComposedChart>
          )}
        </ChartContainer>
      </div>

      <div>
        <div className="stat-label">BS構成</div>
        <p className="meaning-note">総資産のうち自己資本と負債のバランスです。自己資本が厚いほど財務耐性が高い傾向です。</p>
        <ChartContainer className="h-52">
          {({ width, height }) => (
            <BarChart width={width} height={height} data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#e5eaf1" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #d7dee8" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="equity" name="自己資本" stackId="bs" fill="#059669" radius={[0, 0, 0, 0]} />
              <Bar dataKey="liabilities" name="負債" stackId="bs" fill="#94a3b8" radius={[5, 5, 0, 0]} />
            </BarChart>
          )}
        </ChartContainer>
      </div>

      <div>
        <div className="stat-label">収益性</div>
        <p className="meaning-note">ROEと営業利益率です。資本効率と本業の稼ぐ力を確認します。</p>
        <ChartContainer className="h-48">
          {({ width, height }) => (
            <ComposedChart width={width} height={height} data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#e5eaf1" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #d7dee8" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line dataKey="roe" name="ROE" type="monotone" stroke="#0f766e" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line dataKey="operatingMargin" name="営業利益率" type="monotone" stroke="#d97706" strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          )}
        </ChartContainer>
      </div>
    </div>
  );
}

export function ScoreRiskScatter({
  signals,
  selectedSymbol,
  onSelect,
}: {
  signals: SignalData[];
  selectedSymbol: string | null;
  onSelect: (symbol: string) => void;
}) {
  const data = signals.map((signal) => ({
    symbol: signal.symbol,
    name: signal.name ?? signal.symbol,
    final: Math.round(signal.scores.final),
    risk: Math.round(100 - signal.scores.risk),
    tierSize: signal.tier === "S" ? 180 : signal.tier === "A" ? 150 : signal.tier === "B" ? 120 : 90,
  }));

  return (
    <ChartContainer className="h-64">
      {({ width, height }) => (
        <ScatterChart width={width} height={height} margin={{ top: 10, right: 8, bottom: 4, left: -18 }}>
          <CartesianGrid stroke="#e5eaf1" />
          <XAxis type="number" dataKey="final" name="最終スコア" domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} label={{ value: "最終スコア", position: "insideBottom", offset: -2, fontSize: 11, fill: "#64748b" }} />
          <YAxis type="number" dataKey="risk" name="リスク制御" domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} label={{ value: "リスク制御", angle: -90, position: "insideLeft", fontSize: 11, fill: "#64748b" }} />
          <ZAxis type="number" dataKey="tierSize" range={[60, 180]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{ borderRadius: 8, border: "1px solid #d7dee8", boxShadow: "0 12px 28px rgba(15,23,42,0.12)" }}
            formatter={(value, name) => [value, name === "final" ? "最終スコア" : "リスク制御"]}
            labelFormatter={(_, payload) => {
              const item = payload?.[0]?.payload;
              return item ? `${item.name} / ${finalScoreInsight(item.final)}` : "";
            }}
          />
          <Scatter
            data={data}
            fill="#0f766e"
            onClick={(entry) => {
              const symbol = String((entry as { payload?: { symbol?: string } }).payload?.symbol ?? "");
              if (symbol) onSelect(symbol);
            }}
            shape={(props: unknown) => {
              const p = props as { cx?: number; cy?: number; payload?: { symbol: string } };
              const active = p.payload?.symbol === selectedSymbol;
              return (
                <circle
                  cx={p.cx}
                  cy={p.cy}
                  r={active ? 7 : 5}
                  fill={active ? "#d97706" : "#0f766e"}
                  stroke="#ffffff"
                  strokeWidth={active ? 3 : 2}
                  style={{ cursor: "pointer" }}
                />
              );
            }}
          />
        </ScatterChart>
      )}
    </ChartContainer>
  );
}
