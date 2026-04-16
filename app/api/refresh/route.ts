/**
 * Endpoint de precarga — llamado por el Cron Job de Vercel a las 12:00 diarias.
 *
 * Estrategia:
 *  - Sin params → refresca solo el MES ACTUAL (rápido, ~30-60s, cabe en Vercel maxDuration)
 *  - ?year=2024&month=03 → refresca un mes específico (para warm-up manual)
 *  - ?year=2024 → refresca todos los meses de un año (lento, solo usar localmente)
 *
 * Seguridad: requiere header "Authorization: Bearer {CRON_SECRET}" o ?secret=...
 */

import { type NextRequest } from "next/server";
import { fetchUsers, fetchBookings, fetchTransactions } from "@/lib/easycanchas";
import { kvSet, KV_KEYS } from "@/lib/kv";
import { ALL_SPORTS } from "@/lib/sports-config";

export const maxDuration = 300;

/** TTL largo para datos históricos (30 días). Los datos pasados no cambian. */
const HISTORICAL_TTL_S = 30 * 24 * 60 * 60;
/** TTL corto para el mes en curso (26 horas, mayor que el cron de 24h). */
const CURRENT_TTL_S = 26 * 60 * 60;

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0);
  return `${year}-${String(month).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;
  const querySecret = request.nextUrl.searchParams.get("secret");
  if (querySecret === secret) return true;
  return false;
}

/** Refresca un mes concreto para todos los deportes (ALL_SPORTS en paralelo). */
async function refreshMonth(year: string, month: string, ttl: number, log: string[]) {
  const mFrom = `${year}-${month}-01`;
  const mTo   = lastDayOfMonth(Number(year), Number(month));

  await Promise.all(
    ALL_SPORTS.map(async (sportId) => {
      try {
        const bookings = await fetchBookings(mFrom, mTo, sportId);
        await kvSet(KV_KEYS.bookings(year, month, sportId), bookings, ttl);
        log.push(`bookings:${year}:${month}:${sportId} → ${bookings.length}`);
      } catch {
        log.push(`bookings:${year}:${month}:${sportId} → ERROR`);
      }
    })
  );
}

/** Refresca el año completo de transacciones (12 meses en paralelo). */
async function refreshTransactions(year: string, log: string[]) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const results = await Promise.all(
    months.map((m) => {
      const mm  = String(m).padStart(2, "0");
      const end = lastDayOfMonth(Number(year), m);
      return fetchTransactions(`${year}-${mm}-01`, end).catch(() => []);
    })
  );
  const txs = results.flat();
  await kvSet(KV_KEYS.transactions(year), txs);
  log.push(`transactions:${year} → ${txs.length}`);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const paramYear  = searchParams.get("year");
  const paramMonth = searchParams.get("month");

  const log: string[] = [];
  const start = Date.now();

  const now          = new Date();
  const currentYear  = String(now.getFullYear());
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

  try {
    // ── Usuarios (siempre) ─────────────────────────────────────────────────
    const users = await fetchUsers();
    await kvSet(KV_KEYS.users(), users);
    log.push(`users: ${users.length}`);

    if (paramYear && paramMonth) {
      // ── Modo: mes específico ──────────────────────────────────────────────
      const isCurrentMonth = paramYear === currentYear && paramMonth === currentMonth;
      const ttl = isCurrentMonth ? CURRENT_TTL_S : HISTORICAL_TTL_S;
      await refreshMonth(paramYear, paramMonth, ttl, log);

    } else if (paramYear) {
      // ── Modo: año completo (lento — solo para uso local o warm-up inicial) ─
      const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
      for (const month of MONTHS) {
        const isCurrentMonth = paramYear === currentYear && month === currentMonth;
        const ttl = isCurrentMonth ? CURRENT_TTL_S : HISTORICAL_TTL_S;
        await refreshMonth(paramYear, month, ttl, log);
      }
      await refreshTransactions(paramYear, log);

    } else {
      // ── Modo por defecto (cron diario): solo mes actual + transacciones ───
      await refreshMonth(currentYear, currentMonth, CURRENT_TTL_S, log);
      await refreshTransactions(currentYear, log);
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    return Response.json({ ok: true, elapsed: `${elapsed}s`, log });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Error desconocido", log },
      { status: 500 }
    );
  }
}
