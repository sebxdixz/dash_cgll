/**
 * Endpoint de precarga — llamado por el Cron Job de Vercel a las 12:00 diarias.
 * Fetcha TODO desde EasyCanchas y lo guarda en Redis (Upstash).
 *
 * Seguridad: requiere el header "Authorization: Bearer {CRON_SECRET}"
 * (Vercel lo agrega automáticamente en los cron jobs) o el query param
 * ?secret=... para llamadas manuales.
 */

import { type NextRequest } from "next/server";
import { fetchUsers, fetchBookings, fetchTransactions } from "@/lib/easycanchas";
import { kvSet, KV_KEYS } from "@/lib/kv";

export const maxDuration = 300;

const AÑOS_A_CARGAR = ["2023", "2024", "2025"];

// Importar ALL_SPORTS sin importar módulos cliente
import { ALL_SPORTS } from "@/lib/sports-config";

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0);
  return `${year}-${String(month).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function fetchYearTransactions(year: string) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const results = await Promise.all(
    months.map((m) => {
      const mm  = String(m).padStart(2, "0");
      const end = lastDayOfMonth(Number(year), m);
      return fetchTransactions(`${year}-${mm}-01`, end).catch(() => []);
    })
  );
  return results.flat();
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // sin secreto configurado → rechazar todo

  // Vercel Cron agrega este header automáticamente
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  // Llamada manual con query param
  const querySecret = request.nextUrl.searchParams.get("secret");
  if (querySecret === secret) return true;

  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const log: string[] = [];
  const start = Date.now();

  try {
    // ── Usuarios ────────────────────────────────────────────────────────────
    const users = await fetchUsers();
    await kvSet(KV_KEYS.users(), users);
    log.push(`users: ${users.length}`);

    // ── Reservas por año × deporte × mes (clave mensual para respetar límite 1MB de Redis) ───
    const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
    for (const year of AÑOS_A_CARGAR) {
      for (const month of MONTHS) {
        const mFrom = `${year}-${month}-01`;
        const mTo   = lastDayOfMonth(Number(year), Number(month));
        await Promise.all(
          ALL_SPORTS.map(async (sportId) => {
            try {
              const bookings = await fetchBookings(mFrom, mTo, sportId);
              await kvSet(KV_KEYS.bookings(year, month, sportId), bookings);
              log.push(`bookings:${year}:${month}:${sportId} → ${bookings.length}`);
            } catch {
              log.push(`bookings:${year}:${month}:${sportId} → ERROR`);
            }
          })
        );
      }
    }

    // ── Transacciones por año ────────────────────────────────────────────────
    for (const year of AÑOS_A_CARGAR) {
      try {
        const txs = await fetchYearTransactions(year);
        await kvSet(KV_KEYS.transactions(year), txs);
        log.push(`transactions:${year} → ${txs.length}`);
      } catch {
        log.push(`transactions:${year} → ERROR`);
      }
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
