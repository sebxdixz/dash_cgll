"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { tendenciaTemporal } from "@/lib/data";

interface DataPoint {
  fecha: string;
  reservas: number;
  ingresos: number;
}

interface LineChartComponentProps {
  data?: DataPoint[];
}

const formatIngresos = (val: number) => `$${(val / 1_000_000).toFixed(1)}M`;

export default function LineChartComponent({ data }: LineChartComponentProps) {
  const chartData = data ?? tendenciaTemporal;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
        Tendencia Temporal
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0ece4" vertical={false} />
          <XAxis
            dataKey="fecha"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            tickFormatter={(v) => v.slice(0, 7)}
            interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            tickFormatter={formatIngresos}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }}
            formatter={(val, name) =>
              name === "Ingresos" ? formatIngresos(Number(val)) : val
            }
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="reservas"
            name="Reservas"
            stroke="#8b1c31"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="ingresos"
            name="Ingresos"
            stroke="#c9a87c"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
