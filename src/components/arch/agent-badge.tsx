import { getAgent, type AgentId } from "@/lib/agents";
import { cn } from "@/lib/utils";

interface AgentBadgeProps {
  agent: AgentId;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const SIZES = {
  xs: { box: "h-5 w-5 rounded-md", icon: "h-3 w-3" },
  sm: { box: "h-6 w-6 rounded-lg", icon: "h-3.5 w-3.5" },
  md: { box: "h-8 w-8 rounded-xl", icon: "h-4 w-4" },
} as const;

/** Small tinted tile showing an agent's Lucide icon in its accent color. */
export function AgentBadge({ agent, size = "sm", className }: AgentBadgeProps) {
  const a = getAgent(agent);
  const Icon = a.icon;
  const s = SIZES[size];
  return (
    <span
      aria-label={a.name}
      title={a.name}
      className={cn(
        "inline-flex items-center justify-center border shrink-0",
        s.box,
        className,
      )}
      style={{
        backgroundColor: `color-mix(in oklch, ${a.accent} 14%, transparent)`,
        borderColor: `color-mix(in oklch, ${a.accent} 32%, transparent)`,
        color: a.accent,
      }}
    >
      <Icon className={s.icon} strokeWidth={2} />
    </span>
  );
}
