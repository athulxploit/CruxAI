// Per-user daily message limit tracking.
// Limit source: user_overrides.msg_limit (admin-set). Falls back to a default
// (from app_settings.global_limits.daily_msg_limit) or unlimited when absent.
// Admins ALWAYS bypass. Master limits switch off ALWAYS bypasses.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { usePlatform } from "@/lib/platform";

const KEY_PREFIX = "arch:msg_count:v1";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function storageKey(uid: string): string {
  return `${KEY_PREFIX}:${uid}:${today()}`;
}

export function readUsedToday(uid: string | null | undefined): number {
  if (!uid || typeof window === "undefined") return 0;
  try {
    return Number(localStorage.getItem(storageKey(uid)) ?? 0) || 0;
  } catch { return 0; }
}

export function incrementUsed(uid: string | null | undefined): number {
  if (!uid || typeof window === "undefined") return 0;
  const next = readUsedToday(uid) + 1;
  try {
    localStorage.setItem(storageKey(uid), String(next));
    window.dispatchEvent(new CustomEvent("arch:msg_used", { detail: next }));
  } catch { /* ignore */ }
  return next;
}

export function limitsMasterOn(): boolean {
  // Limits are OFF by default. Only ON when admin explicitly enables them.
  if (typeof window === "undefined") return false;
  return localStorage.getItem("arch:limits_enabled") === "true";
}

export interface LimitStatus {
  enforced: boolean;      // limit actively applies to this user
  limit: number | null;   // null = unlimited
  used: number;
  remaining: number;      // Infinity when unlimited
  blocked: boolean;       // used >= limit
  warning: boolean;       // <=3 or <=10% left (not blocked)
}

export function computeStatus(limit: number | null, used: number, enforced: boolean): LimitStatus {
  if (!enforced || limit == null || limit <= 0) {
    return { enforced: false, limit, used, remaining: Infinity, blocked: false, warning: false };
  }
  const remaining = Math.max(0, limit - used);
  const blocked = used >= limit;
  const warning = !blocked && (remaining <= Math.max(3, Math.ceil(limit * 0.1)));
  return { enforced: true, limit, used, remaining, blocked, warning };
}

export function useMessageLimit(): LimitStatus {
  const { user, isAdmin } = useAuth();
  const { settings } = usePlatform();
  const [override, setOverride] = useState<number | null>(null);
  const [used, setUsed] = useState<number>(() => readUsedToday(user?.id));

  useEffect(() => {
    setUsed(readUsedToday(user?.id));
    if (!user?.id) { setOverride(null); return; }
    let cancelled = false;
    supabase
      .from("user_overrides")
      .select("msg_limit,unlimited")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const row = data as { msg_limit: number | null; unlimited: boolean } | null;
        if (row?.unlimited) setOverride(null);
        else setOverride(row?.msg_limit ?? null);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    const h = () => setUsed(readUsedToday(user?.id));
    window.addEventListener("arch:msg_used", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("arch:msg_used", h);
      window.removeEventListener("storage", h);
    };
  }, [user?.id]);

  const defaultLimit =
    (settings?.global_limits as { daily_msg_limit?: number } | undefined)?.daily_msg_limit ?? null;
  const effectiveLimit = override ?? defaultLimit ?? null;
  const enforced = !!user && !isAdmin && limitsMasterOn() && effectiveLimit != null && effectiveLimit > 0;
  return computeStatus(effectiveLimit, used, enforced);
}
