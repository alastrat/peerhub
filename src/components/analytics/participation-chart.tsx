"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/dates";

interface ParticipationData {
  cycleId: string;
  cycleName: string;
  date: Date;
  completionRate: number;
  totalAssignments: number;
  completedAssignments: number;
}

interface ParticipationChartProps {
  data: ParticipationData[];
}

export function ParticipationChart({ data }: ParticipationChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Completion Trends</CardTitle>
          <CardDescription>
            Review completion rates across cycles
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

  const chartData = data.map((d) => ({
    name: d.cycleName,
    date: formatDate(d.date),
    completionRate: d.completionRate,
    completed: d.completedAssignments,
    total: d.totalAssignments,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Completion Trends</CardTitle>
        <CardDescription>
          Review completion rates across cycles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === "completionRate") return [`${value}%`, "Completion Rate"];
                  return [value, name];
                }}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="completionRate"
                name="Completion Rate"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
