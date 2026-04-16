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

/** Width constants for each sub-column type */
const W_RES = 52;  // reservas count
const W_HRS = 44;  // hours
const W_TOT = 56;  // financial total
const W_SPORT = 148; // sport/row label

export default function SportPivotTable({ rows, showFinancial, title, rowLabel = "Deporte" }: SportPivotTableProps) {
  const months = activePivotMonths(rows);
  const colGroups = [...months, "__total__"];

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

  const colsPerGroup = showFinancial ? 3 : 2;
  const totalWidth = W_SPORT + colGroups.length * (W_RES + W_HRS + (showFinancial ? W_TOT : 0));

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
        <table className="text-xs border-collapse" style={{ minWidth: totalWidth }}>
          <colgroup>
            <col style={{ width: W_SPORT }} />
            {colGroups.map((m) => (
              <>
                <col key={`${m}-res`} style={{ width: W_RES }} />
                <col key={`${m}-hrs`} style={{ width: W_HRS }} />
                {showFinancial && <col key={`${m}-tot`} style={{ width: W_TOT }} />}
              </>
            ))}
          </colgroup>

          <thead>
            {/* Row 1 — month group headers */}
            <tr className="bg-[#8b1c31]/10 border-b border-gray-100">
              <th
                rowSpan={2}
                className="sticky left-0 z-20 bg-[#8b1c31]/10 text-left px-3 py-2 font-semibold uppercase tracking-wider text-gray-600 border-r border-gray-200 align-bottom text-[11px]"
              >
                {rowLabel}
              </th>
              {months.map((m) => (
                <th
                  key={m}
                  colSpan={colsPerGroup}
                  className="text-center px-1 py-2 font-semibold text-gray-600 border-l border-gray-200 text-[11px]"
                >
                  {MONTH_LABEL[m]}
                </th>
              ))}
              <th
                colSpan={colsPerGroup}
                className="text-center px-1 py-2 font-semibold text-[#8b1c31] border-l-2 border-[#8b1c31]/30 text-[11px]"
              >
                Total
              </th>
            </tr>

            {/* Row 2 — individual sub-column labels (one <th> per cell — no grid, no overflow) */}
            <tr className="bg-gray-50 border-b border-gray-200">
              {colGroups.map((m, gi) => {
                const isTotal = m === "__total__";
                const borderClass = isTotal
                  ? "border-l-2 border-[#8b1c31]/30"
                  : gi === 0 ? "border-l border-gray-200" : "border-l border-gray-200";
                return (
                  <>
                    <th
                      key={`${m}-r`}
                      className={`text-center py-1 text-[10px] font-medium text-gray-400 uppercase tracking-wide ${borderClass}`}
                    >
                      Res
                    </th>
                    <th
                      key={`${m}-h`}
                      className="text-center py-1 text-[10px] font-medium text-gray-400 uppercase tracking-wide border-l border-gray-100"
                    >
                      Hrs
                    </th>
                    {showFinancial && (
                      <th
                        key={`${m}-t`}
                        className="text-center py-1 text-[10px] font-medium text-gray-400 uppercase tracking-wide border-l border-gray-100"
                      >
                        $
                      </th>
                    )}
                  </>
                );
              })}
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
                <td className="sticky left-0 z-10 bg-inherit px-3 py-2 font-medium text-gray-800 whitespace-nowrap border-r border-gray-200">
                  {row.sport}
                </td>

                {months.map((m, mi) => {
                  const cell = row.months[m];
                  const borderClass = mi === 0 ? "border-l border-gray-200" : "border-l border-gray-200";
                  return (
                    <>
                      <td key={`${m}-r`} className={`text-center py-2 px-1 font-medium text-gray-700 tabular-nums ${borderClass}`}>
                        {cell ? cell.reservas.toLocaleString() : <span className="text-gray-200">—</span>}
                      </td>
                      <td key={`${m}-h`} className="text-center py-2 px-1 text-gray-500 tabular-nums border-l border-gray-100">
                        {cell ? fmtHrs(cell.horas) : <span className="text-gray-200">—</span>}
                      </td>
                      {showFinancial && (
                        <td key={`${m}-t`} className="text-center py-2 px-1 text-[#8b1c31] tabular-nums border-l border-gray-100">
                          {cell ? fmtCLP(cell.total) : <span className="text-gray-200">—</span>}
                        </td>
                      )}
                    </>
                  );
                })}

                {/* Totals column */}
                <td className="text-center py-2 px-1 font-bold text-[#8b1c31] tabular-nums border-l-2 border-[#8b1c31]/20 bg-[#8b1c31]/5">
                  {row.totals.reservas.toLocaleString()}
                </td>
                <td className="text-center py-2 px-1 font-medium text-gray-600 tabular-nums border-l border-gray-200 bg-[#8b1c31]/5">
                  {fmtHrs(row.totals.horas)}
                </td>
                {showFinancial && (
                  <td className="text-center py-2 px-1 font-bold text-[#8b1c31] tabular-nums border-l border-gray-200 bg-[#8b1c31]/5">
                    {fmtCLP(row.totals.total)}
                  </td>
                )}
              </tr>
            ))}

            {/* Grand total row */}
            {rows.length > 1 && (
              <tr className="bg-[#8b1c31]/5 border-t-2 border-[#8b1c31]/20 font-semibold">
                <td className="sticky left-0 z-10 bg-[#8b1c31]/5 px-3 py-2 text-[11px] uppercase tracking-wider text-[#8b1c31] border-r border-gray-200 whitespace-nowrap">
                  Total General
                </td>
                {months.map((m) => (
                  <>
                    <td key={`${m}-r`} className="text-center py-2 px-1 text-[#8b1c31] tabular-nums border-l border-gray-200">
                      {(grand[m]?.reservas ?? 0).toLocaleString()}
                    </td>
                    <td key={`${m}-h`} className="text-center py-2 px-1 text-gray-600 tabular-nums border-l border-gray-100">
                      {fmtHrs(grand[m]?.horas ?? 0)}
                    </td>
                    {showFinancial && (
                      <td key={`${m}-t`} className="text-center py-2 px-1 text-[#8b1c31] tabular-nums border-l border-gray-100">
                        {fmtCLP(grand[m]?.total ?? 0)}
                      </td>
                    )}
                  </>
                ))}
                <td className="text-center py-2 px-1 font-bold text-[#8b1c31] tabular-nums border-l-2 border-[#8b1c31]/30 bg-[#8b1c31]/10">
                  {grandTotal.reservas.toLocaleString()}
                </td>
                <td className="text-center py-2 px-1 text-gray-600 tabular-nums border-l border-gray-200 bg-[#8b1c31]/10">
                  {fmtHrs(grandTotal.horas)}
                </td>
                {showFinancial && (
                  <td className="text-center py-2 px-1 font-bold text-[#8b1c31] tabular-nums border-l border-gray-200 bg-[#8b1c31]/10">
                    {fmtCLP(grandTotal.total)}
                  </td>
                )}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
