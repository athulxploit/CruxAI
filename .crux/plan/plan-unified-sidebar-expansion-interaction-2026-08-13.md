# Plan - Unified Sidebar Expansion Interaction

Enhance the sidebar interaction by turning the top XCOM logo into a dynamic expansion control when the sidebar is collapsed.

## User Review Required

> [!IMPORTANT]
> The sidebar expansion control will now be unified with the XCOM logo at the top. The separate floating expand/collapse button will be removed to achieve a cleaner, more integrated aesthetic.

## Proposed Changes

### Components & UI

#### `src/components/arch/sidebar.tsx`
- **Unified Expansion Control**: Modify the top header area to serve as the expand/collapse trigger.
- **Hover Transformation**: Implement a smooth transition from the XCOM logo to a `PanelLeftOpen` icon (or similar) when hovering in the collapsed state.
- **Click Interaction**: Clicking the logo area in collapsed mode will expand the sidebar.
- **Tooltip**: Add an "Expand sidebar" tooltip when hovering the logo in collapsed mode.
- **Cleanup**: Remove the existing floating toggle button (the small circle with `ChevronRight`) to avoid redundancy.

#### `src/components/arch/logo.tsx` (Optional check)
- Ensure the logo component supports the new interaction states if necessary, though mostly handled in the sidebar wrapper.

## Technical Details

- **Animation**: Use Framer Motion or Tailwind transitions (150-250ms) for the icon swap.
- **State Management**: Leverage the existing `useAppearance` hook to toggle the `sidebarDefault` state.
- **Layout Integrity**: Ensure no layout shifts occur during the transition between the logo and the expand icon.

## Alternative Considerations
- We could keep the existing collapse button but hide it entirely unless specifically needed, but the user requested unifying it with the logo for a premium feel.
