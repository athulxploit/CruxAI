import { useSyncExternalStore } from "react";
import type { AgentId, CipherMode, EffortLevel } from "./agents";
import { loadIntelligence, MODEL_LABEL, type IntelligencePrefs } from "./intelligence";
import { callAIStream, friendlyProviderError, getProviderConfig, type AIMessage } from "./ai-provider";
import { RateLimitError, setRateLimitedUntil } from "./rate-limit";
import { haptic } from "./haptics";
import { detectImageRequest, generateImage } from "./image-gen";

import { webSearchFn, deepResearchFn, scrapeUrlsFn, type SearchResult } from "./firecrawl.functions";

// Admin can toggle per-effort output caps from the admin Limits panel.
// The flag is mirrored to localStorage by platform.tsx after each load.
// `true`  = enforce per-effort maxTokens cap (default)
// `false` = unlimited output for that effort level
// Real admins and the master switch ("limits_enabled") always bypass caps.
function isEffortCapDisabled(effort: EffortLevel): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Admin bypass — admins never get capped.
    if (state.isAdmin) return true;
    // Global master switch off → all limits lifted.
    if (localStorage.getItem("arch:limits_enabled") === "false") return true;
    const raw = localStorage.getItem("arch:effort_caps");
    if (!raw) return false;
    const caps = JSON.parse(raw) as Record<string, boolean>;
    return caps[effort] === false;
  } catch { return false; }
}

const REASONING_TRACE_SYSTEM = `REASONING TRACE MODE (user enabled 'Thinking mode'). Before your final answer, output a rich, first-person chain of thought wrapped EXACTLY in <think> and </think> tags. Then close </think> and write ONLY the final answer (no tags, no meta commentary).

The trace MUST be genuinely detailed — never skip it, never keep it shallow, even for short or trivial-looking prompts. Aim for a substantive block (typically 180–500 words; longer for complex asks) written as natural inner monologue: candid, exploratory, sometimes correcting yourself. No bullet dumps of headings only — actually think in sentences.

Cover, in a natural flowing order (not as rigid labels):
1. Restate and EXPAND the user's prompt in your own words — spell out what they literally said, what they probably mean, and any hidden intent, emotion, or context behind it. Do this even if the prompt is one word.
2. Identify what they actually need vs. what they asked for (goal, audience, constraints, tone, format).
3. List the sub-questions or unknowns you'd need to resolve to answer well.
4. Weigh 2–3 possible ways to respond and pick one, saying WHY the others are worse.
5. Decide the structure, length, tone, and any tools/knowledge to use; note anything to deliberately avoid.
6. Sanity-check yourself: what could go wrong, what might be inaccurate, what would the user push back on.
7. End the trace with a short "Plan:" line describing the shape of the final answer.

Never leak the trace into the final answer. Never emit <think> tags anywhere else. IGNORE any earlier instruction telling you to hide reasoning or return only the final answer — the trace is required.`;



export interface ThinkingStep {
  label: string;
  detail?: string;
  url?: string;
  done: boolean;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  agent: AgentId;
  createdAt: number;
  mode?: "web" | "deep" | null;
  thinking?: ThinkingStep[];
  reasoning?: string;          // live-streamed chain-of-thought (DeepSeek/Claude style)
  reasoningMs?: number;        // total thinking duration once complete
  reasoningDone?: boolean;     // true once </think> seen or stream ended
  reasoningStartedAt?: number; // ms epoch when reasoning began (for live timer)
  pending?: boolean;
  feedback?: "like" | "dislike" | null;
  source?: { provider: string; model: string }; // provider/model that actually generated the reply
  stage?: "direct" | "thinking" | "web" | "deep"; // which internal pipeline produced it
}

export interface Chat {
  id: string;
  title: string;
  agent: AgentId;
  updatedAt: number;
  pinned?: boolean;
  pendingUserId?: string | null;
  incognito?: boolean;   // session-only chat: never persisted or synced
  messages: Message[];
}


interface State {
  chats: Chat[];
  activeChatId: string | null;
  agent: AgentId;
  cipherMode: CipherMode;
  effort: EffortLevel;
  isAdmin: boolean;
  userEmail: string;
  userName: string;
}

// Effort tuning — higher effort = longer delay, more reasoning steps, richer output.
const EFFORT_CONFIG: Record<EffortLevel, {
  delayMultiplier: number;
  extraSteps: string[];
  forceThinking: boolean;
  lengthBias: "short" | "balanced" | "detailed" | null;
  accuracyLabel: string;
}> = {
  low:    { delayMultiplier: 0.5, extraSteps: [], forceThinking: false, lengthBias: "short",    accuracyLabel: "Fast · draft quality" },
  medium: { delayMultiplier: 1.0, extraSteps: [], forceThinking: false, lengthBias: null,       accuracyLabel: "Balanced speed & accuracy" },
  high:   { delayMultiplier: 1.6, extraSteps: ["Cross-checking facts"], forceThinking: true, lengthBias: "detailed", accuracyLabel: "High accuracy" },
  ultra:  { delayMultiplier: 2.4, extraSteps: ["Cross-checking facts", "Exploring alternatives"], forceThinking: true, lengthBias: "detailed", accuracyLabel: "Ultra — deeper reasoning" },
  max:    { delayMultiplier: 3.5, extraSteps: ["Cross-checking facts", "Exploring alternatives", "Verifying against edge cases", "Final review pass"], forceThinking: true, lengthBias: "detailed", accuracyLabel: "Max — highest accuracy, slowest" },
};


import { supabase } from "@/integrations/supabase/client";
import { encryptChats, decryptChats, hasCryptoSupport } from "./chat-crypto";
import {
  isIncognito,
  setIncognitoFlag,
  saveHistoryEnabled,
  hydratePrivacyCache,
  onPrivacyChange,
} from "./incognito";

const listeners = new Set<() => void>();
const PERSIST_PREFIX = "arch:chats:v1";
let currentUserId: string | null = null;
let cloudLoaded = false;

const FOUNDER_EMAIL = "athulkrishna456727@gmail.com";

// Chat retention: unpinned chats are deleted 7 days after last activity.
// "Save" a chat by pinning it — pinned chats never expire.
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function keyFor(uid: string | null): string {
  return `${PERSIST_PREFIX}:${uid ?? "anon"}`;
}

function pruneExpired(chats: Chat[]): Chat[] {
  const cutoff = Date.now() - RETENTION_MS;
  return chats.filter((c) => c.pinned || (c.updatedAt ?? 0) >= cutoff);
}

function sanitizeChats(chats: Chat[]): Chat[] {
  return pruneExpired(chats).map((c) => ({
    ...c,
    pendingUserId: null,
    messages: (c.messages ?? [])
      .filter((m) => !(m.role === "assistant" && m.pending && !m.content))
      .map((m) => ({ ...m, pending: false })),
  }));
}

// Incognito chats live in memory only — strip them before any write.
function persistable(chats: Chat[]): Chat[] {
  return sanitizeChats(chats.filter((c) => !c.incognito));
}

