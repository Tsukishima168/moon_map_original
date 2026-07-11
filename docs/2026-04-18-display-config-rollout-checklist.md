# 2026-04-18 Display Config Rollout Checklist

> Goal: move `map` display metadata out of `public/menu.json` into Supabase display-config tables
> while keeping the current deployed `map` site, SSO, and checkout flow unchanged.

## Hard Constraints

- Do not modify SSO or auth flow.
- Do not modify `/api/map-order`.
- Do not change `map` as the current primary order entrypoint.
- Do not enable `ENABLE_SUPABASE_MENU_DISPLAY_CONFIG` in production before parity verification.
- Do not delete `public/menu.json` in this phase.

## Scope

This phase only concerns display-layer metadata for `map`:

- category title
- category subtitle
- `hidePrice`
- item display order
- item description override
- item image override

This phase does **not** change canonical product facts:

- `menu_items`
- `menu_variants`
- `mbti_menu_links`
- `shop_orders`
- auth/session/profile flows

## Rollout Order

1. Create Supabase display-config tables with [`supabase_menu_display_config.sql`](/Users/pensoair/Desktop/Web-Projects/sites/map-kiwimu-com/docs/legacy-sql/supabase_menu_display_config.sql).
2. Generate seed SQL from current [`public/menu.json`](/Users/pensoair/Desktop/Web-Projects/sites/map-kiwimu-com/public/menu.json):

```bash
node scripts/generate-menu-display-config-seed.js > /tmp/menu-display-config-seed.sql
```

3. Apply the generated seed SQL to Supabase.
4. Verify seeded row counts for `site_key='map'`:
   - 6 category rows
   - 31 item rows
4. Keep `ENABLE_SUPABASE_MENU_DISPLAY_CONFIG` disabled in production.
5. Verify local parity with the flag enabled.
6. Run smoke tests on `map/menu` and checkout.
7. Only after parity is confirmed, consider enabling the flag in production.
8. Keep `public/menu.json` as emergency fallback after rollout.

## Local Verification

Run:

```bash
npx tsc --noEmit
npm run build
ENABLE_SUPABASE_MENU_DISPLAY_CONFIG=true npx vercel dev --listen 4124
```

Then verify:

- `GET /api/menu` still returns `success: true`
- `source` remains `supabase_merged`
- category count matches current runtime
- category order is exactly: `tiramisu`, `basque`, `chiffon`, `mille_crepe`, `pudding`, `drinks`
- item count per category is exactly: `6 / 3 / 2 / 8 / 1 / 11`
- category order matches current runtime
- item order matches current runtime
- descriptions match current runtime
- image overrides match current runtime
- `hidePrice` behavior for drinks still matches current runtime
- there are no display-config loader errors in server logs

Important:

- Do not treat the `/api/menu` `source` field alone as proof that display config is active.
- The current app hides price UI for drinks based on `cat.id === 'drinks'`, so `hide_price` parity must be checked in payload and UI.
- 20 current item images are masked by frontend verified-image keys, so screenshot parity alone is not enough; inspect the `/api/menu` payload too.

## UI Parity Checks

On `/menu`, compare flag OFF vs flag ON:

- same categories rendered
- same visible product names
- same item ordering within each category
- same category ordering
- same product images
- same product descriptions
- same price visibility behavior
- same MBTI highlighted/recommended categories
- no extra categories are dropped or added
- canonical-only items not present in config still appear after configured items in alphabetical order

## Smoke Tests

After parity is confirmed, run:

1. Logged-out SSO test:
   - from `map.kiwimu.com`, click Google login
   - confirm redirect goes to Passport
   - confirm successful return to `map`
2. Logged-in SSO persistence test:
   - reload after return
   - confirm session still exists
   - confirm profile still loads
3. Logout test:
   - logout
   - confirm session/profile clear correctly
4. Open `/menu`
5. Open `/menu?mbti=INTJ`
6. Add at least one item to cart
7. Complete checkout until `/api/map-order` request is sent
8. Confirm no regression in:
   - cart item names
   - cart specs
   - unit prices
   - subtotals
   - total amount
   - pickup date flow
   - LINE redirect behavior
9. Member checkout regression:
   - repeat while logged in
   - confirm `user_id` and `customer_email` are still present in payload
10. Failure-path regression:
   - simulate `/api/map-order` failure
   - confirm app still proceeds to LINE / desktop success flow, matching current behavior

## Do Not Touch

- [`lib/auth.ts`](/Users/pensoair/Desktop/Web-Projects/sites/map-kiwimu-com/lib/auth.ts)
- [`lib/supabase.ts`](/Users/pensoair/Desktop/Web-Projects/sites/map-kiwimu-com/lib/supabase.ts)
- [`api/map-order.ts`](/Users/pensoair/Desktop/Web-Projects/sites/map-kiwimu-com/api/map-order.ts)
- auth/session/profile code in [`index.tsx`](/Users/pensoair/Desktop/Web-Projects/sites/map-kiwimu-com/index.tsx)
- [`api/_utils/verifyTrustedRequest.ts`](/Users/pensoair/Desktop/Web-Projects/sites/map-kiwimu-com/api/_utils/verifyTrustedRequest.ts)
- [`api/_utils/supabase-admin.ts`](/Users/pensoair/Desktop/Web-Projects/sites/map-kiwimu-com/api/_utils/supabase-admin.ts)
- [`vercel.json`](/Users/pensoair/Desktop/Web-Projects/sites/map-kiwimu-com/vercel.json)
- Supabase auth/project config
- passport / SSO integration behavior
- env wiring for `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS`, `INTERNAL_API_TOKEN`

## Exit Criteria

This phase is complete when:

- display config exists in Supabase
- local flag-on parity is confirmed
- checkout smoke tests pass
- no SSO/auth behavior changes were introduced
- no duplicate `site_item_configs` rows or stale active category rows remain after seeding
- production can keep using either:
  - `public/menu.json` metadata path, or
  - new display-config path behind the feature flag
