export interface AgentConfig {
  id: string;
  enabled: boolean;
  maintenance: boolean;
}

export interface AgentsConfigState {
  configs: Record<string, AgentConfig>;
  error: string | null;
  loading: boolean;
}

export function useAgentsConfigState(): AgentsConfigState {
  return { configs: {}, error: null, loading: false };
}

export function useAgentsConfig() {
  return {};
}

export function isAgentAvailable() {
  return { ok: true };
}

export function diagnoseAgent() {
  return { ok: true };
}
