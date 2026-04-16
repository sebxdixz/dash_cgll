import { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: number; // porcentaje, positivo = sube
  subtitle?: string;
}

export default function KpiCard({ title, value, icon, trend, subtitle }: KpiCardProps) {
  const trendPositive = trend !== undefined && trend >= 0;

  return (
    <div className="bg-[#8b1c31] rounded-2xl p-5 flex flex-col gap-3 text-white shadow-md">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">{title}</p>
        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold leading-none">{value}</p>
        {subtitle && <p className="text-xs text-white/60 mt-1">{subtitle}</p>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trendPositive ? "text-green-300" : "text-red-300"}`}>
          {trendPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          <span>{trendPositive ? "+" : ""}{trend}% vs año anterior</span>
        </div>
      )}
    </div>
  );
}
