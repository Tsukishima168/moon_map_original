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

### 設置步驟

1. 在 Vercel Dashboard 中選擇專案
2. 進入 **Settings** → **Environment Variables**
3. 添加上述兩個環境變數
4. 選擇環境：**Production**, **Preview**, **Development**
5. 點擊 **Save**
6. 重新部署（或等待下次自動部署）

## 📋 部署後檢查清單

### 功能測試

- [ ] 網站可以正常訪問
- [ ] 菜單可以正常載入（Supabase 連接正常）
- [ ] 購物車功能正常
- [ ] 結帳流程正常
- [ ] LINE 跳轉功能正常
- [ ] UTM 參數正確儲存
- [ ] 備註欄位正確儲存
- [ ] Drinks 顯示與提示正常

### 調試檢查

1. **打開瀏覽器開發者工具（F12）**
2. **檢查 Console**
   - 應該看到：`Stored UTM params: {...}`
   - 不應該有錯誤訊息

3. **測試訂單流程**
   - 完成一筆測試訂單
   - 檢查 Console 中的：`Order data being saved: {...}`
   - 確認 Supabase 後台資料正確

## 🐛 常見問題

### 問題 1：環境變數未設置

**症狀**：網站無法載入，Console 顯示 Supabase 錯誤

**解決**：在 Vercel 設置中添加環境變數並重新部署

### 問題 2：部署失敗

**症狀**：Vercel 顯示 Build Failed

**檢查**：
1. 確認 `package.json` 中的依賴正確
2. 檢查 Build Logs 中的錯誤訊息
3. 確認 Node.js 版本（建議 18+）

### 問題 3：網站可以訪問但功能異常

**檢查**：
1. 確認環境變數已正確設置
2. 檢查 Supabase 連接是否正常
3. 查看瀏覽器 Console 是否有錯誤

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
