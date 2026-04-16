// ── Transformaciones de datos de la API a formatos de gráficos ────────────────

import { ECBooking, ECTransaction, ECUser, isSocio } from "./easycanchas";

const MONTH_ABBREV = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// ── Gráfico de barras: reservas y usuarios únicos por mes ──────────────────────

export function bookingsByMonth(bookings: ECBooking[]) {
  const map = new Map<string, { mes: string; userIds: Set<number>; count: number }>();

  for (const b of bookings) {
    const [year, month] = b.localDate.split("-");
    const key = `${year}-${month}`;
    if (!map.has(key)) {
      map.set(key, { mes: MONTH_ABBREV[Number(month) - 1], userIds: new Set(), count: 0 });
    }
    const entry = map.get(key)!;
    entry.userIds.add(b.userId);
    entry.count++;
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({ mes: v.mes, usuarios: v.userIds.size, reservas: v.count }));
}

// ── Gráfico de línea: tendencia mensual de reservas e ingresos ─────────────────

export function temporalTrend(bookings: ECBooking[], transactions: ECTransaction[]) {
  const reservasByMonth = new Map<string, number>();
  const ingresosByMonth = new Map<string, number>();

  const bookingIds = new Set(bookings.map((b) => String(b.id)));

  for (const b of bookings) {
    const key = b.localDate.slice(0, 7);
    reservasByMonth.set(key, (reservasByMonth.get(key) ?? 0) + 1);
  }

  for (const tx of transactions) {
    for (const p of tx.products) {
      if (p.productId !== 1) continue;
      if (bookingIds.size > 0 && !bookingIds.has(String(p.productTransactionId))) continue;
      const key = p.transactionDate.slice(0, 7);
      ingresosByMonth.set(key, (ingresosByMonth.get(key) ?? 0) + p.productAmount);
    }
  }

  const allKeys = new Set([...reservasByMonth.keys(), ...ingresosByMonth.keys()]);
  return Array.from(allKeys)
    .sort()
    .map((fecha) => ({
      fecha,
      reservas: reservasByMonth.get(fecha) ?? 0,
      ingresos: ingresosByMonth.get(fecha) ?? 0,
    }));
}

// ── Pie: distribución de estados de reserva ────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  BOOKED: "Reservado",
  PARTIALLY_PAID: "Pago parcial",
  PAID: "Pagado",
  USED: "Completada",
  CANCELLED: "Cancelada",
  EXCHANGED: "Canjeada",
};
const STATUS_COLOR: Record<string, string> = {
  BOOKED: "#c9a87c",
  PARTIALLY_PAID: "#d7c9ad",
  PAID: "#2d6a4f",
  USED: "#8b1c31",
  CANCELLED: "#6b2d3e",
  EXCHANGED: "#9b7b4f",
};

export function bookingStatusBreakdown(bookings: ECBooking[]) {
  const counts = new Map<string, number>();
  for (const b of bookings) {
    counts.set(b.status, (counts.get(b.status) ?? 0) + 1);
  }
  const total = bookings.length || 1;
  return Array.from(counts.entries()).map(([status, count]) => ({
    name: STATUS_LABEL[status] ?? status,
    value: Math.round((count / total) * 100),
    color: STATUS_COLOR[status] ?? "#999999",
  }));
}

// ── Pie: distribución por género ───────────────────────────────────────────────

export function genderBreakdown(users: ECUser[]) {
  let male = 0, female = 0, other = 0;
  for (const u of users) {
    if (u.gender === "M") male++;
    else if (u.gender === "F") female++;
    else other++;
  }
  const total = users.length || 1;
  const result = [
    { name: "Masculino",  value: Math.round((male   / total) * 100), color: "#8b1c31" },
    { name: "Femenino",   value: Math.round((female / total) * 100), color: "#c9a87c" },
  ];
  if (other > 0) {
    result.push({ name: "No especificado", value: Math.round((other / total) * 100), color: "#d7c9ad" });
  }
  return result;
}

// ── Histograma: distribución por edad ─────────────────────────────────────────

const AGE_RANGES = ["0-9","10-19","20-29","30-39","40-49","50-59","60-69","70-79","80-89","90+"];

