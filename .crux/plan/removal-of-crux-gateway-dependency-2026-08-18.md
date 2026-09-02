# Removal of Lovable Gateway Dependency

This plan outlines the complete decoupling of the platform from the native AI gateway, shifting to a direct provider-based architecture using your own API keys.

## Technical Implementation

### 1. Unified Model Registry Update
Update `src/lib/model-registry.ts` to map all UI slugs to their high-performance production equivalents on direct providers.
- **NVIDIA models** -> OpenRouter/Groq equivalents
- **OpenAI (GPT-5 series)** -> Direct OpenAI `o3-mini` or `gpt-4o`
- **Anthropic (Claude 5 series)** -> Direct `claude-3-5-sonnet`

### 2. Direct Streaming Router Rewrite
Complete refactor of `src/routes/api/ai-stream.ts`:
- **Key Injection**: Read keys directly from `process.env` (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.).
- **Strict Aliasing**: Implement a switch block to route UI model IDs to production provider strings.
- **Aggregator Support**: Map "future" and "custom" models to OpenRouter or Groq pools when direct SDKs aren't available.

### 3. Administrative Hardening
- **Key Source**: Ensure all server-side logic strictly uses keys defined in the Admin Dashboard or environment variables.
- **Removal**: Delete all references to the Lovable Gateway (`lovable` provider) and its fallback logic.

## Verification
- Confirm that calls to any model trigger direct API requests to the configured upstreams.
- Validate that reasoning tokens and streaming remain intact without the gateway proxy.
