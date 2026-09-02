# DeepSeek-style "Thinking" Reasoning Implementation

The user wants the AI to show a "thinking" process (reasoning) similar to DeepSeek before providing the final response. We already have a `ReasoningPanel` and `<think>` tag extraction logic in `app-store.ts` and `chat-view.tsx`, but the server-side proxy needs to support streaming reasoning tokens from providers that offer them (like DeepSeek R1 or OpenAI o1/o3) or simulate/enforce the reasoning summary for other models via the system prompt.

## User Review Required

> [!IMPORTANT]
> This change will enable a visual "Thinking" panel for all non-trivial queries. Some models (like DeepSeek R1) provide native reasoning tokens, while others will generate a summary based on the internal reasoning instructions already present in the system prompt.

## Proposed Changes

### AI Streaming Proxy (`src/routes/api/ai-stream.ts`)
- Update `parseOpenAISSE` to detect and yield `reasoning_content` (used by DeepSeek and some OpenAI models).
- Update the streaming loop in `runChainStream` to differentiate between reasoning deltas and content deltas.
- Ensure the encoder emits a specific type for reasoning so the client can handle it correctly.

### App Store Logic (`src/lib/app-store.ts`)
- Refine the `streamIntoV2` function to handle the new `reasoning` delta type from the server.
- Update the `<think>` tag parsing logic to be more robust for models that don't use native reasoning fields but output tags in the text stream.
- Ensure the `reasoningDone` state is correctly transitioned when the thinking process finishes.

### UI Components (`src/components/arch/chat-view.tsx`)
- Ensure the `ReasoningPanel` correctly animates and displays the streaming reasoning.
- Add a "Thinking..." state with a timer to match the DeepSeek aesthetic.

## Technical Details
- **Protocol Update**: The SSE stream will now emit `data: {"reasoning": "..."}` for reasoning tokens and `data: {"delta": "..."}` for final content.
- **Failover**: Reasoning tokens from one provider will be preserved even if the content generation fails and falls back to another provider.
- **System Prompt**: The `REASONING_TRACE_SYSTEM` instruction in `app-store.ts` already guides models to use `<think>` tags; this implementation will prioritize native fields when available.
