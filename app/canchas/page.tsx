"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import GlobalFilters, { Filters } from "@/components/filters/GlobalFilters";
import KpiCard from "@/components/kpi/KpiCard";
import BarChartComponent from "@/components/charts/BarChartComponent";
import LineChartComponent from "@/components/charts/LineChartComponent";
import DataTable from "@/components/tables/DataTable";
import { CalendarCheck, Clock, BarChart2, DollarSign } from "lucide-react";

export default function CanchasPage() {
  const [filters, setFilters] = useState<Filters>({
    año: "2024",
    mes: "Todos",
    esMiembro: "Todos",
    deporte: "Todos",
    agendadoPor: "Todos",
  });

  return (
    <div className="p-6 md:p-8 min-h-screen">
      <Header
        title="Reporte Easycanchas"
        subtitle="Ocupación y métricas de canchas"
      />

      <GlobalFilters filters={filters} onChange={setFilters} />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Total Reservas"
          value="38.4K"
          icon={<CalendarCheck className="w-4 h-4 text-white/80" />}
          trend={7.8}
        />
        <KpiCard
          title="Horas Ocupadas"
          value="131K"
          icon={<Clock className="w-4 h-4 text-white/80" />}
          trend={9.5}
        />
        <KpiCard
          title="Tasa Ocupación"
          value="74%"
          icon={<BarChart2 className="w-4 h-4 text-white/80" />}
          trend={3.2}
        />
        <KpiCard
          title="Ingresos Netos"
          value="$174M"
          icon={<DollarSign className="w-4 h-4 text-white/80" />}
          trend={12.3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <BarChartComponent title="Ocupación por Mes" />
        <LineChartComponent />
      </div>

      <DataTable />
    </div>
  );
}
