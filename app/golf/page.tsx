"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Header from "@/components/layout/Header";
import SelectDropdown from "@/components/filters/SelectDropdown";
import KpiCard from "@/components/kpi/KpiCard";
import BarChartComponent from "@/components/charts/BarChartComponent";
import LineChartComponent from "@/components/charts/LineChartComponent";
import PieChartComponent from "@/components/charts/PieChartComponent";
import HistogramChart from "@/components/charts/HistogramChart";
import SportPivotTable from "@/components/tables/SportPivotTable";
import BookingsTable from "@/components/tables/BookingsTable";
import { Users, CalendarCheck, DollarSign, Flag, Clock, Loader2, Filter, RefreshCw } from "lucide-react";
import {
  bookingsByMonth,
  temporalTrend,
  genderBreakdown,
  ageDistribution,
  computeKpis,
  filterBookings,
  sportPivot,
  activityPivot,
  hoyosPieData,
  hoyosBreakdown,
  customerTypeBreakdown,
} from "@/lib/transforms";
import { GOLF_SPORTS, SPORT_IDS, getSportColor } from "@/lib/sports-config";
import { cachedFetch, clearApiCache } from "@/lib/api-cache";
import type { ECBooking, ECTransaction, ECUser } from "@/lib/easycanchas";

// ── Constantes ─────────────────────────────────────────────────────────────────

