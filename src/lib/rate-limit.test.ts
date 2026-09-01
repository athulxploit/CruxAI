import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock modules pulled in by rate-limit.ts so importing it doesn't require
// a real Supabase client or React auth context at test time.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: null }),
}));

import {
  setRateLimitedUntil,
  readRateLimit,
  clearRateLimit,
} from "./rate-limit";

const UID_A = "11111111-1111-1111-1111-111111111111";
const UID_B = "22222222-2222-2222-2222-222222222222";
const PROJECT_REF = "tfgbdvjwwdwncrohbkyy";
const AUTH_KEY = `sb-${PROJECT_REF}-auth-token`;

function signIn(uid: string) {
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({
      currentSession: { user: { id: uid }, access_token: "x" },
      expiresAt: Date.now() / 1000 + 3600,
    }),
  );
}

function signOut() {
  localStorage.removeItem(AUTH_KEY);
}

describe("rate-limit per-user scoping", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores the cooldown under a UID-scoped storage key", () => {
    signIn(UID_A);
    const until = Date.now() + 60_000;
    setRateLimitedUntil(until, "groq");

    expect(localStorage.getItem(`arch:rate_limit_until:${UID_A}`)).not.toBeNull();
    // Legacy global key must never be created.
    expect(localStorage.getItem("arch:rate_limit_until")).toBeNull();
  });

  it("user A's cooldown does NOT affect user B", () => {
    signIn(UID_A);
    setRateLimitedUntil(Date.now() + 60_000, "groq");
    expect(readRateLimit()?.until).toBeGreaterThan(Date.now());

    // Simulate user B signing into the same browser.
    signOut();
    signIn(UID_B);

    // B must see NO active cooldown.
    expect(readRateLimit()).toBeNull();

    // A's original entry is still there, keyed to A only.
    expect(localStorage.getItem(`arch:rate_limit_until:${UID_A}`)).not.toBeNull();
    expect(localStorage.getItem(`arch:rate_limit_until:${UID_B}`)).toBeNull();
  });

  it("clearRateLimit only clears the current user's entry", () => {
    signIn(UID_A);
    setRateLimitedUntil(Date.now() + 60_000, "groq");
    signOut();
    signIn(UID_B);
    setRateLimitedUntil(Date.now() + 60_000, "gemini");

    // Clear B's entry.
    clearRateLimit();
    expect(readRateLimit()).toBeNull();

    // A's entry must remain untouched.
    signOut();
    signIn(UID_A);
    expect(readRateLimit()?.provider).toBe("groq");
  });

  it("explicit uid argument overrides the current session", () => {
    signIn(UID_A);
    setRateLimitedUntil(Date.now() + 60_000, "gemini", UID_B);

    // The write went to B's key, not A's.
    expect(localStorage.getItem(`arch:rate_limit_until:${UID_B}`)).not.toBeNull();
    expect(localStorage.getItem(`arch:rate_limit_until:${UID_A}`)).toBeNull();

    // A (current session) sees nothing.
    expect(readRateLimit()).toBeNull();
    // Reading with explicit B uid returns the entry.
    expect(readRateLimit(UID_B)?.provider).toBe("gemini");
  });

  it("expired cooldowns return null", () => {
    signIn(UID_A);
    setRateLimitedUntil(Date.now() - 1000, "groq");
    expect(readRateLimit()).toBeNull();
  });

  it("legacy global key is discarded on read and never leaks to a new user", () => {
    // Simulate leftover pre-fix global entry.
    localStorage.setItem(
      "arch:rate_limit_until",
      JSON.stringify({ until: Date.now() + 60_000, provider: "groq" }),
    );
    signIn(UID_B);
    expect(readRateLimit()).toBeNull();
    expect(localStorage.getItem("arch:rate_limit_until")).toBeNull();
  });
});