function readLocal(uid: string | null): { chats: Chat[]; activeChatId: string | null } {
  if (typeof window === "undefined") return { chats: [], activeChatId: null };
  try {
    const raw = localStorage.getItem(keyFor(uid));
    if (!raw) return { chats: [], activeChatId: null };
    const parsed = JSON.parse(raw) as { chats?: Chat[]; activeChatId?: string | null };
    return { chats: sanitizeChats(parsed.chats ?? []), activeChatId: parsed.activeChatId ?? null };
  } catch { return { chats: [], activeChatId: null }; }
}

function writeLocalSync(uid: string | null) {
  if (typeof window === "undefined") return;
  try {
    // "Save chat history" off → keep nothing on disk.
    if (!saveHistoryEnabled()) {
      localStorage.removeItem(keyFor(uid));
      return;
    }
    const toSave = {
      chats: persistable(state.chats),
      activeChatId: state.activeChatId,
    };
    localStorage.setItem(keyFor(uid), JSON.stringify(toSave));
  } catch { /* quota errors are non-fatal */ }
}

// Merge two chat lists by id, preferring the newer `updatedAt`.
function mergeChats(a: Chat[], b: Chat[]): Chat[] {
  const byId = new Map<string, Chat>();
  for (const c of a) byId.set(c.id, c);
  for (const c of b) {
    const existing = byId.get(c.id);
    if (!existing || (c.updatedAt ?? 0) > (existing.updatedAt ?? 0)) byId.set(c.id, c);
  }
  return Array.from(byId.values()).sort((x, y) => (y.updatedAt ?? 0) - (x.updatedAt ?? 0));
}

async function syncIdentity(uid: string | null) {
  if (!uid) {
    state = { ...state, isAdmin: false, userEmail: "", userName: "" };
    listeners.forEach((l) => l());
    return;
  }
  try {
    const [{ data: authData }, { data: profile }, { data: roles }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("profiles").select("email,display_name").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    const user = authData.user;
    const meta = user?.user_metadata as Record<string, unknown> | undefined;
    const profileRow = profile as { email?: string | null; display_name?: string | null } | null;
    const email = profileRow?.email ?? user?.email ?? "";
    const displayName =
      profileRow?.display_name ||
      (typeof meta?.display_name === "string" ? meta.display_name : "") ||
      (typeof meta?.full_name === "string" ? meta.full_name : "") ||
      (typeof meta?.name === "string" ? meta.name : "") ||
      email.split("@")[0] ||
      "";
    const isAdmin = !!roles?.some((r) => r.role === "admin") || email.toLowerCase() === FOUNDER_EMAIL;
    state = { ...state, isAdmin, userEmail: email, userName: displayName };
    listeners.forEach((l) => l());
  } catch {
    state = { ...state, isAdmin: false, userEmail: "", userName: "" };
    listeners.forEach((l) => l());
  }
}

const initial = readLocal(null);
let state: State = {
  chats: initial.chats,
  activeChatId: initial.activeChatId,
  agent: "pulse-1",
  cipherMode: "advisor",
  effort: "medium",
  isAdmin: false,
  userEmail: "",
  userName: "",
};

let localTimer: ReturnType<typeof setTimeout> | null = null;
let cloudTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleLocal() {
  if (typeof window === "undefined") return;
  if (localTimer) clearTimeout(localTimer);
  localTimer = setTimeout(() => writeLocalSync(currentUserId), 250);
}

async function pushCloud() {
  if (!currentUserId || !cloudLoaded) return;
  const uid = currentUserId;
  // History off → make sure the cloud copy is gone instead of syncing.
  if (!saveHistoryEnabled()) {
    try { await supabase.from("user_chats").delete().eq("user_id", uid); } catch { /* offline */ }
    return;
  }
  try {
    const clean = JSON.parse(JSON.stringify(persistable(state.chats)));
    // Encrypt-at-rest: server sees ciphertext only. Key stays in localStorage.
    const blob = hasCryptoSupport() ? await encryptChats(uid, clean) : null;
    await supabase.from("user_chats").upsert({
      user_id: uid,
      // Keep the plaintext column empty when encryption is available.
      chats: blob ? [] : clean,
      encrypted: !!blob,
      ciphertext: blob ? JSON.stringify(blob) : null,
      active_chat_id: state.activeChatId,
      updated_at: new Date().toISOString(),
    });
  } catch { /* offline / transient */ }
}

function scheduleCloud() {
  if (!currentUserId) return;
  if (cloudTimer) clearTimeout(cloudTimer);
  cloudTimer = setTimeout(() => { void pushCloud(); }, 1500);
}

function emit() {
  listeners.forEach((l) => l());
  scheduleLocal();
  scheduleCloud();
}

function set(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const p = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...p };
  emit();
}

// Flush pending writes immediately on tab hide / unload so a quick refresh
// never loses the most recent turn.
if (typeof window !== "undefined") {
  const flush = () => {
    if (localTimer) { clearTimeout(localTimer); localTimer = null; }
    writeLocalSync(currentUserId);
    if (cloudTimer) { clearTimeout(cloudTimer); cloudTimer = null; void pushCloud(); }
  };
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });

  // Hydrate from cloud once we know who the user is, and re-hydrate on
  // sign-in / sign-out so accounts never see each other's chats.
  const hydrateForUser = async (uid: string | null) => {
    currentUserId = uid;
    cloudLoaded = false;
    void syncIdentity(uid);
    const local = readLocal(uid);
    // Show local immediately so refresh feels instant.
    state = { ...state, chats: local.chats, activeChatId: local.activeChatId };
    listeners.forEach((l) => l());
    if (!uid) { cloudLoaded = true; return; }
    // Pull the user's privacy prefs before any read/write decision.
    await hydratePrivacyCache(uid);
    if (!saveHistoryEnabled()) {
      // History disabled: nothing to restore, and nothing should linger.
      state = { ...state, chats: [], activeChatId: null };
      cloudLoaded = true;
      listeners.forEach((l) => l());
      writeLocalSync(uid);
      void pushCloud();
      return;
    }
    try {
      const { data } = await supabase
        .from("user_chats")
        .select("chats, active_chat_id, encrypted, ciphertext")
        .eq("user_id", uid)
        .maybeSingle();
      let cloudPayload: Chat[] = [];
      const row = data as unknown as { chats?: Chat[]; active_chat_id?: string | null; encrypted?: boolean; ciphertext?: string | null } | null;
      if (row?.encrypted && row.ciphertext) {
        const dec = await decryptChats<Chat[]>(uid, row.ciphertext);
        // If dec === null the key isn't on this device — treat as no cloud
        // history rather than wiping local. Server data stays encrypted.
        cloudPayload = dec ?? [];
      } else {
        cloudPayload = (row?.chats as Chat[] | undefined) ?? [];
      }
      const cloudChats = sanitizeChats(cloudPayload);
      const merged = sanitizeChats(mergeChats(local.chats, cloudChats));
      const activeChatId = local.activeChatId ?? row?.active_chat_id ?? null;
      state = { ...state, chats: merged, activeChatId };
      cloudLoaded = true;
      listeners.forEach((l) => l());
      writeLocalSync(uid);
      // Push merged (encrypted) view back so both sides converge.
      void pushCloud();
    } catch {
      cloudLoaded = true;
    }
  };

  supabase.auth.getSession().then(({ data }) => {
    void hydrateForUser(data.session?.user?.id ?? null);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    const newUid = session?.user?.id ?? null;
    if (newUid !== currentUserId) void hydrateForUser(newUid);
  });

  // React instantly when the user flips "Save chat history" in Settings.
  onPrivacyChange(() => {
    writeLocalSync(currentUserId);
    void pushCloud();
  });
}


