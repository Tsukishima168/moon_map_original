# Map Current

## 2026-10-07｜主對話收尾｜本機驗證完成，待獨立簽收與上線核定

- ✅ 主對話覆讀4檔diff，actual-source登入／未知商品名稱、取貨／訂單／LIFF不變性、JSON-LD營業與12px／對比檢核通過。本機首頁／菜單四種寬度無水平溢出與可見破圖。
- ⚠️ 本機menu採未改的public/menu.json備援，不能稱為正式商品／库存驗收。LIFF舊endpoint是SDK警告來源，不是本輪Console讀回；需授權者核對ID2008848603-ANGQX0GN的endpoint是否為https://map.kiwimu.com/。
- ⚠️ 因帳戶額度限制，最終patch尚未獨立簽收；未定位／QR／獎勵／下單／登入或改LINE設定。
- 📌 最終交付索引與hash：/Users/pensoair/.codex/visualizations/2026/10/07/kiwimu-public-copy-repair/map/final-manifest.json；原作者證據保留為歷史，新的final-manifest才是送審版本。未部署；合併上線需Penso同意。


Last updated: 2026-10-07

## 公開文案與可讀性修正 · 2026-10-07（本地已驗，尚未部署）

- 已修正品牌引語／頁尾附註對比（5.141:1／12.469:1），將 20 處 inline 與 5 處季節 CSS 小字提高至 12px；共用 rail／裝飾圓點維持原規格。
- 內部「PROJECT LOADING」、未提供規格、未取得 MBTI 結果與未開放限定內容皆改成顧客指引；第三方登入錯誤與未知甜點 ID 不再直接顯示原始診斷或編碼。保留已知瀏覽器阻擋／關閉視窗提示。
- 分支：`codex/map-public-copy-repair-20261007`，fresh `origin/main` 基線 `de3783f2720cc5333530b471598c81e9f9bd5b38`；canonical repo 的三份 untracked script 副本保留。
- 營業時間採 Tsuki-SSOT `06_行銷企劃/LINE官方帳號_漏斗與設定_2026-10-02.md:44–46` 同日核准值：週一公休；週二至五 13:00–18:00；週六日 11:00–18:00。只同步公開資訊／SEO，取貨日期排程未改。
- LIFF 後續：`CONFIG.LINKS.liff_id = 2008848603-ANGQX0GN`；主審查觀察到 LINE endpoint 為 `https://moon-map-original.vercel.app/`，建議正式 endpoint 為 `https://map.kiwimu.com/`。設定屬 LINE 後台，本輪未登入／讀回／調整，也未消音 SDK 警告；ID 與初始化碼未改。
- 作者驗證：`tsc --noEmit --pretty false`、`npm run vercel-build`、entry_from／attribution／5 案 actual-handler logout 全部通過。交付腳本另驗四案登入文字、未知甜點 ID、營業／JSON-LD、既有訂單／集章／定位／取貨排程／LIFF 程式碼不變、12px 宣告與對比；loopback `/`、`/menu`、`/menu.json` HTTP 200。
- 主審查已回報本地首頁 320／390／768／1280px：橫向溢出 0、可見破圖 0、rail 外小於 12px 文字 0。此為瀏覽器尺寸模擬；fresh-context source review、真人 LINE／iPhone 與正式環境驗收仍待進行。
- 本機菜單資料明列：Vite `/api/menu` 回 `text/javascript` 而非 JSON，前端走未改的 `public/menu.json` 靜態備援（可見舊品名「奶酒提拉米蘇」「原味巴斯克」）。本地 `/menu` 只驗備援版面，不是正式即時商品／庫存簽收；破圖 0 也不代表每個商品有照片。未讀取／修改 env 或改動商品、圖片、價格。
- 交付：`/Users/pensoair/.codex/visualizations/2026/10/07/kiwimu-public-copy-repair/map/delivery-index.md`；私有 loopback 預覽 `http://127.0.0.1:5237/`。未 commit／push／部署，未使用正式登入／定位／訂單／付款／抽獎／點數／DB／Email 或修改 env／正式設定。

## Hero CTA 對齊修正 · 2026-09-17

