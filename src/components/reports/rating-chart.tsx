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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RatingChartProps {
  distribution: Record<number, number>;
  maxRating?: number;
  title?: string;
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

export function RatingChart({
  distribution,
  maxRating = 5,
  title = "Rating Distribution",
}: RatingChartProps) {
  const data = Array.from({ length: maxRating }, (_, i) => {
    const rating = i + 1;
    return {
      rating: rating.toString(),
      count: distribution[rating] || 0,
    };
  });

  const totalCount = data.reduce((sum, d) => sum + d.count, 0);

  if (totalCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No rating data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="rating"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(value: number) => [value, "Responses"]}
                labelFormatter={(label) => `Rating: ${label}`}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-4">
          {data.map((d, index) => (
            <div key={d.rating} className="flex items-center gap-1 text-sm">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: COLORS[index] }}
              />
              <span className="text-muted-foreground">
                {d.rating}: {d.count}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
