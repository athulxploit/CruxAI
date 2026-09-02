import { cn } from "@/lib/utils";
import { Sparkle } from "lucide-react";

interface AgentBadgeProps {
  agent: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const SIZES = {
  xs: { box: "h-5 w-5 rounded-md", icon: "h-3 w-3" },
  sm: { box: "h-6 w-6 rounded-lg", icon: "h-3.5 w-3.5" },
  md: { box: "h-8 w-8 rounded-xl", icon: "h-4 w-4" },
} as const;

/** Unified intelligence badge (replaces legacy agent-specific badges). */
export function AgentBadge({ agent, size = "sm", className }: AgentBadgeProps) {
  const s = SIZES[size];
  const accent = "oklch(0.75 0.13 240)";
  return (
    <span
      aria-label="Metrixcom Engine"
      title="Metrixcom Engine"
      className={cn(
        "inline-flex items-center justify-center border shrink-0",
        s.box,
        className,
      )}
      style={{
        backgroundColor: `color-mix(in oklch, ${accent} 14%, transparent)`,
        borderColor: `color-mix(in oklch, ${accent} 32%, transparent)`,
        color: accent,
      }}
    >
      <Sparkle className={s.icon} strokeWidth={2} />
    </span>
  );
}
