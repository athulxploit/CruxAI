// src/lib/model-chain.ts
// Effort -> real upstream model id used when the user has no explicit
// model preference. Ids are exactly what the AI gateway accepts.

export const METRIX_MODELS = {
  NANO: "openai/gpt-4o-mini",
  SUPER: "openai/gpt-4o",
  ULTRA: "openai/o3-mini",
} as const;

export type MetrixModel = typeof METRIX_MODELS[keyof typeof METRIX_MODELS];

export function getModelForEffort(effort: string): MetrixModel {
  switch (effort) {
    case "max":
    case "ultra":
      return METRIX_MODELS.ULTRA;
    case "high":
      return METRIX_MODELS.SUPER;
    default:
      return METRIX_MODELS.NANO;
  }
}
