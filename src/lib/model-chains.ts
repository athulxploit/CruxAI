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

export type ProviderId = "lovable" | "groq" | "gemini" | "openrouter";
export interface ProviderCall { provider: ProviderId; model: string; }
export type Effort = "low" | "medium" | "high" | "ultra" | "max";

// Lovable AI Gateway — always funded, always available. Prepended to every
// chain so failover has a reliable primary even when third-party keys are
// rate-limited, exhausted, or rejected.
const LOVABLE_PRIMARY: ProviderCall = { provider: "lovable", model: "google/gemini-3-flash-preview" };
const LOVABLE_PRO: ProviderCall = { provider: "lovable", model: "google/gemini-2.5-pro" };

// Global fallback (used by any agent without an override).
export const DEFAULT_CHAINS: Record<Effort, ProviderCall[]> = {
  low: [
    LOVABLE_PRIMARY,
    { provider: "groq",       model: "llama-3.1-8b-instant" },
    { provider: "gemini",     model: "gemini-2.0-flash" },
    { provider: "openrouter", model: "qwen/qwen3-32b" },
  ],
  medium: [
    LOVABLE_PRIMARY,
    { provider: "groq",       model: "llama-3.3-70b-versatile" },
    { provider: "gemini",     model: "gemini-2.0-flash" },
    { provider: "openrouter", model: "qwen/qwen3-32b" },
  ],
  high: [
    LOVABLE_PRIMARY,
    { provider: "gemini",     model: "gemini-2.0-flash" },
    { provider: "groq",       model: "openai/gpt-oss-120b" },
    { provider: "openrouter", model: "qwen/qwen3-32b" },
  ],
  ultra: [
    LOVABLE_PRO,
    LOVABLE_PRIMARY,
    { provider: "gemini",     model: "gemini-2.0-flash" },
    { provider: "groq",       model: "openai/gpt-oss-120b" },
    { provider: "openrouter", model: "qwen/qwen3-32b" },
  ],
  max: [
    LOVABLE_PRO,
    LOVABLE_PRIMARY,
    { provider: "gemini",     model: "gemini-2.0-flash" },
    { provider: "openrouter", model: "qwen/qwen3-32b" },
    { provider: "groq",       model: "openai/gpt-oss-120b" },
  ],
};

// Per-agent baked defaults. Missing entries fall back to DEFAULT_CHAINS.
// New agents can be added here (or in the DB) without changing routing logic.
export const AGENT_DEFAULT_CHAINS: Record<string, Partial<Record<Effort, ProviderCall[]>>> = {
  "forge-1": {
    low: [
      { provider: "gemini",     model: "gemini-2.0-flash" },
      { provider: "groq",       model: "llama-3.3-70b-versatile" },
      { provider: "openrouter", model: "qwen/qwen3-32b" },
    ],
    medium: [
      { provider: "gemini",     model: "gemini-2.0-flash" },
      { provider: "groq",       model: "openai/gpt-oss-120b" },
      { provider: "openrouter", model: "qwen/qwen3-32b" },
    ],
    high: [
      { provider: "groq",       model: "openai/gpt-oss-120b" },
      { provider: "gemini",     model: "gemini-2.0-flash" },
      { provider: "openrouter", model: "qwen/qwen3-32b" },
    ],
    ultra: [
      { provider: "gemini",     model: "gemini-2.0-flash" },
      { provider: "groq",       model: "openai/gpt-oss-120b" },
      { provider: "openrouter", model: "qwen/qwen3-32b" },
    ],
    max: [
      { provider: "gemini",     model: "gemini-2.0-flash" },
      { provider: "openrouter", model: "qwen/qwen3-32b" },
      { provider: "groq",       model: "openai/gpt-oss-120b" },
    ],
  },
  "cipher-1": {
    low: [
      { provider: "groq",       model: "llama-3.3-70b-versatile" },
      { provider: "gemini",     model: "gemini-2.0-flash" },
      { provider: "openrouter", model: "qwen/qwen3-32b" },
    ],
    medium: [
      { provider: "groq",       model: "openai/gpt-oss-120b" },
      { provider: "gemini",     model: "gemini-2.0-flash" },
      { provider: "openrouter", model: "qwen/qwen3-32b" },
    ],
    high: [
      { provider: "gemini",     model: "gemini-2.0-flash" },
      { provider: "groq",       model: "openai/gpt-oss-120b" },
      { provider: "openrouter", model: "qwen/qwen3-32b" },
    ],
    ultra: [
      { provider: "gemini",     model: "gemini-2.0-flash" },
      { provider: "groq",       model: "openai/gpt-oss-120b" },
      { provider: "openrouter", model: "qwen/qwen3-32b" },
    ],
    max: [
      { provider: "gemini",     model: "gemini-2.0-flash" },
      { provider: "openrouter", model: "qwen/qwen3-32b" },
      { provider: "groq",       model: "openai/gpt-oss-120b" },
    ],
  },
};

const EFFORTS: Effort[] = ["low", "medium", "high", "ultra", "max"];
const VALID_PROVIDERS: ProviderId[] = ["lovable", "groq", "gemini", "openrouter"];

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
  let chain: ProviderCall[];
  if (a && map[`chain:${a}:${effort}`]) chain = map[`chain:${a}:${effort}`];
  else if (map[`chain:${effort}`]) chain = map[`chain:${effort}`];
  else {
    const agentBaked = a ? AGENT_DEFAULT_CHAINS[a]?.[effort] : undefined;
    chain = agentBaked ?? DEFAULT_CHAINS[effort];
  }
  // Guarantee Lovable AI Gateway is the primary. Reliable + funded, so no
  // per-user quota failures from third-party keys ever cause a hard error.
  if (chain[0]?.provider !== "lovable") {
    chain = [LOVABLE_PRIMARY, ...chain];
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
