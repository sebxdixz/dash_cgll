"use client";

import { PivotRow, activePivotMonths } from "@/lib/transforms";

const MONTH_LABEL: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};

const fmtCLP = (n: number) =>
  n === 0 ? "—" : `$${n.toLocaleString("es-CL")}`;

const fmtHrs = (n: number) =>
  n === 0 ? "—" : `${n.toFixed(0)}h`;

interface SportPivotTableProps {
  rows:          PivotRow[];
  showFinancial: boolean;   // false mientras carga transactions
  title?:        string;    // override del header (default "Reservas por Deporte y Mes")
  rowLabel?:     string;    // label de la primera columna (default "Deporte")
}

export default function SportPivotTable({ rows, showFinancial, title, rowLabel = "Deporte" }: SportPivotTableProps) {
  const months = activePivotMonths(rows);

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
        <table className="w-full text-xs">
          <thead>
            {/* Fila 1: encabezados de mes */}
            <tr className="bg-[#8b1c31]/10 border-b border-gray-200">
              <th className="sticky left-0 z-10 bg-[#8b1c31]/10 text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-600 min-w-[140px]">
                {rowLabel}
              </th>
              {months.map((m) => (
                <th
                  key={m}
                  colSpan={showFinancial ? 3 : 2}
                  className="text-center px-2 py-2 font-semibold text-gray-600 border-l border-gray-200"
                >
                  {MONTH_LABEL[m]}
                </th>
              ))}
              <th
                colSpan={showFinancial ? 3 : 2}
                className="text-center px-2 py-2 font-semibold text-[#8b1c31] border-l border-gray-200"
              >
                Total
              </th>
            </tr>

            {/* Fila 2: sub-columnas */}
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 uppercase tracking-wider">
              <th className="sticky left-0 z-10 bg-gray-50 px-4 py-1.5" />
              {[...months, "__total__"].map((m) => (
                <th key={`${m}-sub`} colSpan={showFinancial ? 3 : 2} className="border-l border-gray-200">
                  <div className={`grid ${showFinancial ? "grid-cols-3" : "grid-cols-2"}`}>
                    <span className="text-center py-1 px-1">Res.</span>
                    <span className="text-center py-1 px-1">Hrs</span>
                    {showFinancial && <span className="text-center py-1 px-1">Total $</span>}
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
                  i % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                }`}
              >
                <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">
                  {row.sport}
                </td>

                {months.map((m) => {
                  const cell = row.months[m];
                  return (
                    <td
                      key={m}
                      colSpan={showFinancial ? 3 : 2}
                      className="border-l border-gray-200 p-0"
                    >
                      {cell ? (
                        <div className={`grid ${showFinancial ? "grid-cols-3" : "grid-cols-2"} divide-x divide-gray-100`}>
                          <span className="text-center py-2 px-1 font-medium text-gray-700">
                            {cell.reservas.toLocaleString()}
                          </span>
                          <span className="text-center py-2 px-1 text-gray-500">
                            {fmtHrs(cell.horas)}
                          </span>
                          {showFinancial && (
                            <span className="text-center py-2 px-1 text-[#8b1c31] font-medium">
                              {fmtCLP(cell.total)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className={`grid ${showFinancial ? "grid-cols-3" : "grid-cols-2"} divide-x divide-gray-100`}>
                          <span className="text-center py-2 px-1 text-gray-300">—</span>
                          <span className="text-center py-2 px-1 text-gray-300">—</span>
                          {showFinancial && <span className="text-center py-2 px-1 text-gray-300">—</span>}
                        </div>
                      )}
                    </td>
                  );
                })}

                {/* Totales */}
                <td
                  colSpan={showFinancial ? 3 : 2}
                  className="border-l-2 border-[#8b1c31]/20 p-0 bg-[#8b1c31]/5"
                >
                  <div className={`grid ${showFinancial ? "grid-cols-3" : "grid-cols-2"} divide-x divide-gray-200`}>
                    <span className="text-center py-2 px-1 font-bold text-[#8b1c31]">
                      {row.totals.reservas.toLocaleString()}
                    </span>
                    <span className="text-center py-2 px-1 font-medium text-gray-600">
                      {fmtHrs(row.totals.horas)}
                    </span>
                    {showFinancial && (
                      <span className="text-center py-2 px-1 font-bold text-[#8b1c31]">
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
                  colSpan={months.length * (showFinancial ? 3 : 2) + 3}
                  className="px-4 py-10 text-center text-sm text-gray-400"
                >
                  Sin datos para el período seleccionado
                </td>
              </tr>
            )}

            {/* Fila de totales generales */}
            {rows.length > 1 && (() => {
              const grand: Record<string, { reservas: number; total: number; horas: number }> = {};
              let grandTotal = { reservas: 0, total: 0, horas: 0 };
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
              return (
                <tr className="bg-[#8b1c31]/5 border-t-2 border-[#8b1c31]/20 font-semibold">
                  <td className="sticky left-0 z-10 bg-[#8b1c31]/5 px-4 py-2.5 text-xs uppercase tracking-wider text-[#8b1c31]">
                    Total General
                  </td>
                  {months.map((m) => (
                    <td key={m} colSpan={showFinancial ? 3 : 2} className="border-l border-gray-200 p-0">
                      <div className={`grid ${showFinancial ? "grid-cols-3" : "grid-cols-2"} divide-x divide-gray-200`}>
                        <span className="text-center py-2 px-1 text-[#8b1c31]">
                          {(grand[m]?.reservas ?? 0).toLocaleString()}
                        </span>
                        <span className="text-center py-2 px-1 text-gray-600">
                          {fmtHrs(grand[m]?.horas ?? 0)}
                        </span>
                        {showFinancial && (
                          <span className="text-center py-2 px-1 text-[#8b1c31]">
                            {fmtCLP(grand[m]?.total ?? 0)}
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                  <td colSpan={showFinancial ? 3 : 2} className="border-l-2 border-[#8b1c31]/30 p-0 bg-[#8b1c31]/10">
                    <div className={`grid ${showFinancial ? "grid-cols-3" : "grid-cols-2"} divide-x divide-gray-200`}>
                      <span className="text-center py-2 px-1 font-bold text-[#8b1c31]">
                        {grandTotal.reservas.toLocaleString()}
                      </span>
                      <span className="text-center py-2 px-1 text-gray-600">
                        {fmtHrs(grandTotal.horas)}
                      </span>
                      {showFinancial && (
                        <span className="text-center py-2 px-1 font-bold text-[#8b1c31]">
                          {fmtCLP(grandTotal.total)}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
