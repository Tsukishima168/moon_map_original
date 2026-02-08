# Supabase 圖床整合說明（與 Dessert-Booking 共用）

## 設定狀態

- **Bucket 名稱**：`menu-images`
- **權限**：PUBLIC（公開讀取）
- **用途**：月島甜點菜單圖片，本專案（moon_map_original）與 Dessert-Booking 共用同一圖床。

## 圖片 URL 格式

上傳到 `menu-images` 後，公開網址為：

```
https://<你的 Supabase 專案>.supabase.co/storage/v1/object/public/menu-images/<檔名>
```

範例：`classic_tiramisu.webp`  
→ `https://xxxx.supabase.co/storage/v1/object/public/menu-images/classic_tiramisu.webp`

## 本專案如何讀取圖片

1. **環境變數**：使用既有的 `VITE_SUPABASE_URL`（與 Supabase 後端同一個專案）。
2. **程式**：已加入 `getMenuImageUrl()`，會依 `menu_items.image` 自動解析：
   - 若為**完整 URL**（以 `http` 開頭）：直接使用。
   - 若為**檔名或路徑**（例如 `classic_tiramisu.webp` 或 `menu-images/classic_tiramisu.webp`）：自動接上  
     `{VITE_SUPABASE_URL}/storage/v1/object/public/menu-images/` 組成完整 URL。

因此資料庫裡可以只存檔名，不必存完整網址。

## 以「ID / 穩定 key」方式設計（只換圖、網址不變）

目標：**只替換圖片檔案，不改資料庫、不改網址**。

做法：把 **Storage 裡的檔名當成這張圖的永久 ID**。

- **DB 存的 = 穩定 key**：例如 `classic_tiramisu.webp`，只存一次，之後不再改。
- **網址**：永遠是 `.../menu-images/classic_tiramisu.webp`，由 key 決定。
- **只換圖時**：到 Supabase Storage > `menu-images`，**上傳新圖並覆蓋同檔名**（例如還是 `classic_tiramisu.webp`）。  
  → 網址不變、DB 不用改，前端重新整理就會看到新圖。

### 建議的 key 命名（當成 ID 用）

- 格式：**小寫 + 底線**，例如 `classic_tiramisu.webp`、`hojicha_latte.webp`。
- 一旦訂好就當成該品項的「圖 ID」：**不要改檔名**；要換圖就覆蓋同檔名。
- 若之後要換副檔名（例如改 .avif），才需要改 DB 的 key 與 Storage 檔名（等於換 ID）。

### 總結

| 情境 | 你要做的 | DB | 網址 |
|------|----------|-----|------|
| 只換圖（同品項新照片） | Storage 上傳新檔，**覆蓋同檔名** | 不改 | 不變 |
| 換成另一張不同的圖 | 改 `menu_items.image` 為新 key，或上傳新檔名 | 可改 | 會變 |
| 新品項 | 上傳新檔名 + 在 DB 填該檔名 | 新增 | 新 key |

這樣就等於用「檔名當 ID」：只換圖就只覆蓋檔案，網址不用改。

---

## 資料庫欄位建議（menu_items.image）

可任選一種方式儲存，前端都會正確顯示：

| 存法 | 範例 | 說明 |
|------|------|------|
| 只存檔名（當穩定 ID） | `classic_tiramisu.webp` | 建議；只換圖時覆蓋同檔名即可，網址不變 |
| 含路徑 | `menu-images/classic_tiramisu.webp` | 也會被正確解析 |
| 完整 URL | `https://xxx.supabase.co/...` | 照常使用，不會被改寫 |

## 上傳後要做的對應

**第一次設定：**

1. 在 Supabase **Storage** > `menu-images` 上傳檔案，檔名用「穩定 key」（例如 `classic_tiramisu.webp`）。
2. 在 **Table Editor** > `menu_items` 將該品項的 `image` 欄位設為**同一個檔名**（當成圖的 ID）。

**之後只想換圖、網址不變：**

- 到 Storage > `menu-images`，上傳新圖並**覆蓋同檔名**；DB 不用改，重整頁面即可。

存檔後，前台會自動顯示該圖片（無需重啟或重新 build，重新整理頁面即可）。

## Dessert-Booking 共用方式

兩邊只要：

- 使用**同一個 Supabase 專案**（同一組 `VITE_SUPABASE_URL`）。
- 使用同一個 bucket：`menu-images`。
- `menu_items.image` 存檔名或完整 URL 皆可。

則 moon_map_original 與 Dessert-Booking 都會從同一圖床讀取，無需重複上傳。

## 建議圖片規格與壓縮（檔案不要太大）

目前 38 張約 41 MB、單檔約 340 KB～1.6 MB，對網頁選單來說偏大，會拖慢載入（尤其手機）。

**建議規格：**

| 項目 | 建議值 | 說明 |
|------|--------|------|
| 最長邊 | 約 638～800 px | 選單卡片不需更大 |
| 格式 | WebP | 體積小、畫質可接受 |
| 品質 | 75～82 | 再低易有明顯色塊 |
| 單檔目標 | **200～500 KB** | 38 張約 8～15 MB 較理想 |

**做法：**

