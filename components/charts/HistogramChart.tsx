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
import { distribucionEdad } from "@/lib/data";

interface DataPoint {
  rango: string;
  cantidad: number;
}

interface HistogramChartProps {
  data?: DataPoint[];
}

export default function HistogramChart({ data }: HistogramChartProps) {
  const chartData = data ?? distribucionEdad;
  const max = Math.max(...chartData.map((d) => d.cantidad), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
        Distribución por Edad
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          margin={{ top: 0, right: 10, left: -10, bottom: 0 }}
          barCategoryGap="4%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0ece4" vertical={false} />
          <XAxis
            dataKey="rango"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }}
            formatter={(val) => [val ?? 0, "Socios"]}
          />
          <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.cantidad === max ? "#8b1c31" : "#c9a87c"}
                fillOpacity={0.6 + (entry.cantidad / max) * 0.4}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
