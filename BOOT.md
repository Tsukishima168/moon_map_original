# BOOT.md — Moon Map (map.kiwimu.com) · 交接快照

> 每次新開對話，先讀這份文件，快速掌握本專案 (moon_map_original) 的最新狀態。

---

## 交接快照 · 2026-03-21

### 專案狀態
- **架構：** 純 Vite + React SPA（`index.tsx` 約 5,000 行），無框架。
- **部署：** Vercel，`main` 分支自動部署，網域 `map.kiwimu.com`。
- **訂單 API：** `api/map-order.ts`（Vercel Function，直連 moonisland Supabase）。
- **菜單資料：** `public/menu.json`（靜態，與 shop DB 完全解耦）。

### 菜單架構（2026-03-21 完成解耦）
`/menu` 現在直接讀取本機的 `public/menu.json`，**不再依賴 `shop.kiwimu.com`**。
- shop 掛掉 → map/menu 完全不受影響
- 菜單要更新 → 改 `public/menu.json` → commit → push → Vercel 自動部署

### Git 狀態
- branch: `main`
- HEAD: `1bddb2b`（fix(menu): decouple from shop API）
- working_tree: clean
- origin: in sync

### 已修復的 Bug（2026-03-21）
1. 拿掉 `shop.kiwimu.com/api/menu/categories` 依賴
2. 推薦商品 negative margin 破版 → 改用 `outline`
3. 隱藏菜單 `$$160` 雙符號 bug
4. 圖片比例 `height: 200px` → `aspectRatio: 1/1`
5. 加入 `resolveMenuItemImage`（已驗證圖片 key 對照表）

### 結帳流程（2026-03-20 已完成）
即使 `api/map-order` 寫入 DB 失敗，**前端依舊強制跳 LINE**，不漏接任何訂單。

### 待辦
- 菜單有異動時手動更新 `public/menu.json` + commit
- `index.tsx` 技術債（巨石架構，未來可拆元件）