export function ageDistribution(users: ECUser[]) {
  const counts = new Map<string, number>(AGE_RANGES.map((r) => [r, 0]));
  for (const u of users) {
    if (u.age == null) continue;
    const key = u.age >= 90 ? "90+" : (AGE_RANGES[Math.floor(u.age / 10)] ?? "90+");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return AGE_RANGES.map((rango) => ({ rango, cantidad: counts.get(rango) ?? 0 }));
}

// ── KPIs ───────────────────────────────────────────────────────────────────────

export function computeKpis(
  bookings: ECBooking[],
  transactions: ECTransaction[],
  allUsers: ECUser[]
) {
  const sociosActivos = allUsers.filter((u) => !u.blocked && u.memberId != null).length;
  const totalReservas = bookings.length;

  // Join: solo contar transacciones que correspondan a nuestros bookings filtrados
  // Clave: booking.id === product.productTransactionId  WHERE  productId === 1
  const bookingIds = new Set(bookings.map((b) => String(b.id)));

  let ingresosAsociados = 0;
  let ingresosGreenFee  = 0;
  let greenFeeCount     = 0;

  for (const tx of transactions) {
    for (const p of tx.products) {
      if (p.productId !== 1) continue;
      // Si hay bookings filtrados, restringir al join; si bookingIds está vacío, no hay nada que contar
      if (bookingIds.size > 0 && !bookingIds.has(String(p.productTransactionId))) continue;
      if (isSocio(p.userType)) {
        ingresosAsociados += p.productAmount;
      } else {
        ingresosGreenFee += p.productAmount;
        greenFeeCount++;
      }
    }
  }

  const horasOcupadas = Math.round(
    bookings.reduce((sum, b) => sum + (b.timespan ?? 0), 0) / 60
  );

  return {
    sociosActivos,
    totalReservas,
    ingresosAsociados,
    ingresosGreenFee,
    greenFees: greenFeeCount,
    horasOcupadas,
  };
}

// ── Tabla pivot: deporte × mes ────────────────────────────────────────────────

export interface PivotCell {
  reservas: number;
  total:    number;   // suma de totalAmount
  horas:    number;   // suma de timespan / 60
}

export interface PivotRow {
  sport:  string;
  sportId: number;
  months: Record<string, PivotCell>; // key = "01".."12"
  totals: PivotCell;
}

export function sportPivot(bookings: ECBooking[]): PivotRow[] {
  const map = new Map<string, PivotRow>();

  for (const b of bookings) {
    const key    = b.sportName;
    const month  = b.localDate.slice(5, 7); // "01".."12"

    if (!map.has(key)) {
      map.set(key, { sport: key, sportId: b.sportId, months: {}, totals: { reservas: 0, total: 0, horas: 0 } });
    }
    const row = map.get(key)!;
    if (!row.months[month]) row.months[month] = { reservas: 0, total: 0, horas: 0 };

    row.months[month].reservas += 1;
    row.months[month].total    += b.totalAmount ?? 0;
    row.months[month].horas    += (b.timespan ?? 0) / 60;

    row.totals.reservas += 1;
    row.totals.total    += b.totalAmount ?? 0;
    row.totals.horas    += (b.timespan ?? 0) / 60;
  }

  return Array.from(map.values()).sort((a, b) => b.totals.reservas - a.totals.reservas);
}

/** Lista de meses (números "01".."12") que tienen al menos una reserva */
export function activePivotMonths(rows: PivotRow[]): string[] {
  const months = new Set<string>();
  for (const row of rows) Object.keys(row.months).forEach((m) => months.add(m));
  return Array.from(months).sort();
}

/**
 * Igual que sportPivot pero agrupa por courtName en vez de sportName.
 * Útil para mostrar actividades/clases dentro de un mismo deporte.
 */
export function activityPivot(bookings: ECBooking[]): PivotRow[] {
  const map = new Map<string, PivotRow>();

  for (const b of bookings) {
    const key   = b.courtName;
    const month = b.localDate.slice(5, 7);

    if (!map.has(key)) {
      map.set(key, { sport: key, sportId: b.sportId, months: {}, totals: { reservas: 0, total: 0, horas: 0 } });
    }
    const row = map.get(key)!;
    if (!row.months[month]) row.months[month] = { reservas: 0, total: 0, horas: 0 };

    row.months[month].reservas += 1;
    row.months[month].total    += b.totalAmount ?? 0;
    row.months[month].horas    += (b.timespan ?? 0) / 60;

    row.totals.reservas += 1;
    row.totals.total    += b.totalAmount ?? 0;
    row.totals.horas    += (b.timespan ?? 0) / 60;
  }

  return Array.from(map.values()).sort((a, b) => b.totals.reservas - a.totals.reservas);
}

/**
 * Distribución de reservas por deporte para el gráfico de barras horizontales.
 * Devuelve un arreglo ordenado de mayor a menor.
 */
export function bookingsBySport(bookings: ECBooking[]) {
  const map = new Map<string, { sport: string; reservas: number; horas: number }>();

  for (const b of bookings) {
    const key = b.sportName;
    if (!map.has(key)) map.set(key, { sport: key, reservas: 0, horas: 0 });
    const e = map.get(key)!;
    e.reservas += 1;
    e.horas    += (b.timespan ?? 0) / 60;
  }

  return Array.from(map.values()).sort((a, b) => b.reservas - a.reservas);
}

/** KPIs rápidos solo desde bookings (sin transactions). */
export function quickKpis(bookings: ECBooking[], allUsers: ECUser[]) {
  const sociosActivos   = allUsers.filter((u) => !u.blocked && u.memberId != null).length;
  const totalReservas   = bookings.length;
  const horasOcupadas   = Math.round(bookings.reduce((s, b) => s + (b.timespan ?? 0), 0) / 60);
  const usuariosUnicos  = new Set(bookings.map((b) => b.userId)).size;
  return { sociosActivos, totalReservas, horasOcupadas, usuariosUnicos };
}

// ── Golf: distribución por hoyo (courtName = "Hoyo 1", "Hoyo 10", etc.) ───────

/** Colores para distinguir hoyos en gráficos (ciclo sobre una paleta oscura/terracota) */
const HOYO_COLORS = [
  "#8b1c31","#a32439","#c9a87c","#6b2d3e","#d7c9ad",
  "#4a1520","#9b6070","#b07080","#7a4a5a","#c09090",
  "#5a1828","#e0b080","#3d1018","#f0d0a0","#2a0810",
  "#8b5060","#603040","#d0a070","#401020","#b09080",
];

/**
 * Agrupa bookings de golf por courtName (hoyo).
 * Devuelve array ordenado de mayor a menor frecuencia con color asignado.
 */
export function hoyosBreakdown(bookings: ECBooking[]) {
  const counts = new Map<string, number>();

  for (const b of bookings) {
    const key = b.courtName || "Sin asignar";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, value], i) => ({ name, value, color: HOYO_COLORS[i % HOYO_COLORS.length] }))
    .sort((a, b) => b.value - a.value);
}

