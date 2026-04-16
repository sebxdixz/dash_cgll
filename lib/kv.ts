/**
 * Wrapper sobre Upstash Redis (Vercel Marketplace).
 * Todas las funciones son server-side only.
 *
 * Variables de entorno requeridas (se agregan automáticamente al conectar
 * la integración de Upstash Redis en el Vercel dashboard):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

import { Redis } from "@upstash/redis";

// Instancia singleton — reutilizada entre invocaciones en el mismo worker
let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    // Redis.fromEnv() detecta KV_REST_API_URL + KV_REST_API_TOKEN (Vercel Marketplace)
    // o UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (naming legacy)
    _redis = Redis.fromEnv();
  }
  return _redis;
}

/** TTL por defecto: 25 horas (mayor que el cron diario de 24h) */
const DEFAULT_TTL_S = 25 * 60 * 60;

/**
 * Lee un valor del cache. Devuelve null si no existe o está expirado.
 */
export async function kvGet<T>(key: string): Promise<T | null> {
  try {
    return await getRedis().get<T>(key);
  } catch {
    return null; // Redis no disponible → tratamos como miss
  }
}

/**
 * Guarda un valor en el cache con TTL en segundos.
 */
export async function kvSet(
  key: string,
  value: unknown,
  ttlSeconds = DEFAULT_TTL_S
): Promise<void> {
  try {
    await getRedis().set(key, value, { ex: ttlSeconds });
  } catch {
    // ignorar fallos de escritura — no es crítico
  }
}

/**
 * Borra todas las keys que coincidan con el patrón (ej. "bookings:*").
 * Usa SCAN para no bloquear Redis con grandes conjuntos.
 */
export async function kvDeletePattern(pattern: string): Promise<void> {
  try {
    const redis = getRedis();
    let cursor = 0;
    do {
      const [next, keys] = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = Number(next);
      if (keys.length > 0) await redis.del(...keys);
    } while (cursor !== 0);
  } catch {
    // ignorar
  }
}

// ── Claves canónicas ──────────────────────────────────────────────────────────

export const KV_KEYS = {
  users:        () => "users",
  /** Clave mensual: bookings:{year}:{mm}:{sportId}  (cabe dentro del límite 1MB de Upstash) */
  bookings:     (year: string, month: string, sportId: number) => `bookings:${year}:${month}:${sportId}`,
  transactions: (year: string) => `transactions:${year}`,
};
