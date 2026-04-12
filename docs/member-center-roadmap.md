# Member Center Roadmap

## Positioning

`map.kiwimu.com` should become the entry hub for the KIWIMU member experience.

This site should answer three questions fast:

1. Who am I in the KIWIMU system right now?
2. What should I do next?
3. Which connected site should I go to for that action?

The goal is not to turn this repo into the full member system in one pass.
The goal is to make this repo the best cross-site member entry point first.

## Current Ground Truth

- Shared cross-subdomain Supabase session already exists in `lib/supabase.ts` and `lib/auth.ts`.
- The homepage already reads `profiles.nickname` and `profiles.mbti_type` in `index.tsx`.
- Existing connected flows already exist for Passport, menu ordering, MBTI history, rewards, and event tracking.
- Server-side admin access exists, but current request protection is not strong enough for a private multi-source member summary API yet.

## Product Principles

1. Entry before expansion: fix the homepage role before adding more backend scope.
2. Keep cross-site navigation obvious: Passport, MBTI, ordering, and rewards must feel like one system.
3. Preserve working flows: Phase 1 should not break `/menu`, checkout, or existing tracking.
4. Do not add a broad service-role member summary API until auth boundaries and schema drift are resolved.

## Phases

### Phase 1: Reposition The Homepage As The Member Entry Hub

Status: shipped in this PR

Scope:

- Rework the hero so the first screen behaves like a member entry layer.
- Show different signed-in and signed-out entry states.
- Promote core member actions: Passport, ordering, MBTI, store badge, and story navigation.
- Keep current flows and APIs intact.
- Update login/profile language so it matches the member-entry positioning.

Acceptance criteria:

- A signed-out user understands the member value proposition and sees a clear login path.
- A signed-in user sees identity, MBTI state, and next actions without opening a modal first.
- The first screen prioritizes member routing over exhibition storytelling.
- `/menu` behavior remains unchanged.

Non-goals:

- No new schema.
- No new aggregate member API.
- No route split yet.
- No checkout rewrite.

### Phase 2: Build A Safe Member Summary Read Model

Status: next

Scope:

- Decide the canonical source of truth for profile, order, and reward summary data.
- Resolve schema drift across `profiles`, `shop_profiles`, legacy order tables, and reward tables.
- Add a member summary endpoint only after it is scoped to the authenticated user rather than origin-only trust.

Acceptance criteria:

- Every field in the summary has one clear source of truth.
- The endpoint does not rely on broad origin trust for private reads.
- The summary is safe to use for personalized homepage cards.

Risks to address:

- Service-role blast radius.
- Origin-based request checks for member-private data.
- Legacy/live schema drift.

### Phase 3: Split Information Architecture By Job

Status: planned

Scope:

- Keep `/` as the member entry homepage.
- Keep `/menu` as a dedicated menu surface.
- Move exhibition-heavy content into a lower-priority area or a dedicated explore route.
- Make profile and sync status reusable beyond modal-only UI.

Acceptance criteria:

- The homepage is clearly the member hub.
- Brand content still exists but no longer dominates the first decision layer.
- Entry actions map cleanly to downstream sites and tasks.

### Phase 4: Measure And Optimize Member Routing

Status: planned

Scope:

- Add clearer instrumentation for member-entry clicks and downstream completion.
- Track signed-in vs signed-out conversion through the hub.
- Identify which entry cards actually drive Passport usage, MBTI completion, and ordering.

Acceptance criteria:

- We can answer which entry surfaces convert.
- We can compare signed-in and signed-out behavior.
- We can make later homepage decisions using actual funnel data.

## This PR

This PR intentionally completes only Phase 1.

Included:

- Homepage entry restructure
- Signed-in vs signed-out member-first messaging
- Clearer quick actions
- Modal copy updated to match member-entry positioning
- Roadmap for the next phases

Excluded:

- Backend schema changes
- New member aggregation API
- Checkout/order architecture changes
- Permissions redesign

## Recommended Next PR

The next PR should be a data-boundary PR, not another visual PR.

Recommended target:

- Audit live Supabase schema usage
- Choose canonical profile/order/reward sources
- Propose the authenticated member summary contract
- Only then build the API and richer summary cards
