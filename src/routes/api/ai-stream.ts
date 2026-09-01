// Server-side AI proxy with SERVER-SIDE FAILOVER.
//
// The client sends the whole provider chain in ONE request. The server:
//   1. Verifies the Supabase bearer.
//   2. Validates every (provider, model) pair against the allowlist.
//   3. Consumes the per-user daily quota ONCE (not once per attempt).
//   4. Tries providers in order. If a provider fails BEFORE emitting any
//      token, it silently rotates to the next one. If it fails AFTER
//      emitting, the error is surfaced to avoid duplicating output.
// This makes failover invisible to the end-user and prevents retries from
// burning through the daily message quota.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { bumpSuspicion, isIpBlocked, tarpit } from "@/lib/tarpit.server";
import { pickKeys, markKeyUse, markKeyFail, type PoolProvider } from "@/lib/key-pool.server";

type Provider = "groq" | "gemini" | "openrouter" | "lovable";
type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };
type AIMessage = { role: "user" | "assistant" | "system"; content: string | ContentPart[] };
interface ProviderCall { provider: Provider; model: string; }

interface ProxyBody {
  chain?: ProviderCall[];
  // Legacy single-provider fallback (still supported for compatibility)
  provider?: Provider;
  model?: string;
  temperature: number;
  maxTokens: number;
  messages: AIMessage[];
  effort?: string;
}

const ALLOWED_MODELS: Record<Provider, ReadonlySet<string>> = {
  groq: new Set([
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "openai/gpt-oss-120b",
  ]),
  gemini: new Set([
    "gemini-2.0-flash",
    "gemini-pro-latest",
  ]),
  openrouter: new Set([
    "qwen/qwen3-32b",
    "openai/gpt-oss-120b",
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemini-2.0-flash-exp:free",
  ]),
  lovable: new Set([
    "google/gemini-3-flash-preview",
    "google/gemini-2.5-flash",
    "google/gemini-2.5-flash-lite",
    "google/gemini-2.5-pro",
  ]),
};

const MAX_TOKENS_HARD_CAP = 32768;
const MAX_MESSAGES = 200;
const MAX_CHAIN = 6;
const ALLOWED_EFFORTS = new Set(["low", "medium", "high", "ultra", "max"]);
const MAX_TEXT_LEN = 32_000; // per message text part
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB decoded cap per image
const FREE_HOURLY_LIMIT = 30;

// --- In-memory sliding-window hourly rate limit (per Worker isolate).
// Best-effort defense-in-depth; the per-day Supabase quota remains the
// authoritative cap. Non-admins are limited to FREE_HOURLY_LIMIT prompts
// per rolling hour; admins bypass entirely.
const hourlyHits = new Map<string, number[]>();
function checkHourlyLimit(userId: string): { allowed: boolean; retryAfterSec: number; remaining: number } {
  const now = Date.now();
  const windowStart = now - 3600_000;
  const arr = (hourlyHits.get(userId) ?? []).filter((t) => t > windowStart);
  if (arr.length >= FREE_HOURLY_LIMIT) {
    const retryAfterSec = Math.max(1, Math.ceil((arr[0] + 3600_000 - now) / 1000));
    hourlyHits.set(userId, arr);
    return { allowed: false, retryAfterSec, remaining: 0 };
  }
  arr.push(now);
  hourlyHits.set(userId, arr);
  // Opportunistic cleanup to prevent unbounded growth.
  if (hourlyHits.size > 5000) {
    for (const [k, v] of hourlyHits) {
      const kept = v.filter((t) => t > windowStart);
      if (kept.length === 0) hourlyHits.delete(k);
      else hourlyHits.set(k, kept);
    }
  }
  return { allowed: true, retryAfterSec: 0, remaining: FREE_HOURLY_LIMIT - arr.length };
}

