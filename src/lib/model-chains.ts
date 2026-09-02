// Runtime-configurable provider failover chains.
//
// Model IDs are NOT hardcoded in the router. They are loaded from the
// `model_assignments` table so an admin can change models without a code
// change. Rows use one of two key shapes:
//
//   agent_id = 'chain:<effort>'              -> global default per effort
//   agent_id = 'chain:<agent>:<effort>'      -> per-agent override
//
//   provider = 'chain'                       (sentinel; ignored)
//   model    = JSON string of ProviderCall[]  e.g.
//              '[{"provider":"gemini","model":"gemini-2.0-flash"},
//                {"provider":"groq","model":"openai/gpt-oss-120b"},
//                {"provider":"openrouter","model":"qwen/qwen3-32b"}]'
//
// Resolution order at request time: per-agent row -> global-effort row ->
// per-agent baked default -> global baked default. Adding new agents or
// providers requires no routing-logic change — just insert a row.
import { supabase } from "@/integrations/supabase/client";

export type ProviderId = "groq" | "gemini" | "openrouter";
export interface ProviderCall { provider: ProviderId; model: string; }
export type Effort = "low" | "medium" | "high" | "ultra" | "max";

// Direct provider keys — read from pool in router.
const DIRECT_GPT_4O_MINI: ProviderCall = { provider: "openrouter", model: "openai/gpt-4o-mini" };
const DIRECT_GPT_4O: ProviderCall = { provider: "openrouter", model: "openai/gpt-4o" };
const DIRECT_O3_MINI: ProviderCall = { provider: "openrouter", model: "openai/o3-mini" };
const DIRECT_GEMINI_FLASH: ProviderCall = { provider: "openrouter", model: "google/gemini-2.0-flash-001" };
const DIRECT_GEMINI_PRO: ProviderCall = { provider: "openrouter", model: "google/gemini-pro-1.5" };

// Global fallback (used by any agent without an override).
export const DEFAULT_CHAINS: Record<Effort, ProviderCall[]> = {
  low: [
    DIRECT_GEMINI_FLASH,
    DIRECT_GPT_4O_MINI,
    { provider: "groq",       model: "llama-3.3-70b-versatile" },
  ],
  medium: [
    DIRECT_GEMINI_FLASH,
    DIRECT_GPT_4O_MINI,
    DIRECT_GPT_4O,
  ],
  high: [
    DIRECT_GPT_4O,
    { provider: "openrouter", model: "anthropic/claude-3.5-sonnet" },
    DIRECT_GEMINI_PRO,
  ],
  ultra: [
    DIRECT_O3_MINI,
    { provider: "openrouter", model: "openai/o3-mini" },
    DIRECT_GPT_4O,
  ],
  max: [
    DIRECT_O3_MINI,
    { provider: "openrouter", model: "openai/o3-mini" },
    { provider: "openrouter", model: "anthropic/claude-3.5-sonnet" },
  ],
};

// Per-agent baked defaults. Missing entries fall back to DEFAULT_CHAINS.
// New agents can be added here (or in the DB) without changing routing logic.
export const AGENT_DEFAULT_CHAINS: Record<string, Partial<Record<Effort, ProviderCall[]>>> = {
  "forge-1": {
    low: [
      DIRECT_GEMINI_FLASH,
      { provider: "openrouter", model: "openai/gpt-4o-mini" },
    ],
    medium: [
      DIRECT_GEMINI_FLASH,
      { provider: "openrouter", model: "openai/gpt-4o" },
    ],
    high: [
      { provider: "openrouter", model: "openai/gpt-4o" },
      DIRECT_GEMINI_PRO,
    ],
    ultra: [
      { provider: "openrouter", model: "openai/o3-mini" },
      { provider: "openrouter", model: "openai/gpt-4o" },
    ],
    max: [
      { provider: "openrouter", model: "openai/o3-mini" },
      { provider: "openrouter", model: "openai/gpt-4o" },
    ],
  },
  "cipher-1": {
    low: [
      { provider: "openrouter", model: "openai/gpt-4o-mini" },
      DIRECT_GEMINI_FLASH,
    ],
    medium: [
      { provider: "openrouter", model: "openai/gpt-4o" },
      DIRECT_GEMINI_PRO,
    ],
    high: [
      DIRECT_GEMINI_FLASH,
      { provider: "openrouter", model: "openai/o3-mini" },
    ],
    ultra: [
      { provider: "openrouter", model: "openai/o3-mini" },
      { provider: "openrouter", model: "openai/gpt-4o" },
    ],
    max: [
      { provider: "openrouter", model: "openai/o3-mini" },
      { provider: "openrouter", model: "openai/gpt-4o" },
    ],
  },
};

