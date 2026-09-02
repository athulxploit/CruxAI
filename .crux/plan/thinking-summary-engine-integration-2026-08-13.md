# Thinking Summary Engine Integration

Implement a premium, DeepSeek-inspired "Thinking" experience. This includes a user-facing reasoning summary, real-time duration tracking, and a polished expandable UI, while strictly hiding raw internal chain-of-thought.

## User Experience

- **Live Thinking Indicator**: Shows "✦ Thinking..." then "✦ Thinking for X seconds..." while processing.
- **Persistent Summary**: When complete, becomes "✦ Thought for X seconds ▾" which can be expanded to show a safe, bulleted reasoning summary.
- **DeepSeek Aesthetic**: High-clarity, minimal typography with a vertical accent border for expanded reasoning.
- **Effort-Aware**: Summary complexity scales with the selected Effort level (Low to Max).
- **Triviality Suppression**: Greetings and casual chat bypass the reasoning display.

## Technical Implementation

### Core Logic (`src/lib/app-store.ts`)
- **System Mandate**: Inject strict instructions for the model to output a user-safe summary within `<think>` tags.
- **Tag Parsing**: Refine the streaming logic to intercept and separate `<think>` content from the main response.
- **Duration Tracking**: Store actual start/end timestamps to compute real processing duration.
- **State Management**: Update the `Message` interface to store `reasoning`, `reasoningMs`, and `reasoningDone`.
- **Restore Missing Methods**: Re-implement `openChat`, `newChat`, `renameChat`, `deleteChat`, `setIncognito`, and `togglePin` which were accidentally removed during the previous refactor.

### UI Components (`src/components/arch/chat-view.tsx`)
- **ReasoningPanel**: 
  - Implementation of the "✦ Thought for X seconds" expandable header.
  - Integration with `IntelligencePrefs` for expansion behavior (Auto, Always, Never).
  - Styling: Minimal dark-mode compatible layout, serif-italic font for reasoning text, vertical accent border.
- **Streaming Sequence**: Smooth transitions from active thinking to completed summary to response generation.

### AI Proxy & Fallbacks (`src/routes/api/ai-stream.ts`)
- **Actual Duration**: Ensure the server-side proxy provides accurate timing signals if possible, or fallback to client-side measurement.
- **Effort Mapping**: Verify models receive the correct effort/reasoning configuration when supported.

## Technical Details
- **Security**: Strict logic to ensure raw model internal tokens are NEVER rendered.
- **Latency**: Optimize streaming chunk processing to prevent UI flickering.
- **Accessibility**: ARIA labels and keyboard support for the expandable panel.
