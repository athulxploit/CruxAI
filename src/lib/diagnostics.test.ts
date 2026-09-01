import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) },
  },
}));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: null }) }));

import {
  logRateLimitObservation,
  readRateLimitLog,
  clearRateLimitLog,
  setRateLimitedUntil,
  readRateLimit,
  parseRetryAfterDetail,
} from "./rate-limit";

const UID_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const UID_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const AUTH_KEY = "sb-tfgbdvjwwdwncrohbkyy-auth-token";

function signIn(uid: string) {
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({ currentSession: { user: { id: uid }, access_token: "x" } }),
  );
}
function signOut() { localStorage.removeItem(AUTH_KEY); }

/**
 * The Diagnostics tab (src/routes/admin.tsx > Diagnostics) reads directly
 * from readRateLimitLog() + readRateLimit(). These tests verify the data
 * layer it renders is correct AND stays isolated per user.
 */
describe("admin Diagnostics data source", () => {
  beforeEach(() => {
    localStorage.clear();
    clearRateLimitLog();
  });

  it("tags each 429 observation with the UID that was active at the time", () => {
    signIn(UID_A);
    logRateLimitObservation({
      provider: "groq", status: 429, source: "header:retry-after",
      raw: "30", computedMs: 30_000, untilMs: Date.now() + 30_000, uid: null,
    });
    signOut(); signIn(UID_B);
    logRateLimitObservation({
      provider: "gemini", status: 429, source: "body:retryDelay",
      raw: '"retryDelay":"12s"', computedMs: 12_000, untilMs: Date.now() + 12_000, uid: null,
    });

    const log = readRateLimitLog();
    expect(log).toHaveLength(2);
    // Newest first — the tab renders in this order.
    expect(log[0].provider).toBe("gemini");
    expect(log[0].uid).toBe(UID_B);
    expect(log[1].provider).toBe("groq");
    expect(log[1].uid).toBe(UID_A);
  });

  it("respects an explicitly supplied uid instead of falling back to current session", () => {
    signIn(UID_A);
    logRateLimitObservation({
      provider: "groq", status: 429, source: "default",
      raw: null, computedMs: 30_000, untilMs: Date.now() + 30_000, uid: UID_B,
    });
    expect(readRateLimitLog()[0].uid).toBe(UID_B);
  });

  it("caps the rolling log at 25 entries (newest kept, oldest dropped)", () => {
    signIn(UID_A);
    for (let i = 0; i < 30; i++) {
      logRateLimitObservation({
        provider: "groq", status: 429, source: "header:retry-after",
        raw: String(i), computedMs: 1000, untilMs: Date.now() + 1000, uid: null,
      });
    }
    const log = readRateLimitLog();
    expect(log).toHaveLength(25);
    expect(log[0].raw).toBe("29"); // newest
    expect(log[24].raw).toBe("5");  // oldest kept
  });

  it("clearRateLimitLog wipes observations but leaves per-user cooldown keys intact", () => {
    signIn(UID_A);
    setRateLimitedUntil(Date.now() + 60_000, "groq");
    logRateLimitObservation({
      provider: "groq", status: 429, source: "default",
      raw: null, computedMs: 60_000, untilMs: Date.now() + 60_000, uid: null,
    });
    signOut(); signIn(UID_B);
    setRateLimitedUntil(Date.now() + 45_000, "gemini");

    clearRateLimitLog();

    expect(readRateLimitLog()).toEqual([]);
    // Per-user cooldowns must survive a diagnostics-only clear.
    expect(readRateLimit(UID_A)?.provider).toBe("groq");
    expect(readRateLimit(UID_B)?.provider).toBe("gemini");
  });

  it("Diagnostics 'active cooldown' selector picks the row whose untilMs is in the future", () => {
    // Reproduces the exact filter used by admin.tsx line 1452.
    const now = Date.now();
    signIn(UID_A);
    logRateLimitObservation({
      provider: "groq", status: 429, source: "header:retry-after",
      raw: "1", computedMs: 1000, untilMs: now - 5_000, uid: null,   // expired
    });
    logRateLimitObservation({
      provider: "gemini", status: 429, source: "body:retryDelay",
      raw: "2", computedMs: 30_000, untilMs: now + 30_000, uid: null, // active
    });
    const log = readRateLimitLog();
    const active = log.find((o) => o.untilMs > Date.now());
    expect(active?.provider).toBe("gemini");
    expect(active?.uid).toBe(UID_A);
  });

  it("computed cooldown values match parseRetryAfterDetail (numbers rendered in the tab)", () => {
    const h = new Headers({ "retry-after": "42" });
    const d = parseRetryAfterDetail(h, null);
    expect(d.ms).toBe(42_000);
    expect(d.source).toBe("header:retry-after");
    expect(d.raw).toBe("42");

    const body = '{"error":{"message":"try again in 1m 30s"}}';
    const d2 = parseRetryAfterDetail(null, body);
    expect(d2.ms).toBe(90_000);
    expect(d2.source).toBe("body:try-again-in");

    const d3 = parseRetryAfterDetail(null, '{"retryDelay":"7s"}');
    expect(d3.ms).toBe(7_000);
    expect(d3.source).toBe("body:retryDelay");
  });

  it("per-user cooldowns rendered in the tab do not bleed across accounts", () => {
    signIn(UID_A);
    setRateLimitedUntil(Date.now() + 60_000, "groq");
    signOut(); signIn(UID_B);
    // Reading with each UID returns only that user's cooldown.
    expect(readRateLimit(UID_A)?.provider).toBe("groq");
    expect(readRateLimit(UID_B)).toBeNull();
    // Neither user's read touches or reveals the other's storage key contents
    // beyond an explicit uid argument (which only an admin diagnostics UI passes).
    expect(localStorage.getItem(`arch:rate_limit_until:${UID_A}`)).not.toBeNull();
    expect(localStorage.getItem(`arch:rate_limit_until:${UID_B}`)).toBeNull();
  });
});
