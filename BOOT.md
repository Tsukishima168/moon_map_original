# BOOT.md — Moon Map (map.kiwimu.com) · 交接快照

> 每次新開對話，先讀這份文件，快速掌握本專案的最新狀態。
> 本機 canonical repo 路徑：`/Users/pensoair/Desktop/Web-Projects/sites/map-kiwimu-com`
> GitHub remote 目前仍為：`Tsukishima168/moon_map_original`

---

## 交接快照 · 2026-04-18

### 專案狀態
- **架構：** 純 Vite + React SPA（`index.tsx` 約 5,000 行），無框架。
- **部署：** Vercel，`main` 分支自動部署，網域 `map.kiwimu.com`。
- **訂單 API：** `api/map-order.ts`（Vercel Function，直連 moonisland Supabase）。
- **菜單資料：** `/api/menu` 目前會優先讀 moonisland Supabase canonical menu，再回退到 `shop.kiwimu.com/api/menu/categories`，最後才回退 `public/menu.json`。
- **MBTI 商品映射：** `/api/mbti-dessert` 會直讀 Supabase `mbti_menu_links` + `menu_items`，回傳 canonical MBTI 推薦商品。
- **驗證狀態：** 2026-04-18 本地 `npx tsc --noEmit` 與 `npm run build` 通過。

### 菜單架構（當前）
`/menu` 現在會先讀同域的 `api/menu`。
- `api/menu.ts` 會先讀 Supabase canonical product tables（`menu_categories` / `menu_items` / `menu_variants`）
- 若 Supabase canonical source 暫時不可用，才回退到 `shop.kiwimu.com/api/menu/categories`
- `api/menu.ts` 會在 server 端把 live menu 與本地 display metadata / item aliases merge 成 UI-ready payload
- 已預留可選的 Supabase display config（`site_category_configs` / `site_item_configs`），但需顯式開啟 `ENABLE_SUPABASE_MENU_DISPLAY_CONFIG` 才會生效；預設不影響目前線上主站
- `public/menu.json` 仍保留，作為 fallback 與 map 顯示層 metadata（名稱、描述、圖片 key、分類文案）來源
- 如果 shared source 失敗，`api/menu` 會先回退到靜態菜單；若整個 API 不可用，前端仍會再回退到 `public/menu.json`
- 菜單整合尚未完全收斂，**不能把 `public/menu.json` 當作唯一真相，也還不能直接刪**
- runtime 真相以 `api/menu.ts`、`index.tsx`、`docs/2026-04-07-backend-data-flow-inventory.md` 為主；`docs/2026-04-07-menu-data-alignment.md` 是對齊快照，不是唯一架構說明

### Git 狀態
- branch: `main`
- HEAD: 以當前 `git rev-parse --short HEAD` 為準
- working_tree: 不保證乾淨，先看 `git status`
- origin: 不保證同步，先看 `git status -sb`

### 菜單整合現況
1. `map/menu` 已切成 shared source + fallback
2. `map` 現在以 Supabase canonical product tables 為商品主源；`shop /api/menu/categories` 已降為 server-side fallback
3. menu merge 已收回 server 端，前端不再自行抓 `menu.json` 做 merge
4. MBTI 商品映射已改由 `/api/mbti-dessert` 讀 Supabase canonical mapping；前端本地常數只保留人格文案與 fallback 順序
5. `public/menu.json` 仍是必要依賴，因為 map 仍用它承載展示層 metadata 與 fallback
6. 真正的 DB `menu_item_id` 尚未由 upstream shared payload 帶出，這是下一階段的跨 repo contract 工作
7. 根目錄重複的 `menu.json` 已退役，不再保留第二份靜態真相
8. README 與交接文件已更新，不應再把「購物車仍在規劃中」當成現況

### 結帳流程（2026-03-20 已完成）
即使 `api/map-order` 寫入 DB 失敗，**前端依舊強制跳 LINE**，不漏接任何訂單。

### 待辦
- 把 `map` 需要的 display metadata 正式從 shared source 提供，不再散落在 `public/menu.json`
- 讓 upstream shared menu payload 直接帶出真實 `menu_item_id`
- 跑一次完整營運 QA：live menu -> checkout -> Supabase -> Discord -> GA4
- 等 parity 檢查完成後，再決定 `public/menu.json` 是否退役
- `index.tsx` 技術債（巨石架構，未來可拆元件）