const AÑOS        = ["2021","2022","2023","2024","2025"];
const MESES       = ["Todos","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MIEMBRO_OPS = ["Todos","Sí","No"];
const AGENDA_OPS  = ["Todos","Recepción","Teléfono","App móvil","Web"];

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

const clpSubtitle = (val: number): string => {
  if (Math.abs(val) >= 1_000_000) return "CLP millones";
  if (Math.abs(val) >= 1_000) return "CLP miles";
  return "CLP";
};

// ── Componente ────────────────────────────────────────────────────────────────

export default function GolfPage() {
  const [año,         setAño]         = useState("2025");
  const [mes,         setMes]         = useState("Todos");
  const [esMiembro,   setEsMiembro]   = useState("Todos");
  const [agendadoPor, setAgendadoPor] = useState("Todos");
  const [tipoGolf,    setTipoGolf]    = useState("Todos");

  const [bookings,    setBookings]    = useState<ECBooking[]>([]);
  const [users,       setUsers]       = useState<ECUser[]>([]);
  const [loadingBase, setLoadingBase] = useState(true);
  const [errorBase,   setErrorBase]   = useState<string | null>(null);

  const [transactions, setTransactions] = useState<ECTransaction[]>([]);
  const [loadingTx,    setLoadingTx]    = useState(true);
  const [errorTx,      setErrorTx]      = useState<string | null>(null);

  const fetchBase = useCallback(async (a: string, m: string) => {
    setLoadingBase(true);
    setErrorBase(null);
    setBookings([]);
    setUsers([]);
    const { from, to } = buildDateRange(a, m);
    try {
      const [sportResults, usersRes] = await Promise.all([
        Promise.all(
          GOLF_SPORTS.map((id) =>
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
    setErrorTx(null);
    setTransactions([]);
    const { from, to } = buildDateRange(a, m);
    try {
      const data = await cachedFetch<{ transactions: ECTransaction[] }>(
        `/api/easycanchas/transactions?fromIsoDate=${from}&toIsoDate=${to}`
      );
      setTransactions(data.transactions ?? []);
    } catch (err) {
      setErrorTx(err instanceof Error ? err.message : "Error al cargar transacciones");
    } finally {
      setLoadingTx(false);
    }
  }, []);

  useEffect(() => {
    fetchBase(año, mes);
    fetchTx(año, mes);
  }, [año, mes, fetchBase, fetchTx]);

  // Filtros cliente-side
  const byTipo   = useMemo(
    () => tipoGolf === "Todos" ? bookings : bookings.filter((b) => b.sportName === tipoGolf),
    [bookings, tipoGolf]
  );
  const filtered = useMemo(
    () => filterBookings(byTipo, esMiembro, agendadoPor),
    [byTipo, esMiembro, agendadoPor]
  );

  // Tipos disponibles
  const tiposGolf = useMemo(
    () => ["Todos", ...Array.from(new Set(bookings.map((b) => b.sportName))).sort()],
    [bookings]
  );

  // ── Golf estándar (sportId=20) para hoyos ────────────────────────────────────
  // Cada reserva de Golf tiene courtName = "Hoyo 1", "Hoyo 10", etc.
  const golfStd = useMemo(
    () => filtered.filter((b) => b.sportId === SPORT_IDS.GOLF),
    [filtered]
  );
  const hoyosData  = hoyosBreakdown(golfStd);   // { name, value, color }
  const totalHoyos = golfStd.length;             // solicitudes = total tee times de golf

  // ── Derivados generales ───────────────────────────────────────────────────────
  const kpis      = computeKpis(filtered, transactions, users);
  const barData   = bookingsByMonth(filtered);
  const lineData  = temporalTrend(filtered, transactions);
  const generoData = genderBreakdown(users);
  const edadData  = ageDistribution(users);

  // Pivot:
  //  "Golf" seleccionado → por hoyo (courtName) con activityPivot
  //  resto              → por tipo de deporte con sportPivot
  const isGolfTipo = tipoGolf !== "Todos" && golfStd.length > 0 && golfStd.length === filtered.length;
  const pivotRows  = isGolfTipo
    ? activityPivot(golfStd)
    : sportPivot(tipoGolf === "Todos" ? bookings : filtered);

  const pivotTitle = isGolfTipo ? "Solicitudes por Hoyo" : "Reservas por Tipo";

  // Pie:
  //  "Golf" seleccionado → distribución por hoyo
  //  "Todos"            → distribución por tipo de golf (Golf / Campeonatos / Arriendo)
  //  otro tipo          → Socios vs Invitados
  const pieData = useMemo(() => {
    if (isGolfTipo) {
      return hoyosPieData(golfStd);
    }
    if (tipoGolf === "Todos") {
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
  }, [isGolfTipo, tipoGolf, golfStd, bookings, filtered]);

  const pieTitle = isGolfTipo
    ? "Distribución por Hoyo"
    : tipoGolf === "Todos"
    ? "Distribución por Tipo"
    : "Socios vs Invitados";

  return (
    <div className="p-6 md:p-8 min-h-screen">
      <Header title="Golf" subtitle="Club de Golf Los Leones — Dashboard analítico" />

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-[#8b1c31]" />
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Filtros</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <SelectDropdown label="Año"          value={año}         options={AÑOS}        onChange={setAño}         />
          <SelectDropdown label="Mes"          value={mes}         options={MESES}       onChange={setMes}         />
          <SelectDropdown label="Tipo"         value={tipoGolf}    options={tiposGolf}   onChange={setTipoGolf}    />
          <SelectDropdown label="¿Es Socio?"   value={esMiembro}   options={MIEMBRO_OPS} onChange={setEsMiembro}   />
          <SelectDropdown label="Agendado por" value={agendadoPor} options={AGENDA_OPS}  onChange={setAgendadoPor} />
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
          {/* KPIs — 3 + 3 para balance visual */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <KpiCard
              title="Socios Activos"
              value={kpis.sociosActivos.toLocaleString()}
              icon={<Users className="w-4 h-4 text-white/80" />}
              subtitle="Membresías vigentes"
            />
            <KpiCard
              title="Total Reservas"
              value={kpis.totalReservas.toLocaleString()}
              icon={<CalendarCheck className="w-4 h-4 text-white/80" />}
              subtitle="Período seleccionado"
            />
            <KpiCard
              title="Horas Ocupadas"
              value={kpis.horasOcupadas.toLocaleString()}
              icon={<Clock className="w-4 h-4 text-white/80" />}
              subtitle="Tiempo en cancha"
            />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <KpiCard
              title="Ingresos Socios"
              value={loadingTx ? "—" : formatCLP(kpis.ingresosAsociados)}
              icon={
                loadingTx
                  ? <Loader2 className="w-4 h-4 text-white/80 animate-spin" />
                  : <DollarSign className="w-4 h-4 text-white/80" />
              }
              subtitle={loadingTx ? "Calculando..." : clpSubtitle(kpis.ingresosAsociados)}
            />
            <KpiCard
              title="Green Fees"
              value={loadingTx ? "—" : formatCLP(kpis.ingresosGreenFee)}
              icon={
                loadingTx
                  ? <Loader2 className="w-4 h-4 text-white/80 animate-spin" />
                  : <Flag className="w-4 h-4 text-white/80" />
              }
              subtitle={loadingTx ? "Calculando..." : `${kpis.greenFees} accesos externos`}
            />
            <KpiCard
              title="Solicitudes de Hoyos"
              value={totalHoyos.toLocaleString()}
              icon={<Flag className="w-4 h-4 text-white/80" />}
              subtitle="Tee times de golf"
            />
          </div>

          {/* Hoyos: pivot por hoyo solo cuando Golf está seleccionado */}
          {isGolfTipo && hoyosData.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Solicitudes por Hoyo</h3>
              <div className="flex flex-wrap gap-2">
                {hoyosData.map((h) => (
                  <div
                    key={h.name}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                    style={{ backgroundColor: h.color }}
                  >
                    <span>{h.name}</span>
                    <span className="opacity-80">— {h.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gráficos fila 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <BarChartComponent title="Reservas por Mes" data={barData} />
            <PieChartComponent title={pieTitle} data={pieData} />
          </div>

          {/* Gráficos fila 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <LineChartComponent data={lineData} />
            <PieChartComponent title="Distribución por Género" data={generoData} />
            <HistogramChart data={edadData} />
          </div>

          {/* Pivot */}
          <div className="mb-6">
            <SportPivotTable
              rows={pivotRows}
              showFinancial={!loadingTx}
              title={pivotTitle}
              rowLabel={isGolfTipo ? "Hoyo" : "Tipo"}
            />
          </div>

          {errorTx && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl px-5 py-3 mb-4 text-sm">
              No se pudieron cargar las transacciones: {errorTx}
            </div>
          )}

          <BookingsTable bookings={filtered} />
        </>
      )}
    </div>
  );
}
