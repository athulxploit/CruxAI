// Tarpit / delay layer for suspicious callers.
// Server-only. Adds exponential backoff waits and IP blocklist checks.
// In-memory state is per-Worker isolate; combined with the DB blocklist
// and activity_log it is enough to make scanning expensive.

type SupabaseAdmin = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (col: string, v: string) => { limit: (n: number) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> } };
    };
  };
};

const suspicion = new Map<string, { score: number; updated: number }>();
const DECAY_MS = 5 * 60_000; // score halves every 5 minutes of quiet

export function bumpSuspicion(key: string, weight = 1): number {
  const now = Date.now();
  const prev = suspicion.get(key);
  let score = prev?.score ?? 0;
  if (prev) {
    const decay = Math.pow(0.5, (now - prev.updated) / DECAY_MS);
    score = score * decay;
  }
  score += weight;
  suspicion.set(key, { score, updated: now });
  return score;
}

export function suspicionScore(key: string): number {
  const prev = suspicion.get(key);
  if (!prev) return 0;
  const decay = Math.pow(0.5, (Date.now() - prev.updated) / DECAY_MS);
  return prev.score * decay;
}

// Returns ms to await. Score 1 -> ~250ms, 5 -> ~4s, capped at 8s.
export function tarpitDelayMs(key: string): number {
  const s = suspicionScore(key);
  if (s <= 0) return 0;
  return Math.min(8000, Math.round(250 * Math.pow(2, Math.min(s, 6))));
}

export async function tarpit(key: string): Promise<number> {
  const ms = tarpitDelayMs(key);
  if (ms > 0) await new Promise((r) => setTimeout(r, ms));
  return ms;
}

// Cached IP blocklist lookup (60s TTL) against public.blocked_ips.
const blockCache = new Map<string, { blocked: boolean; expires: number }>();
export async function isIpBlocked(ip: string | null | undefined): Promise<boolean> {
  if (!ip) return false;
  const cached = blockCache.get(ip);
  if (cached && cached.expires > Date.now()) return cached.blocked;
  try {
    const mod = (await import("@/integrations/supabase/client.server")) as unknown as { supabaseAdmin: SupabaseAdmin };
    const { data } = await mod.supabaseAdmin.from("blocked_ips").select("id").eq("ip", ip).limit(1).maybeSingle();
    const blocked = Boolean(data);
    blockCache.set(ip, { blocked, expires: Date.now() + 60_000 });
    return blocked;
  } catch {
    return false;
  }
}
