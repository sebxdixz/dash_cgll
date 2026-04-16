/**
 * Cache persistente en localStorage para las llamadas a la API.
 * TTL por defecto: 24 horas. Sin backend requerido.
 *
 * Al detectar un nuevo deploy (BUILD_ID distinto al guardado), se limpia
 * automáticamente toda la caché para evitar mostrar datos obsoletos.
 */

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
const BUILD_KEY = "ec_build_id";

// NEXT_PUBLIC_BUILD_ID se inyecta en next.config al build time
const CURRENT_BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

/** Limpia el cache si el build cambió desde la última visita. */
function evictOnNewDeploy(): void {
  try {
    const stored = localStorage.getItem(BUILD_KEY);
    if (stored !== CURRENT_BUILD) {
      clearApiCache();
      localStorage.setItem(BUILD_KEY, CURRENT_BUILD);
    }
  } catch {
    // ignorar — puede fallar en SSR o private browsing
  }
}

// Ejecutar una sola vez al importar el módulo (client-side only)
if (typeof window !== "undefined") {
  evictOnNewDeploy();
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number; // epoch ms
}

function storageKey(url: string): string {
  return `ec_cache:${url}`;
}

function readEntry<T>(url: string): T | null {
  try {
    const raw = localStorage.getItem(storageKey(url));
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(storageKey(url));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeEntry<T>(url: string, data: T, ttlMs: number): void {
  try {
    const entry: CacheEntry<T> = { data, expiresAt: Date.now() + ttlMs };
    localStorage.setItem(storageKey(url), JSON.stringify(entry));
  } catch {
    // localStorage lleno u otro error — ignorar silenciosamente
  }
}

/**
 * Hace fetch con cache persistente en localStorage.
 * Solo cachea respuestas 2xx; lanza un error en respuestas de error.
 */
export async function cachedFetch<T = unknown>(
  url: string,
  ttlMs = DEFAULT_TTL_MS
): Promise<T> {
  const cached = readEntry<T>(url);
  if (cached !== null) return cached;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} — ${url}`);
  }
  const data = await res.json() as T;
  writeEntry(url, data, ttlMs);
  return data;
}

/**
 * Invalida manualmente todas las entradas del cache.
 * Útil para el botón "Actualizar datos".
 */
export function clearApiCache(): void {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("ec_cache:"));
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignorar
  }
}
