// Incognito mode — session-only chats.
//
// While enabled, conversations stay in memory for the current tab only:
// they are never written to localStorage, never synced to the cloud, and
// never used for model improvement. Turning it off discards them.

import { useSyncExternalStore } from "react";

const KEY = "arch:incognito";
const listeners = new Set<() => void>();

let enabled =
  typeof window !== "undefined" && sessionStorage.getItem(KEY) === "1";

export function isIncognito(): boolean {
  return enabled;
}

export function setIncognitoFlag(v: boolean) {
  if (enabled === v) return;
  enabled = v;
  try {
    if (typeof window !== "undefined") {
      if (v) sessionStorage.setItem(KEY, "1");
      else sessionStorage.removeItem(KEY);
    }
  } catch { /* private-mode storage errors are non-fatal */ }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useIncognito(): boolean {
  return useSyncExternalStore(subscribe, () => enabled, () => false);
}

// ---- Training-data consent (Settings → Privacy → "Improve models with my chats")
// Mirrored to localStorage by the settings screen so sync code paths can read it.
const TRAIN_KEY = "arch:allow_training";

export function allowTraining(): boolean {
  if (typeof window === "undefined") return true;
  // Default ON; users can opt out in Settings → Privacy.
  return localStorage.getItem(TRAIN_KEY) !== "0";
}

export function setAllowTrainingCache(v: boolean) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(TRAIN_KEY, v ? "1" : "0"); } catch { /* noop */ }
}

// ---- Save chat history (Settings → Privacy → "Save chat history")
const HIST_KEY = "arch:save_history";

export function saveHistoryEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(HIST_KEY) !== "0";
}

export function setSaveHistoryCache(v: boolean) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(HIST_KEY, v ? "1" : "0"); } catch { /* noop */ }
  privacyListeners.forEach((l) => l());
}

// Anything that must not leave the tab: incognito chats, or a user who turned
// history off entirely.
export function persistenceAllowed(): boolean {
  return !isIncognito() && saveHistoryEnabled();
}

// True when this turn may be used for model improvement.
export function trainingAllowed(): boolean {
  return !isIncognito() && allowTraining();
}

const privacyListeners = new Set<() => void>();
export function onPrivacyChange(l: () => void) {
  privacyListeners.add(l);
  return () => privacyListeners.delete(l);
}

/** Mirror the user's stored privacy settings into the local caches so every
 *  code path (store persistence, AI requests) can read them synchronously. */
export async function hydratePrivacyCache(uid: string | null) {
  if (!uid || typeof window === "undefined") return;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase
      .from("user_settings")
      .select("privacy")
      .eq("user_id", uid)
      .maybeSingle();
    const privacy = (data?.privacy ?? {}) as Record<string, unknown>;
    if (privacy.allow_training !== undefined) setAllowTrainingCache(privacy.allow_training !== false);
    if (privacy.save_history !== undefined) setSaveHistoryCache(privacy.save_history !== false);
    privacyListeners.forEach((l) => l());

    // Backfill: older rows predate these keys, so the choice only lived on the
    // device. Persist the effective values so the account carries them.
    if (privacy.allow_training === undefined || privacy.save_history === undefined) {
      await supabase.from("user_settings").upsert(
        {
          user_id: uid,
          privacy: {
            ...privacy,
            allow_training: privacy.allow_training !== undefined ? privacy.allow_training !== false : allowTraining(),
            save_history: privacy.save_history !== undefined ? privacy.save_history !== false : saveHistoryEnabled(),
          },
        },
        { onConflict: "user_id" },
      );
    }
  } catch { /* offline — keep cached defaults */ }
}