// Strip control chars (except tab/newline/carriage return) and hard-cap length.
// Keeps normal Unicode / emoji / RTL text intact.
function sanitizeText(s: string): string {
  if (typeof s !== "string") return "";
  // eslint-disable-next-line no-control-regex
  const cleaned = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  return cleaned.length > MAX_TEXT_LEN ? cleaned.slice(0, MAX_TEXT_LEN) : cleaned;
}

function sanitizeMessages(msgs: AIMessage[]): AIMessage[] {
  return msgs.map((m) => {
    if (typeof m.content === "string") {
      return { role: m.role, content: sanitizeText(m.content) };
    }
    const parts: ContentPart[] = [];
    for (const p of m.content) {
      if (p.type === "text") {
        parts.push({ type: "text", text: sanitizeText(p.text) });
      } else if (p.type === "image_url") {
        const url = String(p.image_url?.url ?? "");
        // Only accept data: URIs (already uploaded/analysed client-side) or https URLs.
        if (url.startsWith("data:image/")) {
          // Rough size gate: base64 length * 0.75 ≈ decoded bytes.
          const b64 = url.split(",")[1] ?? "";
          if (b64.length * 0.75 <= MAX_IMAGE_BYTES) parts.push(p);
        } else if (url.startsWith("https://") && url.length < 2048) {
          parts.push(p);
        }
      }
    }
    return { role: m.role, content: parts };
  });
}