- 修正桌機版 Hero 下方 5 張 CTA 卡片整組偏右：`.season04-actions` 寬度大於外層 `.container` 時，`margin: auto` 不會可靠置中；已改成與 Hero stage 一致的 `margin-left: 50%` + `translateX(-50%)` 視覺置中。
- 驗證：`tsc --noEmit` 0 錯誤、`npm run vercel-build` 成功；本機 1440px、1976px 寬螢幕與 390px 手機截圖檢查正常。

## 播放清單頁籤 · 2026-09-16

- SPOTIFY 區塊從寫死的單一 iframe 改成八張歌單的頁籤切換。新增 `SPOTIFY_PLAYLISTS` 常數（id／中文名／英文名／說明）與 `activePlaylist` state；標題、說明、iframe src 全部跟著頁籤動。
- 無障礙：`role="tablist"` + `aria-selected` + roving tabindex，左右方向鍵可切換；iframe 外層為 `role="tabpanel"`。
- 樣式 `.season04-playlist-tabs` / `.season04-playlist-tab` 加在 `styles/window-plan.css`，顏色全部沿用既有 `--window-*` token，未新增色值。說明段落加 `min-height: 2.4em` 防止切換時版面跳動。
- 驗證：`tsc --noEmit` 0 錯誤、`npm run build` 成功、console 無錯誤、切換後標題／說明／iframe src／aria-selected 全部同步、375px 無水平溢出且頁籤橫向可捲、embed 實測載入（含封面與曲目）。
- Footer 的 Spotify 入口改為站內 `#spotify-section` 八歌單區塊，不再外連單一歌單；避免把「月島工作歌單牆」誤解成只有第一張播放清單。
- **踩到的坑（重要）**：`dde58ed`（09-15）上線時嵌的 `1Cw8MbGrZgQHHJngRhzX0O` 當時是**私人**清單，Spotify 私人歌單的 embed 對訪客不顯示，該區塊從 09-15 到 09-16 對所有訪客是空的。09-16 將八張全部改為公開後才正常。**日後任何要 embed 的歌單，建立時就必須是公開。**
- KIWIMU 這個 Spotify 帳號定位為甜點店對外分享用，因此七張工作狀態歌單公開於站上屬預期行為，非誤設。

## 補記：2026-07-16 之後未入帳的 commit

- `15c64a2`（08-23）埋入 LINE Tag base code（LINE Ads pv 追蹤）
- `d2e2aae`（08-27）map 的 Supabase client 明確指定 `flowType: pkce`
- `dde58ed`（09-15）上線綠色甜點目錄與新歌單
- `48dd3bf` / `7773bd0`（09-16）第四季命名與版面重心修正
- 以上五筆當時未回寫本檔，於 2026-09-16 補記。細節以 git log 為準。

## Five-site visual system · 2026-07-15

- Added the shared Kiwimu Universe rail and `03 / Island guide` role label while preserving Map's Season 03.5 exhibition identity.
- Fixed rail overlap for the floating bird, egg progress, and reward affordance; removed the redundant iframe `allowFullScreen` attribute because `allow` already grants fullscreen.
- Fresh-context review found that the fixed `/menu` catalog covered the rail; the catalog now begins at `--ku-rail-height` while transactional modals may still cover the rail to preserve their close controls.
- Verified `npx tsc --noEmit --pretty false`, the Vite production build, homepage, `/menu`, desktop and 390px browser QA, active-site centering, and zero page-level horizontal overflow.
- Vite preview still logs the expected `/api/menu` HTML fallback warning because it does not emulate Vercel API routes; production menu behavior was not changed or re-verified in this pass.
- At the 2026-07-15 handoff, no menu/order, reward, Supabase, Discord, or production mutation was executed; later commits supersede that local handoff state, so current Git status remains the source of truth.

## Supabase Migration Ownership — 2026-07-14

- Map 與 Shop 共用 Supabase project `xlqwfaailjyvsycjnzkz`。
- 共用資料庫的可執行 migration 以 `shop-kiwimu-com/supabase/migrations` 為唯一發布來源；本 repo 不再執行 `supabase db push`。
- 原 `consume_mbti_claim` 修正已移至 Shop 的 `20260713000000_fix_mbti_claim_rpc_ambiguity.sql`。
- 原 `20260704130000_harden_shared_order_tables_rls.sql` 已移出 CLI 可執行路徑，僅保留於 `docs/legacy-sql/` 作為 2026-07-04 線上修補的歷史證據。
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
