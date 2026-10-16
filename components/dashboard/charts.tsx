"use client";

import { EvilAreaChart } from "@/components/evilcharts/charts/recharts-area-chart";
import { EvilBarChart } from "@/components/evilcharts/charts/recharts-bar-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/recharts-chart";
import {
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/evilcharts/ui/recharts-tooltip";
import { formatINR, formatINRCompact } from "@/lib/money";

// One series per chart → one hue (the app accent, validated ≥3:1 on light and
// dark card surfaces) and no legend; the card title names the series.
const SPENT_CONFIG = {
  spent: {
    label: "Spent",
    colors: {
      light: ["var(--color-accent-500)"],
      dark: ["var(--color-accent-500)"],
    },
  },
} satisfies ChartConfig;

function rupeeTooltip() {
  return (
    <ChartTooltip
      cursor={{ strokeWidth: 1 }}
      content={
        <ChartTooltipContent
          hideIndicator
          formatter={(value) => (
            <div className="flex w-full items-center justify-between gap-4">
              <span className="text-muted-foreground">Spent</span>
              <span className="font-medium tabular-nums text-foreground">
                {formatINR(Number(value))}
              </span>
            </div>
          )}
        />
      }
    />
  );
}

export interface TrendDatum extends Record<string, unknown> {
  label: string;
  spent: number;
}

/** Total spend per month: a single-series area (2px line, light wash). */
export function SpendTrendChart({ data }: { data: TrendDatum[] }) {
  return (
    <EvilAreaChart
      config={SPENT_CONFIG}
      data={data}
      className="h-56 w-full"
      curveType="monotone"
      animationType="left-to-right"
    >
      <EvilAreaChart.Grid vertical={false} strokeDasharray="0" />
      <EvilAreaChart.XAxis dataKey="label" />
      <EvilAreaChart.YAxis tickFormatter={(v: number) => formatINRCompact(v)} />
      {rupeeTooltip()}
      <EvilAreaChart.Area
        dataKey="spent"
        variant="gradient"
        strokeVariant="solid"
        strokeWidth={2}
      >
        <EvilAreaChart.ActiveDot />
      </EvilAreaChart.Area>
    </EvilAreaChart>
  );
}

export interface PotSpendDatum extends Record<string, unknown> {
  name: string;
  spent: number;
}

/** Spend by pot this month: horizontal bars, largest first, one hue. */
export function SpendByPotChart({ data }: { data: PotSpendDatum[] }) {
  return (
    // ~36px per row keeps bars ≤24px thick with air between them.
    <div
      className="w-full"
      style={{ height: Math.max(160, data.length * 36 + 40) }}
    >
      <EvilBarChart
        config={SPENT_CONFIG}
        data={data}
        layout="horizontal"
        barRadius={4}
        className="h-full w-full"
        chartProps={{ margin: { left: 8, right: 16 } }}
      >
        <EvilBarChart.Grid horizontal={false} strokeDasharray="0" />
        <EvilBarChart.XAxis
          type="number"
          tickFormatter={(v: number) => formatINRCompact(v)}
        />
        <EvilBarChart.YAxis type="category" dataKey="name" width={130} />
        {rupeeTooltip()}
        <EvilBarChart.Bar dataKey="spent" barProps={{ maxBarSize: 24 }} />
      </EvilBarChart>
    </div>
  );
}