/** Porcentaje de hoyos para pie chart */
export function hoyosPieData(bookings: ECBooking[]) {
  const raw = hoyosBreakdown(bookings);
  const total = raw.reduce((s, h) => s + h.value, 0) || 1;
  return raw.map((h) => ({ ...h, value: Math.round((h.value / total) * 100) }));
}

// ── Distribución Socios vs Invitados (desde customerCodes, sin transactions) ──

export function customerTypeBreakdown(bookings: ECBooking[]) {
  let socios = 0, invitados = 0;
  for (const b of bookings) {
    if (b.customerCodes?.toLowerCase().includes("socio")) socios++;
    else invitados++;
  }
  const total = bookings.length || 1;
  return [
    { name: "Socios",   value: Math.round((socios    / total) * 100), color: "#8b1c31" },
    { name: "Invitados", value: Math.round((invitados / total) * 100), color: "#c9a87c" },
  ].filter((d) => d.value > 0);
}

// ── Filtro cliente-side ────────────────────────────────────────────────────────

export function filterBookings(
  bookings: ECBooking[],
  esMiembro: string,
  agendadoPor: string
) {
  return bookings.filter((b) => {
    if (esMiembro === "Sí" && !b.customerCodes?.toLowerCase().includes("socio")) return false;
    if (esMiembro === "No" &&  b.customerCodes?.toLowerCase().includes("socio")) return false;

    if (agendadoPor === "Recepción" || agendadoPor === "Teléfono") {
      if (b.bookedBy !== "club") return false;
    } else if (agendadoPor === "App móvil" || agendadoPor === "Web") {
      if (b.bookedBy !== "user") return false;
    }

    return true;
  });
}
