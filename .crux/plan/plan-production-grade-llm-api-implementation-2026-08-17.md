# Plan: Production-Grade LLM API Implementation

Implement a robust, multi-provider AI engine that replaces the hardcoded "Lovable Gateway" IDs with a dynamic, production-ready system supporting OpenAI, Groq, OpenRouter, and Google Gemini with automatic failover, streaming reasoning, and founder-injected personality.

## User Review Required

> [!IMPORTANT]
> This implementation will switch the model IDs from the current internal gateway placeholders (like `openai/gpt-5.4-nano`) to real production IDs. We will also wire in the specialized system prompts for Aerospace, Science, and Coding expertise.

## Proposed Changes

### AI Provider & Proxy
- **src/routes/api/ai-stream.ts**:
  - Update `ALLOWED_MODELS` to include production-ready models for all providers.
  - Refine the `runChainStream` function to handle real API responses from multiple providers.
  - Ensure the failover logic is airtight, switching between providers instantly on failure.
- **src/lib/ai-provider.ts**:
  - Inject the "Metrixcom Engine" personality (Metrix-3) and expert knowledge bases (Aerospace, Engineering, Science, Coding).
  - Implement dynamic token limit calculation based on user tier and effort level.

### Model Registry & Intelligence
- **src/lib/model-registry.ts**:
  - Map the 13 tier-locked models to their real production counterparts (e.g., GPT-5.4 Nano -> `gpt-4o-mini` or similar production ID).
  - Define the `chainForPreferredModel` logic to properly route users based on their manual selection.
- **src/lib/intelligence.ts**:
  - Finalize the `PreferredModel` type to match the new registry.

### Core Architecture
- **src/lib/app-store.ts**:
  - Finalize the `buildSystemAppendix` to include the Project Protocol, Reasoning Summary Engine, and Creator Info (Athul Krishna PT).
- **src/lib/model-chains.ts**:
  - Update default failover chains to use a mix of highly reliable (OpenAI) and fast (Groq/Gemini) providers.

## Technical Details
- **Failover Logic**: Uses a silent "retry-on-error" pattern. If the first provider in a chain fails to emit tokens within 1500ms, the proxy switches to the next provider in the chain.
- **Expert Knowledge**: System prompts are injected as "Developer" or "System" messages depending on the provider's API capabilities.
- **Security**: All API keys are stored in the server-side key pool (`src/lib/key-pool.server.ts`) and never exposed to the client.

## Constraints & Assumptions
- **API Keys**: Assumes `OPENAI_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`, and `OPENROUTER_API_KEY` are configured in the environment.
- **Backend**: Uses the new standalone Supabase instance (configured in previous steps) for interaction logging and user preferences.
