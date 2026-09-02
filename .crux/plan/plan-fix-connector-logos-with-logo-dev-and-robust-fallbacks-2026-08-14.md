# Plan: Fix Connector Logos with Logo.dev and Robust Fallbacks

Implement a production-ready logo system for XCOM AI connectors using Logo.dev as the primary provider, backed by a reliable domain-based architecture and multi-tier fallbacks.

## User Review Required

> [!IMPORTANT]
> The implementation requires a `VITE_LOGO_DEV_TOKEN`. I will use a placeholder or public endpoint logic if possible, but for full production reliability, the user should provide a valid Logo.dev publishable token in the environment variables as `VITE_LOGO_DEV_TOKEN`.

## Proposed Changes

### 1. Data Model & Registry
- **File**: `src/lib/connectors-catalog.ts`
  - Ensure all `Connector` definitions have a `domain` field where appropriate, or rely on a centralized mapper.
- **File**: `src/lib/connectors-registry.ts`
  - Audit and expand the `BRAND_DOMAINS` map to include all services mentioned (HubSpot, Monday.com, WiseSheets, etc.).
  - Ensure canonical domains are accurate (e.g., `notion.so`, `dub.co`).

### 2. Logo System Implementation
- **File**: `src/components/arch/connector-logo.tsx`
  - **Refactor `ConnectorLogo` component**:
    - Replace the current DuckDuckGo/Google favicon sources with `Logo.dev`.
    - Construct URLs using `https://img.logo.dev/{domain}?token={VITE_LOGO_DEV_TOKEN}`.
    - Implement a **Fallback Chain**:
      1. **Logo.dev** (primary).
      2. **Local fallback** (if `src/assets/connectors/{id}.png` exists, though we prefer dynamic).
      3. **Generated Monogram** (styled UI element with the first letter of the connector name and a consistent background).
      4. **Generic Icon** (Lucide `Globe` or `Shield` as the absolute last resort).
    - **Caching**: Ensure `loading="lazy"` and cross-origin resource sharing attributes are handled.
    - **Loading State**: Show a neutral shimmer or placeholder while the image loads.
    - **Error Handling**: Use `onError` to trigger the next step in the fallback chain without infinite loops.

### 3. Styling & UI Consistency
- **File**: `src/styles.css` (if needed) or component-level Tailwind:
  - Ensure the logo containers maintain the existing design: `rounded-xl`, `ring-1 ring-border/50`, `bg-surface`.
  - Fix the "black box" issue by ensuring `bg-surface` is used instead of hardcoded dark colors.

### 4. Verification
- Run a targeted script to verify the generated URLs for Gmail, GitHub, Slack, etc.
- Manually check the Integrations page in the preview.

## Technical Details

- **Environment Variables**: The code will read `import.meta.env.VITE_LOGO_DEV_TOKEN`.
- **Domain Mapping**: `getBrandDomain` utility will be the source of truth for constructing the Logo.dev URL.
- **Monogram Generator**: A small utility function to get the first character and a stable background color based on the string hash to ensure consistency.

## Constrained/Forbidden
- No changes to the Integrations page layout, tabs, or filtering.
- No removal of existing connector categories or descriptions.
- No hardcoding of API keys.
