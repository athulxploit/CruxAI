# Plan: Production-Grade Workflow System for Metrixcom (XCOM AI)

Implement a real, functional visual workflow automation engine inspired by n8n but with Metrixcom visual identity. This system will support node creation, connection, configuration, and real-time execution.

## User Review Required

> [!IMPORTANT]
> - The execution engine will initially run on the server using `createServerFn`, but long-running workflows may require background processing.
> - Data mapping using expressions like `{{ $json.field }}` will be implemented using a safe JS evaluation context.
> - Real-time execution updates will be streamed via server functions or a dedicated polling mechanism if WebSockets are not available in the current edge environment.

- Should we include any specific "starter" templates beyond the examples (AI Email Assistant, Security Alert Pipeline)?
- Are there specific integration nodes (beyond Gmail, GitHub, Slack) that are highest priority for the initial release?

## Technical Details

### Architecture
- **State Management**: Workflow graph stored in Supabase (`workflows` table).
- **Frontend Canvas**: Custom React-based infinite canvas with `framer-motion` for interactions and SVG for connections.
- **Execution Engine**: A recursive dependency-resolver that executes nodes.
- **Node Configuration**: Slide-over right panel for node settings.
- **Security**: RLS for workflow ownership, AES-256-GCM for encrypted credential storage (IDs only in workflow JSON).

### Database Schema Changes
- `workflows`: `id`, `user_id`, `name`, `nodes` (JSONB), `edges` (JSONB), `status` (active/inactive), `version`.
- `workflow_executions`: `id`, `workflow_id`, `status`, `start_time`, `end_time`, `input` (JSONB), `output` (JSONB), `logs` (JSONB).
- `workflow_credentials`: `id`, `user_id`, `name`, `type`, `encrypted_data` (references existing `app_user_connections`).

## Proposed Changes

### Database & Security
#### [MIGRATION] Add workflow tables
- Create `public.workflows` and `public.workflow_executions` tables.
- Enable RLS and add policies for `authenticated` users.
- Add `GRANT` statements for `authenticated` and `service_role`.

### Frontend Components
#### [NEW] `src/components/workflow/`
- `WorkflowCanvas.tsx`: Infinite canvas with pan/zoom.
- `WorkflowNode.tsx`: Individual node component with ports.
- `WorkflowEdge.tsx`: SVG connection lines with animation.
- `NodeSidebar.tsx`: Searchable library of triggers, AI, logic, etc.
- `ConfigPanel.tsx`: Right-side configuration for selected nodes.
- `ExecutionView.tsx`: Overlay showing live status and node data.

### Logic & Backend
#### [NEW] `src/lib/workflow/`
- `engine.ts`: Core execution logic (dependency resolution, data passing).
- `registry.ts`: Definitions for all supported nodes.
- `expressions.ts`: Parser for `{{ ... }}` data mapping.
- `persistence.functions.ts`: Server functions to save/load workflows and record executions.

### Routes
#### [UPDATE] `src/routes/workspaces.$tool.tsx`
- Replace current `AutomationLabTool` mockup with the real `WorkflowEditor` component.
#### [NEW] `src/routes/workflows.index.tsx`
- Dashboard for viewing and managing workflows.
#### [NEW] `src/routes/workflows.$id.tsx`
- Full-screen editor route.

## Verification Plan

### Automated Tests
- Test engine dependency resolver with mock nodes.
- Test expression parser with various JSON inputs.

### Manual Verification
- Create a "Manual Trigger -> XCOM AI -> Log" workflow.
- Execute and verify real-time status updates on the canvas.
- Inspect execution history and node-specific I/O data.
- Verify 2FA/Authorization gate for high-risk nodes.
