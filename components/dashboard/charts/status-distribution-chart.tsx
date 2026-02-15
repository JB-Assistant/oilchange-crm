"use client";

import { useMemo, useCallback } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface StatusDistributionChartProps {
  data: { status: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  overdue: "#ef4444",
  due_now: "#f59e0b",
  due_soon: "#3b82f6",
  up_to_date: "#16a34a",
};

function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function StatusDistributionChart({
  data,
}: StatusDistributionChartProps) {
  const chartData = useMemo(
    () =>
      data.map((item) => ({
        name: formatStatusLabel(item.status),
        value: item.count,
        statusKey: item.status,
      })),
    [data]
  );

  const renderLegendValue = useCallback(
    (value: string) => (
      <span className="text-sm text-foreground">{value}</span>
    ),
    []
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={50}
                paddingAngle={2}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.statusKey}
                    fill={STATUS_COLORS[entry.statusKey] ?? "#a1a1aa"}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e4e4e7",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              />
              <Legend
                verticalAlign="bottom"
                formatter={renderLegendValue}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
