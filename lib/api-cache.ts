/**
 * Cache persistente en localStorage para las llamadas a la API.
 * TTL por defecto: 24 horas. Sin backend requerido.
 *
 * Uso:
 *   const data = await cachedFetch("/api/easycanchas/bookings?...");
 */

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

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
 * @param url      URL completa (incluyendo query params)
 * @param ttlMs    Tiempo de vida en ms (default 24 h)
 */
export async function cachedFetch<T = unknown>(
  url: string,
  ttlMs = DEFAULT_TTL_MS
): Promise<T> {
  const cached = readEntry<T>(url);
  if (cached !== null) return cached;

  const res  = await fetch(url);
  const data = await res.json() as T;
  writeEntry(url, data, ttlMs);
  return data;
}

/**
 * Invalida manualmente todas las entradas del cache.
 * Útil para un botón "Actualizar datos".
 */
export function clearApiCache(): void {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("ec_cache:"));
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignorar
  }
}