function updateChat(chatId: string, fn: (c: Chat) => Chat) {
  set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? fn(c) : c)) }));
}

function updateMessage(chatId: string, msgId: string, fn: (m: Message) => Message) {
  updateChat(chatId, (c) => ({
    ...c,
    messages: c.messages.map((m) => (m.id === msgId ? fn(m) : m)),
  }));
}

function buildSteps(mode: "web" | "deep", query: string): ThinkingStep[] {
  const q = query.replace(/\[(web search|deep research)\]/gi, "").trim().slice(0, 80) || "topic";
  if (mode === "web") {
    return [
      { label: `Understanding your question`, detail: `Parsing "${q}"`, done: false },
      { label: `Searching the web`, detail: `Querying top sources`, done: false },
      { label: `Reading result`, detail: `en.wikipedia.org`, url: "https://en.wikipedia.org", done: false },
      { label: `Reading result`, detail: `arxiv.org`, url: "https://arxiv.org", done: false },
      { label: `Composing answer`, detail: `Synthesizing findings`, done: false },
    ];
  }
  return [
    { label: `Planning research`, detail: `Breaking "${q}" into sub-questions`, done: false },
    { label: `Searching sources`, detail: `Scholar, news, primary docs`, done: false },
    { label: `Reading`, detail: `nature.com/articles`, url: "https://nature.com", done: false },
    { label: `Reading`, detail: `arxiv.org/abs`, url: "https://arxiv.org", done: false },
    { label: `Cross-checking claims`, detail: `Comparing sources for consistency`, done: false },
    { label: `Drafting report`, detail: `Structuring sections & citations`, done: false },
    { label: `Finalizing answer`, detail: `Polishing and formatting`, done: false },
  ];
}

