"use client";

/**
 * PÁGINA DE DIAGNÓSTICO — /debug
 * Muestra la data cruda de la API para entender la estructura real.
 * No está en el menú de navegación.
 */

import { useState, useEffect } from "react";
import type { ECBooking, ECTransaction, ECUser } from "@/lib/easycanchas";

const SPORT_GROUPS = [
  { label: "Golf",       ids: [20, 246, 87] },
  { label: "Tenis",      ids: [1, 332, 7, 97, 265, 11, 3] },
  { label: "Gimnasio",   ids: [63, 420] },
  { label: "Actividades",ids: [18, 39, 315, 981, 998, 104] },
];

type SportSummary = {
  sportId: number;
  label: string;
  count: number;
  sportNames: string[];
  courtNames: string[];
  sampleAncillaries: string[];
  sampleCustomerCodes: string[];
  sampleStatuses: string[];
  sample: ECBooking | null;
};

type TxSummary = {
  total: number;
  productIdCounts: Record<number, number>;
  userTypes: string[];
  sampleProducts: ECTransaction["products"];
  sample: ECTransaction | null;
};

export default function DebugPage() {
  const [año, setAño] = useState("2025");
  const [loading, setLoading] = useState(false);
  const [sportData, setSportData] = useState<SportSummary[]>([]);
  const [txData, setTxData] = useState<TxSummary | null>(null);
  const [users, setUsers] = useState<{ total: number; conMemberId: number; bloqueados: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  async function runDiag() {
    setLoading(true);
    setSportData([]);
    setTxData(null);
    setUsers(null);
    setErrors([]);

    const from = `${año}-01-01`;
    const to   = `${año}-12-31`;
    const errs: string[] = [];

    // ── Usuarios ──────────────────────────────────────────────────────────────
    try {
      const res = await fetch("/api/easycanchas/users");
      const d = await res.json() as { users?: ECUser[] };
      const u = d.users ?? [];
      setUsers({
        total:         u.length,
        conMemberId:   u.filter((x) => x.memberId != null).length,
        bloqueados:    u.filter((x) => x.blocked).length,
      });
    } catch (e) {
      errs.push(`Users: ${e}`);
    }

    // ── Transacciones (sample del primer mes) ─────────────────────────────────
    try {
      const res = await fetch(`/api/easycanchas/transactions?fromIsoDate=${from}&toIsoDate=${año}-01-31`);
      const d = await res.json() as { transactions?: ECTransaction[] };
      const txs = d.transactions ?? [];
      const productIdCounts: Record<number, number> = {};
      const userTypesSet = new Set<string>();
      for (const tx of txs) {
        for (const p of tx.products) {
          productIdCounts[p.productId] = (productIdCounts[p.productId] ?? 0) + 1;
          userTypesSet.add(p.userType);
        }
      }
      setTxData({
        total: txs.length,
        productIdCounts,
        userTypes: Array.from(userTypesSet),
        sampleProducts: txs[0]?.products ?? [],
        sample: txs[0] ?? null,
      });
    } catch (e) {
      errs.push(`Transactions: ${e}`);
    }

    // ── Bookings por sport ────────────────────────────────────────────────────
    const summaries: SportSummary[] = [];

    for (const group of SPORT_GROUPS) {
      for (const id of group.ids) {
        try {
          const res  = await fetch(`/api/easycanchas/bookings?fromIsoDate=${from}&toIsoDate=${to}&sportId=${id}`);
          const d    = await res.json() as { bookings?: ECBooking[]; error?: string };
          if (d.error) { errs.push(`Sport ${id}: ${d.error}`); continue; }
          const bks  = d.bookings ?? [];

          const sportNamesSet  = new Set(bks.map((b) => b.sportName));
          const courtNamesSet  = new Set(bks.map((b) => b.courtName));
          const statusSet      = new Set(bks.map((b) => b.status));
          const custCodesSet   = new Set(bks.slice(0, 20).map((b) => b.customerCodes));
          const ancSet         = new Set(
            bks.slice(0, 30).flatMap((b) =>
              (b.ancillaries ?? []).map((a) => `${a.name} (qty:${a.quantity})`)
            )
          );

          summaries.push({
            sportId:             id,
            label:               group.label,
            count:               bks.length,
            sportNames:          Array.from(sportNamesSet),
            courtNames:          Array.from(courtNamesSet).slice(0, 25),
            sampleAncillaries:   Array.from(ancSet).slice(0, 10),
            sampleCustomerCodes: Array.from(custCodesSet).filter(Boolean).slice(0, 10),
            sampleStatuses:      Array.from(statusSet),
            sample:              bks[0] ?? null,
          });
        } catch (e) {
          errs.push(`Sport ${id}: ${e}`);
        }
      }
    }

    setSportData(summaries);
    setErrors(errs);
    setLoading(false);
  }

  useEffect(() => { runDiag(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-6 md:p-8 min-h-screen font-mono text-xs">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="bg-gray-900 text-green-400 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-green-300">🔍 DEBUG — Diagnóstico de datos</p>
            <p className="text-green-600 text-xs mt-0.5">No está en el menú. URL directa: /debug</p>
          </div>
          <div className="flex gap-3 items-center">
            <select
              value={año}
              onChange={(e) => setAño(e.target.value)}
              className="bg-gray-800 text-green-300 border border-green-700 rounded px-2 py-1"
            >
              {["2021","2022","2023","2024","2025"].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
            <button
              onClick={runDiag}
              disabled={loading}
              className="bg-green-700 text-white px-4 py-1 rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? "Cargando..." : "Re-ejecutar"}
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center py-20 text-gray-400 text-sm">
            Cargando datos (puede tardar ~60s por las transacciones)…
          </div>
        )}

        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 mb-6">
            <p className="font-bold text-red-700 mb-2">Errores:</p>
            {errors.map((e, i) => <p key={i} className="text-red-600">{e}</p>)}
          </div>
        )}

        {/* Usuarios */}
        {users && (
          <Section title="👥 Usuarios">
            <Row label="Total usuarios"          value={users.total} />
            <Row label="Con memberId (socios)"   value={users.conMemberId} />
            <Row label="Bloqueados"              value={users.bloqueados} />
          </Section>
        )}

        {/* Transacciones */}
        {txData && (
          <Section title={`💳 Transacciones (Enero ${año} — muestra)`}>
            <Row label="Total transacciones"    value={txData.total} />
            <Row label="userTypes encontrados"  value={txData.userTypes.join(", ") || "—"} />
            <Row label="productId → conteo"     value={
              Object.entries(txData.productIdCounts)
                .map(([id, n]) => `productId=${id}: ${n}`)
                .join("  |  ") || "—"
            } />
            {txData.sampleProducts.length > 0 && (
              <div className="mt-3">
                <p className="text-gray-500 uppercase tracking-wider mb-1">Primer producto de la primera transacción:</p>
                <pre className="bg-gray-100 rounded p-3 text-xs overflow-x-auto">
                  {JSON.stringify(txData.sampleProducts[0], null, 2)}
                </pre>
              </div>
            )}
            {txData.sample && (
              <div className="mt-3">
                <p className="text-gray-500 uppercase tracking-wider mb-1">payment de la primera transacción:</p>
                <pre className="bg-gray-100 rounded p-3 text-xs overflow-x-auto">
                  {JSON.stringify(txData.sample.payment, null, 2)}
                </pre>
              </div>
            )}
          </Section>
        )}

        {/* Bookings por sport */}
        {sportData.map((s) => (
          <Section key={s.sportId} title={`⛳ sportId=${s.sportId} [${s.label}] — ${s.count} reservas`}>
            <Row label="sportName(s)"          value={s.sportNames.join(", ") || "—"} />
            <Row label="courtNames (muestra)"  value={s.courtNames.length > 0 ? s.courtNames.join(", ") : "—"} />
            <Row label="statuses"              value={s.sampleStatuses.join(", ")} />
            <Row label="customerCodes (sample)"value={s.sampleCustomerCodes.join(" | ") || "—"} />
            <Row label="ancillaries (sample)"  value={s.sampleAncillaries.join(" | ") || "ninguna"} />
            {s.sample && (
              <div className="mt-3">
                <p className="text-gray-500 uppercase tracking-wider mb-1">Primera reserva completa:</p>
                <pre className="bg-gray-100 rounded p-3 text-xs overflow-x-auto">
                  {JSON.stringify(s.sample, null, 2)}
                </pre>
              </div>
            )}
          </Section>
        ))}

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden">
      <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
        <p className="font-bold text-gray-700">{title}</p>
      </div>
      <div className="p-4 space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-48 shrink-0">{label}:</span>
      <span className="text-gray-800 break-all">{String(value)}</span>
    </div>
  );
}
