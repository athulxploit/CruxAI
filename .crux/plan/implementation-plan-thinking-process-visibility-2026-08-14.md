# Implementation Plan - Thinking Process Visibility

Enhance the Metrixcom Engine to show a real-time, persistent thinking process summary (similar to DeepSeek) that remains visible after the response is generated.

## User Review Required

> [!IMPORTANT]
> The thinking process will now follow a strict DeepSeek-like visual flow:
> 1.  **During Generation:** A "Thinking..." status shows above the composer.
> 2.  **Inside Messages:** A persistent "Thought for X seconds" panel appears *before* the reply content.
> 3.  **Dynamic Content:** The summary points are task-specific (e.g., "Analyzing React components", "Evaluating encryption methods").

## Proposed Changes

### Core Logic (`src/lib/app-store.ts`)
- Update `REASONING_TRACE_SYSTEM` prompt to strictly enforce the `<think>` tag summary format with task-specific bullets.
- Refine the `streamIntoV2` logic to ensure the `reasoningDone` state and timing are accurately captured.

### UI Components

#### Live Thinking Bar (`src/components/arch/live-thinking.tsx`)
- Update the visual style to match the premium Metrixcom aesthetic.
- Ensure the "Orchestrating..." steps feel dynamic and responsive to the reasoning stream.

#### Reasoning Panel (`src/components/arch/chat-view.tsx`)
- Modify `ReasoningPanel` to ensure it is **always** persistent and visible by default.
- Enhance the typography (serif-italic) and layout to strictly match the requested DeepSeek style.
- Ensure the panel appears at the start of the assistant's message, before the main content.

#### Assistant Message (`src/components/arch/chat-view.tsx`)
- Refactor `AssistantMessage` to cleanly separate the reasoning panel from the research/thinking steps.
- Ensure source attribution (links) appears at the very end of the message, outside the reasoning block.

## Technical Details
- **Framer Motion:** Use smooth transitions for the thinking panel expansion.
- **Tailwind CSS:** Apply `font-serif` and `italic` for the thought process text.
- **State Management:** Leverage `intelligence.ts` preferences to allow users to toggle "Always Expand" vs "Auto" behavior for thoughts.

## Verification Plan

### Manual Verification
- Send various prompts (simple greeting vs. complex code request) and verify the reasoning summary bullet count scales accordingly.
- Verify the "Thought for X seconds" panel stays visible after the response is fully streamed.
- Check that source links appear at the bottom of the message when web search is used.
- Refresh the page and ensure the thinking panels remain visible for past messages.

### Automated Tests
- N/A (UI-centric visual changes).
