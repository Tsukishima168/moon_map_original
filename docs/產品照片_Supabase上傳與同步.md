# 產品照片上傳 Supabase 與 moon_map_original 同步指南

專案選單圖片來自 Supabase 的 `menu_items.image`（完整 URL）。此流程說明如何把產品照片上傳到 Supabase Storage，並讓網頁與資料庫同步顯示。

**共用圖床**：**Dessert-Booking** 與本專案使用**同一個 Supabase 圖床**（bucket：`moon-island-assets`，路徑：`menu-items/`），且讀取同一張表 `menu_items`。只要依本文件上傳並更新 `menu_items.image`，**moon_map_original** 與 **Dessert-Booking** 都會自動顯示同一批產品照片。

---

## 一、整體流程

```
1. 準備照片（1200×1200，檔名 = 英文代號）
      ↓
2. 上傳至 Supabase Storage（bucket: moon-island-assets / 路徑: menu-items/）
      ↓
3. 取得每張圖的公開 URL
      ↓
4. 更新資料庫 menu_items.image → 專案自動同步顯示
```

---

## 二、準備照片

### 2.1 尺寸與命名

- **尺寸**：1200×1200 px（網頁用，不內縮）
- **檔名**：必須使用 **英文代號 (Image ID)**，例如：
  - `baileys_tiramisu.webp`
  - `classic_tiramisu.webp`
  - `matcha_latte.webp`
- **格式**：建議 `.webp`（或 `.jpg`）

對照表在專案根目錄或桌面：`產品品項與檔案名稱對照表.csv`。

### 2.2 可選：批次縮圖與命名

若原始檔是從 1200×1200 畫板匯出的圖，可：

- 用既有 `process-images.sh` 輸出到 `~/moon-island-upload/products/`，再**手動改檔名**為英文代號；  
  或  
- 直接將已命名好的檔案放到上傳用資料夾（見下）。

---

## 三、上傳至 Supabase Storage

### 3.1 本機資料夾

把要上傳的圖片放在：

```text
~/moon-island-upload/menu-items/
```

例如：

- `baileys_tiramisu.webp`
- `classic_tiramisu.webp`
- `matcha_latte.webp`
- …

### 3.2 設定 Supabase 金鑰

在 `upload-to-supabase.js` 中設定 **Service Role Key**（不要提交到 Git）：

- 開啟 Supabase Dashboard → **Settings** → **API**
- 複製 **service_role** key
- 替換腳本裡的 `YOUR_SERVICE_ROLE_KEY_HERE`

### 3.3 執行上傳

```bash
cd /Users/pensoair/Desktop/moon_map_original
node upload-to-supabase.js
```

腳本會：

- 上傳 `~/moon-island-upload/menu-items/*` 到 Storage 路徑：`menu-items/`
- 使用 bucket：`moon-island-assets`（需在 Dashboard 先建立且設為 **Public**）
- 若有同名檔案會覆寫（`upsert: true`）

上傳完成後，每張圖的公開 URL 格式為：

```text
https://xlqwfaailjyvsycjnzkz.supabase.co/storage/v1/object/public/moon-island-assets/menu-items/{英文代號}.webp
```

例如：`.../menu-items/baileys_tiramisu.webp`。

---

## 四、與專案同步（更新資料庫）

專案是從 **Supabase 的 `menu_items` 表**讀取 `image` URL，所以只要把 `menu_items.image` 更新成上述 Storage 網址，網頁就會自動顯示新圖。

### 方式 A：用腳本產生 SQL（建議）

1. 確認 `docs/menu_item_image_mapping.csv` 裡每一列的 `image_id`、`db_name` 與實際資料庫的品項名稱一致（必要時手動改 `db_name`）。
2. 在專案根目錄執行：

   ```bash
   node scripts/generate-menu-image-updates.js
   ```

3. 會產生 `scripts/update_menu_images.sql`。
4. 到 **Supabase Dashboard → SQL Editor** 貼上並執行該 SQL，即可一次更新所有對應品項的 `image`。

### 方式 B：手動在 Dashboard 更新

1. 開啟 **Supabase Dashboard** → **Table Editor** → **menu_items**。
2. 對要換圖的品項，把 **image** 欄位改為對應的公開 URL，例如：  
   `https://xlqwfaailjyvsycjnzkz.supabase.co/storage/v1/object/public/moon-island-assets/menu-items/classic_tiramisu.webp`。

---

## 五、專案端如何「同步」

- 前端 **沒有** 再從本機讀檔或做額外同步。
- 前端只做兩件事：
  1. 用 `supabase.from('menu_items').select(...)` 讀取 `menu_items`（含 `image`）。
  2. 用 `<img src={item.image} />` 顯示。
- 因此：**只要 Supabase 的 `menu_items.image` 是正確的 Storage 公開 URL，moon_map_original 就會自動顯示最新照片**。

之後若要換圖：

- 同上傳步驟，用**相同檔名**再傳一次覆寫 Storage 檔案；  
  或  
- 傳新檔名後，再跑一次「更新 `menu_items.image`」的 SQL／手動改欄位即可。

---

## 六、與 Dessert-Booking 同步

- **Dessert-Booking** 的選單與商品圖同樣來自 Supabase 的 `menu_items`（會讀 `image_url` 或 `image`）。
- 依本文件完成「上傳至 Storage」與「更新 `menu_items.image`」後，**無需在 Dessert-Booking 再做一次**；重新整理 Dessert-Booking 前台即可看到新圖。
- 若資料表有 `image_url` 欄位，可選擇一併更新（與 `image` 填相同 URL），或依 Dessert-Booking 後端邏輯只維護 `image` 即可（該專案已支援 fallback）。

---

## 七、檢查清單

- [ ] 照片已裁成 1200×1200，檔名為英文代號（如 `xxx.webp`）
- [ ] 檔案已放到 `~/moon-island-upload/menu-items/`
- [ ] `upload-to-supabase.js` 已設定正確的 Service Role Key
- [ ] Storage bucket `moon-island-assets` 已建立且為 **Public**
- [ ] 已執行 `node upload-to-supabase.js` 且無錯誤
- [ ] 已執行 `update_menu_images.sql`（或手動更新 `menu_items.image`）
- [ ] 重新整理 moon_map_original 網頁，確認選單圖片已更新

---

## 八、相關檔案

| 檔案 | 說明 |
|------|------|
| `upload-to-supabase.js` | 上傳 `menu-items` 等資料夾到 Supabase Storage |
| `scripts/generate-menu-image-updates.js` | 依對照表產生更新 `menu_items.image` 的 SQL |
| `docs/menu_item_image_mapping.csv` | Image ID ↔ 資料庫品項名稱對照（可編輯） |
| `產品品項與檔案名稱對照表.csv` | 中文品項 ↔ 英文代號（可在桌面或專案內） |
| `scripts/update_menu_images.sql` | 由 generate-menu-image-updates.js 產生，供 SQL Editor 執行 |

若資料庫中的品項名稱與對照表不同（例如「經典｜提拉米蘇」在 DB 為「經典提拉米蘇」），請編輯 `docs/menu_item_image_mapping.csv` 的 `db_name` 欄位，再重新執行 `generate-menu-image-updates.js`。
