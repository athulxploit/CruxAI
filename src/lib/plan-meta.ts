export type PlanId = "free" | "standard" | "pro" | "proplus";

export const PLAN_ORDER: PlanId[] = ["free", "standard", "pro", "proplus"];

export const PLAN_META: Record<PlanId, {
  label: string;
  short: string;
  blurb: string;
  perks: string[];
}> = {
  free: {
    label: "Free",
    short: "Free",
    blurb: "The essentials to get started.",
    perks: ["Core agents", "Standard limits", "FLUX.1 schnell images"],
  },
  standard: {
    label: "Standard",
    short: "Standard",
    blurb: "More headroom for daily work.",
    perks: ["Higher daily limits", "Faster queue", "SD 3.5 Large images"],
  },
  pro: {
    label: "Pro",
    short: "Pro",
    blurb: "Professional-grade reasoning and tooling.",
    perks: ["Priority access", "Extended context", "GPT Image 2"],
  },
  proplus: {
    label: "Pro+",
    short: "Pro+",
    blurb: "Everything Metrixcom can do, uncapped.",
    perks: ["Highest limits", "Top-tier models", "Gemini 3 Pro Image"],
  },
};

export function normalizePlan(plan: string | null | undefined): PlanId {
  const p = (plan ?? "free").toLowerCase();
  return (PLAN_ORDER as string[]).includes(p) ? (p as PlanId) : "free";
}

export function planRank(plan: string | null | undefined): number {
  return PLAN_ORDER.indexOf(normalizePlan(plan));
}

export function planLabel(plan: string | null | undefined): string {
  return PLAN_META[normalizePlan(plan)].label;
}
