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
  // Limits are AUTHORITATIVE on server.
  return true;
}

export interface LimitStatus {
  enforced: boolean;      // limit actively applies to this user
  limit: number | null;   // null = unlimited
  used: number;
  remaining: number;      // Infinity when unlimited
  blocked: boolean;       // used >= limit
  warning: boolean;       // <=3 messages left
  resetTime?: string;
}

export function computeStatus(limit: number | null, used: number, enforced: boolean, resetTime?: string): LimitStatus {
  if (!enforced || limit == null || limit <= 0) {
    return { enforced: false, limit, used, remaining: Infinity, blocked: false, warning: false, resetTime };
  }
  const remaining = Math.max(0, limit - used);
  const blocked = used >= limit;
  // Warning at exactly 3, 2, or 1 message remaining.
  const warning = !blocked && remaining <= 3;
  return { enforced: true, limit, used, remaining, blocked, warning, resetTime };
}

export function useMessageLimit(): LimitStatus {
  const { user, isAdmin } = useAuth();
  const [status, setStatus] = useState<LimitStatus>({
    enforced: false,
    limit: null,
    used: 0,
    remaining: Infinity,
    blocked: false,
    warning: false,
  });

  const fetchLimit = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.rpc("check_message_quota", {
        _user_id: user.id,
      });
      if (error) throw error;
      const q = data as { allowed: boolean; used: number; limit: number | null; remaining: number; reset_at: string };
      
      const enforced = !isAdmin && q.limit !== null;
      setStatus(computeStatus(q.limit, q.used, enforced, q.reset_at));
    } catch (e) {
      console.error("[msg-limit] failed to fetch quota:", e);
    }
  };

  useEffect(() => {
    fetchLimit();
    
    // Listen for successful messages to refresh
    const h = () => fetchLimit();
    window.addEventListener("arch:msg_used", h);
    
    // Also refresh periodically
    const timer = setInterval(fetchLimit, 60000);
    
    return () => {
      window.removeEventListener("arch:msg_used", h);
      clearInterval(timer);
    };
  }, [user?.id, isAdmin]);

  return status;
}
