# Implementation Plan - Metrixcom Engine Architecture

Refactor XCOM from a multi-agent selector into a unified intelligence system powered by the **Metrixcom Engine**. Existing agents (Pulse-1, Forge-1, Cipher-1) will be internalized as "Capabilities" within this engine. Introduce a new "Computer" selector for Local/Cloud execution contexts and enhance the activity transparency.

## Proposed Changes

### 1. Core Architecture & Logic
- **`src/lib/agents.ts`**:
    - Keep `AgentId` and definitions internally for routing.
    - Add a `CAPABILITIES` mapping that translates high-level task types to internal models.
- **`src/lib/app-store.ts`**:
    - Transition the `agent` state to a private engine property.
    - Implement the "Metrixcom Engine" orchestration logic within `sendMessage`.
    - Automatically determine the required agent using `pickAgentForPrompt` (which already exists but will now be mandatory/internal).
    - Update `Message` type to include `executionPlan` and high-level `statusSteps` instead of just "Thinking...".
    - Add `computer` state (`local` | `cloud`).
- **`src/lib/ai-provider.ts`**:
    - Update system prompts to reflect the unified "Metrixcom Engine" identity.
    - Ensure agents know they are part of a larger capability set.

### 2. User Interface Enhancements
- **`src/components/arch/chat-input.tsx`**:
    - **Remove `AgentSelector`**.
    - **Add `ComputerSelector`**: A new toggle/dropdown to switch between "💻 Local Computer" and "☁️ Cloud Computer" (with a "Coming soon" state for cloud).
    - Update placeholder text to "Message Metrixcom...".
- **`src/components/arch/chat-view.tsx` & `src/components/arch/live-thinking.tsx`**:
    - Update the activity progress display to show the execution plan (e.g., "✓ Analyzing Project", "● Generating Code").
    - Hide private reasoning traces as per requirements, maintaining only the Jarvis-style progress.
- **`src/components/arch/sidebar.tsx` & `src/components/arch/topbar.tsx`**:
    - Remove agent logos/names from the top bar and chat history.
    - Replace with "Metrixcom" or the Metrixcom logo.
- **`src/routes/settings.tsx`**:
    - Update "Intelligence" settings to remove manual agent defaults.
    - Rename "Arch Mode" to "Metrixcom Engine" (and make it the permanent underlying behavior).

### 3. Safety & Permissions
- **`src/lib/execution-safety.ts` (New)**:
    - Define a risk-scoring system for tools/actions.
    - Implement a `checkPermission(action)` function that prompts the UI for confirmation on high-risk tasks.

## Technical Details
- **Capability Router**: The existing `pickAgentForPrompt` in `arch-mode.ts` will be the heart of the engine's routing logic.
- **State Migration**: Ensure `activeChatId` stores refer to "Metrixcom" generally, while keeping `agent` as a hidden metadata field for the LLM call.
- **Haptic/Visual feedback**: Retain the shimmer and aurora effects but brand them as "Metrixcom Engine" activity.

## User Review Required
- **Cloud Computer**: I will show a "Coming Soon" state for the Cloud Computer option since the full backend sandbox is not yet provisioned.
- **Agent Branding**: All UI references to Pulse/Forge/Cipher will be replaced with "Metrixcom". Is this acceptable, or should I keep specific capability icons (like a shield for security tasks) in the progress log?
