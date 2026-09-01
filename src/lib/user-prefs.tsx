import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import i18n from "@/lib/i18n";

const RTL_LANGS = new Set(["ar", "he", "fa", "ur"]);

export type UserPrefs = {
  username: string | null;
  country: string | null;
  timezone: string;
  language: string;
  date_format: string;
};

const DEFAULTS: UserPrefs = {
  username: null,
  country: null,
  timezone:
    (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC",
  language: "en-US",
  date_format: "MM/DD/YYYY",
};

type Ctx = UserPrefs & {
  formatDate: (d: Date | string | number) => string;
  formatDateTime: (d: Date | string | number) => string;
  formatTime: (d: Date | string | number) => string;
};

const PrefsCtx = createContext<Ctx>({
  ...DEFAULTS,
  formatDate: (d) => new Date(d).toLocaleDateString(),
  formatDateTime: (d) => new Date(d).toLocaleString(),
  formatTime: (d) => new Date(d).toLocaleTimeString(),
});

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatWithPattern(date: Date, pattern: string, timezone: string): string {
  // Break the date into parts in the target timezone.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const yyyy = map.year;
  const mm = map.month;
  const dd = map.day;
  const mmm = MONTHS[Number(mm) - 1];
  switch (pattern) {
    case "DD/MM/YYYY": return `${dd}/${mm}/${yyyy}`;
    case "YYYY-MM-DD": return `${yyyy}-${mm}-${dd}`;
    case "DD MMM YYYY": return `${dd} ${mmm} ${yyyy}`;
    case "MMM DD, YYYY": return `${mmm} ${dd}, ${yyyy}`;
    case "MM/DD/YYYY":
    default: return `${mm}/${dd}/${yyyy}`;
  }
}

export function UserPrefsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULTS);

  useEffect(() => {
    if (!user) {
      setPrefs(DEFAULTS);
      return;
    }
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("profiles")
        .select("username, country, timezone, language, date_format")
        .eq("id", user!.id)
        .maybeSingle();
      if (cancelled || !data) return;
      setPrefs({
        username: data.username ?? null,
        country: data.country ?? null,
        timezone: data.timezone || DEFAULTS.timezone,
        language: data.language || DEFAULTS.language,
        date_format: data.date_format || DEFAULTS.date_format,
      });
    }
    load();

    const channel = supabase
      .channel(`user-prefs-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Partial<UserPrefs>;
          setPrefs((prev) => ({
            username: n.username ?? prev.username,
            country: n.country ?? prev.country,
            timezone: n.timezone || prev.timezone,
            language: n.language || prev.language,
            date_format: n.date_format || prev.date_format,
          }));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Apply language to <html lang>, i18n, and dir for RTL
  useEffect(() => {
    if (typeof document === "undefined") return;
    const short = prefs.language.split("-")[0] || "en";
    document.documentElement.lang = short;
    document.documentElement.dir = RTL_LANGS.has(short) ? "rtl" : "ltr";
    if (i18n.language !== prefs.language) {
      i18n.changeLanguage(prefs.language);
    }
  }, [prefs.language]);

  const value = useMemo<Ctx>(() => {
    const tz = prefs.timezone;
    const loc = prefs.language;
    return {
      ...prefs,
      formatDate: (d) => formatWithPattern(new Date(d), prefs.date_format, tz),
      formatDateTime: (d) =>
        `${formatWithPattern(new Date(d), prefs.date_format, tz)} ${new Date(d).toLocaleTimeString(loc, { timeZone: tz, hour: "2-digit", minute: "2-digit" })}`,
      formatTime: (d) =>
        new Date(d).toLocaleTimeString(loc, { timeZone: tz, hour: "2-digit", minute: "2-digit" }),
    };
  }, [prefs]);

  return <PrefsCtx.Provider value={value}>{children}</PrefsCtx.Provider>;
}

export function useUserPrefs() {
  return useContext(PrefsCtx);
}
