"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  mes: string;
  usuarios: number;
  reservas: number;
}

interface BarChartComponentProps {
  title?: string;
  data?: DataPoint[];
}

export default function BarChartComponent({
  title = "Reservas por Mes",
  data,
}: BarChartComponentProps) {
  const chartData = data ?? [];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">{title}</p>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[240px] text-sm text-gray-300">
          Sin datos para el período seleccionado
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ece4" vertical={false} />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Bar dataKey="usuarios" name="N° Usuarios" fill="#c9a87c" radius={[4, 4, 0, 0]} />
            <Bar dataKey="reservas" name="Reservas"    fill="#8b1c31" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
