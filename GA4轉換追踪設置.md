# 🎯 Google Analytics 4 - 轉換追踪設置文檔

## 📊 追踪概覽

本專案已完整整合 GA4 電商轉換追踪，涵蓋用戶從瀏覽到完成訂單的完整購物漏斗。

**Measurement ID**: `G-TMRJ21C1GK`

---

## 🛍️ 電商事件追踪（標準 E-commerce Events）

### 1️⃣ `view_item_list` - 查看商品列表

**觸發時機**：用戶點擊「查看完整菜單」按鈕

**追踪資料**：
```javascript
{
  item_list_name: 'main_menu'
}
```

**用途**：
- 追踪多少用戶查看了菜單
- 計算菜單瀏覽率（訪客 → 瀏覽菜單）

---

### 2️⃣ `add_to_cart` - 加入購物車

**觸發時機**：用戶點擊商品價格標籤，將商品加入購物車

**追踪資料**：
```javascript
{
  currency: 'TWD',
  value: 150,  // 商品單價
  items: [{
    item_name: '經典提拉米蘇',
    item_variant: '200ml',
    price: 150,
    quantity: 1
  }]
}
```

**用途**：
- 追踪哪些商品最受歡迎（加入購物車次數）
- 計算商品吸引力（瀏覽 → 加入購物車）
- 分析不同規格的偏好

---

### 3️⃣ `remove_from_cart` - 從購物車移除

**觸發時機**：用戶再次點擊已選商品的價格標籤（Toggle Off）

**追踪資料**：
```javascript
{
  currency: 'TWD',
  value: 150,  // 商品單價
  items: [{
    item_name: '經典提拉米蘇',
    item_variant: '200ml',
    price: 150,
    quantity: 1
  }]
}
```

**用途**：
- 分析用戶猶豫或改變主意的行為
- 計算購物車放棄率

---

### 4️⃣ `begin_checkout` - 開始結帳

**觸發時機**：用戶點擊購物車中的「前往結帳」按鈕

**追踪資料**：
```javascript
{
  currency: 'TWD',
  value: 500,  // 購物車總金額
  items: [
    {
      item_name: '經典提拉米蘇',
      item_variant: '200ml',
      price: 150,
      quantity: 2
    },
    {
      item_name: '季節限定草莓派',
      item_variant: '8吋',
      price: 200,
      quantity: 1
    }
  ]
}
```

**用途**：
- 計算結帳轉換率（加入購物車 → 開始結帳）
- 分析購物車平均金額
- 追踪多商品組合購買行為

---

### 5️⃣ `purchase` - 完成訂單 ⭐ 核心轉換事件

**觸發時機**：用戶填寫完訂單資料，系統成功儲存到 Supabase 後

**追踪資料**：
```javascript
{
  transaction_id: 'ORD01281708123456',  // 唯一訂單編號
  value: 500,  // 訂單總金額
  currency: 'TWD',
  items: [
    {
      item_name: '經典提拉米蘇',
      item_variant: '200ml',
      price: 150,
      quantity: 2
    },
    {
      item_name: '季節限定草莓派',
      item_variant: '8吋',
      price: 200,
      quantity: 1
    }
  ]
}
```

**用途**：
- ⭐ **最重要的轉換指標** - 計算營收
- 計算整體轉換率（訪客 → 訂單）
- 分析平均訂單金額（AOV）
- 追踪每日/每週/每月營收趨勢
- 評估行銷活動 ROI（配合 UTM 參數）

---

## 🎨 品牌互動事件追踪（Custom Events）

### 6️⃣ `select_state` - 選擇心情狀態

**觸發時機**：用戶在心情測驗中選擇狀態（平靜、焦慮、希望等）

**追踪資料**：
```javascript
{
  state: 'calm'  // calm, anxious, hopeful, thinking, create
}
```

**用途**：
- 追踪用戶互動參與度
- 分析最受歡迎的心情狀態
- 了解用戶情緒分佈

---

### 7️⃣ `view_mission_card` - 查看任務卡

**觸發時機**：用戶選擇心情狀態後，系統顯示對應的任務卡

**追踪資料**：
```javascript
{
  state: 'calm'
}
```

**用途**：
- 追踪任務卡展示率
- 評估互動體驗完整度

---

### 8️⃣ `generate_mission_card` - 生成任務卡

**觸發時機**：用戶點擊「生成任務卡」按鈕下載圖片

**追踪資料**：
```javascript
{
  state: 'calm'
}
```

**用途**：
- 追踪用戶分享意願
- 評估互動功能吸引力
- 計算任務卡生成率（選擇狀態 → 生成卡片）

