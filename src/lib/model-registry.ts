// Single source of truth for user-selectable models in Crux AI.
import type { PreferredModel } from "./intelligence";
import { type PlanId } from "./plan-meta";
import type { ProviderCall } from "./model-chains";
import type { ReasoningMode } from "./reasoning";


export type ModelTier = "free" | "standard" | "pro" | "proplus";

export interface ModelEntry {
  id: PreferredModel;
  name: string;
  provider: string;
  minPlan: PlanId;
  openRouterId: string;
  /**
   * Alternate routing slugs for the SAME model (e.g. the paid slug of a
   * ":free" variant). Used only when the primary slug is unavailable /
   * rate-limited upstream — never a different model.
   */
  variantIds?: string[];
  description: string;
  supportsVision: boolean;
  /**
   * Reasoning capability, derived from the provider's advertised
   * `supported_parameters` and verified with a live request per level.
   */
  reasoning: ReasoningMode;
  costPerMessage?: number; // Estimated cost in USD per standard message
}

export const MODEL_REGISTRY: ModelEntry[] = [
  // FREE
  {
    id: "nemotron_3_nano",
    name: "Nemotron-3 Nano",
    provider: "NVIDIA",
    minPlan: "free",
    openRouterId: "nvidia/nemotron-3-nano-30b-a3b",
    description: "Generous free allocation for all users.",
    supportsVision: false,
    reasoning: "toggle",
    costPerMessage: 0.0001,
  },
  {
    id: "nemotron_35_lightning",
    name: "Nemotron-3.5 Lightning",
    provider: "NVIDIA",
    minPlan: "free",
    openRouterId: "nvidia/nemotron-3.5-lightning:free",
    description: "Ultra-fast NVIDIA model, free for all users.",
    supportsVision: false,
    reasoning: "toggle",
    costPerMessage: 0.0001,
  },
  {
    id: "glm_52",
    name: "GLM-5.2",
    provider: "Z.ai",
    minPlan: "free",
    openRouterId: "z-ai/glm-5.2:free",
    // The free slug is frequently rate-limited upstream; fall back to the
    // identical paid slug so the selected model still answers.
    variantIds: ["z-ai/glm-5.2"],
    description: "Advanced model from Zhipu AI.",
    supportsVision: false,
    reasoning: "effort",
    costPerMessage: 0.0002,
  },
  // STANDARD
  {
    id: "gpt_54_nano",
    name: "GPT-5.4 Nano",
    provider: "OpenAI",
    minPlan: "standard",
    openRouterId: "openai/gpt-5.4-nano",
    description: "High-speed OpenAI model for standard tasks.",
    supportsVision: false,
    reasoning: "effort",
    costPerMessage: 0.0003,
  },
  {
    id: "gpt_54_mini",
    name: "GPT-5.4 Mini",
    provider: "OpenAI",
    minPlan: "standard",
    openRouterId: "openai/gpt-5.4-mini",
    description: "Balanced OpenAI efficiency.",
    supportsVision: true,
    reasoning: "effort",
    costPerMessage: 0.0005,
  },
  {
    id: "deepseek_v4_flash",
    name: "DeepSeek V4 Flash",
    provider: "DeepSeek",
    minPlan: "standard",
    openRouterId: "deepseek/deepseek-v4-flash",
    description: "Fast and intelligent DeepSeek model.",
    supportsVision: false,
    reasoning: "effort",
    costPerMessage: 0.0004,
  },
  // PRO
  {
    id: "nemotron_3_super",
    name: "Nemotron-3 Super",
    provider: "NVIDIA",
    minPlan: "pro",
    openRouterId: "nvidia/nemotron-3-super-120b-a12b:free",
    description: "High-performance NVIDIA model.",
    supportsVision: false,
    reasoning: "effort",
    costPerMessage: 0.0015,
  },
  {
    id: "gpt_53_codex",
    name: "GPT-5.3 Codex",
    provider: "OpenAI",
    minPlan: "pro",
    openRouterId: "openai/gpt-5.3-codex",
    description: "Specialized for advanced coding and reasoning.",
    supportsVision: false,
    reasoning: "effort",
    costPerMessage: 0.0025,
  },
  {
    id: "gpt_55_terra",
    name: "GPT-5.5 Terra",
    provider: "OpenAI",
    minPlan: "pro",
    openRouterId: "openai/gpt-5.5",
    description: "Powerful OpenAI flagship (Terra).",
    supportsVision: true,
    reasoning: "effort",
    costPerMessage: 0.0035,
  },
  {
    id: "claude_sonnet_5",
    name: "Claude Sonnet 5",
    provider: "Anthropic",
    minPlan: "pro",
    openRouterId: "anthropic/claude-sonnet-5",
    description: "Next-gen Anthropic intelligence.",
    supportsVision: true,
    reasoning: "effort_budget",
    costPerMessage: 0.0030,
  },
  // PRO+
  {
    id: "nemotron_3_ultra",
    name: "Nemotron-3 Ultra",
    provider: "NVIDIA",
    minPlan: "proplus",
    openRouterId: "nvidia/nemotron-3-ultra-550b-a55b:free",
    description: "Ultimate NVIDIA flagship performance.",
    supportsVision: false,
    reasoning: "effort",
    costPerMessage: 0.0050,
  },
  {
    id: "gpt_56_sol",
    name: "GPT-5.6 Sol",
    provider: "OpenAI",
    minPlan: "proplus",
    openRouterId: "openai/gpt-5.6-sol",
    description: "The peak of OpenAI reasoning (Sol).",
    supportsVision: true,
    reasoning: "effort_xhigh",
    costPerMessage: 0.0100,
  },
  {
    id: "claude_opus_46",
    name: "Claude Opus 4.6",
    provider: "Anthropic",
    minPlan: "proplus",
    openRouterId: "anthropic/claude-opus-4.6",
    description: "The absolute highest level of Claude intelligence.",
    supportsVision: true,
    reasoning: "effort_budget",
    costPerMessage: 0.0150,
  },
];

// Resolves either an internal PreferredModel id or a provider (OpenRouter) id.
// Returns null when unknown — never silently defaults to another model.
export function getModelEntry(id: string | undefined | null): ModelEntry | null {
  if (!id || id === "auto") return null;
  return (
    MODEL_REGISTRY.find((m) => m.id === id) ??
    MODEL_REGISTRY.find((m) => m.openRouterId === id) ??
    null
  );
}

export function chainForPreferredModel(id: string | undefined | null): ProviderCall[] | null {
  const entry = getModelEntry(id);
  if (!entry) return null;
  // Exactly the selected model — no substitutions. Alternate slugs of the
  // SAME model are appended so upstream free-tier rate limits don't hard-fail.
  return [
    { provider: "openrouter", model: entry.openRouterId },
    ...(entry.variantIds ?? []).map((model) => ({ provider: "openrouter" as const, model })),
  ];
}

export function getFriendlyName(modelId: string | undefined): string | null {
  if (!modelId) return null;
  const entry = getModelEntry(modelId);
  return entry ? entry.name : modelId;
}