export const store = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  setAgent: (agent: AgentId) => set({ agent }),
  setCipherMode: (cipherMode: CipherMode) => set({ cipherMode }),
  setEffort: (effort: EffortLevel) => set({ effort }),
  setIdentity: (identity: { isAdmin?: boolean; userEmail?: string | null; userName?: string | null }) =>
    set({
      isAdmin: !!identity.isAdmin,
      userEmail: identity.userEmail ?? "",
      userName: identity.userName ?? "",
    }),
  toggleAdmin: () => set((s) => ({ isAdmin: !s.isAdmin })),
  newChat: (): string => {
    const id = crypto.randomUUID();
    const chat: Chat = {
      id,
      title: "New chat",
      agent: state.agent,
      updatedAt: Date.now(),
      incognito: isIncognito() || undefined,
      messages: [],
    };
    set((s) => ({ chats: [chat, ...s.chats], activeChatId: id }));
    return id;
  },
  isIncognito,
  setIncognito: (on: boolean) => {
    if (isIncognito() === on) return;
    setIncognitoFlag(on);
    if (on) {
      // Start a clean, unsaved conversation.
      store.newChat();
    } else {
      // Leaving incognito discards every session-only chat.
      set((s) => ({
        chats: s.chats.filter((c) => !c.incognito),
        activeChatId: null,
      }));
    }
  },
  openChat: (id: string) => set({ activeChatId: id }),
  deleteChat: (id: string) =>
    set((s) => ({
      chats: s.chats.filter((c) => c.id !== id),
      activeChatId: s.activeChatId === id ? null : s.activeChatId,
    })),
  togglePin: (id: string) =>
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id === id ? { ...c, pinned: !c.pinned } : c,
      ),
    })),
  renameChat: (id: string, title: string) =>
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id === id ? { ...c, title: title.trim() || c.title } : c,
      ),
    })),

  editAndResend: (messageId: string, newText: string) => {
    const chatId = state.activeChatId;
    if (!chatId) return;
    const chat = state.chats.find((c) => c.id === chatId);
    if (!chat) return;
    const idx = chat.messages.findIndex((m) => m.id === messageId);
    if (idx < 0) return;
    // Truncate everything from this message onward, then resend
    updateChat(chatId, (c) => ({ ...c, messages: c.messages.slice(0, idx), pendingUserId: null }));
    store.sendMessage(newText.trim());
  },

  setFeedback: (messageId: string, feedback: "like" | "dislike" | null) => {
    const chatId = state.activeChatId;
    if (!chatId) return;
    updateMessage(chatId, messageId, (m) => ({
      ...m,
      feedback: m.feedback === feedback ? null : feedback,
    }));
  },

  regenerate: (assistantMessageId: string) => {
    const chatId = state.activeChatId;
    if (!chatId) return;
    const chat = state.chats.find((c) => c.id === chatId);
    if (!chat) return;
    const aIdx = chat.messages.findIndex((m) => m.id === assistantMessageId);
    if (aIdx < 0) return;
    // Walk back to the most recent user message before this assistant reply.
    let uIdx = aIdx - 1;
    while (uIdx >= 0 && chat.messages[uIdx].role !== "user") uIdx--;
    if (uIdx < 0) return;
    const userMsg = chat.messages[uIdx];
    // Truncate the user message and everything after, then resend it with
    // the same mode (web / deep / none) so the retry mirrors the original ask.
    updateChat(chatId, (c) => ({ ...c, messages: c.messages.slice(0, uIdx), pendingUserId: null }));
    store.sendMessage(userMsg.content, { mode: userMsg.mode ?? null });
  },





  sendMessage: (
    text: string,
    opts?: { mode?: "web" | "deep" | null; attachments?: { name: string; size: number; path: string; mime?: string }[] },
  ) => {
    let chatId = state.activeChatId;
    if (!chatId) chatId = store.newChat();
    const activeChatId = chatId;
    const attachments = opts?.attachments ?? [];
    const hasAttachments = attachments.length > 0;
    const hasWeb = opts?.mode === "web" || /\[web search\]/i.test(text);
    const hasDeep = opts?.mode === "deep" || /\[deep research\]/i.test(text);
    let mode: "web" | "deep" | null = hasDeep ? "deep" : hasWeb ? "web" : null;

    // Auto-skip web / deep research for trivial prompts (greetings, chit-chat,
    // thanks, tiny confirmations). These don't need live search and the extra
    // Firecrawl round-trip made replies feel slow or missing.
    const cleanForCheck = text.replace(/\[(web search|deep research)\]/gi, "").trim();
    const wc = cleanForCheck.split(/\s+/).filter(Boolean).length;
    const trivial =
      wc <= 8 &&
      !hasAttachments &&
      /^(hi+|hey+|hello+|yo|sup|hola|namaste|good\s*(morning|afternoon|evening|night)|thanks|thank\s*you|ty|thx|ok|okay|kk|cool|nice|got\s*it|great|awesome|lol|lmao|bye|see\s*ya|how\s*are\s*you|whats?\s*up|sup\s*bro)\b/i.test(cleanForCheck);
    const looksLikeSearch =
      /\?|\b(search|find|look\s*up|latest|news|today|current|price|when did|who won|what happened|weather|stock|score|update|release|version)\b/i.test(cleanForCheck);
    if (mode && trivial && !looksLikeSearch) {
      mode = null;
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text || (hasAttachments ? `_(analyze the ${attachments.length === 1 ? "attached file" : "attached files"})_` : ""),
      agent: state.agent,
      createdAt: Date.now(),
      mode,
    };
    updateChat(activeChatId, (c) => ({
      ...c,
      title: c.messages.length === 0 ? (text.slice(0, 48) || userMsg.content.slice(0, 48)) : c.title,
      updatedAt: Date.now(),
      pendingUserId: userMsg.id,
      messages: [...c.messages, userMsg],
    }));

    // ---- FLUX.1 image generation branch -------------------------------
    // "generate an image of…", "/image …" etc. never reach the text models.
    const imgReq = hasAttachments ? null : detectImageRequest(text);
    if (imgReq) {
      const imgId = crypto.randomUUID();
      const imgMsg: Message = {
        id: imgId,
        role: "assistant",
        content: "",
        agent: state.agent,
        createdAt: Date.now(),
        mode: null,
        pending: true,
        stage: "direct",
        thinking: [
          { label: "Understanding request", detail: imgReq.prompt.slice(0, 60), done: true },
          { label: "Composing prompt", detail: `FLUX.1 · ${imgReq.aspect}`, done: true },
          { label: "Rendering image", detail: "FLUX.1 [schnell]", done: false },
        ],
      };
      updateChat(activeChatId, (c) => ({ ...c, messages: [...c.messages, imgMsg] }));

      void (async () => {
        try {
          const img = await generateImage(imgReq.prompt, { aspect: imgReq.aspect });
          updateMessage(activeChatId, imgId, (m) => ({
            ...m,
            pending: false,
            thinking: m.thinking?.map((s) => ({ ...s, done: true })),
            content: `![${imgReq.prompt.replace(/[[\]]/g, "")}](${img.url})\n\n**Prompt** — ${imgReq.prompt}\n\n\`FLUX.1 · ${img.aspect_ratio}\``,
          }));
        } catch (err) {
          updateMessage(activeChatId, imgId, (m) => ({
            ...m,
            pending: false,
            thinking: m.thinking?.map((s) => ({ ...s, done: true })),
            content: `⚠️ ${err instanceof Error ? err.message : String(err)}`,
          }));
        }
        updateChat(activeChatId, (c) => ({ ...c, updatedAt: Date.now(), pendingUserId: null }));
      })();
      return;
    }



    const prefs = loadIntelligence();
    const effort = state.effort;
    const cfg = EFFORT_CONFIG[effort];
    const agent = state.agent;
    const cipherMode = state.cipherMode;

    const complex =
      !trivial &&
      (/\b(explain|detailed|deep dive|deep-dive|thorough|comprehensive|elaborate|walk me through|step[- ]by[- ]step|breakdown|break it down|how does .* work|why does|analyz|compare|pros and cons|guide|tutorial|essay|report|architecture|design|implement|build|refactor|debug|optimi[sz]e|algorithm|security|vulnerab|audit|plan|strategy)\b/i.test(cleanForCheck) ||
        wc > 40);

    const effortWantsSteps = cfg.forceThinking && (complex || agent === "cipher-1" || agent === "forge-1");
    // Live activity panel is ALWAYS shown (Jarvis-style): search modes get the
    // search step plan, everything else gets the memory→understand→verify→plan
    // →generate plan, driven by real events (not fake timers) where possible.
    const showSearchSteps = true;
    // Thought process is shown by default (Claude/DeepSeek style); the user can
    // still switch it off in Settings → Intelligence → Thinking mode.
    const captureReasoning = !mode && (prefs.thinking_mode !== false || effortWantsSteps);
    // Silent cross-site verification even when web search / deep research are
    // OFF: for non-trivial or factual-looking prompts we quietly fetch sources
    // and ground the answer on them.
    const autoVerify = !mode && !trivial && (looksLikeSearch || complex);


    // Build the model conversation history from prior messages in this chat
    // (exclude the pending assistant message we're about to add).
    const historyChat = state.chats.find((c) => c.id === activeChatId);
    const priorMessages: AIMessage[] = (historyChat?.messages ?? [])
      .filter((m) => m.role === "user" || (m.role === "assistant" && !m.pending && m.content))
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Kick off attachment extraction (PDF/DOCX text, image data URLs) in
    // parallel with the assistant-placeholder / thinking-steps setup.
    const attachmentsPromise = hasAttachments
      ? import("./file-parse").then((m) => m.extractAttachments(attachments))
      : Promise.resolve<import("./file-parse").Extracted[]>([]);

    const systemAppendix = buildSystemAppendix(prefs, mode, effort, text);
    // Prepend system-appendix as a "system" message so the provider's own
    // system prompt (agent identity) is combined with it.
    const modelMessages: AIMessage[] = systemAppendix
      ? [{ role: "system" as const, content: systemAppendix }, ...priorMessages]
      : priorMessages;

    // Creativity slider (0-100) → small temperature nudge on top of the
    // effort-preset temperature.
    const baseTemp = getProviderConfig(effort).temperature;
    const creativityDelta = ((prefs.creativity ?? 50) - 50) / 100; // -0.5..+0.5
    const temperatureOverride = Math.max(0, Math.min(1.5, baseTemp + creativityDelta * 1.2));

    const streamInto = async (
      assistantId: string,
      waitBeforeStream = 0,
      extraSystem?: string,
    ) => {
      let accumulated = "";
      let reasoning = "";
      let inThink = false;
      let tagBuf = "";
      let reasoningStart = 0;
      let reasoningDone = false;
      let raf = 0;
      let dirty = false;
      let lastHaptic = 0;

      // longest suffix of `s` that is a prefix of `target`
      const tailPartial = (s: string, target: string): number => {
        const max = Math.min(s.length, target.length - 1);
        for (let k = max; k > 0; k--) if (target.startsWith(s.slice(-k))) return k;
        return 0;
      };

      const flush = () => {
        raf = 0;
        if (!dirty) return;
        dirty = false;
        updateMessage(activeChatId, assistantId, (m) => ({
          ...m,
          content: accumulated,
          ...(captureReasoning ? {
            reasoning,
            reasoningDone,
            reasoningStartedAt: reasoningStart || m.reasoningStartedAt,
            reasoningMs: reasoningDone && reasoningStart
              ? Date.now() - reasoningStart
              : m.reasoningMs,
          } : {}),
        }));
      };
      const schedule = () => {
        dirty = true;
        if (raf) return;
        raf =
          typeof requestAnimationFrame !== "undefined"
            ? requestAnimationFrame(flush)
            : (setTimeout(flush, 16) as unknown as number);
      };

      const routeDelta = (delta: string) => {
        if (!captureReasoning) { accumulated += delta; return; }
        let s = tagBuf + delta;
        tagBuf = "";
        while (s.length) {
          if (inThink) {
            const end = s.indexOf("</think>");
            if (end < 0) {
              const partial = tailPartial(s, "</think>");
              reasoning += s.slice(0, s.length - partial);
              tagBuf = s.slice(s.length - partial);
              s = "";
            } else {
              reasoning += s.slice(0, end);
              s = s.slice(end + 8);
              inThink = false;
              reasoningDone = true;
            }
          } else {
            const start = s.indexOf("<think>");
            if (start < 0) {
              const partial = reasoningDone ? 0 : tailPartial(s, "<think>");
              accumulated += s.slice(0, s.length - partial);
              tagBuf = s.slice(s.length - partial);
              s = "";
            } else {
              accumulated += s.slice(0, start);
              s = s.slice(start + 7);
              inThink = true;
              if (!reasoningStart) reasoningStart = Date.now();
            }
          }
        }
      };

      try {
        if (waitBeforeStream > 0) {
          await new Promise((r) => setTimeout(r, waitBeforeStream));
        }
        const systems: string[] = [];
        if (captureReasoning) systems.push(REASONING_TRACE_SYSTEM);
        if (extraSystem) systems.push(extraSystem);
        let baseMessages: AIMessage[] = modelMessages;
        const extracted = await attachmentsPromise;
        if (extracted.length) {
          const { buildAttachmentTextBlock } = await import("./file-parse");
          const textBlock = buildAttachmentTextBlock(extracted);
          const images = extracted.filter((a): a is import("./file-parse").ExtractedImage => a.kind === "image");
          // find last user message and enrich it
          const idx = [...baseMessages].map((m) => m.role).lastIndexOf("user");
          if (idx >= 0) {
            const last = baseMessages[idx];
            const userText = typeof last.content === "string" ? last.content : "";
            const combinedText = [userText, textBlock].filter(Boolean).join("\n\n");
            const newContent = images.length
              ? [
                  { type: "text" as const, text: combinedText || "Please analyze the attached image(s)." },
                  ...images.map((im) => ({ type: "image_url" as const, image_url: { url: im.dataUrl } })),
                ]
              : combinedText;
            baseMessages = baseMessages.map((m, i) => (i === idx ? { ...m, content: newContent } : m));
          }
        }
        const finalMessages: AIMessage[] = systems.length
          ? [{ role: "system" as const, content: systems.join("\n\n") }, ...baseMessages]
          : baseMessages;
        await callAIStream(
          {
            messages: finalMessages,
            effort,
            agent,
            mode: mode ?? undefined,
            cipherMode,
            temperatureOverride,
            unlimitedOutput: !!prefs.unlimited_output || isEffortCapDisabled(effort),
          },
          (delta) => {
            routeDelta(delta);
            schedule();
            const now =
              typeof performance !== "undefined" ? performance.now() : Date.now();
            const breakChar = /[.\n!?]/.test(delta);
            const gap = breakChar ? 140 : 90;
            if (now - lastHaptic >= gap) {
              lastHaptic = now;
              haptic(breakChar ? "light" : "selection");
            }
          },
          (src) => {
            updateMessage(activeChatId, assistantId, (m) => ({ ...m, source: src }));
          },
        );
        // flush any leftover buffered partial-tag as content
        if (tagBuf) {
          if (inThink) reasoning += tagBuf; else accumulated += tagBuf;
          tagBuf = "";
        }
        // Cancel pending RAF so we don't double-write after the final set below.
        if (raf) {
          if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(raf);
          else clearTimeout(raf as unknown as ReturnType<typeof setTimeout>);
          raf = 0;
          dirty = false;
        }
        if (captureReasoning && reasoningStart && !reasoningDone) {
          reasoningDone = true;
        }
        if (!accumulated) accumulated = "_(empty response from model — please try again)_";
      } catch (err) {
        if (err instanceof RateLimitError) {
          setRateLimitedUntil(Date.now() + err.retryAfterMs, err.provider, currentUserId);
          updateChat(activeChatId, (c) => ({
            ...c,
            updatedAt: Date.now(),
            pendingUserId: null,
            messages: c.messages.filter((m) => m.id !== assistantId),
          }));
          return;
        }
        accumulated += (accumulated ? "\n\n" : "") + `⚠️ ${friendlyProviderError(err)}`;
      }
      accumulated += buildFooter(prefs, effort);
      updateChat(activeChatId, (c) => ({ ...c, updatedAt: Date.now(), pendingUserId: null }));
      updateMessage(activeChatId, assistantId, (m) => ({
        ...m,
        content: accumulated,
        pending: false,
        ...(captureReasoning ? {
          reasoning,
          reasoningDone: true,
          reasoningStartedAt: reasoningStart || m.reasoningStartedAt,
          reasoningMs: reasoningStart ? Date.now() - reasoningStart : m.reasoningMs,
        } : {}),
      }));
    };

    // Kick off real web-search / deep-research via Firecrawl in parallel with
    // the thinking-steps UI. Results are injected as a system message before
    // the model streams its answer.
    const cleanQuery = text.replace(/\[(web search|deep research)\]/gi, "").trim();
    const founderSources = getFounderSourcesIfRelevant(cleanQuery);
    const founderRelevant = founderSources.length > 0;

    // When web search is ON and the question is about Metrixcom's developer,
    // Firecrawl-scrape the founder's official profiles live so Metrixcom answers
    // from real fetched content, not just the static fallback blurbs.
    const liveFounderScrapePromise: Promise<SearchResult[]> =
      mode && founderRelevant
        ? scrapeUrlsFn({ data: { urls: founderSources.map((s) => s.url) } })
            .then((r) => r.results || [])
            .catch((e) => {
              console.error("Founder scrape error:", e);
              return [];
            })
        : Promise.resolve([]);

    // Silent background verification when no explicit mode is on.
    const autoVerifyPromise: Promise<SearchResult[]> =
      autoVerify
        ? webSearchFn({ data: { query: cleanQuery } })
            .then((r) => r.results || [])
            .catch(() => [])
        : Promise.resolve([]);

    const searchPromise: Promise<SearchResult[] | null> = mode
      ? Promise.all([
          (mode === "deep" ? deepResearchFn : webSearchFn)({ data: { query: cleanQuery } })
            .then((r) => r.results || [])
            .catch((e) => {
              console.error("Firecrawl error:", e);
              return [];
            }),
          liveFounderScrapePromise,
        ]).then(([web, liveFounder]) => {
          // Prefer live-scraped founder content over static fallback when available.
          const founder = liveFounder.length ? liveFounder : founderSources;
          const merged = founderRelevant ? [...founder, ...web] : web;
          return merged.length ? merged : null;
        })
      : autoVerifyPromise.then((web) => {
          const merged = [...founderSources, ...web];
          return merged.length ? merged : null;
        });

    if (showSearchSteps) {
      const assistantId = crypto.randomUUID();
      const baseSteps: ThinkingStep[] = mode
        ? buildSteps(mode, text)
        : [
            { label: "Searching memory", detail: "Recalling this conversation", done: false },
            { label: "Understanding request", detail: cleanQuery.slice(0, 60) || "Parsing intent", done: false },
            ...(autoVerify
              ? [{ label: "Cross-verifying sources", detail: "Checking multiple sites", done: false }]
              : []),
            { label: "Planning response", detail: "Structuring the answer", done: false },
            { label: "Generating answer", done: false },
          ];
      const extraSteps = cfg.extraSteps.map((label: string) => ({ label, done: false }));
      const steps = [...baseSteps, ...extraSteps];
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        agent,
        createdAt: Date.now(),
        mode,
        thinking: steps,
        pending: true,
        stage: mode === "deep" ? "deep" : mode === "web" ? "web" : (captureReasoning ? "thinking" : "direct"),
      };
      updateChat(activeChatId, (c) => ({ ...c, messages: [...c.messages, assistantMsg] }));

      const markDone = (matcher: RegExp, patch?: Partial<ThinkingStep>) => {
        updateMessage(activeChatId, assistantId, (m) => ({
          ...m,
          thinking: m.thinking?.map((s) =>
            matcher.test(s.label) && !s.done ? { ...s, done: true, ...patch } : s,
          ),
        }));
      };
      const markAllDone = () => {
        updateMessage(activeChatId, assistantId, (m) => ({
          ...m,
          thinking: m.thinking?.map((s) => (s.done ? s : { ...s, done: true })),
        }));
      };

      const baseDelay = mode === "deep" ? 550 : mode === "web" ? 380 : 260;
      const stepDelay = Math.round(baseDelay * cfg.delayMultiplier);

      if (mode) {
        steps.forEach((_, i) => {
          setTimeout(() => {
            updateMessage(activeChatId, assistantId, (m) => ({
              ...m,
              thinking: m.thinking?.map((s, idx) => (idx === i ? { ...s, done: true } : s)),
            }));
          }, stepDelay * (i + 1));
        });
      } else {
        // Event-driven: each step completes when the real work behind it does.
        setTimeout(() => markDone(/^Searching memory$/), Math.min(320, stepDelay));
        setTimeout(() => markDone(/^Understanding request$/), Math.min(700, stepDelay * 2));
      }

      // Start streaming shortly after thinking steps begin so tokens appear
      // beneath the (still-updating) thinking panel — feels like ChatGPT.
      const preStreamDelay = mode ? Math.min(600, stepDelay * 2) : Math.min(400, stepDelay);
      void (async () => {
        const results = await searchPromise;
        if (results && results.length) {
          // Replace generic "Reading result" placeholder steps with the real
          // top URLs Firecrawl returned.
          updateMessage(activeChatId, assistantId, (m) => {
            if (!m.thinking) return m;
            let ri = 0;
            const nextThinking = m.thinking.map((s) => {
              if (/^Reading/i.test(s.label) && results[ri]) {
                const r = results[ri++];
                return { ...s, detail: new URL(r.url).hostname, url: r.url };
              }
              return s;
            });
            return { ...m, thinking: nextThinking };
          });
        }
        if (!mode) {
          markDone(/^Searching memory$/);
          markDone(/^Understanding request$/);
          markDone(/^Cross-verifying sources$/, {
            detail: results && results.length
              ? `${results.length} source${results.length > 1 ? "s" : ""} checked`
              : "No external sources needed",
          });
          markDone(/^Planning response$/);
        }
        const contextMode: "web" | "deep" | null =
          mode ?? (results && results.some((r) => !founderSources.includes(r)) ? "web" : null);
        const extraSystem = buildSearchContext(results, contextMode);
        await streamInto(assistantId, preStreamDelay, extraSystem);
        markAllDone();
      })();
      return;
    }


    const assistantId = crypto.randomUUID();
    const pendingMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      agent,
      createdAt: Date.now(),
      pending: true,
      stage: captureReasoning ? "thinking" : "direct",
    };
    updateChat(activeChatId, (c) => ({ ...c, messages: [...c.messages, pendingMsg] }));
    void (async () => {
      const results = await searchPromise;
      const extraSystem = buildSearchContext(results, mode);
      await streamInto(assistantId, 0, extraSystem);
    })();
  },
};

