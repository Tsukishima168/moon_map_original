# Map Current

Last updated: 2026-06-04

## Status

- Repository: `/Users/pensoair/Desktop/Web-Projects/sites/map-kiwimu-com`
- Current branch: `main`
- Remote tracking: `origin/main`
- Latest checked commit: `9f96ebe fix(menu): align product images and quantity ordering`
- Working tree at handoff: clean before this documentation pass
- Production role: Moon Map public brand/store/menu entry, `/menu` catalog, lightweight LINE preorder handoff, canonical menu consumer

## Stack

- App runtime: React 19 + Vite 6
- Primary UI file: `index.tsx`
- Serverless API: Vercel functions under `api/`
- Menu data: Supabase canonical menu first, Shop grouped menu fallback, `public/menu.json` final fallback/display metadata source
- Orders: `api/map-order.ts` writes canonical `orders` payload through server-side Supabase admin client
- Tracking: GA4, UTM, cross-site attribution, Discord notification APIs
- Optional CMS area: `studio/` Sanity config exists but is not the primary runtime path

## Operational Boundary

- Map owns discovery, route/menu browsing, MBTI recommendation display, and LINE preorder handoff.
- Shop owns formal checkout, payment methods, order admin, and LINE Pay production rollout.
- Passport owns identity and persistent member state.
- Gacha owns campaign/reward game mechanics.
- MBTI/Kiwimu owns quiz and content discovery.

If a feature starts to look like payment, fulfillment, or order management, move it to Shop or document an explicit architecture exception before implementing.

## Current Runtime Contract

- `/menu` loads same-origin `/api/menu`.
- `/api/menu` tries Supabase canonical menu tables first.
- If Supabase canonical menu fails, `/api/menu` falls back to `https://shop.kiwimu.com/api/menu/categories`.
- If the shared menu fallback fails, static `public/menu.json` remains the last fallback.
- `/api/mbti-dessert?mbti=TYPE` resolves canonical MBTI dessert mapping through Supabase.
- `public/menu.json` is still required for display metadata and fallback. Do not delete it until display metadata is fully shared.
- `ENABLE_SUPABASE_MENU_DISPLAY_CONFIG=true` opts into Supabase-backed display config; default runtime should remain unchanged unless intentionally rolling that out.

## Important Files

- `index.tsx`: main SPA, `/menu`, cart, checkout modal, LINE handoff.
- `api/menu.ts`: server-side menu source cascade and metadata merge.
- `api/map-order.ts`: canonical order persistence.
- `api/mbti-dessert.ts`: canonical MBTI menu recommendation endpoint.
- `api/_utils/menu-source.ts`: Supabase canonical menu queries.
- `api/_utils/menu-display-config.ts`: optional display metadata rollout flag.
- `lib/menu-shared.ts`: menu normalize/merge helpers.
- `lib/menu-catalog.ts`: local stable item id mapping.
- `public/menu.json`: display metadata and static fallback.

## Known Risks

- `index.tsx` is a large monolithic file and should be edited carefully.
- `/api/map-order` is intentionally not the same as Shop checkout. Keep semantics narrow.
- If server-side Supabase env is missing, menu/order APIs may degrade to fallbacks or fail.
- README still contains visual emoji formatting and historical roadmap items; use this file for operational state.
- Full live flow `menu -> cart -> order -> Supabase -> Discord -> GA4 -> LINE` still needs a production smoke with real env.

## Next Work Queue

- Finish shared display metadata contract so `public/menu.json` can eventually retire.
- Align upstream payload so true `menu_item_id` is available across Shop and Map.
- Add route/API smoke tests for `/api/menu`, `/api/mbti-dessert`, and `/menu`.
- Keep Map CTAs aligned to Kiwimu, Passport, Gacha, and Shop without duplicating their owned flows.
