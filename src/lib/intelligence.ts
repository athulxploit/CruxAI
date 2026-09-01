// Intelligence preferences — cached in localStorage so the sync app-store
// can read them without waiting for Supabase.

export type ResponseLength = "short" | "balanced" | "detailed";
export type PreferredModel = "auto" | "gemini" | "gpt" | "claude";
export type ThinkingExpand = "auto" | "always" | "never";

export type IntelligencePrefs = {
  default_agent: string;
  default_effort: string;
  web_search: boolean;
  deep_research: boolean;
  memory: boolean;
  system_prompt: string;
  arch_mode: boolean;
  preferred_model: PreferredModel;
  response_length: ResponseLength;
  thinking_mode: boolean;
  thinking_expand: ThinkingExpand; // auto = open while streaming then collapse; always = open; never = collapsed
  auto_citations: boolean;
  auto_code_explanations: boolean;
  safe_mode: boolean;
  creativity: number; // 0-100
  unlimited_output: boolean; // when true, remove per-effort output token cap
};

export const INTELLIGENCE_DEFAULTS: IntelligencePrefs = {
  default_agent: "pulse-1",
  default_effort: "medium",
  web_search: false,
  deep_research: false,
  memory: true,
  system_prompt: "",
  arch_mode: false,
  preferred_model: "auto",
  response_length: "detailed",
  thinking_mode: true,
  thinking_expand: "auto",
  auto_citations: false,
  auto_code_explanations: true,
  safe_mode: true,
  creativity: 50,
  unlimited_output: false,
};

const KEY = "arch:intelligence";

export function loadIntelligence(): IntelligencePrefs {
  if (typeof window === "undefined") return INTELLIGENCE_DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return INTELLIGENCE_DEFAULTS;
    return { ...INTELLIGENCE_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return INTELLIGENCE_DEFAULTS;
  }
}

export function saveIntelligence(next: Partial<IntelligencePrefs>) {
  if (typeof window === "undefined") return;
  const merged = { ...loadIntelligence(), ...next };
  localStorage.setItem(KEY, JSON.stringify(merged));
  window.dispatchEvent(new CustomEvent("arch:intelligence", { detail: merged }));
}

export function subscribeIntelligence(cb: (p: IntelligencePrefs) => void) {
  const h = (e: Event) => cb((e as CustomEvent).detail as IntelligencePrefs);
  window.addEventListener("arch:intelligence", h);
  return () => window.removeEventListener("arch:intelligence", h);
}

export const MODEL_LABEL: Record<PreferredModel, string> = {
  auto: "Auto",
  gemini: "Gemini",
  gpt: "GPT",
  claude: "Claude",
};
