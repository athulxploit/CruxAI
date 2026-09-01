import { Sparkles, Crown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizePlan, PLAN_META } from "@/lib/plan-meta";

/**
 * Small semantic badge showing which plan an account is on.
 * Uses design tokens only — no hardcoded colors.
 */
export function PlanBadge({
  plan,
  className,
  showIcon = true,
}: {
  plan: string | null | undefined;
  className?: string;
  showIcon?: boolean;
}) {
  const id = normalizePlan(plan);
  const meta = PLAN_META[id];
  const Icon = id === "proplus" ? Crown : id === "pro" ? Sparkles : id === "standard" ? Zap : null;

  return (
    <span
      title={meta.blurb}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wider",
        id === "free"
          ? "border-border bg-secondary text-muted-foreground"
          : "border-primary/30 bg-primary/10 text-primary",
        className,
      )}
    >
      {showIcon && Icon && <Icon className="h-3 w-3" />}
      {meta.short}
    </span>
  );
}
