# 2026-04-07 Backend Data Flow Inventory

## Canonical Contracts

### 1. Map menu display contract

- User-facing URL: `https://map.kiwimu.com/menu`
- Map proxy: `/api/menu`
- Upstream contract: `https://shop.kiwimu.com/api/menu/categories`
- Runtime source tables:
  - `menu_categories`
  - `menu_items`
  - `menu_variants`
- Notes:
  - `map` still keeps `public/menu.json` as fallback and display metadata source.
  - `shop /api/menu/categories` is now the canonical external display contract.

### 2. MBTI soul dessert contract

- User-facing CTA destination: `https://map.kiwimu.com/menu`
- Kiwimu proxy: `/api/mbti-dessert`
- Upstream contract: `https://shop.kiwimu.com/api/menu/mbti/[mbtiType]`
- Runtime source tables:
  - `mbti_menu_links`
  - `menu_items`
  - `menu_variants`
- Notes:
  - The returned payload resolves MBTI dessert data from `shop`.
  - The returned `cta_url` must still point to `map/menu` until `shop` is ready as a landing surface.

### 3. Shop commerce contract

- User-facing URL: `https://shop.kiwimu.com`
- Primary frontend contract: `/api/menu`
- Runtime source tables:
  - `menu_items`
  - `menu_variants`
  - `mbti_menu_links` when `mbti` query is present
- Notes:
  - `/api/menu` remains the flat commerce-oriented product contract for `shop` itself.
  - External sites should not depend on this flat shape anymore.

## Runtime Table Status

### Active runtime tables

- `menu_categories`
  - Used by `shop /api/menu/categories`
  - Consumer: `map/menu`
- `menu_items`
  - Used by `shop /api/menu`, `shop /api/menu/categories`, `shop /api/menu/mbti/[mbtiType]`
  - Consumers: `shop`, `map/menu`, `kiwimu`
- `menu_variants`
  - Used by the same menu contracts above
  - Consumers: `shop`, `map/menu`, `kiwimu`
- `mbti_menu_links`
  - Used by `shop /api/menu/mbti/[mbtiType]` and `shop /api/menu?mbti=...`
  - Consumers: `kiwimu`, `shop`
- `menu_item_availability`
  - Used by admin availability APIs and availability RPC paths
  - Consumer: `shop` admin / availability logic

### Alignment-only tables

- `menu_item_aliases`
  - Purpose: cross-site naming bridge (`map` / `MBTI` / legacy names -> canonical `menu_items`)
  - Current runtime status: no live frontend or API contract reads this table directly
  - Keep as data alignment infrastructure, not as a presentation source

## Legacy / Retirement Candidates

- `mbti_recommendations`
  - Current DB status: empty
  - Current runtime status: no active consumer in the three live product flows
  - Recommendation: treat as retired

- `menu_items.mbti_type`
  - Current DB status: still populated on legacy rows
  - Current runtime status: no active menu contract reads this column
  - Recommendation: treat as legacy compatibility data only

- `profiles.v2_unlocked_at`
  - Current runtime status: only referenced by `V2` prototype flow
  - Product status: `V2` not launched, no public entry should depend on this yet

## Current Product Guardrails

- `V2` must not be exposed through public result-card entry points before launch.
- `shop` must not be the public dessert CTA destination yet.
- `map/menu` remains the shared user-facing dessert landing page.
