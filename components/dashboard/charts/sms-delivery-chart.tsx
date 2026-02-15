"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SmsDeliveryChartProps {
  data: {
    delivered: number;
    sent: number;
    failed: number;
    queued: number;
  };
}

const COLORS: Record<string, string> = {
  Delivered: "#16a34a",
  Sent: "#3b82f6",
  Failed: "#ef4444",
  Queued: "#a1a1aa",
};

export function SmsDeliveryChart({ data }: SmsDeliveryChartProps) {
  const chartData = useMemo(
    () => [
      { name: "Delivered", value: data.delivered },
      { name: "Sent", value: data.sent },
      { name: "Failed", value: data.failed },
      { name: "Queued", value: data.queued },
    ],
    [data]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMS Delivery</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e4e4e7",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              />
              <Bar dataKey="value" name="Messages" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[entry.name]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