---

### 9️⃣ `click_easter_egg` - 點擊彩蛋

**觸發時機**：用戶點擊隱藏的 Kiwimu 彩蛋

**追踪資料**：無額外參數

**用途**：
- 追踪深度探索用戶
- 評估品牌故事吸引力

---

### 🔟 導航點擊事件

#### `click_hero_checkin` - 點擊「登島互動」
#### `click_hero_pickup` - 點擊「預訂取貨」
#### `click_hero_delivery` - 點擊「冷凍宅配」

**用途**：
- 追踪首頁三大入口的點擊率
- 優化首頁佈局與文案
- 了解用戶主要需求（互動 vs 購買）

---

## 📈 完整購物漏斗（Conversion Funnel）

```
1. 🌐 訪客到達網站
   ↓
2. 👁️ view_item_list（查看菜單）
   ↓
3. 🛒 add_to_cart（加入購物車）
   ↓
4. 💳 begin_checkout（開始結帳）
   ↓
5. ✅ purchase（完成訂單）⭐
```

### 關鍵轉換率指標

| 轉換階段 | 計算公式 | 目標基準 |
|---------|---------|---------|
| **菜單瀏覽率** | `view_item_list / 總訪客` | > 40% |
| **加入購物車率** | `add_to_cart / view_item_list` | > 30% |
| **結帳啟動率** | `begin_checkout / add_to_cart` | > 50% |
| **訂單完成率** | `purchase / begin_checkout` | > 60% |
| **整體轉換率** | `purchase / 總訪客` | > 3-5% |

---

## 🔗 UTM 參數整合

### 自動追踪來源

系統會自動捕捉並儲存以下 UTM 參數到訂單資料庫：

| 參數 | 用途 | 範例 |
|------|------|------|
| `utm_source` | 流量來源 | `instagram`, `facebook`, `line` |
| `utm_medium` | 行銷媒介 | `social`, `cpc`, `post` |
| `utm_campaign` | 活動名稱 | `season04_launch`, `mothers_day` |
| `utm_content` | 內容標識 | `story_ad`, `feed_post` |
| `utm_term` | 關鍵字 | `dessert`, `tiramisu` |

### 建議的 UTM 使用場景

#### Instagram 貼文
```
https://moon-island.vercel.app?utm_source=instagram&utm_medium=social&utm_campaign=season04_launch&utm_content=feed_post
```

#### Facebook 廣告
```
https://moon-island.vercel.app?utm_source=facebook&utm_medium=cpc&utm_campaign=mothers_day&utm_content=carousel_ad
```

#### LINE 官方帳號訊息
```
https://moon-island.vercel.app?utm_source=line&utm_medium=message&utm_campaign=new_menu&utm_content=push_notification
```

---

## 📊 在 GA4 中查看數據

### 1. 即時報表（Real-time Report）

**路徑**：GA4 首頁 → 報表 → 即時

**可查看**：
- 目前活躍用戶數
- 正在瀏覽的頁面
- 即時觸發的事件

**用途**：測試追踪是否正常運作

---

### 2. 電子商務購買報表

**路徑**：GA4 → 報表 → 營利 → 電子商務購買情形

**可查看**：
- 總營收（Total Revenue）
- 交易次數（Transactions）
- 平均訂單金額（Average Purchase Revenue）
- 熱銷商品排行（Items）

---

### 3. 轉換漏斗分析

**路徑**：GA4 → 探索 → 建立新的探索 → 漏斗探索

**建議設定**：
```
步驟 1: page_view (任何頁面)
步驟 2: view_item_list
步驟 3: add_to_cart
步驟 4: begin_checkout
步驟 5: purchase
```

**可查看**：
- 每個步驟的流失率
- 完整漏斗轉換率
- 瓶頸分析（哪一步流失最多）

---

### 4. UTM 來源分析

**路徑**：GA4 → 報表 → 流量開發 → 流量贏取

**可查看**：
- 不同來源的訪客數
- 各來源的轉換率
- 各來源的營收貢獻

**進階篩選**：
- 依 `utm_campaign` 比較不同活動效益
- 依 `utm_medium` 比較不同媒介效果

---

## 🎯 設定 GA4 轉換目標

### 步驟

1. **進入 GA4 管理介面**
   - 點擊左下角「管理」
   - 選擇「事件」

2. **將 `purchase` 標記為轉換**
   - 找到 `purchase` 事件
   - 開啟「標記為轉換」

