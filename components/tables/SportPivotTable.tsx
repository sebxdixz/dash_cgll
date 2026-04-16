"use client";

import { PivotRow, activePivotMonths } from "@/lib/transforms";

const MONTH_LABEL: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};

const fmtCLP = (n: number): string => {
  if (n === 0) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(n / 1_000)}K`;
};

const fmtHrs = (n: number) =>
  n === 0 ? "—" : `${n.toFixed(0)}h`;

interface SportPivotTableProps {
  rows:          PivotRow[];
  showFinancial: boolean;
  title?:        string;
  rowLabel?:     string;
}

export default function SportPivotTable({ rows, showFinancial, title, rowLabel = "Deporte" }: SportPivotTableProps) {
  const months = activePivotMonths(rows);
  const cols = showFinancial ? 3 : 2;

  // Grand totals
  const grand: Record<string, { reservas: number; total: number; horas: number }> = {};
  const grandTotal = { reservas: 0, total: 0, horas: 0 };
  for (const row of rows) {
    for (const [m, cell] of Object.entries(row.months)) {
      if (!grand[m]) grand[m] = { reservas: 0, total: 0, horas: 0 };
      grand[m].reservas += cell.reservas;
      grand[m].total    += cell.total;
      grand[m].horas    += cell.horas;
    }
    grandTotal.reservas += row.totals.reservas;
    grandTotal.total    += row.totals.total;
    grandTotal.horas    += row.totals.horas;
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-[#8b1c31] px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/90">
            {title ?? "Reservas por Deporte y Mes"}
          </p>
        </div>
        <div className="flex items-center justify-center py-10 text-sm text-gray-300">
          Sin datos para el período seleccionado
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-[#8b1c31] px-5 py-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/90">
          {title ?? "Reservas por Deporte y Mes"}
        </p>
        <span className="text-xs text-white/70">
          {rows.reduce((s, r) => s + r.totals.reservas, 0).toLocaleString()} reservas totales
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="text-xs border-collapse" style={{ minWidth: `${140 + (months.length + 1) * cols * 58}px` }}>
          <thead>
            {/* Row 1 — month group headers */}
            <tr className="bg-[#8b1c31]/10 border-b border-gray-200">
              <th
                rowSpan={2}
                className="sticky left-0 z-20 bg-[#8b1c31]/10 text-left px-4 py-2 font-semibold uppercase tracking-wider text-gray-600 border-r border-gray-200 align-bottom"
                style={{ minWidth: 140 }}
              >
                {rowLabel}
              </th>
              {months.map((m) => (
                <th
                  key={m}
                  colSpan={cols}
                  className="text-center px-2 py-2 font-semibold text-gray-600 border-l border-gray-200"
                  style={{ minWidth: cols * 58 }}
                >
                  {MONTH_LABEL[m]}
                </th>
              ))}
              <th
                colSpan={cols}
                className="text-center px-2 py-2 font-semibold text-[#8b1c31] border-l-2 border-[#8b1c31]/30"
                style={{ minWidth: cols * 58 }}
              >
                Total
              </th>
            </tr>

            {/* Row 2 — sub-column labels */}
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 uppercase tracking-wider">
              {/* sticky left-0 spacer handled by rowSpan on the first th above */}
              {[...months, "__total__"].map((m, gi) => (
                <th
                  key={`${m}-res`}
                  colSpan={cols}
                  className={`p-0 ${gi < months.length ? "border-l border-gray-200" : "border-l-2 border-[#8b1c31]/30"}`}
                >
                  <div className={`grid ${cols === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                    <span className="text-center py-1.5 text-[10px]">Res.</span>
                    <span className="text-center py-1.5 text-[10px]">Hrs</span>
                    {showFinancial && <span className="text-center py-1.5 text-[10px]">$</span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.sport}
                className={`border-b border-gray-100 hover:bg-amber-50/40 transition-colors ${
                  i % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                }`}
              >
                <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap border-r border-gray-200">
                  {row.sport}
                </td>

                {months.map((m, mi) => {
                  const cell = row.months[m];
                  return (
                    <td
                      key={m}
                      colSpan={cols}
                      className={`p-0 border-l border-gray-200 ${mi === months.length - 1 ? "border-r-0" : ""}`}
                    >
                      <div className={`grid ${cols === 3 ? "grid-cols-3" : "grid-cols-2"} divide-x divide-gray-100`}>
                        <span className="text-center py-2 px-1 font-medium text-gray-700 tabular-nums">
                          {cell ? cell.reservas.toLocaleString() : <span className="text-gray-200">—</span>}
                        </span>
                        <span className="text-center py-2 px-1 text-gray-500 tabular-nums">
                          {cell ? fmtHrs(cell.horas) : <span className="text-gray-200">—</span>}
                        </span>
                        {showFinancial && (
                          <span className="text-center py-2 px-1 text-[#8b1c31] tabular-nums">
                            {cell ? fmtCLP(cell.total) : <span className="text-gray-200">—</span>}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}

                {/* Totals column */}
                <td
                  colSpan={cols}
                  className="p-0 border-l-2 border-[#8b1c31]/20 bg-[#8b1c31]/5"
                >
                  <div className={`grid ${cols === 3 ? "grid-cols-3" : "grid-cols-2"} divide-x divide-gray-200`}>
                    <span className="text-center py-2 px-1 font-bold text-[#8b1c31] tabular-nums">
                      {row.totals.reservas.toLocaleString()}
                    </span>
                    <span className="text-center py-2 px-1 font-medium text-gray-600 tabular-nums">
                      {fmtHrs(row.totals.horas)}
                    </span>
                    {showFinancial && (
                      <span className="text-center py-2 px-1 font-bold text-[#8b1c31] tabular-nums">
                        {fmtCLP(row.totals.total)}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={months.length * cols + cols + 1}
                  className="px-4 py-10 text-center text-sm text-gray-400"
                >
                  Sin datos para el período seleccionado
                </td>
              </tr>
            )}

            {/* Grand total row */}
            {rows.length > 1 && (
              <tr className="bg-[#8b1c31]/5 border-t-2 border-[#8b1c31]/20 font-semibold">
                <td className="sticky left-0 z-10 bg-[#8b1c31]/5 px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#8b1c31] border-r border-gray-200 whitespace-nowrap">
                  Total General
                </td>
                {months.map((m) => (
                  <td key={m} colSpan={cols} className="p-0 border-l border-gray-200">
                    <div className={`grid ${cols === 3 ? "grid-cols-3" : "grid-cols-2"} divide-x divide-gray-200`}>
                      <span className="text-center py-2 px-1 text-[#8b1c31] tabular-nums">
                        {(grand[m]?.reservas ?? 0).toLocaleString()}
                      </span>
                      <span className="text-center py-2 px-1 text-gray-600 tabular-nums">
                        {fmtHrs(grand[m]?.horas ?? 0)}
                      </span>
                      {showFinancial && (
                        <span className="text-center py-2 px-1 text-[#8b1c31] tabular-nums">
                          {fmtCLP(grand[m]?.total ?? 0)}
                        </span>
                      )}
                    </div>
                  </td>
                ))}
                <td colSpan={cols} className="p-0 border-l-2 border-[#8b1c31]/30 bg-[#8b1c31]/10">
                  <div className={`grid ${cols === 3 ? "grid-cols-3" : "grid-cols-2"} divide-x divide-gray-200`}>
                    <span className="text-center py-2 px-1 font-bold text-[#8b1c31] tabular-nums">
                      {grandTotal.reservas.toLocaleString()}
                    </span>
                    <span className="text-center py-2 px-1 text-gray-600 tabular-nums">
                      {fmtHrs(grandTotal.horas)}
                    </span>
                    {showFinancial && (
                      <span className="text-center py-2 px-1 font-bold text-[#8b1c31] tabular-nums">
                        {fmtCLP(grandTotal.total)}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