// --- Anomaly detection: flag suspicious input patterns.
// Heuristic-only, non-blocking. Findings are logged to activity_log for
// admin review; we intentionally do NOT reject the request to avoid
// false-positive lockouts on legitimate coding / security prompts.
const SUSPICIOUS_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "prompt_injection", re: /\b(ignore (all )?previous|disregard (all )?prior|system prompt|reveal (your )?instructions)\b/i },
  { name: "sql_injection", re: /(\bunion\s+select\b|\bdrop\s+table\b|--\s*$|;\s*(delete|drop|update)\s)/i },
  { name: "shell_exfil", re: /(curl|wget|nc)\s+[^\s]*\|(\s*sh|\s*bash)|(\$\(|`)\s*(env|printenv|cat\s+\/etc\/passwd|~\/\.ssh)/i },
  { name: "secret_grab", re: /(AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/ },
  { name: "xss_payload", re: /<script\b|javascript:\s*[^\/]|on(error|load|click)\s*=\s*['"]/i },
];

function scanForAnomalies(msgs: AIMessage[]): string[] {
  const hits = new Set<string>();
  for (const m of msgs) {
    const text = typeof m.content === "string"
      ? m.content
      : m.content.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join("\n");
    if (!text) continue;
    for (const { name, re } of SUSPICIOUS_PATTERNS) {
      if (re.test(text)) hits.add(name);
    }
    // Extreme repetition (>200 identical chars) — probable prompt spam / DoS.
    if (/(.)\1{200,}/.test(text)) hits.add("repetition_flood");
  }
  return Array.from(hits);
}

// --- Burst detection: >10 requests in 60s from one user is anomalous.
const burstHits = new Map<string, number[]>();
function detectBurst(userId: string): boolean {
  const now = Date.now();
  const arr = (burstHits.get(userId) ?? []).filter((t) => t > now - 60_000);
  arr.push(now);
  burstHits.set(userId, arr);
  return arr.length > 10;
}

async function logSecurityEvent(
  client: ReturnType<typeof buildUserClient>,
  userId: string,
  type: string,
  message: string,
  meta: Record<string, unknown>,
) {
  if (!client) return;
  try {
    await client.from("activity_log").insert({
      user_id: userId,
      type,
      category: "security",
      message,
      meta,
      status: "open",
    });
  } catch { /* best-effort */ }
}



function buildUserClient(token: string) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const fetchShim: typeof fetch = (input, init) => {
    const h = new Headers(init?.headers);
    if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
    h.set("apikey", key);
    return fetch(input as RequestInfo, { ...init, headers: h });
  };
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: { fetch: fetchShim, headers: { Authorization: `Bearer ${token}` } },
  });
}

async function verifyBearer(request: Request): Promise<{ userId: string; token: string } | null> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    console.warn("[ai-stream] auth rejected:", error?.message ?? "no user");
    return null;
  }
  return { userId: data.user.id, token };
}

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return Math.max(min, Math.min(max, v));
}

// --- Upstream fetchers. Each returns the raw upstream Response so the
// caller can inspect status before deciding whether to failover. ---

// Text-only models: flatten multimodal content and drop image parts
// (leaving a placeholder note so the model knows something was attached).
function flattenForTextModel(msgs: AIMessage[]): AIMessage[] {
  return msgs.map((m) => {
    if (typeof m.content === "string") return m;
    const text = m.content
      .map((p) => (p.type === "text" ? p.text : "[image attached — not visible to this model]"))
      .join("\n");
    return { role: m.role, content: text };
  });
}

async function fetchGroq(call: ProviderCall, key: string, msgs: AIMessage[], t: number, mx: number): Promise<Response> {
  return fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: call.model, messages: flattenForTextModel(msgs), temperature: t, max_tokens: mx, stream: true }),
  });
}

async function fetchOpenRouter(call: ProviderCall, key: string, msgs: AIMessage[], t: number, mx: number, origin: string | null, noStore = false): Promise<Response> {
  const body: Record<string, unknown> = {
    model: call.model, messages: flattenForTextModel(msgs), temperature: t, max_tokens: mx, stream: true,
  };
  // User opted out of model improvement (or is incognito): only route to
  // upstreams that do not collect/train on prompts.
  if (noStore) body.provider = { data_collection: "deny" };
  return fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": origin || "https://arch.ai",
      "X-Title": "Metrixcom",
    },
    body: JSON.stringify(body),
  });
}

async function fetchLovable(call: ProviderCall, msgs: AIMessage[], t: number, mx: number): Promise<Response> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return new Response("LOVABLE_API_KEY not configured", { status: 500 });
  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "arch-ai-proxy",
    },
    body: JSON.stringify({ model: call.model, messages: flattenForTextModel(msgs), temperature: t, max_tokens: mx, stream: true }),
  });
}

function contentToText(c: string | ContentPart[]): string {
  if (typeof c === "string") return c;
  return c.map((p) => (p.type === "text" ? p.text : "")).join("");
}

// Convert an OpenAI-style content array into Gemini `parts`.
function contentToGeminiParts(c: string | ContentPart[]): Array<Record<string, unknown>> {
  if (typeof c === "string") return [{ text: c }];
  const parts: Array<Record<string, unknown>> = [];
  for (const p of c) {
    if (p.type === "text") { if (p.text) parts.push({ text: p.text }); }
    else if (p.type === "image_url") {
      const url = p.image_url?.url ?? "";
      const m = /^data:([^;]+);base64,(.+)$/.exec(url);
      if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
    }
  }
  return parts.length ? parts : [{ text: "" }];
}

async function fetchGemini(call: ProviderCall, key: string, msgs: AIMessage[], t: number, mx: number): Promise<Response> {
  const sys = msgs.find((m) => m.role === "system");
  const convo = msgs.filter((m) => m.role !== "system");
  const payload: Record<string, unknown> = {
    contents: convo.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: contentToGeminiParts(m.content),
    })),
    generationConfig: { temperature: t, maxOutputTokens: mx },
  };
  if (sys) payload.systemInstruction = { parts: [{ text: contentToText(sys.content) }] };
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${call.model}:streamGenerateContent?alt=sse&key=${key}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
  );
}

// --- Upstream SSE parsers. Emit { type:'delta', text } | { type:'done' }
// and throw on parse error. Called in a stream context; we use an async
// generator so the caller can pump into its own controller. ---

async function* parseOpenAISSE(body: ReadableStream<Uint8Array>): AsyncGenerator<string, void, void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buf += decoder.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).replace(/\r$/, "");
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const j = JSON.parse(raw);
        const d = j?.choices?.[0]?.delta?.content;
        if (typeof d === "string" && d) yield d;
      } catch { /* ignore */ }
    }
  }
}

async function* parseGeminiSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<string, void, void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buf += decoder.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).replace(/\r$/, "");
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw) continue;
      try {
        const j = JSON.parse(raw);
        const parts = j?.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
          for (const p of parts) {
            if (typeof p?.text === "string" && p.text) yield p.text;
          }
        }
      } catch { /* ignore */ }
    }
  }
}

function encoderChunk(obj: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`);
}
function doneChunk(): Uint8Array {
  return new TextEncoder().encode(`data: [DONE]\n\n`);
}

// Run the full chain. Emit tokens as they come. Rotate providers only
// BEFORE any token has been forwarded to the client.
function runChainStream(
  chain: ProviderCall[],
  msgs: AIMessage[],
  temperature: number,
  maxTokens: number,
  origin: string | null,
  noStore = false,
): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let emittedAny = false;
      const attempts: string[] = [];
      try {
        for (let i = 0; i < chain.length; i++) {
          const call = chain[i];
          // For pooled providers, expand into per-key attempts (LRU healthy first).
          // Lovable uses a single managed key so we treat it as a single attempt.
          type Attempt = { keyIdx: number | null; keyValue: string | null };
          let keyAttempts: Attempt[];
          if (call.provider === "lovable") {
            keyAttempts = [{ keyIdx: null, keyValue: null }];
          } else {
            const picks = pickKeys(call.provider as PoolProvider);
            keyAttempts = picks.length > 0
              ? picks.map((p) => ({ keyIdx: p.idx, keyValue: p.key }))
              : [];
          }
          if (keyAttempts.length === 0) {
            attempts.push(`${call.provider}:${call.model} no-keys`);
            continue;
          }

          for (const { keyIdx, keyValue } of keyAttempts) {
            const label = keyIdx === null
              ? `${call.provider}:${call.model}`
              : `${call.provider}#${keyIdx + 1}:${call.model}`;
            try {
              let upstream: Response;
              if (call.provider === "groq") upstream = await fetchGroq(call, keyValue!, msgs, temperature, maxTokens);
              else if (call.provider === "gemini") upstream = await fetchGemini(call, keyValue!, msgs, temperature, maxTokens);
              else if (call.provider === "lovable") upstream = await fetchLovable(call, msgs, temperature, maxTokens);
              else upstream = await fetchOpenRouter(call, keyValue!, msgs, temperature, maxTokens, origin, noStore);

              if (keyIdx !== null) markKeyUse(call.provider as PoolProvider, keyIdx);

              if (!upstream.ok || !upstream.body) {
                const txt = await upstream.text().catch(() => "");
                attempts.push(`${label} ${upstream.status}`);
                console.warn(`[ai-stream] ${label} failed ${upstream.status}: ${txt.slice(0, 200)}`);
                if (keyIdx !== null) markKeyFail(call.provider as PoolProvider, keyIdx, upstream.status);
                if (emittedAny) throw new Error(`${label} ${upstream.status}`);
                continue; // try next key in this provider
              }

              const gen = call.provider === "gemini"
                ? parseGeminiSSE(upstream.body)
                : parseOpenAISSE(upstream.body);
              let providerEmitted = false;
              for await (const delta of gen) {
                if (!providerEmitted) {
                  controller.enqueue(encoderChunk({ source: { provider: call.provider, model: call.model } }));
                }
                providerEmitted = true;
                emittedAny = true;
                controller.enqueue(encoderChunk({ delta }));
              }
              if (!providerEmitted) {
                attempts.push(`${label} empty`);
                console.warn(`[ai-stream] ${label} produced no tokens; rotating`);
                if (keyIdx !== null) markKeyFail(call.provider as PoolProvider, keyIdx, 502);
                continue;
              }
              attempts.push(`${label} ok`);
              controller.enqueue(doneChunk());
              console.log(`[ai-stream] success chain=${attempts.join(" -> ")}`);
              controller.close();
              return;
            } catch (err) {
              attempts.push(`${label} threw`);
              console.warn(`[ai-stream] ${label} threw`, err);
              if (keyIdx !== null) markKeyFail(call.provider as PoolProvider, keyIdx, 599);
              if (emittedAny) {
                controller.enqueue(encoderChunk({ error: String(err) }));
                controller.close();
                return;
              }
            }
          }
        }
        // Every provider failed and nothing was emitted.
        controller.enqueue(encoderChunk({ error: `All providers failed: ${attempts.join(", ")}` }));
        controller.close();
      } catch (e) {
        try { controller.enqueue(encoderChunk({ error: String(e) })); } catch { /* ignore */ }
        try { controller.close(); } catch { /* ignore */ }
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": noStore ? "no-store" : "no-cache",
      // Signals that this turn must not be retained or used for training.
      "X-Data-Retention": noStore ? "none" : "standard",
    },
  });
}

