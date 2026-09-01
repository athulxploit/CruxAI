// Per-provider API key pool with in-memory health tracking + LRU rotation.
//
// Each provider reads N keys from env: FOO_API_KEY, FOO_API_KEY_2, FOO_API_KEY_3, ...
// A key that returns 401/403 is cooled down for 30min. A 429 cools down for 5min.
// Any other upstream failure cools down for 60s. The pool always returns the
// full ordered try-list — even fully-unhealthy pools return every key so we
// never give up entirely.

export type PoolProvider = "groq" | "gemini" | "openrouter";

const ENV_BASE: Record<PoolProvider, string> = {
  groq: "GROQ_API_KEY",
  gemini: "GEMINI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

const MAX_KEYS_PER_PROVIDER = 5;

function readPool(base: string): string[] {
  const keys: string[] = [];
  const primary = process.env[base];
  if (primary) keys.push(primary);
  for (let i = 2; i <= MAX_KEYS_PER_PROVIDER; i++) {
    const v = process.env[`${base}_${i}`];
    if (v) keys.push(v);
  }
  return keys;
}

interface KeyHealth {
  unhealthyUntil: number;
  lastUsedAt: number;
  totalCalls: number;
  totalFails: number;
  lastStatus?: number;
}

const POOLS: Record<PoolProvider, string[]> = {
  groq: readPool(ENV_BASE.groq),
  gemini: readPool(ENV_BASE.gemini),
  openrouter: readPool(ENV_BASE.openrouter),
};

const HEALTH = new Map<string, KeyHealth>();

function healthKey(provider: PoolProvider, idx: number): string {
  return `${provider}:${idx}`;
}

function getHealth(provider: PoolProvider, idx: number): KeyHealth {
  const k = healthKey(provider, idx);
  let h = HEALTH.get(k);
  if (!h) {
    h = { unhealthyUntil: 0, lastUsedAt: 0, totalCalls: 0, totalFails: 0 };
    HEALTH.set(k, h);
  }
  return h;
}

export interface PoolPick { key: string; idx: number }

/** Ordered attempt list: healthy LRU keys first, then quarantined ones as last resort. */
export function pickKeys(provider: PoolProvider): PoolPick[] {
  const now = Date.now();
  const pool = POOLS[provider];
  if (pool.length === 0) return [];
  const withHealth = pool.map((key, idx) => ({ key, idx, h: getHealth(provider, idx) }));
  const healthy = withHealth
    .filter(({ h }) => h.unhealthyUntil <= now)
    .sort((a, b) => a.h.lastUsedAt - b.h.lastUsedAt);
  const quarantined = withHealth
    .filter(({ h }) => h.unhealthyUntil > now)
    .sort((a, b) => a.h.unhealthyUntil - b.h.unhealthyUntil);
  return [...healthy, ...quarantined].map(({ key, idx }) => ({ key, idx }));
}

export function markKeyUse(provider: PoolProvider, idx: number): void {
  const h = getHealth(provider, idx);
  h.lastUsedAt = Date.now();
  h.totalCalls += 1;
}

export function markKeyFail(provider: PoolProvider, idx: number, status: number): void {
  const h = getHealth(provider, idx);
  h.totalFails += 1;
  h.lastStatus = status;
  const cooldownMs =
    status === 401 || status === 403 ? 30 * 60_000 :
    status === 429 ? 5 * 60_000 :
    status >= 500 ? 60_000 :
    30_000;
  h.unhealthyUntil = Date.now() + cooldownMs;
}

export interface KeyStatus {
  idx: number;
  healthy: boolean;
  cooldownSec: number;
  calls: number;
  fails: number;
  lastStatus?: number;
  lastUsedAt: number;
}

export function poolStatus(): Record<PoolProvider, KeyStatus[]> {
  const now = Date.now();
  const out = {} as Record<PoolProvider, KeyStatus[]>;
  for (const p of Object.keys(POOLS) as PoolProvider[]) {
    out[p] = POOLS[p].map((_, idx) => {
      const h = getHealth(p, idx);
      return {
        idx,
        healthy: h.unhealthyUntil <= now,
        cooldownSec: Math.max(0, Math.ceil((h.unhealthyUntil - now) / 1000)),
        calls: h.totalCalls,
        fails: h.totalFails,
        lastStatus: h.lastStatus,
        lastUsedAt: h.lastUsedAt,
      };
    });
  }
  return out;
}

export function poolSizes(): Record<PoolProvider, number> {
  return {
    groq: POOLS.groq.length,
    gemini: POOLS.gemini.length,
    openrouter: POOLS.openrouter.length,
  };
}
