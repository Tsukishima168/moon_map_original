# Moon Map 設計系統契約 — Season 04「甜點目錄」

> 更新：2026-09-07。來源：窗邊計畫三份印刷主視覺＋`index.tsx` 現有功能契約。
> 本季只重塑 Map 的季節敘事層，不改 Kiwimu Universe 五站導覽、菜單資料來源、購物車、結帳、登入、定位與彩蛋契約。

## 設計命題

**WONDER → JOURNEY → PAUSE**

「窗邊計畫」是本季入口結構；「甜點目錄 / Dessert Menu」是這次綠色系列對外最直覺的菜單名稱。訪客從好奇進入一個綠色世界，沿著光與階梯前進，最後在甜點旁停一下。綠色是環境，不是所有元件的填色；商品與表單仍使用奶油白表面確保閱讀與轉換。

## 策展分層

| 分類 | 策展軸線 | 文案角色 |
|---|---|---|
| 提拉米蘇 | 奶油的陰影 | 咖啡、乳酪與酒香疊成窗邊的深色記憶 |
| 巴斯克乳酪 | 焦糖的土壤 | 烘烤邊緣留下焦香，中心保持柔軟 |
| 戚風蛋糕 | 果實的光 | 鮮奶油、果酸與空氣感，讓綠光變得輕 |
| 千層蛋糕 | 時間的層次 | 一層一層切開時間，茶、奶油與果香在切面裡停住 |
| 乾濕分離布丁 | 安靜的甜 | 把焦糖和蛋奶分開，留一點選擇給今天的自己 |
| 店內飲品 | 茶與咖啡的流動 | 抹茶、焙茶、花草與咖啡，把窗邊的停頓延長 |

## 色彩（唯一權威：`index.tsx` 的 `CONFIG.BRAND_COLORS`）

| Token | 值 | 角色 |
|---|---|---|
| creamWhite | `#F5F0E8` | 商品卡、表單、長文與淺色表面 |
| emotionBlack | `#2B2018` | 淺底主要文字 |
| moonSilver / windowSun | `#D7C678` | 窗光、選取狀態、深綠底重點 |
| moonShadow / windowLeaf | `#587337` | 淺底標籤、底線、focus 與進度 |
| islandBlue / windowForest | `#304F2F` | 主 CTA、主題表面；舊 key 為相容性保留 |
| grayText | `#5F6856` | 次階文字 |
| grayLine | `#D8D7C4` | 分隔線與表單框 |
| nightBlue / windowForest | `#304F2F` | 深色漸層起點；舊 key 為相容性保留 |
| nightBlueDeep / windowForestDeep | `#1F2F1F` | 深綠底、頁尾、主 CTA |
| windowMoss | `#7A893C` | 純裝飾，不承載小字 |
| --c-line-brand / -alt | `#06C755` / `#00B900` | LINE 第三方品牌色，固定不改 |

### 對比準則

- 奶油白 `#F5F0E8` 對森林深綠 `#1F2F1F`：12.47:1。
- 奶油白對窗景綠 `#304F2F`：8.10:1。
- 森林深綠對日光黃 `#D7C678`：8.24:1。
- 苔光綠 `#7A893C` 對奶油白只有 3.38:1，只能作大面積裝飾或非文字圖形。

## 三幕素材

| 幕 | 素材 | 使用位置 |
|---|---|---|
| WONDER | `wonder-desktop.avif/webp`、`wonder-mobile.webp` | 首屏 Hero |
| JOURNEY | `journey-desktop.avif/webp`、`journey-mobile.webp` | Island Hours／狀態選擇 |
| PAUSE | `pause-desktop.avif/webp`、`pause-mobile.webp` | 菜單入口與 `/menu` 頁首 |

- 圖片放在 `public/assets/season-04/`。
- 印刷 PDF 不可直接上線。
- 圖片中的文字只作視覺元素；主標、說明與 CTA 必須另有 HTML 文字。
- 手機使用專屬裁切，不能依賴桌機圖 `object-fit: cover` 自動取景。

## 字體

- 中文與正文：`"Noto Sans TC"`，400 / 500 / 700。
- 系統標籤：既有 Menlo / Monaco mono stack，uppercase、`letter-spacing: .05em`。
- WONDER / JOURNEY / PAUSE 的特殊字形由印刷主視覺承擔，不新增顯示字體依賴。
- 引語與展籤維持既有 serif 策略。

## 版面與元件

- 敘事圖像可以突破 800px 內容欄，最大約 1180px。
- 功能內容維持既有 600 / 720 / 800px 容器。
- Hero、Journey、Pause 使用 24–36px 大圓角；商品卡、表單與小元件維持 8 / 12 / 20px 階級。
- `/menu` 以奶油白商品卡為主，綠色只用於頁首、分類層級、選取狀態與 CTA。
- 黑色 Kiwimu Universe 導覽列保持不變；Map active 狀態沿用跨站 lime。

## 動效

- 首屏只做一次 1.2 秒影像 settle，不做循環視差。
- 互動元件沿用 `--ease-ui` 與 `--ease-playful`。
- 所有新動效受全域 `prefers-reduced-motion` 規則降級。

## 不可破壞

1. 不改 `/api/menu`、Supabase menu contract、stable item id 與 fallback。
2. 不改購物車、結帳、LINE 導購、Discord 通知與訂單 persistence。
3. 不改 Passport 登入、GPS 徽章與 9 顆彩蛋的 reward id。
4. 不把桌機大圖直接套用到手機。
5. 不讓裝飾文字取代可存取的 HTML 標題。

## 驗收尺寸

- Mobile：390 × 844。
- Tablet：768 × 1024。
- Desktop：1440 × 900。
- 驗證 `npm run vercel-build`、`npx tsc --noEmit`、首頁與 `/menu` 的 console error、菜單加入購物車與結帳入口。