const EFFORTS: Effort[] = ["low", "medium", "high", "ultra", "max"];
const VALID_PROVIDERS: ProviderId[] = ["groq", "gemini", "openrouter"];

import { loadIntelligence } from "./intelligence";
import { chainForPreferredModel } from "./model-registry";


type ChainMap = Record<string, ProviderCall[]>; // key: `chain:<effort>` or `chain:<agent>:<effort>`

let cache: ChainMap | null = null;
let inflight: Promise<ChainMap> | null = null;
let subscribed = false;

function parseChain(raw: unknown): ProviderCall[] | null {
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const out: ProviderCall[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") return null;
      const p = (item as any).provider;
      const m = (item as any).model;
      if (!VALID_PROVIDERS.includes(p) || typeof m !== "string" || !m) return null;
      out.push({ provider: p, model: m });
    }
    return out;
  } catch { return null; }
}

async function loadFromDb(): Promise<ChainMap> {
  const map: ChainMap = {};
  try {
    const { data, error } = await supabase
      .from("model_assignments" as never)
      .select("agent_id, model")
      .like("agent_id", "chain:%" as never);
    if (error || !data) return map;
    for (const row of data as Array<{ agent_id: string; model: string }>) {
      const chain = parseChain(row.model);
      if (chain) map[row.agent_id] = chain;
    }
  } catch { /* fall through to defaults */ }
  return map;
}

function subscribeInvalidation() {
  if (subscribed) return;
  subscribed = true;
  try {
    supabase
      .channel("model-chains-cache")
      .on("postgres_changes", { event: "*", schema: "public", table: "model_assignments" }, () => {
        cache = null;
        inflight = null;
      })
      .subscribe();
  } catch { /* ignore */ }
}

function resolve(map: ChainMap, agent: string | undefined, effort: Effort): ProviderCall[] {
  const a = (agent || "").toLowerCase();
  
  // User override via Settings > Intelligence > Preferred Model.
  const prefs = loadIntelligence();
  const override = chainForPreferredModel(prefs.preferred_model);
  
  let chain: ProviderCall[];
  if (override) {
    chain = override;
  } else if (a && map[`chain:${a}:${effort}`]) {
    chain = map[`chain:${a}:${effort}`];
  } else if (map[`chain:${effort}`]) {
    chain = map[`chain:${effort}`];
  } else {
    const agentBaked = a ? AGENT_DEFAULT_CHAINS[a]?.[effort] : undefined;
    chain = agentBaked ?? DEFAULT_CHAINS[effort];
  }

  // Ensure high effort levels always use capable models if not already specified.
  if ((effort === "ultra" || effort === "max") && chain.length > 0) {
    // Inject a reasoning/capable model at the front if the current one is low-tier
    const first = chain[0];
    if (first.model.includes("mini") || first.model.includes("nano")) {
      chain = [DIRECT_O3_MINI, ...chain];
    }
  }

  // No Lovable Gateway fallback. Direct providers only.
  if (chain[0]?.provider !== "openrouter" && chain[0]?.provider !== "groq" && chain[0]?.provider !== "gemini") {
    chain = [DIRECT_GPT_4O_MINI, ...chain];
  }

  return chain;
}

export async function getChain(effort: Effort, agent?: string): Promise<ProviderCall[]> {
  subscribeInvalidation();
  if (cache) return resolve(cache, agent, effort);
  if (!inflight) inflight = loadFromDb().then((c) => { cache = c; return c; });
  const c = await inflight;
  return resolve(c, agent, effort);
}

export function getChainSync(effort: Effort, agent?: string): ProviderCall[] {
  return resolve(cache ?? {}, agent, effort);
}

export function refreshChains() { cache = null; inflight = null; }