- 用專案裡的 `process-images.sh` 做「網頁用」輸出（腳本已支援 800px、WebP、可調品質）。
- 若要更小：把腳本裡的 `SIZE` 改為 `638x638`（或 `640x640`）、`QUALITY` 改為 `78` 左右，再重新輸出並**用同檔名覆蓋**上傳到 Storage，網址與 DB 都不用改。

壓縮後用同檔名覆蓋 = 只換圖、ID 與網址不變。

---

## 檔名對照參考（依你目前 bucket 內容）

可依檔名對應到品項，在 `menu_items` 填寫 `image`：

- `classic_tiramisu.webp` → 經典提拉米蘇
- `classic_basque.webp` → 經典原味巴斯克
- `classic_pudding.webp` → 烤布丁(附焦糖液)
- `baileys_tiramisu.webp` → 奶酒提拉米蘇
- `matcha_tiramisu.webp` → 抹茶提拉米蘇（若檔名如此）
- `hojicha_latte.webp`、`classic_americano.webp`、`herbal_tea.webp` 等 → 飲品

實際對應請依你 bucket 內檔名與後台品項名稱調整。

---

## 用「其他 ID」做對應（可選）

目前是**檔名 = 圖的 ID**，直接存在 `menu_items.image`。若你想用「數字 ID 或 slug」來對應，有兩種常見做法：

### 做法 A：維持現狀，用檔名當 ID（你現在的方式）

- `menu_items.image` 存 `classic_tiramisu.webp`，本身就是 ID。
- 優點：簡單、不用多表；換圖就覆蓋同檔名。
- 適合：一產品一圖、用檔名對應就夠用。

### 做法 B：多一張「圖檔表」，用 ID 對應

- 新增表：`image_assets(id, storage_key)`，例如 `id = 1`、`storage_key = 'classic_tiramisu.webp'`。
- `menu_items` 改存 `image_id`（對應 `image_assets.id`），查詢時 join 拿 `storage_key` 再組 URL。
- 優點：品項只記數字 ID；同一張圖可被多個品項共用；之後要加「一產品多圖」時，可再擴成「多張圖都記在別的表」。
- 缺點：多一層查詢、要改後端/前端。

若之後要做「一產品多圖」，通常會用類似做法 B 的結構（見下一節），再一起加 `image_assets` 即可。

---

## 一產品多張圖的邏輯（未來擴充）

若之後要「一個產品多張照片」（例如主圖 + 輪播/相簿），可以這樣設計。

### 方案一：獨立「產品圖片表」（建議，彈性最大）

多一張表專門存「某品項底下有哪些圖」：

```sql
-- 產品圖片表（一產品多圖）
create table menu_item_images (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  storage_key text not null,                    -- 例: classic_tiramisu.webp / classic_tiramisu_2.webp
  sort_order int not null default 0,           -- 排序
  is_primary boolean not null default false     -- 是否為主圖（僅一張為 true）
);

create index idx_menu_item_images_item on menu_item_images(menu_item_id);
```

- **主圖**：`is_primary = true` 的那一筆（或沒有就取 `sort_order` 最小）。
- **其餘**：同一個 `menu_item_id` 的其他列 = 該產品的多張圖，用 `sort_order` 排輪播/相簿。
- Storage 一樣用同一個 bucket、同一個 URL 規則；`storage_key` 一樣是「穩定檔名」，只換圖就覆蓋同檔名。

現有 `menu_items.image` 可以：

- **過渡**：先保留，主圖從 `menu_items.image` 讀，多圖從 `menu_item_images` 讀；之後再慢慢把主圖也遷到 `menu_item_images`（一筆 `is_primary = true`）。
- **或**：之後棄用 `menu_items.image`，主圖一律從 `menu_item_images` 的 `is_primary` 取得。

### 方案二：用陣列存多個 key（不改表結構時）

- 在 `menu_items` 加一欄，例如 `images text[]` 或 `images jsonb`，存多個檔名：  
  `['classic_tiramisu.webp', 'classic_tiramisu_2.webp', 'classic_tiramisu_3.webp']`。
- **主圖**：取第一個，或保留原本 `menu_items.image` 當主圖，`images` 只當「額外圖」。
- 優點：不用新表、查一次 menu_items 就有全部 key。  
- 缺點：排序、主圖標記要自己約定（例如第一個為主圖）。

### 檔名建議（多圖時）

- 主圖：`classic_tiramisu.webp`（和現在一樣）。
- 第 2、3 張：`classic_tiramisu_2.webp`、`classic_tiramisu_3.webp`（同一個「圖 ID 前綴」）。
- 一樣用**同檔名覆蓋**即可換圖，網址不變。

---

## 小結

- 圖床：Supabase Storage bucket `menu-images`（PUBLIC）。
- 本專案：已用 `getMenuImageUrl()` 接好，只要 `VITE_SUPABASE_URL` 正確即可。
- **現在**：`menu_items.image` 存檔名（= 圖的 ID），同一網址、只換圖就覆蓋同檔名。
- **用其他 ID 對應**：可維持檔名當 ID（做法 A），或加 `image_assets` 用數字 ID（做法 B）。
- **一產品多圖**：之後可加 `menu_item_images` 表（方案一），或用 `menu_items.images` 陣列（方案二）；多圖檔名建議用同一前綴 + `_2`、`_3`，仍可覆蓋同檔名換圖。
- 與 Dessert-Booking：共用同一 Supabase 專案與 `menu-images` 即可共用圖床。
