import { Sparkle, Code2, ShieldCheck, type LucideIcon } from "lucide-react";

export type AgentId = "pulse-1" | "forge-1" | "cipher-1";
export type CipherMode = "advisor" | "operator";
export type EffortLevel = "low" | "medium" | "high" | "ultra" | "max";

export interface Agent {
  id: AgentId;
  name: string;
  tagline: string;
  description: string;
  capabilities: string[];
  icon: LucideIcon;
  glyph: string;
  accent: string;
}

export const AGENTS: Agent[] = [
  {
    id: "pulse-1",
    name: "Pulse-1",
    tagline: "General intelligence",
    description: "Research, writing, planning, learning and conversation.",
    capabilities: ["Research", "Writing", "Planning", "Learning", "Conversation"],
    icon: Sparkle,
    glyph: "✦",
    accent: "oklch(0.75 0.13 240)",
  },
  {
    id: "forge-1",
    name: "Forge-1",
    tagline: "Software engineering",
    description: "Professional programming, debugging, architecture and code review.",
    capabilities: ["Programming", "Debugging", "Architecture", "Code Review", "Project Generation"],
    icon: Code2,
    glyph: "◐",
    accent: "oklch(0.78 0.1 180)",
  },
  {
    id: "cipher-1",
    name: "Cipher-1",
    tagline: "Cybersecurity",
    description: "Ethical hacking, red team, penetration testing and security research.",
    capabilities: ["Ethical Hacking", "Red Team", "Pentesting", "Security Research"],
    icon: ShieldCheck,
    glyph: "◈",
    accent: "oklch(0.72 0.14 30)",
  },
];

export const EFFORT_LEVELS: EffortLevel[] = ["low", "medium", "high", "ultra", "max"];

export function getAgent(id: AgentId): Agent {
  return AGENTS.find((a) => a.id === id) ?? AGENTS[0];
}
