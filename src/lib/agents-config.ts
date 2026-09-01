import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AgentId } from "./agents";

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
  const [state, setState] = useState<AgentsConfigState>({
    configs: {},
    error: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      // Try direct table read first (admins can read all columns).
      const direct = await supabase
        .from("agents_config")
        .select("id, enabled, maintenance");
      if (!mounted) return;
      if (!direct.error && direct.data && direct.data.length > 0) {
        const map: Record<string, AgentConfig> = {};
        for (const row of direct.data) map[row.id] = row as AgentConfig;
        setState({ configs: map, error: null, loading: false });
        return;
      }
      // Non-admin fallback: SECURITY DEFINER RPC exposing only safe columns.
      const rpc = await supabase.rpc("list_agents_public");
      if (!mounted) return;
      if (rpc.error) {
        setState((s) => ({ ...s, error: rpc.error.message, loading: false }));
        return;
      }
      const map: Record<string, AgentConfig> = {};
      for (const row of (rpc.data ?? []) as { id: string; enabled: boolean; maintenance: boolean }[]) {
        map[row.id] = { id: row.id, enabled: row.enabled, maintenance: row.maintenance };
      }
      setState({ configs: map, error: null, loading: false });
    }

    load();
    const ch = supabase.channel(`agents-config-live-${Math.random().toString(36).slice(2)}`);
    ch.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "agents_config" },
      load,
    ).subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  return state;
}

// Backwards-compatible hook returning only the map.
export function useAgentsConfig() {
  return useAgentsConfigState().configs;
}

export type BlockReason = "maintenance" | "disabled" | "config-missing" | "fetch-error";

export interface Availability {
  ok: boolean;
  reason?: BlockReason;
  field?: "maintenance" | "enabled" | null;
  value?: boolean | null;
  detail?: string;
}

export function isAgentAvailable(
  configs: Record<string, AgentConfig>,
  id: AgentId,
): Availability {
  const c = configs[id];
  // Missing row: treat as available but expose reason for debug UI.
  if (!c) return { ok: true, reason: "config-missing", field: null, value: null };
  if (c.maintenance === true)
    return { ok: false, reason: "maintenance", field: "maintenance", value: true };
  if (c.enabled === false)
    return { ok: false, reason: "disabled", field: "enabled", value: false };
  return { ok: true };
}

// Diagnostic info about an agent (does not necessarily block).
export function diagnoseAgent(
  state: AgentsConfigState,
  id: AgentId,
): Availability {
  if (state.error) {
    return {
      ok: false,
      reason: "fetch-error",
      field: null,
      value: null,
      detail: state.error,
    };
  }
  return isAgentAvailable(state.configs, id);
}
