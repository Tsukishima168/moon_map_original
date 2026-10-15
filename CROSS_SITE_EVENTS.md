# CROSS SITE EVENTS (v1)

This document defines the shared analytics events used across the four MoonMoon websites:
- `passport`
- `mbti_lab`
- `moon_map`
- `dessert_booking`

## Naming Rules
- Use `snake_case` for event names and parameters.
- Every event must include `site_id`.
- When linking across sites, include `source_site` and `target_site`.
- If UTM parameters exist, send all available `utm_*` keys.
- `mbti_type` must be uppercase (e.g. `INTJ`).
- `variant` must be `A` or `T`.
- `stamp_id` / `reward_id` must match the constants ID.

## Core Events

| Event Name | Trigger | Required Params | Optional Params |
| --- | --- | --- | --- |
| `utm_landing` | Entry with UTM params | `site_id`, `utm_source`, `utm_medium` | `utm_campaign`, `utm_content`, `utm_term` |
| `page_view` | Page load | `site_id`, `page_id` | `page_title` |
| `quiz_start` | Quiz starts | `site_id`, `quiz_id` | `source` |
| `quiz_complete` | Quiz finishes | `site_id`, `quiz_id`, `mbti_type` | `variant`, `duration_sec` |
| `result_view` | Result shown | `site_id`, `mbti_type` | `variant` |
| `outbound_click` | External link click | `site_id`, `source_site`, `target_site`, `label` | `url`, `utm_*` |
| `universe_nav_click` | Click on any Kiwimu Universe rail link (see below) | `site_id` + the 12 rail fields | |
| `passport_open` | Passport opened | `site_id`, `from_screen` |  |
| `stamp_unlock` | Stamp unlocked | `site_id`, `stamp_id`, `method` | `source` |
| `stamp_claim` | MBTI claim consumed | `site_id`, `status` | `reason` |
| `reward_redeem` | Reward redeemed | `site_id`, `reward_id`, `method` |  |
| `order_start` | Checkout starts | `site_id` | `cart_value`, `items_count`, `mbti_type` |
| `order_submit` | Order submitted | `site_id`, `order_value` | `items_count`, `mbti_type` |
| `qr_scan` | Store QR scanned | `site_id`, `stamp_id` | `location_id` |

## Legacy Mapping (Compatibility)

| Current Event | Target Event | Notes |
| --- | --- | --- |
| `stamp_unlocked` | `stamp_unlock` | Add `method` if possible |
| `stamp_auto_unlocked` | `stamp_unlock` | Use `method=auto` |
| `quiz_started` | `quiz_start` |  |
| `quiz_completed` | `quiz_complete` |  |
| `result_viewed` | `result_view` |  |
| `outbound_click` | `outbound_click` | Add `site_id`, `source_site`, `target_site` |

## Recommended `site_id` values
- `passport`
- `mbti_lab`
- `moon_map`
- `dessert_booking`

## Universe rail: `universe_nav_click`

The shared forest navigation (`components/KiwimuUniverseRail.tsx`, a byte-identical kit shared by all five sites) calls `onTrack('universe_nav_click', details)` on every rail link click: the five sites, the forest exhibition link, the link that points at the current site, and the links inside the mobile "更多" panel. Map's `onTrack` is `trackEvent` (`lib/crossSiteTracking.ts`), which sends it through `gtag('event', ...)` and adds `site_id: 'moon_map'`. The rail does not send `outbound_click` any more. Errors in `onTrack` are swallowed and the link is never `preventDefault`ed.

| Param | Value |
| --- | --- |
| `source_site` | `map` |
| `target_site` | `kiwimu` / `passport` / `map` / `gacha` / `shop` / `canopy` |
| `viewport` | e.g. `390x844` |
| `viewport_width`, `viewport_height` | numbers |
| `viewport_category` | `mobile` (<=640) / `tablet` (<=1024) / `desktop` / `unknown` |
| `login_status` | `authenticated` / `anonymous` / `unknown` (read once at mount from map's own supabase client; `unknown` when no client or on error) |
| `surface` | `universe_rail` |
| `link_name` | `MBTI` / `Passport` / `Map` / `Gacha` / `Shop` / `Canopy` |
| `entry_surface` | `universe_rail` (same as `surface`) |
| `destination_type` | `cross_site_nav` (the five sites) / `external` (forest exhibition) |
| `transport_type` | `beacon` |

- Cross-site links carry `?from=map_universe_rail`; the link to the current site and the forest exhibition link do not.
- The event is also sent for the current-site link (`source_site` = `target_site`). Filter with `source_site != target_site` when counting cross-site navigation.
- `login_status` is read once when the rail mounts and cached; a login or logout inside the same page view shows up on the next page load.

