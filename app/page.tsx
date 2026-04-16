"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import KpiCard from "@/components/kpi/KpiCard";
import SelectDropdown from "@/components/filters/SelectDropdown";
import BarChartComponent from "@/components/charts/BarChartComponent";
import PieChartComponent from "@/components/charts/PieChartComponent";
import SportPivotTable from "@/components/tables/SportPivotTable";
import {
  bookingsByMonth,
  bookingsBySport,
  sportPivot,
  quickKpis,
} from "@/lib/transforms";
import { ALL_SPORTS, getSportColor } from "@/lib/sports-config";
import type { ECBooking, ECUser } from "@/lib/easycanchas";
import { cachedFetch, clearApiCache } from "@/lib/api-cache";
import { Users, CalendarCheck, Clock, Activity, Loader2, Filter, RefreshCw } from "lucide-react";

const AÑOS = ["2021", "2022", "2023", "2024", "2025"];

function buildDateRange(año: string, mes: string) {
  const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  if (mes === "Todos") return { from: `${año}-01-01`, to: `${año}-12-31` };
  const idx = MONTHS.indexOf(mes);
  const m   = String(idx + 1).padStart(2, "0");
  const last = new Date(Number(año), idx + 1, 0).getDate();
  return { from: `${año}-${m}-01`, to: `${año}-${m}-${String(last).padStart(2, "0")}` };
}

const MESES = ["Todos","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default function GeneralPage() {
  const [año, setAño] = useState("2025");
  const [mes, setMes] = useState("Todos");

  const [bookings,   setBookings]   = useState<ECBooking[]>([]);
  const [users,      setUsers]      = useState<ECUser[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  // loaded = nombres de deportes con datos (para mostrar en el label)
  // doneCount = fetches completados, con o sin datos (para la barra de progreso)
  const [loaded,     setLoaded]     = useState<string[]>([]);
  const [doneCount,  setDoneCount]  = useState(0);

  const fetchData = useCallback(async (a: string, m: string) => {
    setLoading(true);
    setError(null);
    setBookings([]);
    setLoaded([]);
    setDoneCount(0);

    const { from, to } = buildDateRange(a, m);

    try {
      // Fetch users una sola vez, sports en paralelo con actualización incremental
      const usersPromise = cachedFetch<{ users: ECUser[] }>("/api/easycanchas/users")
        .then((d) => setUsers(d.users ?? []));

      const sportPromises = ALL_SPORTS.map((id) =>
        cachedFetch<{ bookings: ECBooking[] }>(
          `/api/easycanchas/bookings?fromIsoDate=${from}&toIsoDate=${to}&sportId=${id}`
        )
          .then((d) => {
            const b = (d.bookings ?? []) as ECBooking[];
            if (b.length > 0) {
              setBookings((prev) => [...prev, ...b]);
              setLoaded((prev) => [...prev, b[0].sportName]);
            }
            setDoneCount((prev) => prev + 1);
            return b;
          })
          .catch(() => {
            setDoneCount((prev) => prev + 1);
            return [] as ECBooking[];
          })
      );

      await Promise.all([usersPromise, ...sportPromises]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(año, mes);
  }, [año, mes, fetchData]);

  // Derivados
  const kpis        = quickKpis(bookings, users);
  const barData     = bookingsByMonth(bookings);
  const sportData   = bookingsBySport(bookings).map((s) => ({
    name:  s.sport,
    value: s.reservas,
    color: getSportColor(s.sport),
  }));
  const pivotRows   = sportPivot(bookings);

  const totalSports = ALL_SPORTS.length;
  const isPartial   = loading || doneCount < totalSports;

  return (
    <div className="p-6 md:p-8 min-h-screen">
      <Header
        title="Resumen General"
        subtitle="Club de Golf Los Leones — Todos los deportes"
      />

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-[#8b1c31]" />
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Filtros</span>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <SelectDropdown label="Año" value={año} options={AÑOS}  onChange={setAño} />
          <SelectDropdown label="Mes" value={mes} options={MESES} onChange={setMes} />
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

      {/* Barra de progreso de carga */}
      {isPartial && (
        <div className="bg-white rounded-2xl border border-gray-200 px-5 py-3 mb-6 flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-[#8b1c31] shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Cargando deportes... {doneCount}/{totalSports}</span>
              <span>{loaded.join(", ")}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#8b1c31] rounded-full transition-all duration-300"
                style={{ width: `${(doneCount / totalSports) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* KPIs — aparecen aunque no haya cargado todo */}
      {(loaded.length > 0 || !loading) && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
              title="Total Reservas"
              value={kpis.totalReservas.toLocaleString()}
              icon={<CalendarCheck className="w-4 h-4 text-white/80" />}
              subtitle={isPartial ? `${loaded.length}/${totalSports} deportes` : "Todos los deportes"}
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
              subtitle="Canchas + instalaciones"
            />
            <KpiCard
              title="Usuarios Únicos"
              value={kpis.usuariosUnicos.toLocaleString()}
              icon={<Activity className="w-4 h-4 text-white/80" />}
              subtitle="Con al menos 1 reserva"
            />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <BarChartComponent title="Reservas por Mes (todos los deportes)" data={barData} />
            <PieChartComponent title="Distribución por Deporte" data={sportData} />
          </div>

          {/* Pivot por deporte */}
          <SportPivotTable rows={pivotRows} showFinancial={false} />
        </>
      )}
    </div>
  );
}
