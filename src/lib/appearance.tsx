import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type ThemeMode = "dark" | "light" | "system";
export type Density = "compact" | "comfortable" | "spacious";
export type AccentName = "blue" | "violet" | "emerald" | "amber" | "rose";
export type FontName = "inter" | "mono" | "serif";
export type ChatWidth = "compact" | "normal" | "wide";
export type SidebarDefault = "expanded" | "collapsed";
export type CodeTheme = "dark" | "light";
export type MsgFontSize = "sm" | "md" | "lg" | "xl";
export type RadiusName = "sharp" | "soft" | "rounded" | "pill";

export interface Appearance {
  theme: ThemeMode;
  density: Density;
  accent: AccentName;
  font: FontName;
  reduceMotion: boolean;
  chatWidth: ChatWidth;
  sidebarDefault: SidebarDefault;
  codeTheme: CodeTheme;
  msgFontSize: MsgFontSize;
  radius: RadiusName;
}

const DEFAULT: Appearance = {
  theme: "dark",
  density: "comfortable",
  accent: "blue",
  font: "inter",
  reduceMotion: false,
  chatWidth: "normal",
  sidebarDefault: "expanded",
  codeTheme: "dark",
  msgFontSize: "md",
  radius: "soft",
};

const ACCENT_COLORS: Record<AccentName, string> = {
  blue: "oklch(0.66 0.17 250)",
  violet: "oklch(0.62 0.22 295)",
  emerald: "oklch(0.68 0.16 160)",
  amber: "oklch(0.78 0.16 75)",
  rose: "oklch(0.65 0.22 15)",
};

const LS_KEY = "arch-appearance";

function resolveTheme(mode: ThemeMode): "dark" | "light" {
  if (mode === "system" && typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode === "light" ? "light" : "dark";
}

export function applyAppearance(a: Appearance) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const resolved = resolveTheme(a.theme);
  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
  root.classList.remove("density-compact", "density-comfortable", "density-spacious");
  root.classList.add(`density-${a.density}`);
  root.classList.remove("font-inter", "font-mono", "font-serif");
  root.classList.add(`font-${a.font}`);
  root.classList.toggle("reduce-motion", a.reduceMotion);
  root.style.setProperty("--accent-color", ACCENT_COLORS[a.accent]);

  // Chat width
  root.classList.remove("chat-compact", "chat-normal", "chat-wide");
  root.classList.add(`chat-${a.chatWidth}`);

  // Sidebar collapsed
  root.classList.toggle("sidebar-collapsed", a.sidebarDefault === "collapsed");

  // Code theme
  root.classList.remove("code-dark", "code-light");
  root.classList.add(`code-${a.codeTheme}`);

  // Message font size
  root.classList.remove("msg-sm", "msg-md", "msg-lg", "msg-xl");
  root.classList.add(`msg-${a.msgFontSize}`);

  // Radius
  root.classList.remove("radius-sharp", "radius-soft", "radius-rounded", "radius-pill");
  root.classList.add(`radius-${a.radius}`);
}

function readLocal(): Appearance {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch { /* noop */ }
  return DEFAULT;
}

interface Ctx {
  appearance: Appearance;
  update: (patch: Partial<Appearance>) => void;
}

const AppearanceCtx = createContext<Ctx>({ appearance: DEFAULT, update: () => {} });

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [appearance, setAppearance] = useState<Appearance>(() => readLocal());

  useEffect(() => {
    applyAppearance(appearance);
    try { window.localStorage.setItem(LS_KEY, JSON.stringify(appearance)); } catch { /* noop */ }
  }, [appearance]);

  useEffect(() => {
    if (appearance.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyAppearance(appearance);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [appearance]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_settings")
      .select("appearance")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const remote = (data as { appearance?: Partial<Appearance> } | null)?.appearance;
        if (remote && typeof remote === "object") {
          setAppearance((prev) => ({ ...prev, ...remote }));
        }
      });
  }, [user]);

  function update(patch: Partial<Appearance>) {
    setAppearance((prev) => {
      const next = { ...prev, ...patch };
      if (user) {
        supabase
          .from("user_settings")
          .upsert({ user_id: user.id, appearance: next } as never)
          .then(({ error }) => { if (error) console.error(error); });
      }
      return next;
    });
  }

  return <AppearanceCtx.Provider value={{ appearance, update }}>{children}</AppearanceCtx.Provider>;
}

export function useAppearance() {
  return useContext(AppearanceCtx);
}
