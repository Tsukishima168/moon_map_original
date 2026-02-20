# 🤖 Discord 訂單通知檢查清單

## ✅ 當前實現狀態

### 訂單流程（index.tsx）
- **第 943 行**：`confirmAndSend()` 函數正確呼叫 `/api/notify-discord-order`
- **目的地**：直接發送到 Discord #月島訂單通知 頻道（ID: `1451819433432580202`）
- **不會重定向到 results 頻道**：訂單完成後只會重定向到 LINE 訊息或桌面成功頁面

### Discord API 實現（api/notify-discord-order.ts）
- ✅ **頻道ID**：`1451819433432580202` (月島訂單通知頻道，非 results)
- ✅ **消息格式**：完整的訂單資訊（訂單號、客戶、金額、商品、取貨日期、備註）
- ✅ **時間戳記**：包含台灣時區的建立時間
- ✅ **錯誤處理**：即使訊息發送失敗也不會中斷前端流程
- ✅ **日誌記錄**：完整的成功/失敗記錄便於除錯

---

## 🔧 必要的 Vercel 環境變數設置

### 當前狀態：⚠️ **可能未設置**

要使 Discord 訂單通知功能正常運作，需要在 Vercel 中設置：

```
DISCORD_TOKEN = your_discord_bot_token_here
```

### 設置步驟

1. **取得 Discord Bot Token**
   - 前往 [Discord Developer Portal](https://discord.com/developers/applications)
   - 選擇應用程式 → Bot 選項卡
   - 複製 Token（不要共享！）

2. **在 Vercel 中添加環境變數**
   - 打開 Vercel Dashboard
   - 進入 `moon_map_original` 專案
   - Settings → Environment Variables
   - 新增：`DISCORD_TOKEN` = `你的token`
   - 選擇所有環境（Production, Preview, Development）

3. **確保 Bot 有權限**
   - Bot 已加入 Discord 伺服器
   - Bot 對 #月島訂單通知 頻道有「發送訊息」權限

4. **重新部署**
   - Vercel 會自動重新部署
   - 或者推送新 commit 觸發部署

---

## 🧪 測試 Discord 訂單通知

### 測試步驟

1. **確保環境變數已設置**（見上文）
2. **完成一筆測試訂單**
   - 選擇商品並加入購物車
   - 點擊結帳
   - 填寫客戶資訊並提交

3. **檢查 Console 日誌**
   - 打開瀏覽器 F12 開發者工具
   - 應該看到：`[DISCORD][ORDER] ✅ Order notification sent: {...}`
   - 如果看到：`[DISCORD][ORDER] ❌ DISCORD_TOKEN not configured` → 環境變數未設置

4. **檢查 Discord 頻道**
   - 在 Discord 伺服器中進入 #月島訂單通知 頻道
   - 應該看到新的訂單通知消息

### 預期的 Discord 消息格式

```
📦 **有新的月島訂單來自 moon_map_menu！**

🧾 訂單編號：`20260219-ABC123`
👤 訂購人：張三 (0912345678)
💰 總金額：$1200
🗓 取貨日期：2026-02-22

🧁 訂購內容：
• 季節限定甜點 | 6入禮盒 x 1
• 伯爵紅茶戚風 | 一份 x 1

📝 備註：請不要放辣醬

⏰ 建立時間：2026/2/19 下午3:45:30
```

---

## 🚨 常見問題排除

### 問題：Discord 沒有收到訂單通知

**檢查清單**：
- [ ] DISCORD_TOKEN 已在 Vercel 環境變數中設置
- [ ] 複製 token 時沒有多餘空格
- [ ] Vercel 已完成部署（檢查 Deployments 頁面）
- [ ] 訂單確實已建立在 Supabase（檢查資料庫）
- [ ] Bot 已加入 Discord 伺服器
- [ ] Bot 對目標頻道有發送訊息權限
- [ ] 瀏覽器 Console 沒有錯誤訊息

### 問題：Console 顯示「DISCORD_TOKEN not configured」

**原因**：環境變數未設置或部署未更新

**解決**：
1. 再次檢查 Vercel 環境變數
2. 確認 token 值正確複製（無空格）
3. 強制重新部署：在 Vercel Dashboard 找到專案，點擊 Redeploy

### 問題：訂單已建立但 Discord 通知失敗

**這是正常的！** 
- 訂單流程不會因為 Discord 通知失敗而中斷
- 用戶仍會被重定向到 LINE 訊息（PC）或桌面成功頁面（手機）
- 檢查 Vercel 函數日誌了解失敗原因

---

## 📋 代碼引用

### 訂單提交流程
**檔案**：[index.tsx](index.tsx#L943)
**行數**：943-958
**功能**：在訂單成功建立後，非同步呼叫 Discord 通知 API

### Discord 通知 API
**檔案**：[api/notify-discord-order.ts](api/notify-discord-order.ts)
**功能**：
- 接收前端的訂單資訊
- 建立格式化的 Discord 消息
- 發送到指定的 Discord 頻道

---

## 📊 版本信息

- **更新時間**：2026年2月19日
- **月島甜點店版本**：Moon Map Original
- **Discord API 版本**：v10
- **月島訂單通知頻道 ID**：1451819433432580202

---

**重點提醒**：✨
> 訂單通知在 **Vercel 後端** 通過 Discord API 發送，是異步非阻塞的。
> 即使 Discord 通知失敗，**訂單仍會成功建立** 並重定向用戶到 LINE。
> 因此不會有訂單遺失的風險，只是無法在 Discord 即時看到。
