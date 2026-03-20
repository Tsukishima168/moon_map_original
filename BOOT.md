# BOOT.md — Moon Map (map.kiwimu.com) · 交接快照

> 每次新開對話，先讀這份文件，快速掌握本專案 (moon_map_original) 的最新狀態。

---

## 交接快照 · 2026-03-20 緊急修復 (Hotfix)

### 🚨 今日背景與處理重點
主力成交的靜態選單頁「甜點目錄 (`/menu`)」因後方依賴的 API `shop.kiwimu.com` (500 錯誤/CORS) 而發生**全白畫面**及**阻斷結帳跳轉**的嚴重問題。
今天已完成前端的緊急止血（**完全解耦與兜底防護**），確保流量與轉單不受任何後端異常影響。

### ✅ 今日完成項目 (已推上 `main` 且 Vercel 自動部署完成)

1. **`/menu` 靜態菜單備援 (Fallback) 機制**
   - 新增 `menuError` 狀態。當 API (GET `/api/menu/categories`) 失敗時，自動退回讀取本地的 `public/menu.json` 靜態檔。
   - 保證了 `/menu` 頁面不管 API 死活都能顯示出精美的圖文目錄。
   - **防呆 UI**：一旦觸發 fallback，會在畫面上方顯示**黃色警告橫幅**「目前使用離線菜單...」並附上綠色的「LINE ➔」引導點擊。
   - **完全斷線防禦**：如果連 fallback json 都失敗（機率極低），畫面會顯示友善的「菜單暫時無法載入」並放上巨大 LINE 按鈕，堅守最後轉換。

2. **結帳 Checkout 強制跳轉 LINE (解開依賴)**
   - 修正了原本 `index.tsx` 中 `confirmAndSend` 在 POST `/api/map-order` 失敗時會 `return` 中斷程式碼的 bug。
   - 現在改成即使訂單不寫入 DB，**前端依舊會把整串客戶填寫資料（姓名/電話/取貨日/購物車內容）串好 LINE Url Schema**，並強制導向給 LINE 客服。不漏接任何實質訂單。

### 🔄 專案狀態 (moon_map_original)
- **架構特徵：** 單檔開發為主 (`index.tsx` 將近 5,000 行），沒有使用 Next.js 等框架，為純 Vite + React 應用。
- **後台依賴：** 訂單資料庫與菜單 API 由另一專案 `Dessert-Booking` 支援。
- **目前分流狀態：** `/menu` 現正面臨 `shop.kiwimu.com` 的連線阻礙，但在本次 Hotfix 後，能穩定提供純前端導購（跳 LINE）服務。

### 📝 待辦推薦清單 (Next Steps)
對於下一手 AI / 開發者的建議：
1. **跨站維修**：等待主理人指示前往 `Dessert-Booking` 專案排除導致 500 Error 的 Server 問題。
2. **技術債清理**：未來若有空，可以拆分 `index.tsx` 的巨石架構，把 Menu Overlay 與 Checkout Modal 抽離成獨立的 React 元件。
