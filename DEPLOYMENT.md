# 部署指南

## ✅ 已完成的步驟

1. **代碼已推送到 GitHub**
   - Repository: `https://github.com/Tsukishima168/moon_map_original.git`
   - Branch: `main`
   - Commit: `d1c26df` - "修復訂單流程：LINE跳轉、UTM參數、備註儲存、Drinks顯示邏輯"

## 🚀 Vercel 自動部署

### 如果 Vercel 已經連接

Vercel 會自動檢測 GitHub push 並觸發部署。通常需要 1-3 分鐘完成。

### 檢查部署狀態

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 找到 `moon_map_original` 專案
3. 查看最新的部署狀態

### 如果 Vercel 尚未連接

1. 前往 [Vercel](https://vercel.com)
2. 點擊 "Add New Project"
3. 選擇 GitHub repository: `Tsukishima168/moon_map_original`
4. 確認以下設置：
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

## 🔐 環境變數設置

在 Vercel 專案設置中，需要添加以下環境變數：

### Supabase 環境變數

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Discord 環境變數（用於訂單通知）

```
DISCORD_TOKEN=your_discord_bot_token
```

**取得 Discord Bot Token 的步驟：**
1. 前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 選擇或建立你的應用程式
3. 進入 **Bot** 選項卡
4. 點擊 **Reset Token** 或直接複製已有的 Token
5. 確保 Bot 具有以下權限：
   - `Send Messages` (傳送訊息)
   - `Read Message History` (讀取訊息歷史)
6. 邀請 Bot 加入你的 Discord 伺服器

**訂單通知頻道 ID**：
- 目前設定為：`1451819433432580202` (月島訂單通知頻道)
- 可在 `api/notify-discord-order.ts` 中修改 `CHANNEL_ID`

### 設置步驟

1. 在 Vercel Dashboard 中選擇專案
2. 進入 **Settings** → **Environment Variables**
3. 依次添加：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `DISCORD_TOKEN` ⭐ 新增
4. 選擇環境：**Production**, **Preview**, **Development**（建議全選）
5. 點擊 **Save**
6. 重新部署（或等待下次自動部署）

## 📋 部署後檢查清單

### 功能測試

- [ ] 網站可以正常訪問
- [ ] 菜單可以正常載入（Supabase 連接正常）
- [ ] 購物車功能正常
- [ ] 結帳流程正常
- [ ] **Discord 訂單通知正常傳送到 #月島訂單通知 頻道** ⭐ 新增
- [ ] LINE 跳轉功能正常
- [ ] UTM 參數正確儲存
- [ ] 備註欄位正確儲存
- [ ] Drinks 顯示與提示正常

### 調試檢查

1. **打開瀏覽器開發者工具（F12）**
2. **檢查 Console**
   - 應該看到：`Stored UTM params: {...}`
   - 不應該有錯誤訊息
   - 應該看到：`[DISCORD][ORDER] ✅ Order notification sent:` (若 DISCORD_TOKEN 已設置)

3. **測試訂單流程**
   - 完成一筆測試訂單
   - 檢查 Console 中的：`Order data being saved: {...}`
   - 確認 Supabase 後台資料正確
   - **檢查 Discord #月島訂單通知 頻道是否收到訂單通知** ⭐ 新增

## 🐛 常見問題

### 問題 1：環境變數未設置

**症狀**：網站無法載入，Console 顯示 Supabase 錯誤

**解決**：在 Vercel 設置中添加環境變數並重新部署

### 問題 2：訂單未通知到 Discord

**症狀**：
- 訂單成功建立在 Supabase，但 Discord #月島訂單通知 頻道沒有收到消息
- Console 顯示：`[DISCORD][ORDER] ❌ DISCORD_TOKEN not configured`

**解決步驟**：
1. ✅ 確認已在 Vercel 環境變數中設置 `DISCORD_TOKEN`
2. ✅ 確認 `DISCORD_TOKEN` 值正確（複製時避免空格）
3. ✅ 確認 Discord Bot 已加入目標伺服器
4. ✅ 確認 Bot 對目標頻道有「傳送訊息」權限
5. ✅ 在 Vercel Dashboard 中重新部署（或推送新 commit）
6. ✅ 等待 1-3 分鐘讓部署完成
7. ✅ 完成一筆新訂單測試

**驗證 Bot 權限**：
- 在 Discord 伺服器中，右鍵點擊目標頻道 → 編輯頻道 → 權限
- 找到你的 Bot 帳號，確保以下權限已啟用：
  - ✅ 檢視頻道
  - ✅ 傳送訊息
  - ✅ 嵌入連結
  - ✅ 讀取訊息歷史

### 問題 3：部署失敗

**症狀**：Vercel 顯示 Build Failed

**檢查**：
1. 確認 `package.json` 中的依賴正確
2. 檢查 Build Logs 中的錯誤訊息
3. 確認 Node.js 版本（建議 18+）

### 問題 4：網站可以訪問但功能異常

**檢查**：
1. 確認環境變數已正確設置（包括 DISCORD_TOKEN）
2. 檢查 Supabase 連接是否正常
3. 查看瀏覽器 Console 是否有錯誤
4. 完成一筆訂單測試，檢查 Discord 是否收到通知

## 📊 部署資訊

- **GitHub Repository**: https://github.com/Tsukishima168/moon_map_original
- **Vercel 配置檔案**: `vercel.json`
- **Build 工具**: Vite
- **Framework**: React + TypeScript

## 🔄 自動部署流程

```
Git Push → GitHub → Vercel Webhook → 自動 Build → 自動 Deploy
```

每次 push 到 `main` 分支時，Vercel 會自動：
1. 檢測變更
2. 執行 `npm install`
3. 執行 `npm run build`
4. 部署到生產環境

## 📝 下次更新流程

1. 修改代碼
2. `git add .`
3. `git commit -m "更新說明"`
4. `git push origin main`
5. Vercel 自動部署（1-3 分鐘）

---

**最後更新**：2026年1月28日  
**部署狀態**：✅ 已推送到 GitHub，等待 Vercel 自動部署
