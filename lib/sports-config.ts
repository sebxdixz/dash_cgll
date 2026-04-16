// ── Mapa completo de deportes del Club de Golf Los Leones ─────────────────────
// Obtenido del ambiente training (training.easycancha.com, clubId=350).
// Actualizar si el club agrega nuevos deportes/actividades.

export const SPORT_IDS = {
  // Golf
  GOLF:               20,
  CAMPEONATOS_GOLF:  246,

  // Tenis y Deportes
  TENIS:               1,
  CLASES_TENIS:      332,
  PADEL:               7,
  CLASES_PADEL:       97,
  CAMPEONATOS_PADEL: 265,
  SQUASH:             11,
  FUTBOLITO:           3,
  ARRIENDO_CARROS:    87,

  // Gimnasio
  GIMNASIO:           63,
  MASAJES:           420,

  // Actividades y Eventos
  PISCINA:            18,
  CUMPLEANOS:         39,
  GUARDERIA:         315,
  TALLER_VERANO:     981,
  ALMUERZO_FIN_AÑO:  998,
  RESTAURANTE:       104,
  // Estacionales / no siempre presentes en training:
  // CHARLAS, EVENTOS, FIESTA_15, FIESTA_FIN_AÑO, TALLER_NAVIDAD
} as const;

// ── Agrupaciones por página ───────────────────────────────────────────────────

export const GOLF_SPORTS = [
  SPORT_IDS.GOLF,
  SPORT_IDS.CAMPEONATOS_GOLF,
  SPORT_IDS.ARRIENDO_CARROS,
];

export const TENIS_SPORTS = [
  SPORT_IDS.TENIS,
  SPORT_IDS.CLASES_TENIS,
  SPORT_IDS.PADEL,
  SPORT_IDS.CLASES_PADEL,
  SPORT_IDS.CAMPEONATOS_PADEL,
  SPORT_IDS.SQUASH,
  SPORT_IDS.FUTBOLITO,
];

export const GIMNASIO_SPORTS = [
  SPORT_IDS.GIMNASIO,
  SPORT_IDS.MASAJES,
];

export const ACTIVIDADES_SPORTS = [
  SPORT_IDS.PISCINA,
  SPORT_IDS.CUMPLEANOS,
  SPORT_IDS.GUARDERIA,
  SPORT_IDS.TALLER_VERANO,
  SPORT_IDS.ALMUERZO_FIN_AÑO,
  SPORT_IDS.RESTAURANTE,
];

// Todos los deportes para la página General (excluye Restaurante para el KPI)
export const ALL_SPORTS = [
  ...GOLF_SPORTS,  // Golf + Campeonatos Golf + Arriendo Carros
  ...TENIS_SPORTS,
  ...GIMNASIO_SPORTS,
  SPORT_IDS.PISCINA,
  SPORT_IDS.CUMPLEANOS,
  SPORT_IDS.GUARDERIA,
  SPORT_IDS.TALLER_VERANO,
];

/** Normaliza a minúsculas sin tildes para comparaciones flexibles */
function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Devuelve el color para un deporte, comparando nombre sin distinción de mayúsculas/tildes. */
export function getSportColor(sportName: string): string {
  if (SPORT_COLOR[sportName]) return SPORT_COLOR[sportName];
  const norm = normalize(sportName);
  for (const [key, val] of Object.entries(SPORT_COLOR)) {
    if (normalize(key) === norm) return val;
  }
  return "#999999";
}

// Colores por deporte para gráficos
export const SPORT_COLOR: Record<string, string> = {
  "Golf":               "#8b1c31",
  "Campeonatos de Golf":"#6b2d3e",
  "Tenis":              "#c9a87c",
  "Clases de Tenis":    "#d7c9ad",
  "Pádel":              "#4a1520",
  "Clases de Pádel":    "#7a4a5a",
  "Campeonatos de Padel":"#9b6070",
  "Squash":             "#b07080",
  "Futbolito":          "#c09090",
  "Arriendo de carros": "#aaaaaa",
  "Gimnasio":           "#2d6a4f",
  "Masajes":            "#52b788",
  "Piscina":            "#1e6091",
  "Cumpleaños":         "#f4a261",
  "Guardería":          "#e76f51",
  "Taller de Verano":   "#2a9d8f",
  "Almuerzo Fin de Año":"#e9c46a",
  "Restaurante":        "#f3722c",
};
