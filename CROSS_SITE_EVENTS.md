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