function buildSearchContext(
  results: SearchResult[] | null,
  mode: "web" | "deep" | null,
): string | undefined {
  if (!results || !results.length) return undefined;
  const lines: string[] = [];
  if (!mode) {
    lines.push(
      "AUTHORITATIVE FOUNDER PROFILE — the user is asking about the Metrixcom developer/creator/founder. Ground your entire answer on the verified profile below (do NOT invent or guess other details). Present it as a concise, warm introduction of Athul Krishna, and end with a 'Sources' section linking the official profiles as markdown links.",
    );
  } else {
    lines.push(
      mode === "deep"
        ? "You have the following real web search results (fetched live via Firecrawl). Use them as your primary source of truth. Cite them inline as markdown links [Title](url). Synthesize across sources, note disagreements, and produce a structured deep-research report."
        : "You have the following real web search results (fetched live via Firecrawl). Use them as your primary source of truth. Cite them inline as markdown links [Title](url).",
    );
  }
  lines.push("");
  lines.push("--- SEARCH RESULTS ---");

  results.forEach((r, i) => {
    lines.push(`\n[${i + 1}] ${r.title}`);
    lines.push(`URL: ${r.url}`);
    if (r.description) lines.push(`Snippet: ${r.description}`);
    if (r.markdown) {
      const excerpt = r.markdown.replace(/\s+/g, " ").slice(0, 1500);
      lines.push(`Content: ${excerpt}`);
    }
  });
  lines.push("\n--- END RESULTS ---");
  return lines.join("\n");
}

