# Plan: Production-Grade Plugin Directory for Metrixcom AI

Upgrade the existing "Plugins" option into a full-featured, centered directory modal with discovery, category filtering, search, and detailed plugin management.

## User Review Required

> [!IMPORTANT]
> - Real external integrations (GitHub, Slack, etc.) require their respective OAuth client credentials in your backend environment.
> - I will implement the UI for these connections using the existing `app_user_connections` architecture.
> - The initial UI will include a predefined list of 20+ plugin cards as requested.

## Proposed Changes

### 1. Plugin Data Model & Directory UI
- Create `src/components/arch/plugin-directory.tsx` to handle the large centered modal.
- Implement `src/lib/plugins/catalog.ts` with the 20 requested plugins (Google Drive, GitHub, Notion, etc.).
- Add navigation rail (Discover, Installed, My Plugins, Categories) and scrollable grid.
- Implement search and category filtering logic.

### 2. Plugin Detail & Management
- Create `src/components/arch/plugin-detail-view.tsx` for the inner detail panel.
- Implement states: Available, Installed, Connected, Disconnected, and Error.
- Support "Add" action that persists to the database using the existing connection table structure.

### 3. Integration with Chat Input
- Update `src/components/arch/chat-input.tsx` to open the new `PluginDirectory` modal instead of redirecting to `/integrations`.
- Ensure the "Plugins" option in the attachment menu triggers the modal.

### 4. Persistence & Server Functions
- Update `src/lib/connectors.functions.ts` to support "installing" a plugin (marking as active for a user) even if not yet authenticated.
- Ensure the local UI state reflects database state on refresh.

## Technical Details
- **Architecture**: The plugin system will build upon the existing `Connector` types in `src/lib/connectors-catalog.ts` but expand them to support the directory UI requirements.
- **Styling**: Metrixcom premium dark design system (semantic tokens, `rounded-2xl`, subtle borders).
- **Navigation**: Sticky left sidebar with independent content scrolling using `sticky self-start`.
- **Responsive**: Full-screen overlay on mobile, large centered modal on desktop.
