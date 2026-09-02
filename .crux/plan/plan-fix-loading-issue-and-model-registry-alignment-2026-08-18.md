# Plan: Fix Loading Issue and Model Registry Alignment

The user reported a "loading issue" (UI crash/Error Boundary) and previously requested wiring effort levels and direct model routing. The current issue is likely a combination of missing database rows (causing empty registry/chains) and UI components attempting to access undefined properties before data is fully hydrated.

## Proposed Changes

### 1. Database & Migrations
- Ensure `model_registry` and `model_assignments` tables are seeded with the correct entries matching the 12-model lineup.
- Add robust `GRANT` statements for all `public` schema tables (`user_roles`, `agents_config`, `model_assignments`, `model_registry`, `xcomm_model_usage`, `model_limits`).

### 2. UI Robustness (Crash Fix)
- **src/components/arch/sidebar.tsx**: Add safety checks for `agentConfigs` and `availability` to prevent crashes if the config hasn't loaded.
- **src/components/arch/chat-input.tsx**: Ensure `availability` and `diagnostic` handles undefined state gracefully.
- **src/components/arch/model-selector.tsx**: Add a loading state or default entry if `MODEL_REGISTRY` or `profile` is unavailable during first render.
- **src/components/arch/chat-view.tsx**: Fix potential `undefined` access in `SourceBadge` if `m.source` is partially populated.

### 3. Model & Effort Wiring Refinement
- **src/lib/model-chains.ts**: Ensure the `resolve` function correctly handles the user's `preferred_model` while still applying effort-based logic (like adding reasoning models for ultra/max effort).
- **src/lib/model-registry.ts**: Verify all 12 model entries use the correct `:free` suffix or OpenRouter slugs as per user commands.
- **src/lib/intelligence.ts**: Sync the `PreferredModel` union type with the actual registry IDs.

### 4. Technical Details
- Using `createServerFn` for server-side entitlement checks.
- Direct provider communication (OpenRouter, Groq, Gemini) via server-side proxy.
- Entitlement tracking via `xcomm_model_usage` table.

## Verification Plan

### Automated Checks
- Run `vitest` on `src/lib/model-chains.ts` and `src/lib/model-registry.ts` if tests exist.
- Build the project (`bun run build`) to check for type errors.

### Manual Verification (Playwright)
- Open the preview and verify the sidebar loads without the "Something went wrong" screen.
- Select different models in the selector and verify they persist.
- Check the browser console for any lingering "undefined" or "null" property access errors.
- Run a diagnostic test against OpenRouter for one of the new models (e.g., Nemotron-3 Ultra).
