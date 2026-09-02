# Plan: Fix Model Selection Routing Bug

The goal is to ensure that the model selected in the UI is immediately used for the very next request, even within an existing conversation, without requiring a page refresh.

## Proposed Changes

### 1. Intelligence State Management (`src/lib/intelligence.ts`)
- Ensure `saveIntelligence` properly broadcasts changes so other components can react immediately. (Currently uses `CustomEvent`, which is good).

### 2. Orchestration Layer (`src/lib/app-store.ts`)
- The bug resides in `sendMessage`. It currently captures `preferred_model` once at the start of the function but doesn't guarantee it's the latest value if state updates are pending or if it's reading from a stale copy.
- **Fix**: Read the latest `preferred_model` from `loadIntelligence()` (which reads directly from `localStorage`) at the exact moment of constructing the `callAIStream` request.
- Ensure the `assistantMsg` added to the state captures the `source` (model/provider) as soon as the response starts to reflect the actual model used.

### 3. Backend Proxy (`src/routes/api/ai-stream.ts`)
- The backend already has a `preferredModelOverride` field in the body.
- It uses `getModelEntry` to resolve this to an `openRouterId`.
- **Optimization**: Ensure that if `preferredModelOverride` is provided, it *pre-empts* all other logic and is the primary model in the failover chain.

### 4. Verification
- Use a Playwright script to simulate:
    1. Select Model A -> Send Message -> Verify Payload uses Model A.
    2. Select Model B (without refresh) -> Send Message -> Verify Payload uses Model B.
    3. Verify network requests via intercepted POST data.

## Technical Details

- **Files affected**:
    - `src/lib/app-store.ts`: Update `sendMessage` to read fresh `preferred_model`.
    - `src/routes/api/ai-stream.ts`: Ensure override logic is bulletproof and doesn't fall back to defaults unless explicitly allowed.
    - `src/components/arch/chat-view.tsx`: Ensure the source badge correctly displays the model used for that specific message.

## Security Considerations
- Tier entitlements are already enforced in `src/routes/api/ai-stream.ts` based on the user's plan. This fix will maintain those checks.
