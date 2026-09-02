// Top-level Crux AI workspace mode. Deliberately independent from model
// selection (`intelligence.preferred_model`) and from agent/effort state.

import { MessageSquare, Briefcase, type LucideIcon } from "lucide-react";

export type WorkspaceMode = "chat" | "work";

export interface WorkspaceModeMeta {
  id: WorkspaceMode;
  label: string;
  short: string;
  hint: string;
  icon: LucideIcon;
  placeholder: string;
  /** Composer capabilities enabled for this mode. */
  tools: {
    attachments: boolean;
    images: boolean;
    webSearch: boolean;
    deepResearch: boolean;
    plugins: boolean;
    computer: boolean;
    archMode: boolean;
  };
}

export const WORKSPACE_MODES: readonly WorkspaceModeMeta[] = [
  {
    id: "chat",
    label: "Chat",
    short: "Chat",
    hint: "Fast, lightweight conversation",
    icon: MessageSquare,
    placeholder: "Ask Crux anything…",
    tools: {
      attachments: true,
      images: true,
      webSearch: false,
      deepResearch: false,
      plugins: false,
      computer: false,
      archMode: false,
    },
  },
  {
    id: "work",
    label: "Work",
    short: "Work",
    hint: "Research, documents, projects and workflows",
    icon: Briefcase,
    placeholder: "Describe the research, document or workflow to work on…",
    tools: {
      attachments: true,
      images: true,
      webSearch: true,
      deepResearch: true,
      plugins: true,
      computer: false,
      archMode: false,
    },
  },
] as const;

export const DEFAULT_WORKSPACE_MODE: WorkspaceMode = "chat";

export function getModeMeta(mode: WorkspaceMode): WorkspaceModeMeta {
  return WORKSPACE_MODES.find((m) => m.id === mode) ?? WORKSPACE_MODES[0];
}

export function isWorkspaceMode(v: unknown): v is WorkspaceMode {
  return v === "chat" || v === "work";
}

export const WORKSPACE_MODE_STORAGE_KEY = "crux:workspace_mode";
export const WORKSPACE_MODE_EVENT = "crux:workspace_mode";

export function readStoredWorkspaceMode(): WorkspaceMode {
  if (typeof window === "undefined") return DEFAULT_WORKSPACE_MODE;
  try {
    const raw = localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY);
    return isWorkspaceMode(raw) ? raw : DEFAULT_WORKSPACE_MODE;
  } catch {
    return DEFAULT_WORKSPACE_MODE;
  }
}

export function writeStoredWorkspaceMode(mode: WorkspaceMode) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

/** Mode-specific system context appended to the prompt. */
export function workspaceModeContext(mode: WorkspaceMode): string {
  switch (mode) {
    case "work":
      return [
        "════ WORK MODE ════",
        "The user is in Work mode: research, projects, documents, workflows and advanced task execution.",
        "- Prefer structured deliverables: briefs, outlines, tables, checklists, step plans.",
        "- Cite sources when web search or research results are present.",
        "- Track project state across turns and surface the single most useful next action.",
        "════ END WORK MODE ════",
      ].join("\n");
    case "chat":
    default:
      return [
        "════ CHAT MODE ════",
        "The user is in Chat mode: lightweight conversation. Keep answers direct and appropriately brief.",
        "Do not produce project scaffolding, long plans or heavy documents unless explicitly asked.",
        "════ END CHAT MODE ════",
      ].join("\n");
  }
}
