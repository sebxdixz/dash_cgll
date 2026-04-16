"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Header from "@/components/layout/Header";
import KpiCard from "@/components/kpi/KpiCard";
import SelectDropdown from "@/components/filters/SelectDropdown";
import BarChartComponent from "@/components/charts/BarChartComponent";
import PieChartComponent from "@/components/charts/PieChartComponent";
import SportPivotTable from "@/components/tables/SportPivotTable";
import BookingsTable from "@/components/tables/BookingsTable";
import {
  bookingsByMonth,
  computeKpis,
  sportPivot,
  customerTypeBreakdown,
} from "@/lib/transforms";
import type { ECBooking, ECTransaction, ECUser } from "@/lib/easycanchas";
import { Users, CalendarCheck, DollarSign, Clock, Loader2, Filter, RefreshCw } from "lucide-react";
import { TENIS_SPORTS, getSportColor } from "@/lib/sports-config";
import { cachedFetch, clearApiCache } from "@/lib/api-cache";

// ── Constantes ─────────────────────────────────────────────────────────────────

const AÑOS  = ["2021","2022","2023","2024","2025"];
const MESES = ["Todos","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function buildDateRange(año: string, mes: string): { from: string; to: string } {
  if (mes === "Todos") return { from: `${año}-01-01`, to: `${año}-12-31` };
  const idx     = MONTHS.indexOf(mes);
  const month   = String(idx + 1).padStart(2, "0");
  const lastDay = new Date(Number(año), idx + 1, 0).getDate();
  return { from: `${año}-${month}-01`, to: `${año}-${month}-${String(lastDay).padStart(2, "0")}` };
}

const formatCLP = (val: number): string => {
  if (val === 0) return "$0";
  if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(val / 1_000)}K`;
};

// ── Componente ────────────────────────────────────────────────────────────────

export default function TenisPage() {
  const [año,     setAño]     = useState("2025");
  const [mes,     setMes]     = useState("Todos");
  const [deporte, setDeporte] = useState("Todos");

  // Fase 1: bookings + users
  const [bookings, setBookings]       = useState<ECBooking[]>([]);
  const [users,    setUsers]          = useState<ECUser[]>([]);
  const [loadingBase, setLoadingBase] = useState(true);
  const [errorBase,   setErrorBase]   = useState<string | null>(null);

  // Fase 2: transactions
  const [transactions,  setTransactions]  = useState<ECTransaction[]>([]);
  const [loadingTx,     setLoadingTx]     = useState(true);

  const fetchBase = useCallback(async (a: string, m: string) => {
    setLoadingBase(true);
    setErrorBase(null);
    setBookings([]);
    setUsers([]);

    const { from, to } = buildDateRange(a, m);

    try {
      const [sportResults, usersRes] = await Promise.all([
        Promise.all(
          TENIS_SPORTS.map((id) =>
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
      // silencioso — los KPIs financieros quedan en "—"
    } finally {
      setLoadingTx(false);
    }
  }, []);

  useEffect(() => {
    fetchBase(año, mes);
    fetchTx(año, mes);
  }, [año, mes, fetchBase, fetchTx]);

  // Deportes disponibles en los datos
  const availableSports = useMemo(
    () => ["Todos", ...Array.from(new Set(bookings.map((b) => b.sportName))).sort()],
    [bookings]
  );

  // Filtro client-side por deporte
  const filtered = useMemo(
    () => deporte === "Todos" ? bookings : bookings.filter((b) => b.sportName === deporte),
    [bookings, deporte]
  );

  // Derivados
  const kpis      = computeKpis(filtered, transactions, users);
  const barData   = bookingsByMonth(filtered);
  const pivotRows = sportPivot(deporte === "Todos" ? bookings : filtered);

  // Pie:
  //  - "Todos" → distribución por deporte (con colores por deporte)
  //  - deporte específico → Socios vs Invitados
  const pieData = useMemo(() => {
    if (deporte === "Todos") {
      const countMap = new Map<string, number>();
      for (const b of bookings) countMap.set(b.sportName, (countMap.get(b.sportName) ?? 0) + 1);
      const total = bookings.length || 1;
      return Array.from(countMap.entries()).map(([name, count]) => ({
        name,
        value: Math.round((count / total) * 100),
        color: getSportColor(name),
      }));
    }
    return customerTypeBreakdown(filtered);
  }, [deporte, bookings, filtered]);

  const pieTitle = deporte === "Todos" ? "Distribución por Deporte" : "Socios vs Invitados";

  return (
    <div className="p-6 md:p-8 min-h-screen">
      <Header
        title="Tenis y Deportes"
        subtitle="Club de Golf Los Leones — Reservas y métricas"
      />

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-[#8b1c31]" />
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Filtros</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <SelectDropdown label="Año"     value={año}     options={AÑOS}            onChange={setAño}     />
          <SelectDropdown label="Mes"     value={mes}     options={MESES}           onChange={setMes}     />
          <SelectDropdown label="Deporte" value={deporte} options={availableSports} onChange={setDeporte} />
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
          <span className="text-sm">Cargando reservas...</span>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
              title="Ingresos Totales"
              value={loadingTx ? "—" : formatCLP(kpis.ingresosAsociados + kpis.ingresosGreenFee)}
              icon={
                loadingTx
                  ? <Loader2 className="w-4 h-4 text-white/80 animate-spin" />
                  : <DollarSign className="w-4 h-4 text-white/80" />
              }
              subtitle={loadingTx ? "Calculando..." : "CLP millones"}
            />
            <KpiCard
              title="Total Reservas"
              value={kpis.totalReservas.toLocaleString()}
              icon={<CalendarCheck className="w-4 h-4 text-white/80" />}
              subtitle="Período seleccionado"
            />
            <KpiCard
              title="Socios Activos"
              value={kpis.sociosActivos.toLocaleString()}
              icon={<Users className="w-4 h-4 text-white/80" />}
              subtitle="Membresías vigentes"
            />
            <KpiCard
              title="Horas Ocupadas"
              value={kpis.horasOcupadas.toLocaleString()}
              icon={<Clock className="w-4 h-4 text-white/80" />}
              subtitle="Cancha utilizada"
            />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <BarChartComponent title="Reservas por Mes" data={barData} />
            <PieChartComponent title={pieTitle} data={pieData} />
          </div>

          {/* Tabla pivot */}
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
