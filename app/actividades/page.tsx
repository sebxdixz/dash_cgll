"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Header from "@/components/layout/Header";
import KpiCard from "@/components/kpi/KpiCard";
import SelectDropdown from "@/components/filters/SelectDropdown";
import PieChartComponent from "@/components/charts/PieChartComponent";
import BarChartComponent from "@/components/charts/BarChartComponent";
import SportPivotTable from "@/components/tables/SportPivotTable";
import BookingsTable from "@/components/tables/BookingsTable";
import { sportPivot, bookingsByMonth, quickKpis } from "@/lib/transforms";
import { ACTIVIDADES_SPORTS, getSportColor } from "@/lib/sports-config";
import { cachedFetch, clearApiCache } from "@/lib/api-cache";
import type { ECBooking, ECUser } from "@/lib/easycanchas";
import { Users, CalendarCheck, Clock, BarChart2, Loader2, Filter, RefreshCw } from "lucide-react";

const AÑOS  = ["2021","2022","2023","2024","2025"];
const MESES = ["Todos","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function buildDateRange(año: string, mes: string) {
  const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  if (mes === "Todos") return { from: `${año}-01-01`, to: `${año}-12-31` };
  const idx  = MONTHS.indexOf(mes);
  const m    = String(idx + 1).padStart(2, "0");
  const last = new Date(Number(año), idx + 1, 0).getDate();
  return { from: `${año}-${m}-01`, to: `${año}-${m}-${String(last).padStart(2, "0")}` };
}

export default function ActividadesPage() {
  const [año,       setAño]       = useState("2025");
  const [mes,       setMes]       = useState("Todos");
  const [actividad, setActividad] = useState("Todas");

  const [bookings,  setBookings]  = useState<ECBooking[]>([]);
  const [users,     setUsers]     = useState<ECUser[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [loaded,    setLoaded]    = useState<string[]>([]);
  const [error,     setError]     = useState<string | null>(null);

  const fetchData = useCallback(async (a: string, m: string) => {
    setLoading(true);
    setError(null);
    setBookings([]);
    setLoaded([]);

    const { from, to } = buildDateRange(a, m);
    try {
      const [sportResults, usersRes] = await Promise.all([
        Promise.all(
          ACTIVIDADES_SPORTS.map((id) =>
            cachedFetch<{ bookings: ECBooking[] }>(
              `/api/easycanchas/bookings?fromIsoDate=${from}&toIsoDate=${to}&sportId=${id}`
            )
              .then((d) => {
                const b = (d.bookings ?? []) as ECBooking[];
                if (b.length > 0) {
                  setLoaded((prev) => [...prev, b[0].sportName]);
                  setBookings((prev) => [...prev, ...b]);
                }
                return b;
              })
              .catch(() => [] as ECBooking[])
          )
        ),
        cachedFetch<{ users: ECUser[] }>("/api/easycanchas/users"),
      ]);
      void sportResults;
      setUsers(usersRes.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(año, mes);
  }, [año, mes, fetchData]);

  // Actividades disponibles en los datos reales
  const availableActividades = useMemo(
    () => ["Todas", ...Array.from(new Set(bookings.map((b) => b.sportName))).sort()],
    [bookings]
  );

  // Filtro por actividad
  const filtered = useMemo(
    () => actividad === "Todas" ? bookings : bookings.filter((b) => b.sportName === actividad),
    [bookings, actividad]
  );

  const kpis      = quickKpis(filtered, users);
  const barData   = bookingsByMonth(filtered);
  const pivotRows = sportPivot(filtered);

  const sportDist = pivotRows.map((r) => ({
    name:  r.sport,
    value: Math.round((r.totals.reservas / (kpis.totalReservas || 1)) * 100),
    color: getSportColor(r.sport),
  }));

  const isPartial = loading && loaded.length > 0;

  return (
    <div className="p-6 md:p-8 min-h-screen">
      <Header
        title="Actividades"
        subtitle="Club de Golf Los Leones — Eventos y servicios"
      />

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-[#8b1c31]" />
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Filtros</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <SelectDropdown label="Año"       value={año}       options={AÑOS}                onChange={setAño}       />
          <SelectDropdown label="Mes"       value={mes}       options={MESES}               onChange={setMes}       />
          <SelectDropdown label="Actividad" value={actividad} options={availableActividades} onChange={setActividad} />
          <button
            onClick={() => { clearApiCache(); fetchData(año, mes); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Limpiar caché y recargar datos frescos"
          >
            <RefreshCw className="w-3 h-3" />
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Barra de carga incremental */}
      {isPartial && (
        <div className="bg-white rounded-2xl border border-gray-200 px-5 py-3 mb-6 flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-[#8b1c31] shrink-0" />
          <div className="flex-1 text-xs text-gray-500">
            Cargando... ({loaded.join(", ")})
          </div>
        </div>
      )}

      {loading && loaded.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-20 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Cargando actividades...</span>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
              title="Total Reservas"
              value={kpis.totalReservas.toLocaleString()}
              icon={<CalendarCheck className="w-4 h-4 text-white/80" />}
              subtitle="Período seleccionado"
            />
            <KpiCard
              title="Clientes Únicos"
              value={kpis.usuariosUnicos.toLocaleString()}
              icon={<Users className="w-4 h-4 text-white/80" />}
              subtitle="Personas distintas"
            />
            <KpiCard
              title="Horas Totales"
              value={kpis.horasOcupadas.toLocaleString()}
              icon={<Clock className="w-4 h-4 text-white/80" />}
              subtitle="Duración acumulada"
            />
            <KpiCard
              title="Actividades"
              value={pivotRows.length.toString()}
              icon={<BarChart2 className="w-4 h-4 text-white/80" />}
              subtitle="Tipos distintos"
            />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <BarChartComponent title="Reservas por Mes" data={barData} />
            <PieChartComponent title="Distribución por Actividad" data={sportDist} />
          </div>

          {/* Pivot actividad × mes */}
          <div className="mb-6">
            <SportPivotTable rows={pivotRows} showFinancial={false} />
          </div>

          {/* Tabla detalle */}
          <BookingsTable bookings={filtered} />
        </>
      )}
    </div>
  );
}
