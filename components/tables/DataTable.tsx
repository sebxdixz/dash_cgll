"use client";

import { useState, Fragment } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
  createColumnHelper,
  ExpandedState,
} from "@tanstack/react-table";
import { torneosData, Torneo, TorneoDetalle } from "@/lib/data";
import { ChevronRight, ChevronDown } from "lucide-react";

const formatCLP = (val: number) =>
  `$${(val / 1_000_000).toFixed(1)}M`;

const statusColor: Record<Torneo["estado"], string> = {
  Completado: "bg-green-100 text-green-700",
  "En curso": "bg-blue-100 text-blue-700",
  Cancelado: "bg-red-100 text-red-600",
};

const helper = createColumnHelper<Torneo>();

const columns = [
  helper.display({
    id: "expand",
    cell: ({ row }) =>
      row.getCanExpand() ? (
        <button
          onClick={row.getToggleExpandedHandler()}
          className="flex items-center justify-center w-5 h-5 rounded hover:bg-gray-200 transition-colors"
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="w-3.5 h-3.5 text-[#8b1c31]" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
          )}
        </button>
      ) : null,
    size: 36,
  }),
  helper.accessor("nombre", {
    header: "Torneo",
    cell: (info) => (
      <span className="font-medium text-gray-800">{info.getValue()}</span>
    ),
  }),
  helper.accessor("categoria", {
    header: "Categoría",
    cell: (info) => (
      <span className="text-gray-600 text-sm">{info.getValue()}</span>
    ),
  }),
  helper.accessor("participantes", {
    header: "Participantes",
    cell: (info) => (
      <span className="font-medium">{info.getValue().toLocaleString()}</span>
    ),
  }),
  helper.accessor("reservas", {
    header: "Reservas",
    cell: (info) => (
      <span className="font-medium">{info.getValue().toLocaleString()}</span>
    ),
  }),
  helper.accessor("ingresos", {
    header: "Ingresos",
    cell: (info) => (
      <span className="font-semibold text-[#8b1c31]">{formatCLP(info.getValue())}</span>
    ),
  }),
  helper.accessor("estado", {
    header: "Estado",
    cell: (info) => (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor[info.getValue()]}`}>
        {info.getValue()}
      </span>
    ),
  }),
];

function SubTable({ detalles }: { detalles: TorneoDetalle[] }) {
  return (
    <table className="w-full text-xs mt-1">
      <thead>
        <tr className="text-gray-400 uppercase tracking-wider">
          <td className="py-1.5 pl-10 pr-3">Mes</td>
          <td className="py-1.5 px-3">Participantes</td>
          <td className="py-1.5 px-3">Reservas</td>
          <td className="py-1.5 px-3">Ingresos</td>
        </tr>
      </thead>
      <tbody>
        {detalles.map((d, i) => (
          <tr key={i} className="border-t border-gray-100 text-gray-600">
            <td className="py-2 pl-10 pr-3">{d.mes}</td>
            <td className="py-2 px-3">{d.participantes}</td>
            <td className="py-2 px-3">{d.reservas}</td>
            <td className="py-2 px-3 font-medium text-[#8b1c31]">{formatCLP(d.ingresos)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function DataTable() {
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const table = useReactTable({
    data: torneosData,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getRowCanExpand: (row) => !!row.original.detalles?.length,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="bg-[#8b1c31] px-5 py-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/90">
          Torneos y Eventos
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#8b1c31]/10 border-b border-gray-200">
              {table.getHeaderGroups().map((hg) =>
                hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600"
                    style={{ width: header.getSize() }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => (
              <Fragment key={row.id}>
                <tr
                  className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() && row.original.detalles && (
                  <tr className="bg-amber-50/60 border-b border-gray-100">
                    <td colSpan={columns.length} className="py-2">
                      <SubTable detalles={row.original.detalles} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
