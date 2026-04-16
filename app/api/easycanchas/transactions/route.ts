import { type NextRequest } from "next/server";
import { fetchTransactions } from "@/lib/easycanchas";
import { kvGet, kvSet, KV_KEYS } from "@/lib/kv";
import type { ECTransaction } from "@/lib/easycanchas";

export const maxDuration = 300;

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0);
  return `${year}-${String(month).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function fetchTransactionsRange(from: string, to: string): Promise<ECTransaction[]> {
  const fromDate = new Date(from);
  const toDate   = new Date(to);

  const segments: { from: string; to: string }[] = [];
  let cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);

  while (cursor <= toDate) {
    const year  = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    const segFrom = cursor <= fromDate
      ? from
      : `${year}-${String(month).padStart(2, "0")}-01`;
    const segTo = new Date(year, month, 0) >= toDate
      ? to
      : lastDayOfMonth(year, month);

    segments.push({ from: segFrom, to: segTo });
    cursor = new Date(year, month, 1);
  }

  const results = await Promise.all(
    segments.map((s) => fetchTransactions(s.from, s.to).catch(() => []))
  );
  return results.flat();
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const from = searchParams.get("fromIsoDate");
  const to   = searchParams.get("toIsoDate");

  if (!from || !to) {
    return Response.json({ error: "fromIsoDate y toIsoDate son requeridos" }, { status: 400 });
  }

  const fromYear = from.slice(0, 4);
  const toYear   = to.slice(0, 4);

  // Cache solo aplica para rangos dentro del mismo año
  if (fromYear === toYear) {
    const kvKey = KV_KEYS.transactions(fromYear);
    const cached = await kvGet<ECTransaction[]>(kvKey);

    if (cached) {
      // Filtrar al rango pedido por fecha de primer producto
      const filtered = cached.filter((tx) => {
        const date = tx.products[0]?.transactionDate ?? tx.payment.localTransactionDateTime.slice(0, 10);
        return date >= from && date <= to;
      });
      return Response.json({ transactions: filtered, source: "cache" });
    }

    // Miss: fetch año completo y cachear
    try {
      const all = await fetchTransactionsRange(`${fromYear}-01-01`, `${fromYear}-12-31`);
      await kvSet(kvKey, all);
      const filtered = all.filter((tx) => {
        const date = tx.products[0]?.transactionDate ?? tx.payment.localTransactionDateTime.slice(0, 10);
        return date >= from && date <= to;
      });
      return Response.json({ transactions: filtered });
    } catch {
      return Response.json({ transactions: [] });
    }
  }

  // Multi-año → fetch directo
  try {
    const transactions = await fetchTransactionsRange(from, to);
    return Response.json({ transactions });
  } catch {
    return Response.json({ transactions: [] });
  }
}
