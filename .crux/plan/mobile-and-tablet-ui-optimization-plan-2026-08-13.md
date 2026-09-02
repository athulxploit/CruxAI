# Mobile and Tablet UI Optimization Plan

Optimize the Metrixcom UI for mobile and tablet devices to ensure a seamless experience across all form factors while maintaining the premium desktop aesthetic.

## User Experience Improvements

- Implement a responsive sidebar that collapses to a bottom navigation bar or a hamburger menu on mobile.
- Adjust the chat layout to maximize vertical space on smaller screens.
- Reposition action buttons (Share, Copy, Regenerate) for better reachability on mobile.
- Optimize typography and spacing for readability on small displays.

## Technical Details

### 1. Global Layout (`src/routes/__root.tsx`)
- Adjust the main shell to handle responsive padding and height.
- Use `h-[calc(100dvh)]` to prevent address bar layout shifts on mobile browsers.

### 2. Sidebar & Navigation (`src/components/arch/sidebar.tsx`)
- Introduce a `MobileNav` component that appears at the bottom of the screen on mobile devices.
- Ensure the `AppSidebar` (desktop version) is hidden on small screens (`hidden md:flex`).
- Update the `MobileSidebarTrigger` to work with a mobile-friendly `Sheet` or slide-over menu.

### 3. Chat View & Messages (`src/components/arch/chat-view.tsx`)
- Update `arch-chat-container` to have fluid padding (`px-4` on mobile, `px-6` on tablet, `px-8` on desktop).
- Adjust message bubble styles for narrow widths.
- Move message action overlays (Copy, Edit, Share) to a long-press menu or a simplified horizontal bar below the message for touch users.

### 4. Chat Input & Composer (`src/components/arch/chat-input.tsx`)
- Reposition the "Effort Tuning" and "Computer Selector" to be more accessible on mobile (possibly within a "Tools" menu icon).
- Ensure the textarea autoresize doesn't push the viewport too far.
- Optimize the layout of attachments for touch interaction.

### 5. Top Bar (`src/components/arch/topbar.tsx`)
- Simplify the top bar on mobile: hide less essential status indicators.
- Ensure the search trigger and notifications are easily reachable.

## Verification Plan

- Test on various viewport widths:
  - Mobile: 375px - 480px
  - Tablet: 768px - 1024px
  - Desktop: 1280px+
- Verify touch interactions for all UI elements.
- Check for "layout jumps" when the virtual keyboard appears on mobile.
