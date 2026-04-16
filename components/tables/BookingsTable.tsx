"use client";

import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { ECBooking } from "@/lib/easycanchas";
import { ChevronLeft, ChevronRight } from "lucide-react";

const formatCLP = (val: number) =>
  val.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

const STATUS_LABEL: Record<string, string> = {
  BOOKED:           "Reservado",
  PARTIALLY_PAID:   "Pago parcial",
  PAID:             "Pagado",
  USED:             "Completada",
  CANCELLED:        "Cancelada",
  EXCHANGED:        "Canjeada",
};
const STATUS_CLASS: Record<string, string> = {
  BOOKED:         "bg-yellow-100 text-yellow-700",
  PARTIALLY_PAID: "bg-orange-100 text-orange-700",
  PAID:           "bg-green-100 text-green-700",
  USED:           "bg-blue-100  text-blue-700",
  CANCELLED:      "bg-red-100   text-red-600",
  EXCHANGED:      "bg-gray-100  text-gray-600",
};

const helper = createColumnHelper<ECBooking>();

const columns = [
  helper.accessor("localDate", {
    header: "Fecha",
    cell: (info) => <span className="text-gray-700">{info.getValue()}</span>,
  }),
  helper.accessor("localStartTime", {
    header: "Hora",
    cell: (info) => <span className="text-gray-600">{info.getValue()}</span>,
  }),
  helper.accessor("courtName", {
    header: "Cancha",
    cell: (info) => <span className="font-medium text-gray-800">{info.getValue()}</span>,
  }),
  helper.accessor((row) => `${row.userFirstName} ${row.userLastName}`, {
    id: "usuario",
    header: "Jugador",
    cell: (info) => <span className="text-gray-700">{info.getValue()}</span>,
  }),
  helper.accessor("customerCodes", {
    header: "Tipo",
    cell: (info) => {
      const val = info.getValue() ?? "";
      const isSocio = val.toLowerCase().includes("socio");
      return (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            isSocio ? "bg-[#8b1c31]/10 text-[#8b1c31]" : "bg-amber-100 text-amber-700"
          }`}
        >
          {isSocio ? "Socio" : val || "Invitado"}
        </span>
      );
    },
  }),
  helper.accessor("status", {
    header: "Estado",
    cell: (info) => {
      const s = info.getValue();
      return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_CLASS[s] ?? "bg-gray-100 text-gray-600"}`}>
          {STATUS_LABEL[s] ?? s}
        </span>
      );
    },
  }),
  helper.accessor("totalAmount", {
    header: "Monto",
    cell: (info) => {
      const val = info.getValue();
      if (!val || val === 0) return <span className="text-gray-300">—</span>;
      return <span className="font-semibold text-[#8b1c31]">{formatCLP(val)}</span>;
    },
  }),
  helper.accessor("bookedBy", {
    header: "Agendado por",
    cell: (info) => (
      <span className="text-xs text-gray-500">
        {info.getValue() === "club" ? "Club" : "Usuario"}
      </span>
    ),
  }),
];

interface BookingsTableProps {
  bookings: ECBooking[];
}

export default function BookingsTable({ bookings }: BookingsTableProps) {
  const table = useReactTable({
    data: bookings,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = bookings.length;
  const from = pageIndex * pageSize + 1;
  const to   = Math.min(from + pageSize - 1, totalRows);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="bg-[#8b1c31] px-5 py-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/90">
          Detalle de Reservas
        </p>
        <span className="text-xs text-white/70">{totalRows.toLocaleString()} reservas</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#8b1c31]/10 border-b border-gray-200">
              {table.getHeaderGroups().map((hg) =>
                hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600 whitespace-nowrap"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                  i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-2.5 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-gray-400">
                  Sin reservas para el período seleccionado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalRows > pageSize && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
          <span>{from}–{to} de {totalRows.toLocaleString()}</span>
          <div className="flex gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
