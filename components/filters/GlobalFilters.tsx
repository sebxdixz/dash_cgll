"use client";

import { años, meses, deportes, agendadores } from "@/lib/data";
import SelectDropdown from "./SelectDropdown";
import { Filter } from "lucide-react";

export interface Filters {
  año: string;
  mes: string;
  esMiembro: string;
  deporte: string;
  agendadoPor: string;
}

interface GlobalFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export default function GlobalFilters({ filters, onChange }: GlobalFiltersProps) {
  const set = (key: keyof Filters) => (value: string) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-[#8b1c31]" />
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Filtros</span>
      </div>
      <div className="flex flex-wrap gap-3">
        <SelectDropdown
          label="Año"
          value={filters.año}
          options={años}
          onChange={set("año")}
        />
        <SelectDropdown
          label="Mes"
          value={filters.mes}
          options={meses}
          onChange={set("mes")}
        />
        <SelectDropdown
          label="¿Es Miembro?"
          value={filters.esMiembro}
          options={["Todos", "Sí", "No"]}
          onChange={set("esMiembro")}
        />
        <SelectDropdown
          label="Deporte"
          value={filters.deporte}
          options={deportes}
          onChange={set("deporte")}
        />
        <SelectDropdown
          label="Agendado por"
          value={filters.agendadoPor}
          options={agendadores}
          onChange={set("agendadoPor")}
        />
      </div>
    </div>
  );
}
