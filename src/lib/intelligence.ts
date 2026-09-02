// Intelligence preferences — cached in localStorage so the sync app-store
// can read them without waiting for Supabase.

export type ResponseLength = "short" | "balanced" | "detailed";
export type PreferredModel = "auto" | "nemotron_3_nano" | "nemotron_35_lightning" | "gpt_54_nano" | "gpt_54_mini" | "deepseek_v4_flash" | "nemotron_3_super" | "gpt_53_codex" | "gpt_55_terra" | "claude_sonnet_5" | "glm_52" | "nemotron_3_ultra" | "gpt_56_sol" | "claude_opus_46";
import type { ReasoningLevel } from "./reasoning";

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
  thinking_expand: ThinkingExpand; // auto = open while streaming and stay open; always = open; never = collapsed
  auto_citations: boolean;
  auto_code_explanations: boolean;
  safe_mode: boolean;
  creativity: number; // 0-100
  unlimited_output: boolean; // when true, remove per-effort output token cap
  reasoning_level: ReasoningLevel; // provider reasoning control; adapts to the selected model
};

export const INTELLIGENCE_DEFAULTS: IntelligencePrefs = {
  default_agent: "metrixcom", // Legacy internal field for backward compat
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
  reasoning_level: "off",
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
  auto: "Auto Selection",
  nemotron_3_nano: "Nemotron-3 Nano",
  nemotron_35_lightning: "Nemotron-3.5 Lightning",
  gpt_54_nano: "GPT-5.4 Nano",
  gpt_54_mini: "GPT-5.4 Mini",
  deepseek_v4_flash: "DeepSeek V4 Flash",
  nemotron_3_super: "Nemotron-3 Super",
  gpt_53_codex: "GPT-5.3 Codex",
  gpt_55_terra: "GPT-5.5 Terra",
  claude_sonnet_5: "Claude Sonnet 5",
  glm_52: "GLM-5.2",
  nemotron_3_ultra: "Nemotron-3 Ultra",
  gpt_56_sol: "GPT-5.6 Sol",
  claude_opus_46: "Claude Opus 4.6",
};