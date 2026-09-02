# Plan: Immersive Help, Blog, and Changelog Pages

Build a high-end, Perplexity-style help center and blog system for Metrixcom. These pages will feature "butter-soft" motion scrolling, immersive engineering imagery, and a clean, desktop-first layout.

## Technical Details

### 1. Route Structures
- Create `src/routes/blog/index.tsx` (Blog Feed)
- Create `src/routes/blog/$slug.tsx` (Individual Posts)
- Create `src/routes/changelog.tsx` (Release Notes)
- Revamp `src/routes/help.tsx` (Help Center Home)

### 2. Design System Components
- **`HelpShell`**: A specialized layout wrapper for these public-facing pages, different from the app's sidebar-heavy shell.
- **`MotionSection`**: Framer Motion powered scroll-reveal blocks.
- **`ProgressScroll`**: A visual indicator at the top of long-form articles.

### 3. Implementation Steps

#### A. Sidebar Menu Update
- Update `src/components/arch/sidebar.tsx` to point the "Help" submenu items to these new internal routes.
- Ensure they open in a new tab (`target="_blank"`) as requested.

#### B. Engineering the Help Center (`/help`)
- Design a grid-based landing page inspired by Perplexity's help center.
- Categories: "Get Started", "Research & Analysis", "Security & Privacy", "Account & Billing".
- Search bar with micro-interactions.

#### C. The Metrixcom Blog (`/blog`)
- Featured post card with a large engineering/security-themed background image.
- Secondary grid for topic-based browsing (Company, Developers, Enterprise).
- Adaptive typography (serif for readability, sans-serif for UI).

#### D. The Changelog (`/changelog`)
- Vertical timeline layout showing Metrixcom's rapid evolution.
- "Butter-smooth" scroll animations as the user moves down the release history.

### 4. Content & Visuals
- Use high-resolution engineering and security imagery from Unsplash.
- Dynamic data: Model updates, "Metrixcom Computer" launch announcements, and "Engine" optimizations.
