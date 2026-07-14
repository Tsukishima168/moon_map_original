# Map Current

Last updated: 2026-07-11

## Supabase Migration Ownership — 2026-07-14

- Map 與 Shop 共用 Supabase project `xlqwfaailjyvsycjnzkz`。
- 共用資料庫的可執行 migration 以 `shop-kiwimu-com/supabase/migrations` 為唯一發布來源；本 repo 不再執行 `supabase db push`。
- 原 `consume_mbti_claim` 修正已移至 Shop 的 `20260713000000_fix_mbti_claim_rpc_ambiguity.sql`。
- Map 僅在 `docs/legacy-sql/` 保留歷史參考，不屬於 Supabase CLI 的可執行 migration path。

## Active Mission — 全面升級進化（2026-07-11 開工）

- 目標：map.kiwimu.com 技術債＋體驗細節＋內容一致性全面升級，每個環節（menu／購物車／訂單／MBTI 推薦／SSO／GA4／Discord／SEO／響應式）有實測證據後才算完成。
- 狀態：Phase C 實作中，分支 `feat/full-upgrade-202607`（基線 main @ `526bfd3`，營業時間修正仍未 push）。
- Phase A/B 結論（報告在 session scratchpad 的 audit-repo.md / audit-live.md）：
  - P0×3：verifyTrustedRequest host 自我放行漏洞、map-order 無欄位驗證、全站無 ErrorBoundary
  - P1 主力：假 @vercel/node 型別、a11y 缺口、店址常數前後端重複、無 CI、sanity 死代碼、根目錄 15 個散落 SQL
  - 線上 WARN×5：缺安全 headers、/api/menu 無 CDN 快取、無效 MBTI 回 404、favicon.ico 被 SPA 吞、線上營業時間仍舊值
  - 本輪暫緩（記債）：index.tsx 巨石全拆、三套品名字串映射收斂成 ID-based
- 實作波次全部完成（2026-07-12）：W1 API 加固 ✅ → W2 前端細節 ✅ → W3 倉庫衛生 ✅ → W4+W5 細節加深＋設計收斂 ✅。共 34 commits 已 push `origin/feat/full-upgrade-202607`。
- Phase D 驗證 ✅：本地 8 環節全綠（首頁/menu/fallback 鏈/購物車/head 細節/mobile/tsc/build）；Vercel preview 驗過 API（menu supabase 正源 6 分類、MBTI 400/404 分流、nosniff+referrer-policy、favicon→Cloudinary webp 200）。紅隊（fresh Opus）PASS with nits，nit 已清或記債。
- 追加完成（2026-07-12）：Season 03.5「銀月夜」色系換裝（moonYellow 退場 → moonSilver #C9CDD8／moonShadow #5A6B8C 雙 token、夜藍加深 #1B2340→#111830、對比度全實算）＋入口卡 01-05 排版重整（字級階層、順序歸位、移除 emoji、修 button 置中漂移）。全部已 push，preview 部署 success。
- **已上線（2026-07-12）**：Penso 核可 merge，main @ e844888 部署 production success。線上煙霧測試全綠：營業時間 13:00–18:00 生效、安全 headers×4、MBTI 400 分流、favicon 308→Cloudinary、銀月夜色系上線、/api/menu CDN 快取 GET 實測 HIT（注意：HEAD 請求永遠 MISS，別誤判）。
- 後續待辦：①islandBlue 橘紅要不要跟著冷化（現保留當唯一暖色）；②`gh auth refresh -h github.com -s workflow` 補 scope 後把 CI workflow commit 加回（備份在 session scratchpad/ci.yml）；③production 一筆監督下的標記測試單驗訂單→Supabase→Discord 鏈；④feature branch 可刪（已併入 main）。
- Preview 環境注意：Vercel 會覆蓋 preview 的 Cache-Control（s-maxage 只在 production 生效）；沒設 ALLOWED_PREVIEW_ORIGIN 時 preview 下單/領獎 API 會 401（刻意安全設計）。
- 記債：訂單速率限制、Sentry、index.tsx 巨石全拆、品名映射 ID 化、parseInt NaN 邊界 fallback、letter-spacing 單位統一。
- 設計 DNA 契約已抽取（scratchpad/design-dna.md）：Season 03 色彩/字體/間距/形狀/動效/元件規格＋16 條不一致清單。
- Penso 拍板（2026-07-12）：①蠟封血紅、必填星號紅、三套金色家族、Noto Serif TC 引語體 → 全部維持現狀，視為刻意設計，寫入契約；②訂單速率限制、Sentry → 本輪不開，記債。
- Season 03 主題已上線（bc67a04/20ea6ae 在 origin/main）；營業時間修正待 push。

（以下為 2026-06-04 舊快照，僅供參考）

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
