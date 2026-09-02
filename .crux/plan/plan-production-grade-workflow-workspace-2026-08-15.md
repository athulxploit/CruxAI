# Plan: Production-Grade Workflow Workspace

Upgrade the current embedded workflow editor into a dedicated, full-page production-grade visual automation platform with real node interaction, execution tracking, and AI assistance.

## User Review Required

> [!IMPORTANT]
> - The new Workflow workspace will be available at `/workflows/$id` (editor) and `/workflows` (dashboard).
> - Webhook triggers will generate unique endpoints under `/api/public/workflow/$id`.
> - Credentials will be managed via the existing `secrets` system but exposed via a new "Credentials" UI in settings or within the node config.

- **Question:** Should we allow anonymous users to view/edit workflows, or require authentication? (Default: Authenticated only).
- **Question:** For the "Computer" nodes, should we integrate with the existing local/cloud computer foundations immediately?

## Technical Details

### 1. Data Model & Backend
- **Supabase Tables:**
    - `workflows`: `id`, `user_id`, `name`, `description`, `nodes` (JSONB), `edges` (JSONB), `status`, `created_at`, `updated_at`.
    - `workflow_executions`: `id`, `workflow_id`, `status` (running, success, failed), `start_time`, `end_time`, `trigger_data` (JSONB), `execution_log` (JSONB - node by node inputs/outputs).
- **API Routes:**
    - `src/routes/api/public/workflow.$id.ts`: Public endpoint for webhook triggers.
    - `src/lib/workflow/persistence.functions.ts`: CRUD operations for workflows.

### 2. UI/UX Architecture
- **Full-Page Editor (`src/components/workflow/WorkflowEditor.tsx`):**
    - Move from a fixed-height card to a `h-screen` layout.
    - Implement a proper `NodeLibrary` (searchable, categorized).
    - Implement a `WorkflowHeader` with state management (Saving, Test, Execute).
    - Implement a `ConfigurationPanel` (right-side drawer).
    - Implement `ExecutionOverlay` to show real-time progress.
- **Node Engine Upgrade:**
    - Use `reactflow` or a custom optimized SVG/Canvas engine for true dragging/panning/zooming if the current custom one is too limited. *Decision: Improve the current custom engine to maintain branding consistency and lightweight footprint.*
    - Support multiple ports per node (Input/Output).
    - Support connection deletion and multi-select.

### 3. Feature Implementation
- **AI-Assisted Creation:** New `Build with AI` modal that takes natural language, calls a server function to generate nodes/edges JSON, and populates the canvas.
- **Expression Support:** Update `resolveExpressions` to support `$node("Node Name").json.property` and `$vars.name`.
- **Node Catalog Expansion:** Add all requested triggers (Webhook, Cron), Logic (IF, Switch, Loop), and Integration nodes (Slack, GitHub, etc.).

## Proposed Changes

### Database
- New migration for `workflows` and `workflow_executions`.
- RLS policies to ensure users only see their own workflows.

### Components
#### `src/components/workflow/WorkflowHeader.tsx` (New)
- Editable name, status badge, execution controls.

#### `src/components/workflow/NodeLibrary.tsx` (New)
- Searchable sidebar with categories.

#### `src/components/workflow/ConfigPanel.tsx` (New)
- Right-side drawer for node settings.

#### `src/components/workflow/WorkflowEditor.tsx` (Refactor)
- Full-page layout, better canvas event handling (panning, zooming, multi-select).

### Logic
#### `src/lib/workflow/engine.ts` (Refactor)
- Support parallel execution, branching logic, and real-time state streaming back to UI.
- Improved error handling and retries.

#### `src/lib/workflow/registry.ts` (Expansion)
- Complete the catalog of 50+ node types as requested.

### Routes
- `src/routes/workflows.tsx`: Updated dashboard with execution history summaries.
- `src/routes/workflows.$id.tsx`: Full-page editor mount point.
- `src/routes/workspaces.$tool.tsx`: Link to the new dedicated editor instead of embedding it.
