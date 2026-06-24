"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import type { Company, FinancialPoint, MarketMetric } from "@/lib/fundamentals/mock";

export type EnrichedCompany = Company & {
  latest: FinancialPoint;
  metrics: MarketMetric;
};

const blue = "#2563eb";
const green = "#059669";
const amber = "#d97706";
const red = "#dc2626";
const slate = "#64748b";

export function IndustryRevenueRankingChart({ rows }: { rows: EnrichedCompany[] }) {
  const topRows = rows.slice(0, 10).map((company, index) => ({
    name: company.name,
    ticker: company.ticker,
    revenue: company.latest.revenue,
    rank: index + 1,
  }));

  return (
    <ChartContainer className="h-72">
      {({ width, height }) => (
        <BarChart width={width} height={height} data={topRows} layout="vertical" margin={{ top: 8, right: 22, left: 60, bottom: 0 }}>
          <CartesianGrid stroke="#e5eaf1" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: slate }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={116} tick={{ fontSize: 11, fill: "#334155" }} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(15,23,42,0.04)" }}
            contentStyle={{ borderRadius: 8, border: "1px solid #d7dee8", boxShadow: "0 12px 28px rgba(15,23,42,0.12)" }}
            formatter={(value) => [`${Number(value).toLocaleString()} 百万円`, "売上"]}
            labelFormatter={(label) => `${label}`}
          />
          <Bar dataKey="revenue" name="売上" radius={[0, 6, 6, 0]}>
            {topRows.map((row) => (
              <Cell key={row.ticker} fill={row.rank <= 3 ? blue : "#94a3b8"} />
            ))}
          </Bar>
        </BarChart>
      )}
    </ChartContainer>
  );
}

export function ProfitabilityScatter({ rows }: { rows: EnrichedCompany[] }) {
  const data = rows.map((company) => ({
    name: company.name,
    ticker: company.ticker,
    roe: company.latest.roe,
    margin: company.latest.operatingMargin,
    marketCap: Math.max(90, Math.min(280, company.metrics.marketCap / 20000)),
  }));

  return (
    <ChartContainer className="h-72">
      {({ width, height }) => (
        <ScatterChart width={width} height={height} margin={{ top: 10, right: 10, bottom: 4, left: -14 }}>
          <CartesianGrid stroke="#e5eaf1" />
          <XAxis
            type="number"
            dataKey="margin"
            name="営業利益率"
            unit="%"
            tick={{ fontSize: 10, fill: slate }}
            tickLine={false}
            axisLine={false}
            label={{ value: "営業利益率", position: "insideBottom", offset: -2, fontSize: 11, fill: slate }}
          />
          <YAxis
            type="number"
            dataKey="roe"
            name="ROE"
            unit="%"
            tick={{ fontSize: 10, fill: slate }}
            tickLine={false}
            axisLine={false}
            label={{ value: "ROE", angle: -90, position: "insideLeft", fontSize: 11, fill: slate }}
          />
          <ZAxis type="number" dataKey="marketCap" range={[80, 240]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{ borderRadius: 8, border: "1px solid #d7dee8", boxShadow: "0 12px 28px rgba(15,23,42,0.12)" }}
            formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name === "roe" ? "ROE" : "営業利益率"]}
            labelFormatter={(_, payload) => {
              const item = payload?.[0]?.payload;
              return item ? `${item.name} (${item.ticker})` : "";
            }}
          />
          <Scatter data={data} fill={green} />
        </ScatterChart>
      )}
    </ChartContainer>
  );
}

export function PeerMetricBars({
  rows,
  activeTicker,
  metric,
}: {
  rows: EnrichedCompany[];
  activeTicker?: string;
  metric: "revenue" | "roe" | "per";
}) {
  const metricLabel = metric === "revenue" ? "売上" : metric === "roe" ? "ROE" : "PER";
  const data = rows.slice(0, 8).map((company) => ({
    name: company.name,
    ticker: company.ticker,
    value: metric === "revenue" ? company.latest.revenue : metric === "roe" ? company.latest.roe : company.metrics.per,
  }));

  return (
    <ChartContainer className="h-56">
      {({ width, height }) => (
        <BarChart width={width} height={height} data={data} layout="vertical" margin={{ top: 8, right: 18, left: 58, bottom: 0 }}>
          <CartesianGrid stroke="#e5eaf1" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: slate }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={108} tick={{ fontSize: 11, fill: "#334155" }} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(15,23,42,0.04)" }}
            contentStyle={{ borderRadius: 8, border: "1px solid #d7dee8" }}
            formatter={(value) => [formatMetric(Number(value), metric), metricLabel]}
          />
          <Bar dataKey="value" name={metricLabel} radius={[0, 6, 6, 0]}>
            {data.map((row) => (
              <Cell key={row.ticker} fill={row.ticker === activeTicker ? amber : metric === "per" ? red : green} />
            ))}
          </Bar>
        </BarChart>
      )}
    </ChartContainer>
  );
}

function formatMetric(value: number, metric: "revenue" | "roe" | "per") {
  if (metric === "revenue") return `${value.toLocaleString()} 百万円`;
  if (metric === "roe") return `${value.toFixed(1)}%`;
  return `${value.toFixed(1)}倍`;
}