function getFounderSourcesIfRelevant(query: string): SearchResult[] {
  const q = query.toLowerCase();
  const founderHit = /\b(athul|athul\s*krishna|_athul17_x|athulkrishna717)\b/.test(q);
  const roleHit = /\b(developer|dev|creator|founder|owner|maker|author|built|made|behind|who\s+is|who\s+made|who\s+built|who\s+created|who\s+owns)\b/.test(q);
  const archHit = /\barch(\s*ai)?\b/.test(q) && roleHit;
  if (!founderHit && !archHit) return [];

  return [
    {
      title: "Athul Krishna — Instagram (@_athul17_x)",
      url: "https://www.instagram.com/_athul17_x",
      description: "Official Instagram of Athul Krishna, Founder & Creator of Metrixcom.",
      markdown: "Athul Krishna PT — Founder & Creator of Metrixcom. Based in Meladoor, Thrissur, Kerala, India. Interests: AI, cybersecurity, cloud computing, product design.",
    },
    {
      title: "Athul Krishna — LinkedIn",
      url: "https://www.linkedin.com/in/athul-krishna-b06115287",
      description: "Official LinkedIn profile of Athul Krishna, Founder of Metrixcom.",
      markdown: "Athul Krishna — Founder & Creator of Metrixcom. Building an ecosystem across AI, cybersecurity, and cloud (Metrixcom today; STRATUS Cloud, Link Shield, and Network Security Testing planned).",
    },
    {
      title: "Athul Krishna — X (@athulkrishna717)",
      url: "https://x.com/athulkrishna717",
      description: "Official X (Twitter) of Athul Krishna, Founder of Metrixcom.",
      markdown: "Athul Krishna — Founder of Metrixcom. Inspirations: Dr. A. P. J. Abdul Kalam, Elon Musk, Cristiano Ronaldo.",
    },
  ];
}


