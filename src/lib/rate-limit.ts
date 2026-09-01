// Per-user rate-limit state. When a provider returns 429, we stash the
// "ready at" timestamp for the CURRENT user only and render a banner above
// the composer with a live countdown — never inside the chat transcript.
// Scoping the storage key by user id ensures one user hitting a provider
// cap never blocks another account signed into the same browser.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

const KEY_PREFIX = "arch:rate_limit_until";
const LEGACY_KEY = "arch:rate_limit_until"; // old global key — cleared on first read
const EVT = "arch:rate_limit";

function keyFor(uid: string | null | undefined): string {
  return `${KEY_PREFIX}:${uid || "anon"}`;
}

function extractUid(value: unknown, depth = 0): string | null {
  if (!value || depth > 4) return null;
  if (typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const directUser = obj.user as Record<string, unknown> | undefined;
  if (typeof directUser?.id === "string" && directUser.id) return directUser.id;
  for (const key of ["currentSession", "session", "data"]) {
    const found = extractUid(obj[key], depth + 1);
    if (found) return found;
  }
  return null;
}

// Best-effort synchronous uid for callers outside of React (e.g. app-store).
// Falls back to reading the cached Supabase session from localStorage.
function currentUidSync(): string | null {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith("sb-") || !k.endsWith("-auth-token")) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const uid = extractUid(JSON.parse(raw));
      if (uid) return uid;
    }
  } catch { /* ignore */ }
  return null;
}

export class RateLimitError extends Error {
  retryAfterMs: number;
  provider?: string;
  constructor(retryAfterMs: number, provider?: string, message?: string) {
    super(message || "Rate limited");
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
    this.provider = provider;
  }
}

export function setRateLimitedUntil(untilMs: number, provider?: string, uid?: string | null): void {
  if (typeof window === "undefined") return;
  const id = uid ?? currentUidSync();
  try {
    localStorage.setItem(keyFor(id), JSON.stringify({ until: untilMs, provider: provider || null }));
    // Clean up any legacy global key so old data doesn't leak across accounts.
    if (localStorage.getItem(LEGACY_KEY) && LEGACY_KEY !== keyFor(id)) {
      localStorage.removeItem(LEGACY_KEY);
    }
    window.dispatchEvent(new CustomEvent(EVT));
  } catch { /* ignore */ }
}

