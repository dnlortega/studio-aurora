"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export function DashboardChart({
  data,
}: {
  data: { day: string; label: string; total: number; revenueCents: number }[];
}) {
  return (
    <ChartContainer
      config={{
        total: { label: "Agendamentos", color: "var(--chart-1)" },
      }}
      className="aspect-auto h-52 w-full"
    >
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={16}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          width={34}
        />
        <ChartTooltip
          content={<ChartTooltipContent indicator="dot" />}
          cursor={{ fill: "var(--muted)" }}
        />
        <Bar
          dataKey="total"
          fill="var(--color-total)"
          radius={[4, 4, 0, 0]}
          maxBarSize={26}
        />
      </BarChart>
    </ChartContainer>
  );
}
