"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Header from "@/components/layout/Header";
import KpiCard from "@/components/kpi/KpiCard";
import SelectDropdown from "@/components/filters/SelectDropdown";
import BarChartComponent from "@/components/charts/BarChartComponent";
import PieChartComponent from "@/components/charts/PieChartComponent";
import BookingsTable from "@/components/tables/BookingsTable";
import SportPivotTable from "@/components/tables/SportPivotTable";
import {
  activityPivot,
  sportPivot,
  bookingsByMonth,
  computeKpis,
  quickKpis,
} from "@/lib/transforms";
import { GIMNASIO_SPORTS, getSportColor } from "@/lib/sports-config";
import { cachedFetch, clearApiCache } from "@/lib/api-cache";
import type { ECBooking, ECTransaction, ECUser } from "@/lib/easycanchas";
import { Users, CalendarCheck, Clock, DollarSign, Dumbbell, Loader2, Filter, RefreshCw } from "lucide-react";

const AÑOS  = ["2021","2022","2023","2024","2025"];
const MESES = ["Todos","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const ACTIVITY_COLORS: Record<string, string> = {
  "Sala de Fitness": "#8b1c31",
  "Indoor Cycling":  "#c9a87c",
  "Yoga":            "#6b2d3e",
  "Box":             "#d7c9ad",
  "Zumba":           "#4a1520",
  "Pilates":         "#9b6a4f",
};

function buildDateRange(año: string, mes: string) {
  const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  if (mes === "Todos") return { from: `${año}-01-01`, to: `${año}-12-31` };
  const idx  = MONTHS.indexOf(mes);
  const m    = String(idx + 1).padStart(2, "0");
  const last = new Date(Number(año), idx + 1, 0).getDate();
  return { from: `${año}-${m}-01`, to: `${año}-${m}-${String(last).padStart(2, "0")}` };
}

