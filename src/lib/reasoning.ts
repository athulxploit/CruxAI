// Real reasoning-capability system.
//
// Capability is declared per model in the model registry and was derived from
// OpenRouter's `supported_parameters` for each model id, then verified with a
// live request per level. We NEVER send a reasoning parameter to a model that
// does not advertise support for it.
//
// Modes:
//   "none"          — model has no reasoning parameter. No control is shown.
//   "toggle"        — model supports `reasoning: { enabled }` only (no effort).
//   "effort"        — model supports `reasoning: { effort: low|medium|high }`.
//   "effort_xhigh"  — as "effort", plus the provider-accepted `xhigh` step.
//   "effort_budget" — as "effort", plus a token-budget step for "max"
//                     (`reasoning: { max_tokens }`, Anthropic-style thinking budget).

export type ReasoningMode =
  | "none"
  | "toggle"
  | "effort"
  | "effort_xhigh"
  | "effort_budget";

export type ReasoningLevel = "off" | "on" | "low" | "medium" | "high" | "max";

export const REASONING_META: Record<ReasoningLevel, { label: string; hint: string }> = {
  off: { label: "Off", hint: "No extra reasoning pass — fastest replies." },
  on: { label: "On", hint: "Model reasons before answering." },
  low: { label: "Low", hint: "Brief reasoning · low latency." },
  medium: { label: "Medium", hint: "Balanced reasoning depth." },
  high: { label: "High", hint: "Extended reasoning · slower." },
  max: { label: "Max", hint: "Maximum reasoning budget · slowest." },
};

const LEVELS_BY_MODE: Record<ReasoningMode, ReasoningLevel[]> = {
  none: [],
  toggle: ["off", "on"],
  effort: ["off", "low", "medium", "high"],
  effort_xhigh: ["off", "low", "medium", "high", "max"],
  effort_budget: ["off", "low", "medium", "high", "max"],
};

export function reasoningLevelsFor(mode: ReasoningMode | undefined): ReasoningLevel[] {
  return LEVELS_BY_MODE[mode ?? "none"];
}

export function supportsReasoning(mode: ReasoningMode | undefined): boolean {
  return reasoningLevelsFor(mode).length > 0;
}

/** Clamps a level to what the given model actually supports. */
export function adaptReasoningLevel(
  mode: ReasoningMode | undefined,
  level: ReasoningLevel,
): ReasoningLevel {
  const levels = reasoningLevelsFor(mode);
  if (levels.length === 0) return "off";
  if (levels.includes(level)) return level;
  // Nearest supported step, degrading downwards, never upgrading silently.
  const order: ReasoningLevel[] = ["max", "high", "medium", "low", "on", "off"];
  const from = order.indexOf(level);
  for (let i = from; i < order.length; i++) {
    if (levels.includes(order[i])) return order[i];
  }
  return "off";
}

/**
 * Maps a level to the provider's actual reasoning configuration.
 * Returns null when nothing should be sent (unsupported model or "off" on a
 * model where omitting the parameter is the correct off-state).
 */
export function buildReasoningParam(
  mode: ReasoningMode | undefined,
  level: ReasoningLevel,
): Record<string, unknown> | null {
  const levels = reasoningLevelsFor(mode);
  if (levels.length === 0 || !levels.includes(level)) return null;
  if (level === "off") return { enabled: false };
  if (level === "on") return { enabled: true };
  if (level === "max") {
    if (mode === "effort_xhigh") return { effort: "xhigh" };
    if (mode === "effort_budget") return { max_tokens: 16384 };
    return { effort: "high" };
  }
  return { effort: level };
}
