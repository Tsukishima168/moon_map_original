# BOOT.md — Moon Map (map.kiwimu.com) · 交接快照

> 每次新開對話，先讀這份文件，快速掌握本專案的最新狀態。
> 本機 canonical repo 路徑：`/Users/pensoair/Desktop/Web-Projects/sites/map-kiwimu-com`
> GitHub remote 目前仍為：`Tsukishima168/moon_map_original`

---

## 交接快照 · 2026-04-07

### 專案狀態
- **架構：** 純 Vite + React SPA（`index.tsx` 約 5,000 行），無框架。
- **部署：** Vercel，`main` 分支自動部署，網域 `map.kiwimu.com`。
- **訂單 API：** `api/map-order.ts`（Vercel Function，直連 moonisland Supabase）。
- **菜單資料：** `/api/menu`（proxy 到 `shop.kiwimu.com/api/menu/categories`）優先，`public/menu.json` 作為 fallback。

### 菜單架構（2026-04-07 起）
`/menu` 現在會先讀同域的 `api/menu`，再由該 endpoint proxy 到 `shop.kiwimu.com/api/menu/categories`。
- live 商品、價格、上下架狀態以 `shop` 為主
- `public/menu.json` 仍保留，作為 fallback 與 map 顯示層 metadata（名稱、描述、圖片 key、分類文案）來源
- 如果 shared source 失敗，前端仍會回退到 `public/menu.json`
- 菜單整合尚未完全收斂，**不能把 `public/menu.json` 當作唯一真相，也還不能直接刪**

### Git 狀態
- branch: `main`
- HEAD: 以當前 `git rev-parse --short HEAD` 為準
- working_tree: 不保證乾淨，先看 `git status`
- origin: 不保證同步，先看 `git status -sb`

### 菜單整合現況
1. `map/menu` 已切成 shared source + fallback
2. `map` 現在走 `shop /api/menu/categories` 這條 grouped display contract；`shop /api/menu` 仍保留給 commerce 自己的平面商品流
3. `public/menu.json` 仍是必要依賴，因為 map 仍用它承載展示層 metadata
4. 根目錄重複的 `menu.json` 已退役，不再保留第二份靜態真相

### 結帳流程（2026-03-20 已完成）
即使 `api/map-order` 寫入 DB 失敗，**前端依舊強制跳 LINE**，不漏接任何訂單。

### 待辦
- 把 `map` 需要的 display contract 正式從 shared source 提供，不再散落在前端常數與 `public/menu.json`
- 等 parity 檢查完成後，再決定 `public/menu.json` 是否退役
- `index.tsx` 技術債（巨石架構，未來可拆元件）
