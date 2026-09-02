# Plan: Dynamic Model Availability & Premium Badges

Update the model selection UI to dynamically show or hide tier badges based on the user's current subscription plan. If a model is included in their plan, the badge is hidden and the model is fully unlocked; if not, the badge remains and triggers the upgrade flow.

## User Review Required

> [!IMPORTANT]
> - The entitlement hierarchy is `free < pro < proplus`.
> - A user with a higher tier automatically unlocks all lower tiers.
> - "FREE" badges will be hidden for everyone since free models are always accessible.

## Proposed Changes

### Core Logic
- Use a central entitlement check: `tier <= userTier`.
- Admins bypass all restrictions (all models unlocked, no badges).

### UI Components

#### 1. Model Selector Dropdown (`src/components/arch/model-selector.tsx`)
- [x] Refactor `checkLock` to handle plan hierarchy.
- [x] Add `shouldShowBadge` logic to hide badges for unlocked models.
- [x] Remove the hardcoded "emerald" FREE badge.

#### 2. Settings Page (`src/routes/settings.tsx`)
- [x] Update the "Preferred model" selection dropdown in the Intelligence section.
- [x] Import `MODEL_REGISTRY` to iterate through all models.
- [x] Inject badge logic and hierarchy checks for consistency.

#### 3. Admin Dashboard (`src/routes/admin.tsx`)
- [ ] Review the Models management tab.
- [ ] Ensure the "Limits" section accurately reflects the current tier-based routing.
- [ ] Verify that model definitions in the admin view correctly display their intended base tiers.

#### 4. Intelligence Library (`src/lib/intelligence.ts`)
- [ ] Ensure `MODEL_LABEL` remains a fallback, but favor dynamic labels from the registry.

## Verification Plan

### Automated Tests
- Run Playwright scripts to verify model list rendering for different mock user states:
  - `plan: 'free'` -> Show PRO/PRO+ badges, lock those models.
  - `plan: 'pro'` -> Hide PRO badges, keep PRO+ badges.
  - `plan: 'proplus'` -> Hide all tier badges, all models unlocked.

### Manual Verification
- Open the Model Selector in the chat composer.
- Navigate to Settings -> Intelligence and check the model list.
- Verify that clicking a locked model still triggers the premium upgrade flow.
