import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export interface FeatureFlags {
  memory: boolean;
  web_search: boolean;
  deep_research: boolean;
  operator_mode: boolean;
  voice: boolean;
  vision: boolean;
  [key: string]: boolean;
}

export interface AppSettings {
  id: number;
  site_name: string;
  registration_enabled: boolean;
  google_auth_enabled: boolean;
  maintenance_mode: boolean;
  default_theme: string;
  default_agent: string;
  default_language: string;
  max_upload_mb: number;
  web_search_status: string;
  deep_research_status: string;
  allowed_file_types: string[];
  global_limits: Record<string, number>;
}

export interface Announcement {
  id: string;
  kind: "banner" | "popup" | "maintenance" | "release";
  title: string;
  body: string;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

interface PlatformCtx {
  settings: AppSettings | null;
  flags: FeatureFlags;
  announcements: Announcement[];
  loading: boolean;
}

const Ctx = createContext<PlatformCtx>({
  settings: null,
  flags: {
    memory: true,
    web_search: true,
    deep_research: true,
    operator_mode: true,
    voice: false,
    vision: false,
  },
  announcements: [],
  loading: true,
});

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [flags, setFlags] = useState<FeatureFlags>({
    memory: true,
    web_search: true,
    deep_research: true,
    operator_mode: true,
    voice: false,
    vision: false,
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile, signOut } = useAuth();

  async function loadAll() {
    const [s, f, a] = await Promise.all([
      supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("feature_flags" as never).select("*"),
      supabase
        .from("announcements" as never)
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false }),
    ]);
    if (s.data) {
      setSettings(s.data as AppSettings);
      // Mirror per-effort output cap flags to localStorage so the sync
      // app-store can consult them without an async round-trip.
      try {
        const gl = (s.data as AppSettings).global_limits as unknown as {
          effort_caps?: Record<string, boolean>;
          limits_enabled?: boolean;
        };
        const caps = gl?.effort_caps;
        if (caps && typeof window !== "undefined") {
          localStorage.setItem("arch:effort_caps", JSON.stringify(caps));
          window.dispatchEvent(new CustomEvent("arch:effort_caps", { detail: caps }));
        }
        if (typeof window !== "undefined") {
          const enabled = gl?.limits_enabled !== false; // default on
          localStorage.setItem("arch:limits_enabled", enabled ? "true" : "false");
        }
      } catch { /* ignore */ }
    }
    if (f.data) {
      const map: FeatureFlags = { ...flags };
      for (const row of f.data as { key: string; enabled: boolean }[]) {
        map[row.key] = row.enabled;
      }
      setFlags(map);
    }
    if (a.data) setAnnouncements(a.data as Announcement[]);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    const ch = supabase
      .channel("platform-config")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        loadAll,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feature_flags" },
        loadAll,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        loadAll,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enforce user status (suspended/banned) live
  useEffect(() => {
    if (!profile) return;
    if (profile.status === "banned") {
      toast.error("Your account has been banned. Contact support.");
      signOut();
      return;
    }
    const p = profile as unknown as { suspended_until?: string | null };
    if (
      profile.status === "suspended" ||
      (p.suspended_until && new Date(p.suspended_until) > new Date())
    ) {
      toast.error("Your account is suspended.");
      signOut();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.status, (profile as unknown as { suspended_until?: string })?.suspended_until]);

  const value = useMemo(
    () => ({ settings, flags, announcements, loading }),
    [settings, flags, announcements, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlatform() {
  return useContext(Ctx);
}

/** Write an admin audit log entry. */
export async function logAdminAction(
  actor_email: string | null,
  action: string,
  target: string | null,
  meta: Record<string, unknown> = {},
) {
  await supabase.from("admin_logs" as never).insert({
    actor_email,
    action,
    target,
    meta,
  } as never);
}
