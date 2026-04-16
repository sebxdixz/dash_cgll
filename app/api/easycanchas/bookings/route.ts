import { type NextRequest } from "next/server";
import { fetchBookings } from "@/lib/easycanchas";
import { kvGet, kvSet, KV_KEYS } from "@/lib/kv";
import type { ECBooking } from "@/lib/easycanchas";

// Necesario para soportar el fetch del año completo en training (API lenta ~20s/mes)
export const maxDuration = 300;

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0); // día 0 del siguiente mes = último día del mes actual
  return `${year}-${String(month).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Devuelve la lista de meses ("01".."12") cubiertos por el rango from..to (mismo año) */
function monthsInRange(from: string, to: string): string[] {
  const fromMonth = Number(from.slice(5, 7));
  const toMonth   = Number(to.slice(5, 7));
  const months: string[] = [];
  for (let m = fromMonth; m <= toMonth; m++) {
    months.push(String(m).padStart(2, "0"));
  }
  return months;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const from    = searchParams.get("fromIsoDate");
  const to      = searchParams.get("toIsoDate");
  const sportId = searchParams.get("sportId");

  if (!from || !to) {
    return Response.json(
      { error: "fromIsoDate y toIsoDate son requeridos" },
      { status: 400 }
    );
  }

  const fromYear = from.slice(0, 4);
  const toYear   = to.slice(0, 4);
  const sid      = sportId ? Number(sportId) : undefined;

  // ── Cache por mes cuando hay sportId y rango dentro del mismo año ─────────
  // Estrategia: clave bookings:{year}:{mm}:{sportId} — un mes cabe en < 1MB
  if (sid !== undefined && fromYear === toYear) {
    const months = monthsInRange(from, to);

    const monthResults = await Promise.all(
      months.map(async (month) => {
        const kvKey = KV_KEYS.bookings(fromYear, month, sid);
        const cached = await kvGet<ECBooking[]>(kvKey);
        if (cached) return cached;

        // Cache miss → fetch solo ese mes
        const mFrom = `${fromYear}-${month}-01`;
        const mTo   = lastDayOfMonth(Number(fromYear), Number(month));
        try {
          const monthBookings = await fetchBookings(mFrom, mTo, sid);
          await kvSet(kvKey, monthBookings);
          return monthBookings;
        } catch {
          return [] as ECBooking[];
        }
      })
    );

    // Unir todos los meses y recortar al rango exacto pedido
    const all      = monthResults.flat();
    const filtered = all.filter((b) => b.localDate >= from && b.localDate <= to);
    return Response.json({ bookings: filtered });
  }

  // ── Sin sportId o rango multi-año → fetch directo sin cache ───────────────
  try {
    const bookings = await fetchBookings(from, to, sid);
    return Response.json({ bookings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return Response.json({ error: message }, { status: 502 });
  }
}