3. **（可選）設定其他轉換目標**
   - `begin_checkout` - 追踪結帳啟動
   - `generate_mission_card` - 追踪互動深度

---

## 🧪 測試追踪是否正常

### 測試清單

- [ ] **1. 安裝 GA Debugger 擴充功能**
  - Chrome: [Google Analytics Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna)

- [ ] **2. 開啟瀏覽器開發者工具**
  - 按 F12
  - 切換到「Console」分頁

- [ ] **3. 執行完整購物流程**
  - 進入網站
  - 點擊「查看完整菜單」
  - 選擇商品加入購物車
  - 點擊「前往結帳」
  - 填寫訂單資料並提交

- [ ] **4. 檢查 Console 是否有追踪記錄**
  - 應該看到類似 `[Track] view_item_list` 的訊息
  - 應該看到 `[Track] add_to_cart`
  - 應該看到 `[Track] begin_checkout`
  - 應該看到 `[Track] purchase`

- [ ] **5. 在 GA4 即時報表中確認**
  - 登入 GA4
  - 進入「即時」報表
  - 確認能看到自己的活動
  - 確認事件有正確記錄

---

## 📋 後續優化建議

### 短期（1-2 週）

1. **設定自訂報表**
   - 建立每日營收儀表板
   - 建立商品銷售排行報表

2. **設定警示**
   - 當日訂單數異常低時發送通知
   - 轉換率大幅下降時發送警示

### 中期（1 個月）

1. **A/B 測試追踪**
   - 測試不同商品圖片的影響
   - 測試不同文案的轉換率

2. **受眾分析**
   - 建立「高價值客戶」受眾（訂單金額 > 500）
   - 建立「購物車放棄」受眾（加入購物車但未結帳）

3. **再行銷活動**
   - 針對購物車放棄用戶推送提醒
   - 針對高價值客戶推送新品

### 長期（3 個月）

1. **整合其他數據源**
   - 連結 LINE OA 數據
   - 連結 Supabase 後台數據

2. **機器學習預測**
   - 使用 GA4 的預測指標
   - 識別高轉換潛力的訪客

---

## ❓ 常見問題

### Q1: 為什麼 GA4 報表中看不到數據？

**可能原因**：
1. 追踪代碼剛部署，數據需要 24-48 小時才會顯示在標準報表（但即時報表應立即可見）
2. 瀏覽器安裝了廣告攔截器
3. Measurement ID 設定錯誤

**解決方式**：
- 先檢查「即時」報表
- 關閉廣告攔截器測試
- 檢查 Console 是否有錯誤訊息

---

### Q2: purchase 事件有觸發但金額為 0？

**可能原因**：
- 商品價格解析失敗（價格格式問題）

**解決方式**：
- 檢查 Console 的 `[Track] purchase` 訊息
- 確認 `value` 和 `items[].price` 是否正確

---

### Q3: 如何排除自己的訪問數據？

**方式 1：使用內部流量篩選器（推薦）**
1. GA4 → 管理 → 資料串流 → 設定
2. 新增「內部流量定義」
3. 輸入你的 IP 位址
4. 在「資料篩選器」中啟用

**方式 2：使用瀏覽器擴充功能**
- 安裝「Block Yourself from Analytics」

---

## 📞 技術支援

如有追踪相關問題，請檢查：

1. **瀏覽器 Console**（F12 → Console）
   - 查看 `[Track]` 開頭的訊息
   - 查看是否有 JavaScript 錯誤

2. **Network 面板**（F12 → Network → 搜尋 "collect"）
   - 查看是否有請求發送到 `google-analytics.com`
   - 檢查請求參數是否正確

3. **GA4 即時報表**
   - 確認事件是否有即時出現

---

## ✅ 追踪狀態總結

| 事件類型 | 事件名稱 | 狀態 |
|---------|---------|------|
| 電商 | `view_item_list` | ✅ 已設置 |
| 電商 | `add_to_cart` | ✅ 已設置 |
| 電商 | `remove_from_cart` | ✅ 已設置 |
| 電商 | `begin_checkout` | ✅ 已設置 |
| 電商 | `purchase` ⭐ | ✅ 已設置 |
| 互動 | `select_state` | ✅ 已設置 |
| 互動 | `view_mission_card` | ✅ 已設置 |
| 互動 | `generate_mission_card` | ✅ 已設置 |
| 導航 | `click_hero_*` | ✅ 已設置 |
| 彩蛋 | `click_easter_egg` | ✅ 已設置 |

---

**最後更新**：2026-01-28  
**負責人**：AI Assistant  
**GA4 Property ID**：G-TMRJ21C1GK
