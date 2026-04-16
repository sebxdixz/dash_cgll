import { fetchUsers } from "@/lib/easycanchas";
import { kvGet, kvSet, KV_KEYS } from "@/lib/kv";
import type { ECUser } from "@/lib/easycanchas";

export async function GET() {
  // 1. Intentar desde KV
  const cached = await kvGet<ECUser[]>(KV_KEYS.users());
  if (cached) return Response.json({ users: cached, source: "cache" });

  // 2. Fallback a EasyCanchas y poblar cache
  try {
    const users = await fetchUsers();
    await kvSet(KV_KEYS.users(), users);
    return Response.json({ users });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return Response.json({ error: message }, { status: 502 });
  }
}
