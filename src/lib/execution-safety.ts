import { store } from "./app-store";

export type RiskLevel = "low" | "medium" | "high";

export interface ExecutionAction {
  id: string;
  type: string;
  label: string;
  risk: RiskLevel;
  detail?: string;
}

const RISK_LEVELS: Record<string, RiskLevel> = {
  "file_read": "low",
  "file_create": "low",
  "file_modify": "medium",
  "file_delete": "high",
  "terminal_cmd": "high",
  "package_install": "medium",
  "config_modify": "medium",
  "security_scan": "medium",
  "credential_access": "high",
};

export async function checkExecutionPermission(action: ExecutionAction): Promise<boolean> {
  // Simple tasks don't need confirmation
  if (action.risk === "low") return true;

  // Medium and High risk tasks require explicit user approval via a global event/state
  // In a real app, this would trigger a UI modal.
  // For this implementation, we will simulate the permission check architecture.
  console.log(`[Permission Check] Risk: ${action.risk.toUpperCase()} | Action: ${action.label}`);
  
  if (action.risk === "high") {
    // High risk always asks
    return window.confirm(`Metrixcom Engine needs permission to: ${action.label}\n\n${action.detail || "This is a high-risk operation."}`);
  }

  // Medium risk might be auto-approved depending on user settings (future)
  return true;
}
