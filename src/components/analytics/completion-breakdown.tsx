"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ReviewerType } from "@prisma/client";
import { REVIEWER_TYPE_LABELS } from "@/lib/constants/roles";

interface BreakdownData {
  total: number;
  completed: number;
  rate: number;
}

interface CompletionBreakdownProps {
  breakdown: Record<ReviewerType, BreakdownData>;
}

const COLORS: Record<ReviewerType, string> = {
  SELF: "#8b5cf6", // violet
  MANAGER: "#3b82f6", // blue
  PEER: "#22c55e", // green
  DIRECT_REPORT: "#f59e0b", // amber
  EXTERNAL: "#ec4899", // pink
};

export function CompletionBreakdown({ breakdown }: CompletionBreakdownProps) {
  const chartData = Object.entries(breakdown)
    .filter(([_, data]) => data.total > 0)
    .map(([type, data]) => ({
      name: REVIEWER_TYPE_LABELS[type as ReviewerType],
      type: type as ReviewerType,
      rate: data.rate,
      completed: data.completed,
      total: data.total,
    }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Completion by Reviewer Type</CardTitle>
          <CardDescription>
            Breakdown of completion rates by reviewer type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No data available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Completion by Reviewer Type</CardTitle>
        <CardDescription>
          Breakdown of completion rates by reviewer type
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chart */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 30, left: 80, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number | undefined, name: string | undefined) => {
                  if (value === undefined) return ["-", name ?? ""];
                  if (name === "rate") return [`${value}%`, "Completion Rate"];
                  return [value, name ?? ""];
                }}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.type} fill={COLORS[entry.type]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed stats */}
        <div className="space-y-4">
          {chartData.map((item) => (
            <div key={item.type} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: COLORS[item.type] }}
                  />
                  <span>{item.name}</span>
                </div>
                <span className="text-muted-foreground">
                  {item.completed}/{item.total} ({item.rate}%)
                </span>
              </div>
              <Progress
                value={item.rate}
                className="h-1.5"
                style={{
                  // @ts-ignore - CSS custom property
                  "--progress-color": COLORS[item.type],
                }}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