const formatCLP = (val: number): string => {
  if (val === 0) return "$0";
  if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(val / 1_000)}K`;
};

export default function GimnasioPage() {
  const [año,  setAño]  = useState("2025");
  const [mes,  setMes]  = useState("Todos");
  const [tipo, setTipo] = useState("Todos");

  // Fase 1: bookings + users
  const [bookings,    setBookings]    = useState<ECBooking[]>([]);
  const [users,       setUsers]       = useState<ECUser[]>([]);
  const [loadingBase, setLoadingBase] = useState(true);
  const [errorBase,   setErrorBase]   = useState<string | null>(null);

  // Fase 2: transactions (financiero)
  const [transactions, setTransactions] = useState<ECTransaction[]>([]);
  const [loadingTx,    setLoadingTx]    = useState(true);

  const fetchBase = useCallback(async (a: string, m: string) => {
    setLoadingBase(true);
    setErrorBase(null);
    setBookings([]);
    setUsers([]);

    const { from, to } = buildDateRange(a, m);

    try {
      const [sportResults, usersRes] = await Promise.all([
        Promise.all(
          GIMNASIO_SPORTS.map((id) =>
            cachedFetch<{ bookings: ECBooking[] }>(
              `/api/easycanchas/bookings?fromIsoDate=${from}&toIsoDate=${to}&sportId=${id}`
            )
              .then((d) => (d.bookings ?? []) as ECBooking[])
              .catch(() => [] as ECBooking[])
          )
        ),
        cachedFetch<{ users: ECUser[] }>("/api/easycanchas/users"),
      ]);

      setBookings(sportResults.flat());
      setUsers(usersRes.users ?? []);
    } catch (err) {
      setErrorBase(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoadingBase(false);
    }
  }, []);

  const fetchTx = useCallback(async (a: string, m: string) => {
    setLoadingTx(true);
    setTransactions([]);
    const { from, to } = buildDateRange(a, m);
    try {
      const data = await cachedFetch<{ transactions: ECTransaction[] }>(
        `/api/easycanchas/transactions?fromIsoDate=${from}&toIsoDate=${to}`
      );
      setTransactions(data.transactions ?? []);
    } catch {
      // silencioso — financiero es opcional
    } finally {
      setLoadingTx(false);
    }
  }, []);

  useEffect(() => {
    fetchBase(año, mes);
    fetchTx(año, mes);
  }, [año, mes, fetchBase, fetchTx]);

  // Tipos disponibles en los datos (Gimnasio / Masajes)
  const tiposDisponibles = useMemo(
    () => ["Todos", ...Array.from(new Set(bookings.map((b) => b.sportName))).sort()],
    [bookings]
  );

  // Filtro por tipo (sportName)
  const filtered = useMemo(
    () => tipo === "Todos" ? bookings : bookings.filter((b) => b.sportName === tipo),
    [bookings, tipo]
  );

  // KPIs — base siempre disponible, financiero solo cuando cargan transactions
  const kpis         = quickKpis(filtered, users);
  const financialKpis = loadingTx ? null : computeKpis(filtered, transactions, users);
  const barData   = bookingsByMonth(filtered);

  // Pivot: cuando "Todos" → sportPivot (Gimnasio vs Masajes)
  //        cuando tipo específico → activityPivot (clases/servicios internos)
  const pivotRows = tipo === "Todos" ? sportPivot(filtered) : activityPivot(filtered);

  // Pie: distribución por tipo o por actividad interna
  const pieData = tipo === "Todos"
    ? pivotRows.map((r) => ({
        name:  r.sport,
        value: Math.round((r.totals.reservas / (kpis.totalReservas || 1)) * 100),
        color: getSportColor(r.sport),
      }))
    : pivotRows.map((r) => ({
        name:  r.sport,
        value: Math.round((r.totals.reservas / (kpis.totalReservas || 1)) * 100),
        color: ACTIVITY_COLORS[r.sport] ?? getSportColor(r.sport),
      }));

  return (
    <div className="p-6 md:p-8 min-h-screen">
      <Header
        title="Gimnasio"
        subtitle="Club de Golf Los Leones — Actividades y uso"
      />

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-[#8b1c31]" />
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Filtros</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <SelectDropdown label="Año"  value={año}  options={AÑOS}             onChange={setAño}  />
          <SelectDropdown label="Mes"  value={mes}  options={MESES}            onChange={setMes}  />
          <SelectDropdown label="Tipo" value={tipo} options={tiposDisponibles} onChange={setTipo} />
          <button
            onClick={() => { clearApiCache(); fetchBase(año, mes); fetchTx(año, mes); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Limpiar caché y recargar datos frescos"
          >
            <RefreshCw className="w-3 h-3" />
            Actualizar
          </button>
        </div>
      </div>

      {errorBase && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 mb-6 text-sm">
          {errorBase}
        </div>
      )}

      {loadingBase ? (
        <div className="flex items-center justify-center gap-2 py-20 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Cargando datos del gimnasio...</span>
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
              title="Usuarios Únicos"
              value={kpis.usuariosUnicos.toLocaleString()}
              icon={<Dumbbell className="w-4 h-4 text-white/80" />}
              subtitle="Personas distintas"
            />
            <KpiCard
              title="Horas Ocupadas"
              value={kpis.horasOcupadas.toLocaleString()}
              icon={<Clock className="w-4 h-4 text-white/80" />}
              subtitle="Uso de instalaciones"
            />
            <KpiCard
              title="Ingresos"
              value={financialKpis ? formatCLP(financialKpis.ingresosAsociados + financialKpis.ingresosGreenFee) : "—"}
              icon={
                loadingTx
                  ? <Loader2 className="w-4 h-4 text-white/80 animate-spin" />
                  : <DollarSign className="w-4 h-4 text-white/80" />
              }
              subtitle={loadingTx ? "Calculando..." : "CLP millones"}
            />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <BarChartComponent title="Reservas por Mes" data={barData} />
            <PieChartComponent
              title={tipo === "Todos" ? "Gimnasio vs Masajes" : `Actividades — ${tipo}`}
              data={pieData}
            />
          </div>

          {/* Pivot */}
          <div className="mb-6">
            <SportPivotTable rows={pivotRows} showFinancial={!loadingTx} />
          </div>

          {/* Tabla detalle */}
          <BookingsTable bookings={filtered} />
        </>
      )}
    </div>
  );
}