export function clearRateLimit(uid?: string | null): void {
  if (typeof window === "undefined") return;
  const id = uid ?? currentUidSync();
  try {
    localStorage.removeItem(keyFor(id));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch { /* ignore */ }
}

export function readRateLimit(uid?: string | null): { until: number; provider: string | null } | null {
  if (typeof window === "undefined") return null;
  const id = uid ?? currentUidSync();
  try {
    // Migrate/discard any legacy global entry so it can never re-appear for another user.
    if (localStorage.getItem(LEGACY_KEY) && LEGACY_KEY !== keyFor(id)) {
      localStorage.removeItem(LEGACY_KEY);
    }
    const raw = localStorage.getItem(keyFor(id));
    if (!raw) return null;
    const j = JSON.parse(raw) as { until?: number; provider?: string | null };
    if (!j?.until || j.until <= Date.now()) return null;
    return { until: j.until, provider: j.provider ?? null };
  } catch { return null; }
}

export interface RateLimitStatus {
  active: boolean;
  untilMs: number | null;
  remainingMs: number;
  readableIn: string;
  readableAt: string;
  provider: string | null;
}

function fmtRemaining(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return rs ? `${m}m ${rs}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}

function fmtAt(untilMs: number): string {
  try {
    return new Date(untilMs).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch { return ""; }
}

export function useRateLimit(): RateLimitStatus {
  const { user, isAdmin } = useAuth();
  const uid = user?.id ?? null;
  const [state, setState] = useState<{ until: number; provider: string | null } | null>(() => readRateLimit(uid));
  const [, tick] = useState(0);

  // Re-read whenever the signed-in user changes so a previous user's active
  // countdown never carries over to a different account.
  useEffect(() => {
    setState(readRateLimit(uid));
  }, [uid]);

  // Admins bypass provider rate-limit banners entirely — also flush any
  // stored countdown so it doesn't pop back after a refresh.
  useEffect(() => {
    if (isAdmin) {
      clearRateLimit(uid);
      setState(null);
    }
  }, [isAdmin, uid]);

  useEffect(() => {
    const refresh = () => setState(readRateLimit(uid));
    window.addEventListener(EVT, refresh);
    window.addEventListener("storage", refresh);
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "SIGNED_IN" || event === "USER_UPDATED") {
        setState(readRateLimit(uid));
      }
    });
    return () => {
      window.removeEventListener(EVT, refresh);
      window.removeEventListener("storage", refresh);
      sub.subscription.unsubscribe();
    };
  }, [uid]);

  useEffect(() => {
    if (!state) return;
    const id = setInterval(() => {
      if (Date.now() >= state.until) {
        clearRateLimit(uid);
        setState(null);
      } else {
        tick((n) => n + 1);
      }
    }, 250);
    return () => clearInterval(id);
  }, [state, uid]);

  if (isAdmin || !state) {
    return { active: false, untilMs: null, remainingMs: 0, readableIn: "", readableAt: "", provider: null };
  }
  const remainingMs = Math.max(0, state.until - Date.now());
  return {
    active: remainingMs > 0,
    untilMs: state.until,
    remainingMs,
    readableIn: fmtRemaining(remainingMs),
    readableAt: fmtAt(state.until),
    provider: state.provider,
  };
}

// Parse a provider error body for a retry-after hint. Falls back to 30s.
// We keep millisecond precision so the countdown matches the provider exactly.
export interface RetryAfterDetail {
  ms: number;
  source: string; // e.g. "header:retry-after", "header:x-ratelimit-reset-tokens", "body:try-again-in", "body:retryDelay", "default"
  raw: string | null; // the exact header/body fragment used
}

export function parseRetryAfterDetail(headers: Headers | null, body: string | null): RetryAfterDetail {
  const DEFAULT = 30_000;
  const MAX = 60 * 60 * 1000;

  const ra = headers?.get("retry-after");
  if (ra) {
    const n = Number(ra);
    if (Number.isFinite(n) && n > 0) return { ms: Math.min(MAX, Math.round(n * 1000)), source: "header:retry-after", raw: ra };
    const date = Date.parse(ra);
    if (!Number.isNaN(date)) return { ms: Math.min(MAX, Math.max(1000, date - Date.now())), source: "header:retry-after(date)", raw: ra };
  }
  const resetHeaders = ["x-ratelimit-reset-requests", "x-ratelimit-reset-tokens", "x-ratelimit-reset"];
  for (const h of resetHeaders) {
    const v = headers?.get(h);
    if (!v) continue;
    const m = v.match(/([0-9.]+)\s*(ms|s|m|h)?/i);
    if (!m) continue;
    const n = parseFloat(m[1]);
    if (!Number.isFinite(n) || n <= 0) continue;
    const unit = (m[2] || "s").toLowerCase();
    const mult = unit === "ms" ? 1 : unit === "s" ? 1000 : unit === "m" ? 60_000 : 3_600_000;
    return { ms: Math.min(MAX, Math.round(n * mult)), source: `header:${h}`, raw: v };
  }

  if (body) {
    const mHms = body.match(/try again in\s+(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:([0-9.]+)s)?(?:\s*([0-9]+)ms)?/i);
    if (mHms && (mHms[1] || mHms[2] || mHms[3] || mHms[4])) {
      const h = parseInt(mHms[1] || "0", 10);
      const m = parseInt(mHms[2] || "0", 10);
      const s = parseFloat(mHms[3] || "0");
      const ms = parseInt(mHms[4] || "0", 10);
      const total = h * 3_600_000 + m * 60_000 + Math.round(s * 1000) + ms;
      if (total > 0) return { ms: Math.min(MAX, total), source: "body:try-again-in", raw: mHms[0] };
    }
    const mDelay = body.match(/"retryDelay"\s*:\s*"([0-9.]+)s"/i);
    if (mDelay) return { ms: Math.min(MAX, Math.round(parseFloat(mDelay[1]) * 1000)), source: "body:retryDelay", raw: mDelay[0] };
  }
  return { ms: DEFAULT, source: "default", raw: null };
}

export function parseRetryAfterMs(headers: Headers | null, body: string | null): number {
  return parseRetryAfterDetail(headers, body).ms;
}

// Rolling diagnostics log (browser-local, admin panel reads it).
export interface RateLimitObservation {
  ts: number;
  provider: string;
  status: number;
  source: string;
  raw: string | null;
  computedMs: number;
  untilMs: number;
  uid: string | null;
}
const DIAG_KEY = "arch:rl_diag_log";
const DIAG_MAX = 25;

export function logRateLimitObservation(o: Omit<RateLimitObservation, "ts">): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(DIAG_KEY);
    const arr: RateLimitObservation[] = raw ? JSON.parse(raw) : [];
    arr.unshift({ ts: Date.now(), ...o, uid: o.uid ?? currentUidSync() });
    localStorage.setItem(DIAG_KEY, JSON.stringify(arr.slice(0, DIAG_MAX)));
    window.dispatchEvent(new CustomEvent("arch:rl_diag"));
  } catch { /* ignore */ }
}

export function readRateLimitLog(): RateLimitObservation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DIAG_KEY);
    return raw ? (JSON.parse(raw) as RateLimitObservation[]) : [];
  } catch { return []; }
}

export function clearRateLimitLog(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DIAG_KEY);
    window.dispatchEvent(new CustomEvent("arch:rl_diag"));
  } catch { /* ignore */ }
}

