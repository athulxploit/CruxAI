
## Heads-up (one-time, then I proceed as you asked)

You picked **VITE_ keys + client-side fetch**. Those keys will ship inside the JS bundle — anyone who opens DevTools on the deployed site can copy them and burn your Groq/Gemini quota. That is a real risk, not a stylistic preference. I will build exactly what you asked; just want it on record. If you change your mind before I start, I can move the calls to a TanStack server function in ~10 min.

You also need to add the two keys yourself in **Project Settings → Environment Variables** (Lovable does not let me write `VITE_*` values into `.env` for you). I will build the code so it works the moment those are set.

---

## What I'll build

### 1. `src/lib/ai-provider.ts` (new)
The router you pasted, with two tweaks:
- **Model IDs updated to currently-valid Groq models** (yours are decommissioned):
  - low → `llama-3.1-8b-instant`
  - medium → `llama-3.3-70b-versatile`
  - high → `llama-3.3-70b-versatile` (mixtral was retired)
  - ultra → `gemini-2.0-flash`
  - max → `gemini-2.5-pro`
- Everything else (types, `getSystemPrompt`, `getProviderConfig`, `callAI`, `callGroq`, `callGemini`, `PROVIDER_HEALTH`) exactly as you specified.
- Preserves your Advisor/Operator branching for Cipher-1.

### 2. `src/lib/app-store.ts` — replace the fake reply engine
- `sendMessage` now:
  1. Appends the user message (unchanged).
  2. Builds the message history for the active chat (role: user/assistant, content only — mapped from `Message[]`).
  3. Runs the **existing** thinking-step engine so motion/steps still show for complex prompts, web/deep, forge/cipher on high effort, etc. (no visual regression).
  4. Awaits `callAI({ messages, effort: state.effort, agent: state.agent, mode: state.cipherMode })`.
  5. Streams the returned text into the assistant message, flipping `pending: false`.
- `composeReply` is **deleted**. The model produces the whole reply; no more `Overview / Key Points / Detailed Explanation` template.
- The intelligence prefs (`response_length`, `creativity`, `thinking_mode`, `safe_mode`, `auto_citations`, `auto_code_explanations`, `preferred_model` label) are **folded into the system prompt** so the real model honors them — e.g. "Keep the answer concise" for `short`, "Cite sources inline" when `auto_citations`, temperature nudged by `creativity/100`. This preserves the behavior you already tuned without the fake template.
- Footer badge (`Model: … · Effort: … · Length: …`) is kept and appended to the model output so the transparency line the UI already renders stays intact.
- `editAndResend` continues to work (it already truncates then calls `sendMessage`).

### 3. Error handling
- 401/403 → assistant message: "Missing or invalid API key — add `VITE_GROQ_API_KEY` / `VITE_GEMINI_API_KEY` in Project Settings."
- 429 → "Rate limited by {provider} — try again in a moment or lower Effort."
- Network/other → surface the provider error text so you can debug.
- `PROVIDER_HEALTH[provider]` flipped to `false` on hard failure so the effort selector could later reflect it (UI change out of scope for this turn).

### 4. What I will NOT touch
- The chat UI (`chat-view.tsx`, `chat-input.tsx`), thinking-step visuals, ARCH Mode, agent picker, maintenance gating, settings screens, admin dashboard — all left exactly as they are.
- `intelligence.ts`, `agents.ts`, `arch-mode.ts` — read-only.
- No new packages. Uses `fetch` as you specified.

### 5. Verification
- Confirm build passes.
- Ask you to add the two `VITE_` keys, then I'll open the preview and send a test prompt on each agent + a couple of effort levels to confirm real responses come back and thinking steps still play.

## Technical notes

- `import.meta.env.VITE_GROQ_API_KEY` / `VITE_GEMINI_API_KEY` are read at request time (not module-init) so a missing key at build doesn't crash SSR.
- History mapping strips `mode`/`thinking`/`pending` fields — providers only get `{role, content}`.
- The Cipher-1 Operator system prompt still says "simulate realistic output" — no real tool execution sandbox is added (that's a separate, much larger project).

Confirm and I'll build it.