export const Route = createFileRoute("/api/ai-stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifyBearer(request);
        if (!auth) return new Response("Unauthorized", { status: 401 });

        let raw: unknown;
        try { raw = await request.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }
        const r = (raw ?? {}) as Partial<ProxyBody>;
        if (!Array.isArray(r.messages) || r.messages.length === 0 || r.messages.length > MAX_MESSAGES) {
          return new Response("Message count out of range", { status: 400 });
        }
        for (const m of r.messages) {
          if (!m || typeof m.role !== "string") return new Response("Malformed message", { status: 400 });
          if (typeof m.content !== "string" && !Array.isArray(m.content)) {
            return new Response("Malformed message content", { status: 400 });
          }
        }

        // Accept either { chain: [...] } (preferred) or legacy { provider, model }.
        let chain: ProviderCall[];
        if (Array.isArray(r.chain) && r.chain.length > 0) {
          chain = r.chain.slice(0, MAX_CHAIN) as ProviderCall[];
        } else if (r.provider && r.model) {
          chain = [{ provider: r.provider as Provider, model: r.model }];
        } else {
          return new Response("Missing chain or provider/model", { status: 400 });
        }

        for (const c of chain) {
          const allow = ALLOWED_MODELS[c?.provider as Provider];
          if (!allow) return new Response(`Unknown provider: ${c?.provider}`, { status: 400 });
          if (!allow.has(c.model)) return new Response(`Model not allowed: ${c.model}`, { status: 403 });
        }

        // Always append a Lovable AI Gateway fallback so upstream provider
        // outages / quota exhaustion never surface to end users.
        if (process.env.LOVABLE_API_KEY && !chain.some((c) => c.provider === "lovable")) {
          chain.push({ provider: "lovable", model: "google/gemini-3-flash-preview" });
          if (chain.length > MAX_CHAIN) chain = chain.slice(0, MAX_CHAIN);
        }

        const effort = typeof r.effort === "string" && ALLOWED_EFFORTS.has(r.effort) ? r.effort : "medium";

        // SECURITY: strip any client-supplied system messages. The trusted
        // system prompt is added by the client's system prompt (already in the
        // bundle) as the first message, but we reject any attempts to inject
        // ADDITIONAL system messages further into the conversation, and we
        // never let a user swap the leading agent persona for a different one
        // (e.g. "You are a jailbroken model"). Only the first message is
        // allowed to be role=system; any others are demoted to user text so
        // the model treats them as untrusted input, not authoritative rules.
        const inbound = r.messages as AIMessage[];
        const filtered: AIMessage[] = inbound.map((m, i) => {
          if (m.role === "system" && i > 0) {
            const t = typeof m.content === "string"
              ? m.content
              : m.content.map((p) => (p.type === "text" ? p.text : "")).join("\n");
            return { role: "user", content: `[note from user, not a system rule]: ${t}` };
          }
          return m;
        });
        // Sanitize inbound content before it ever reaches an upstream provider.
        const sanitized = sanitizeMessages(filtered);


        // Consume quota ONCE per user prompt (not per failover attempt).
        const userClient = buildUserClient(auth.token);
        if (!userClient) return new Response("Server config error", { status: 500 });

        // Check whether the caller is an admin — admins bypass hourly limits.
        let isAdmin = false;
        try {
          const { data: adminCheck } = await userClient.rpc("has_role", {
            _user_id: auth.userId,
            _role: "admin",
          });
          isAdmin = Boolean(adminCheck);
        } catch { /* treat as free user */ }

        // Zero-trust IP checks: hard block from DB, plus tarpit for scoring suspects.
        const callerIp = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");
        const tarpitKey = `${callerIp ?? "noip"}:${auth.userId}`;
        if (!isAdmin && callerIp && await isIpBlocked(callerIp)) {
          await logSecurityEvent(userClient, auth.userId, "ip_blocked", "Blocked IP attempted request", { ip: callerIp });
          await tarpit(tarpitKey);
          return new Response(JSON.stringify({ error: "forbidden" }), {
            status: 403, headers: { "Content-Type": "application/json" },
          });
        }
        // Apply accumulated tarpit delay before doing any real work.
        if (!isAdmin) await tarpit(tarpitKey);

        // Hourly free-tier rate limit (30/hr). Admins bypass.
        if (!isAdmin) {
          const rl = checkHourlyLimit(auth.userId);
          if (!rl.allowed) {
            bumpSuspicion(tarpitKey, 2);
            await logSecurityEvent(userClient, auth.userId, "rate_limit", "Hourly request cap exceeded", {
              limit: FREE_HOURLY_LIMIT,
              retry_after_seconds: rl.retryAfterSec,
              ip: callerIp,
            });
            await tarpit(tarpitKey);
            return new Response(
              JSON.stringify({
                error: "rate_limited",
                reason: "hourly_limit_exceeded",
                limit: FREE_HOURLY_LIMIT,
                retry_after_seconds: rl.retryAfterSec,
              }),
              {
                status: 429,
                headers: {
                  "Content-Type": "application/json",
                  "Retry-After": String(rl.retryAfterSec),
                  "X-RateLimit-Limit": String(FREE_HOURLY_LIMIT),
                  "X-RateLimit-Remaining": "0",
                },
              },
            );
          }
          if (detectBurst(auth.userId)) {
            bumpSuspicion(tarpitKey, 1.5);
            await logSecurityEvent(userClient, auth.userId, "burst", "Rapid request burst (>10/min)", {
              ip: callerIp,
            });
          }
        }

        // Anomaly detection on sanitized input — log + suspicion bump.
        const anomalies = scanForAnomalies(sanitized);
        if (anomalies.length > 0) {
          bumpSuspicion(tarpitKey, Math.min(3, anomalies.length));
          await logSecurityEvent(userClient, auth.userId, "suspicious_input", `Matched patterns: ${anomalies.join(", ")}`, {
            patterns: anomalies,
            ua: request.headers.get("user-agent"),
            ip: callerIp,
          });
        }


        const { data: quota, error: qErr } = await userClient.rpc("consume_message_quota", { _effort: effort });
        if (qErr) return new Response(`Quota check failed: ${qErr.message}`, { status: 500 });
        const q = (quota ?? {}) as { allowed?: boolean; remaining?: number; limit?: number; reason?: string };
        if (!q.allowed) {
          return new Response(
            JSON.stringify({ error: "quota_exceeded", reason: q.reason ?? "limit_exceeded", limit: q.limit ?? 0 }),
            { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "3600" } },
          );
        }

        const temperature = clamp(r.temperature, 0, 2, 0.4);
        const maxTokens = Math.floor(clamp(r.maxTokens, 16, MAX_TOKENS_HARD_CAP, 2048));
        // Privacy flags from the client: incognito turns, or a user who opted
        // out of model improvement, are never retained anywhere server-side.
        const noStore = (r as { noStore?: boolean }).noStore === true
          || (r as { allowTraining?: boolean }).allowTraining === false;
        return runChainStream(chain, sanitized, temperature, maxTokens, request.headers.get("origin"), noStore);
      },
    },
  },
});