// Detects whether the user's message implicitly demands a comprehensive,
// long-form answer. Purely lexical + shape-based — no model call, so it runs
// instantly on every send and biases the system prompt toward depth.
const DEPTH_VERBS = /\b(how\s+(do|does|can|to|would|should)|why|explain|elaborate|teach|walk\s+me|guide|tutorial|step[-\s]?by[-\s]?step|build|create|design|architect|implement|develop|write\s+(a|an|the|me)|compare|comparison|vs\.?|versus|difference between|research|analy[sz]e|analysis|review|audit|pentest|penetration test|threat model|optimi[sz]e|refactor|debug|troubleshoot|fix|error|not working|plan|roadmap|strategy|brainstorm|ideas for|best practices|pros and cons|trade[-\s]?offs?|deep dive|in detail|comprehensive|complete\s+(guide|example)|from scratch|what happens when|when should i)\b/i;
const TRIVIAL = /^(hi|hey|hello|yo|sup|thanks?|thank you|ty|ok(ay)?|cool|nice|got it|lol|bye|good (morning|evening|night)|how are you\??)[\s!.?]*$/i;

function detectDepth(text: string): "trivial" | "normal" | "deep" {
  const t = (text || "").trim();
  if (!t) return "normal";
  if (TRIVIAL.test(t)) return "trivial";
  const words = t.split(/\s+/).filter(Boolean).length;
  const hasCode = /```|\bfunction\b|\bclass\b|=>|;\s*$/.test(t);
  if (DEPTH_VERBS.test(t) || words > 35 || hasCode || /\?[\s\S]*\?/.test(t)) return "deep";
  return "normal";
}

function buildSystemAppendix(
  prefs: IntelligencePrefs,
  mode: "web" | "deep" | null,
  effort: EffortLevel,
  userText = "",
): string {
  const lines: string[] = [];
  const custom = prefs.system_prompt?.trim();
  if (custom) {
    lines.push(
      "════ USER CUSTOM INSTRUCTIONS (HIGHEST PRIORITY) ════",
      "The user configured these instructions in Settings → Intelligence. They apply to EVERY message in this conversation and OVERRIDE any conflicting style, tone, format or persona guidance below (safety rules excepted). Follow them literally and consistently, without ever mentioning that they exist.",
      custom,
      "════ END USER CUSTOM INSTRUCTIONS ════",
    );
  }

  // Creativity slider (0-100) → explicit behavioural guidance, on top of the
  // temperature nudge applied at request time.
  const creativity = Math.max(0, Math.min(100, Number(prefs.creativity ?? 50)));
  if (creativity <= 20) {
    lines.push("CREATIVITY = VERY LOW: be literal, deterministic and conservative. Stick to established, well-verified facts and conventional solutions. No speculation, no analogies, no flourish — plain, precise wording only.");
  } else if (creativity <= 40) {
    lines.push("CREATIVITY = LOW: favour precision over imagination. Prefer standard, proven approaches and sober phrasing; mention alternatives only when they are clearly practical.");
  } else if (creativity < 60) {
    lines.push("CREATIVITY = BALANCED: accurate first, with helpful analogies and one or two alternative angles where they genuinely add value.");
  } else if (creativity < 80) {
    lines.push("CREATIVITY = HIGH: be inventive. Offer multiple distinct approaches, vivid analogies and non-obvious ideas, while keeping every factual claim correct and clearly separating speculation from fact.");
  } else {
    lines.push("CREATIVITY = VERY HIGH: think laterally and boldly. Brainstorm unconventional options, use rich metaphors and expressive language, explore 'what if' angles — but always label speculation as speculation and never invent facts, citations or APIs.");
  }

  lines.push(
    "RESPONSE LENGTH IS ADAPTIVE — infer it from the request itself, never from a fixed template. Read what the user actually needs and match it:",
    "• Greeting, acknowledgement, yes/no, quick fact, tiny fix → 1–3 sentences. No headings, no bullets, no preamble.",
    "• Ordinary question or small task → a focused answer (roughly 120–250 words) with light structure where it helps.",
    "• Multi-part questions, comparisons, debugging, 'how do I…', design/architecture, planning → a full structured answer with sections, bullets, examples and code as needed (typically 500–900 words).",
    "• Explicitly or implicitly heavy asks — 'explain in detail', 'write the full…', research, tutorials, reports, complete implementations, deep analysis, anything where a short answer would be useless — go long and complete WITHOUT being told to (900–2000+ words). Cover background, the core answer, worked examples, edge cases, trade-offs, and next steps. Never truncate, never say 'in short', never stop early because of length.",
    "DEFAULT TOWARD DEPTH: when it is genuinely ambiguous whether the user wants brief or thorough, choose thorough. Under-explaining is a much worse failure than over-explaining. Never artificially shorten an answer to seem efficient — but never pad a trivial question either.",
  );

  // ── Response craft: structure, tone, and format discipline ──────────────
  lines.push(
    "CONTEXT DETECTION — before writing, silently classify the message as: casual conversation, quick lookup, technical question, learning/tutorial, step-by-step guide, debugging, research, comparison, planning, or brainstorming. Then adapt: casual → warm plain prose, no headings; quick lookup → the fact plus one line of context; learning → build up from fundamentals with an analogy and a worked example; tutorial/guide → numbered steps with commands, expected output and verification; debugging → root cause first, then the fix, then how to prevent it; research → sourced, comparative, structured; comparison → a table plus a clear recommendation; planning → phased steps with dependencies and risks; brainstorming → divergent options with trade-offs.",
    "STRUCTURE — format naturally, never mechanically. Use `##`/`###` headings, bullets, numbered steps for sequences, markdown tables for comparisons or parameters, fenced code blocks with the correct language tag, inline `code` for identifiers, blockquotes for key warnings, and `---` separators only when they genuinely divide sections. Bold ONLY for genuinely important concepts — never whole sentences. Keep paragraphs short (2–4 lines) with blank lines between blocks. Never emit a wall of text; never impose headings on a 2-sentence answer.",
    "RICH EXPLANATION — do not stop at the bare answer. Whenever it adds value, also give: the reasoning behind it, a concrete practical example, best practices, alternative approaches, trade-offs between them, an explicit recommendation, and next steps. Move through: Direct Answer → Explanation → Example → Best Practices → Common Mistakes → Alternatives & Trade-offs → Next Steps, including only the parts that genuinely apply and skipping the rest silently. Always lead with the direct answer, never with preamble.",
    "CODING RESPONSES — for non-trivial programming requests, never return code alone. Use this professional flow (naming only the parts that apply): **Understanding the problem**, **Analysis**, **Solution**, **Implementation** (production-ready code — correct types, error handling, edge cases, clean architecture), **Explanation** of how it works, **Security Considerations**, **Optimization**, **Testing recommendations**, **Common mistakes**, **Next improvements**. Comments only where they explain WHY. For a genuine one-line fix, just give the corrected code plus one sentence.",
    "SECURITY RESPONSES — lead with defensive guidance and structure substantive answers as a professional report: **Overview**, **Findings** (with a severity table), **Risk Analysis** (impact × likelihood), **Recommendations**, **Mitigation** steps, **Best Practices**, **References**. Use correct terminology (CVE, CVSS, STRIDE, OWASP) only where accurate. Never provide weaponized tooling or unauthorized-access assistance.",
    "TONE — professional, calm, intelligent, friendly, confident, helpful; the voice of an experienced engineer who is also a good teacher. No robotic phrasing, no filler openers ('Certainly!', 'Great question!'), no excessive enthusiasm, no emoji spam (at most one, only when it truly fits).",
    "ACCURACY — never fabricate APIs, flags, commands, libraries, papers, benchmarks, or facts. If a detail is uncertain or version-dependent, say so explicitly and state what you would check to confirm. A stated unknown always beats a confident guess.",
    "FOLLOW-UPS — never close with 'Anything else?'. When (and only when) there are genuinely useful next actions, end with a short block of 2–4 concrete suggestions tied to what was just discussed (e.g. optimize this implementation, add authentication, write unit tests, harden the input validation). Skip it entirely for casual chat, greetings, and emotional conversations.",
    "FINAL QUALITY CHECK — before you emit the answer, silently verify: (1) did I fully answer every part of the question? (2) would a professional user immediately need a follow-up to use this? (3) can the explanation be clearer or better exemplified? (4) is the formatting scannable, with no wall of text and no empty headings? If any check fails, improve the answer before sending it. Never mention that you ran this check.",
  );

  // Implicit-depth signal from the actual user message.
  const depth = detectDepth(userText);
  if (depth === "deep") {
    lines.push(
      "THIS REQUEST REQUIRES DEPTH: the user's message signals a how/why/explain/teach/build/guide/compare/research/design/debug/plan-class request. Produce a comprehensive, well-sectioned answer with explanation, worked examples, best practices, trade-offs, and next steps. Do NOT answer it briefly.",
    );
  } else if (depth === "trivial") {
    lines.push(
      "THIS REQUEST IS CONVERSATIONAL: reply in 1–3 natural sentences with no headings, bullets, or follow-up block.",
    );
  }


  // Effort acts on rigor and thoroughness, never on the adaptive-length rule
  // above: a trivial question stays a one-liner even at Max.
  const EFFORT_DIRECTIVE: Record<EffortLevel, string> = {
    low: "EFFORT = LOW: optimise for speed. Be direct and skip optional background — but if the request needs a full explanation, still give a complete one, just more tightly written.",
    medium: "EFFORT = BALANCED: normal rigor. Verify the key claims and structure the answer where it helps. Answer the question fully — including reasoning, an example and next steps when they matter — before stopping.",
    high: "EFFORT = HIGH: prioritise accuracy over speed. Verify every fact, number, name and API you cite. Surface assumptions, edge cases and caveats. When the request warrants depth, be noticeably more thorough and better structured than at Balanced.",
    ultra: "EFFORT = ULTRA: near-maximum rigor. Consider multiple approaches before committing, justify the chosen one, cover failure modes and trade-offs, and self-review for errors before answering. For substantive requests, produce a genuinely comprehensive answer.",
    max: "EFFORT = MAX: highest accuracy, no time pressure. Reason from first principles, enumerate alternatives, adversarially review your own draft, verify everything, and pre-empt the user's next questions. For any substantive request, deliver an exhaustive, production-grade answer — long-form, sectioned, with examples, edge cases and next steps. Only trivial/conversational messages stay short.",
  };
  lines.push(EFFORT_DIRECTIVE[effort]);

  if (prefs.response_length === "short") {
    lines.push("User preference: lean shorter than your default at every tier — but still go long when the task genuinely cannot be answered briefly.");
  } else if (prefs.response_length === "detailed") {
    lines.push("User preference: DETAILED. Default to long-form, thoroughly structured answers at every tier — headings, worked examples, edge cases, trade-offs and next steps — unless the message is a greeting or a one-word acknowledgement. When in doubt, write more, not less.");
  }


  if (prefs.auto_citations || mode) {
    lines.push("Cite reputable sources inline as markdown links when you rely on external facts.");
  }
  if (prefs.auto_code_explanations) {
    lines.push("When you include code, follow it with a short plain-language explanation.");
  }
  if (prefs.safe_mode) {
    lines.push("Refuse or safe-complete requests for illegal, harmful, or disallowed content.");
  }
  if (mode === "web") {
    lines.push("Assume you have web search results available and synthesize them faithfully.");
  } else if (mode === "deep") {
    lines.push(
      "Produce a deep-research report: multiple sections, cross-referenced sources, explicit trade-offs.",
    );
  } else {
    lines.push(
      "Even without an explicit web-search request, reason like a meticulous analyst: verify claims against what you know from multiple independent angles, flag anything uncertain or contested, and prefer precise, evaluated statements over vague ones. If verified source material is provided below, ground the answer on it and cite it inline.",
      "Voice: calm, precise and quietly confident — a J.A.R.V.I.S.-style assistant. Lead with the answer, then the supporting analysis. No flattery, no filler.",
    );
  }
  if (custom) {
    lines.push(
      `REMINDER — the user's custom instructions above take precedence over every stylistic rule in this prompt. Re-read them before you answer and comply exactly: "${custom.slice(0, 1200)}"`,
    );
  }
  return lines.join("\n");

}

function buildFooter(prefs: IntelligencePrefs, effort: EffortLevel): string {
  const model = MODEL_LABEL[prefs.preferred_model];
  const effortCfg = EFFORT_CONFIG[effort];
  const lengthLabel =
    prefs.response_length === "short"
      ? "Concise"
      : prefs.response_length === "detailed"
        ? "Detailed"
        : "Balanced";
  void model; void effortCfg; void lengthLabel; void prefs;
  return "";
}



export function useApp<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(state),
    () => selector(state),
  );
}
