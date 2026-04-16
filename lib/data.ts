// ── Mock data para el Dashboard CGLL ──────────────────────────────────────────

export const kpiData = {
  sociosActivos: 3356,
  totalReservas: 38420,
  ingresosAsociados: 174520000,
  greenFees: 25180,
  horasOcupadas: 131400,
};

export const reservasPorMes = [
  { mes: "Ene", usuarios: 280, reservas: 420 },
  { mes: "Feb", usuarios: 310, reservas: 490 },
  { mes: "Mar", usuarios: 420, reservas: 680 },
  { mes: "Abr", usuarios: 390, reservas: 610 },
  { mes: "May", usuarios: 450, reservas: 720 },
  { mes: "Jun", usuarios: 510, reservas: 830 },
  { mes: "Jul", usuarios: 490, reservas: 800 },
  { mes: "Ago", usuarios: 530, reservas: 860 },
  { mes: "Sep", usuarios: 480, reservas: 770 },
  { mes: "Oct", usuarios: 560, reservas: 910 },
  { mes: "Nov", usuarios: 520, reservas: 840 },
  { mes: "Dic", usuarios: 600, reservas: 980 },
];

export const tendenciaTemporal = Array.from({ length: 60 }, (_, i) => {
  const date = new Date(2021, 0, 1);
  date.setMonth(date.getMonth() + i);
  return {
    fecha: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    reservas: Math.floor(300 + Math.random() * 400 + Math.sin(i / 6) * 100),
    ingresos: Math.floor(2000000 + Math.random() * 3000000 + Math.sin(i / 6) * 500000),
  };
});

export const estadoReservas = [
  { name: "Completadas", value: 68, color: "#8b1c31" },
  { name: "Canceladas", value: 18, color: "#c9a87c" },
  { name: "No Show", value: 9, color: "#6b2d3e" },
  { name: "Pendientes", value: 5, color: "#d7c9ad" },
];

export const distribucionGenero = [
  { name: "Masculino", value: 62, color: "#8b1c31" },
  { name: "Femenino", value: 35, color: "#c9a87c" },
  { name: "No especificado", value: 3, color: "#d7c9ad" },
];

export const distribucionEdad = [
  { rango: "0-9", cantidad: 12 },
  { rango: "10-19", cantidad: 45 },
  { rango: "20-29", cantidad: 189 },
  { rango: "30-39", cantidad: 412 },
  { rango: "40-49", cantidad: 578 },
  { rango: "50-59", cantidad: 634 },
  { rango: "60-69", cantidad: 520 },
  { rango: "70-79", cantidad: 380 },
  { rango: "80-89", cantidad: 210 },
  { rango: "90+", cantidad: 45 },
];

export interface Torneo {
  id: string;
  nombre: string;
  categoria: string;
  participantes: number;
  reservas: number;
  ingresos: number;
  estado: "Completado" | "En curso" | "Cancelado";
  detalles?: TorneoDetalle[];
}

export interface TorneoDetalle {
  mes: string;
  participantes: number;
  reservas: number;
  ingresos: number;
}

export const torneosData: Torneo[] = [
  {
    id: "1",
    nombre: "Campeonato de Golf",
    categoria: "Amateur",
    participantes: 120,
    reservas: 480,
    ingresos: 14400000,
    estado: "Completado",
    detalles: [
      { mes: "Ene", participantes: 40, reservas: 160, ingresos: 4800000 },
      { mes: "Feb", participantes: 38, reservas: 152, ingresos: 4560000 },
      { mes: "Mar", participantes: 42, reservas: 168, ingresos: 5040000 },
    ],
  },
  {
    id: "2",
    nombre: "Copa Apertura",
    categoria: "Senior",
    participantes: 85,
    reservas: 340,
    ingresos: 10200000,
    estado: "En curso",
    detalles: [
      { mes: "Abr", participantes: 28, reservas: 112, ingresos: 3360000 },
      { mes: "May", participantes: 30, reservas: 120, ingresos: 3600000 },
      { mes: "Jun", participantes: 27, reservas: 108, ingresos: 3240000 },
    ],
  },
  {
    id: "3",
    nombre: "Torneo Damas",
    categoria: "Femenino",
    participantes: 64,
    reservas: 256,
    ingresos: 7680000,
    estado: "Completado",
    detalles: [
      { mes: "Jul", participantes: 22, reservas: 88, ingresos: 2640000 },
      { mes: "Ago", participantes: 20, reservas: 80, ingresos: 2400000 },
      { mes: "Sep", participantes: 22, reservas: 88, ingresos: 2640000 },
    ],
  },
  {
    id: "4",
    nombre: "Liga Empresarial",
    categoria: "Corporativo",
    participantes: 200,
    reservas: 800,
    ingresos: 24000000,
    estado: "En curso",
    detalles: [
      { mes: "Oct", participantes: 68, reservas: 272, ingresos: 8160000 },
      { mes: "Nov", participantes: 72, reservas: 288, ingresos: 8640000 },
      { mes: "Dic", participantes: 60, reservas: 240, ingresos: 7200000 },
    ],
  },
  {
    id: "5",
    nombre: "Copa Clausura",
    categoria: "Juvenil",
    participantes: 48,
    reservas: 192,
    ingresos: 3840000,
    estado: "Cancelado",
  },
];

export const años = ["2021", "2022", "2023", "2024", "2025"];
export const meses = [
  "Todos", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
export const deportes = ["Todos", "Golf", "Tenis", "Pádel", "Gimnasio", "Actividades"];
export const agendadores = ["Todos", "Recepción", "App móvil", "Web", "Teléfono"];
