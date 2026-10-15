# Moon Map 設計系統契約 — Season 04「甜點目錄」

> 更新：2026-10-14（月島深綠風格升級 Phase A＋B：共用森林導覽 kit）。來源：窗邊計畫三份印刷主視覺＋`index.tsx` 現有功能契約＋2026-10-14 五站風格驗收（`kiwimu-com/docs/style-audit-20261014/REPORT.md`）。
> 本文只描述**現況**。Map 只重塑季節敘事層，不改 Kiwimu Universe 五站導覽、菜單資料來源、購物車、結帳、登入、定位與彩蛋契約。

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

Key 以實際色相命名（2026-10-14 由 `moonSilver`／`moonShadow`／`islandBlue`／`nightBlue`／`nightBlueDeep` 更名，值不變；舊名不再存在）。

| Token | 值 | 角色 |
|---|---|---|
| `forestDeep` | `#1F2F1F` | 深色面（hero 文字面板、頁尾、主卡、深色按鈕）；淺色面上的主行動底色 |
| `forestMid` | `#304F2F` | 淺色面的焦點與強調、深色漸層起點、主行動 hover |
| `creamWhite` | `#F5F0E8` | 奶油紙底、商品卡、表單、長文、深綠實心按鈕上的字 |
| `forestGold` | `#D7C678` | 柔金：深色面上的主行動、目前狀態、深色面焦點、選取狀態 |
| `moss` | `#587337` | 淺底標籤、底線、進度條（不承載小字：對奶油 4.38:1） |
| `grayText` | `#5F6856` | 淺色面次要文字（對奶油 5.14:1，不得再淡） |
| `grayLine` | `#D8D7C4` | 分隔線與表單框；深色面上的次要文字 |
| `emotionBlack` | `#2B2018` | 淺底主要文字 |
| `--c-line-brand` / `-alt` | `#06C755` / `#00B900` | LINE 第三方品牌色，固定不改 |

`styles/window-plan.css` 的 `--window-*` 是同一組色票的 CSS 變數（`--window-forest-deep`、`--window-forest`、`--window-sun`、`--window-cream`、`--window-leaf`＝`moss`、`--window-muted-on-dark`、`--window-muted-on-light`）。`--window-moss`（`#7A893C`）目前沒有任何引用，不要拿來承載文字；舊文件裡的 `windowMoss` 不是 `BRAND_COLORS` 的成員。

`index.tsx` 內舊的 CSS 變數名 `--c-yellow`（實際是 `moss`）、`--c-yellow-deep`（實際是 `forestGold`）、`--c-blue`（實際是 `forestMid`）名實倒置，因引用面太廣先保留，新程式碼請直接用 `CONFIG.BRAND_COLORS.*` 或 `--window-*`。

### 對比準則

- 奶油 `#F5F0E8` 對深綠 `#1F2F1F`：12.47:1。
- 奶油對中綠 `#304F2F`：8.10:1。
- 深綠對柔金 `#D7C678`：8.24:1。
- 淺色面次要文字 `#5F6856` 對奶油：5.14:1；深色面次要文字 `#D8D7C4` 對深綠 ≥9:1。
- 一般文字 ≥4.5:1，大字（≥24px，或 ≥18.66px 粗體）≥3:1。壓在圖片或漸層上的文字用截圖人工確認。

### 主行動按鈕：依表面決定

| 表面 | 配色 |
|---|---|
| 深色面（深綠文字面板、深綠卡、深色主題） | 柔金底 `#D7C678` 配深綠字 `#1F2F1F`（例：`.map-status-button`、`/menu` 的「回首頁」） |
| 淺色面（奶油或白卡、modal） | 深綠實心 `#1F2F1F` 配奶油字 `#F5F0E8`（例：`.btn-primary`、`.map-egg-reward`） |

沒有黑色硬陰影（offset 的黑色硬影）。彩蛋進度膠囊 `.map-egg-badge` 是狀態指示（不是主行動），照 2026-10-14 規格用柔金底配深綠字、柔和陰影。

### 焦點、觸控、字級

- 焦點環：深色面 2px solid `#D7C678`，淺色面 2px solid `#1F2F1F`，offset 2px。實作在 `styles/forest-a11y.css`：`html :focus-visible` 取 `--focus-ring`，深色面容器（hero 文字面板、`/menu` 頁首文字面板、story 卡、journey、頁尾）把 `--focus-ring` 設成柔金。
- 背景會變的元素（入口卡跨在深綠面板與奶油底之間、journey 的狀態鈕疊在照片上）用兩段式：外環 2px 深綠＋offset 空隙內 2px 柔金內襯。
- 共用 rail 內的焦點由 rail 自己負責（2px 柔金）。
- 觸控目標 ≥44×44px（段落內行內連結除外；頁尾、導覽、分頁、摘要連結不在豁免之列）。
- 可讀文字 ≥12px（`aria-hidden` 的裝飾元素除外，例如藏在頁面裡的彩蛋小圖示）。

## 三幕素材

| 幕 | 素材 | 使用位置 |
|---|---|---|
| WONDER | `wonder-desktop.avif/webp`（3000×1230／2400×984）、`wonder-mobile.webp`（900×1350） | 首屏 Hero |
| JOURNEY | `journey-desktop.avif/webp`、`journey-mobile.webp` | Island Hours／狀態選擇 |
| PAUSE | `pause-desktop.avif/webp`（2200×1825／1600×1328）、`pause-mobile.webp`（900×1350） | 菜單入口與 `/menu` 頁首 |

- 圖片放在 `public/assets/season-04/`。印刷 PDF 不可直接上線。
- 圖片中的文字只作視覺元素；主標、說明與 CTA 必須另有 HTML 文字。
- 不改插畫本身；取景只用 `object-fit`／`object-position`／尺寸與位置。

## Hero 取景（2026-10-14）

`wonder-desktop` 把「Kiwimu©」字標烤在左上、「WONDER＋英文副標」烤在右下，另有左右兩隻 Kiwimu。所以首頁 hero 改成「深綠文字面板＋框住中央 Kiwimu 的圖片」，**任何斷點的可見圖片區都只能含中央提蛋糕盒那隻**。

### 原圖座標（3000×1230，px；`wonder-mobile` 為 900×1350）

| 元素 | x | y |
|---|---|---|
| 烤字 Kiwimu© | 120–660 | 30–200 |
| 左側拱門 Kiwimu | 670–870 | 560–890 |
| 中央提蛋糕盒 Kiwimu | 1330–1700 | 590–930 |
| 右側坐著 Kiwimu | 2390–2610 | 616–916 |
| 烤字 WONDER＋副標 | 2320–2920 | 990–1160 |
| `wonder-mobile` 中央 Kiwimu（無烤字、無其他角色） | 330–725 | 650–1030 |

### 斷點與取景

| 視窗寬 | 版面 | 圖片 |
|---|---|---|
| ≥1024 | 兩欄：左 44% 文字面板、右 56% 圖片；stage 最大 1080×（`clamp(620px, 64vw, 760px)`） | `object-fit: cover; object-position: 51% 50%`；交界 40px 深綠漸層 |
| 600–1023 | 上下堆疊：圖片帶在上（高 360px）、文字面板在下 | 橫圖固定 2400px 寬（0.8 CSS px／原圖 px），以 (1515,760) 為焦點置中 |
| <600 | 上下堆疊：圖片帶在上（`aspect-ratio: 13/10`、最高 340px） | 改用 `wonder-mobile`，`object-position: 50% 72%`；`<picture>` 的 `<source media>` 同為 `max-width: 599px` |

兩張入口卡（01 // INTERACT、02 // ORDER NOW）在 hero 下方，疊在 stage 底緣 28–54px，不壓角色。

### 驗收（`/Users/pensoair/Desktop/Web-Projects/sites/.worktrees/style-20261014-qa/map/results.json`）

Playwright 以 `object-fit`／`object-position` 換算每個角色與烤字的渲染座標，七個寬度（1920、1440、1280、1024、768、390、320）全數通過：

| 寬 | 可見原圖範圍（x／y） | 烤字∩可見區 | 角色∩文字元素 | 中央 Kiwimu 完整 |
|---|---|---|---|---|
| 1920／1440／1280 | 1030–2010／0–1230 | 0 | 0 | 是 |
| 1024 | 1003–2037／0–1230 | 0 | 0 | 是 |
| 768 | 1056–1974／535–985 | 0 | 0 | 是 |
| 390 | 0–900／473–1166（mobile 圖） | 無烤字 | 0 | 是 |
| 320 | 0–900／474–1166（mobile 圖） | 無烤字 | 0 | 是 |

烤字 bbox 外擴 40 原圖 px（原圖座標誤差 ±40）後再測。另掃 17 個中間寬度（含 599／600、1023／1024 等斷點邊緣）全部通過。

## `/menu` 頁首取景（2026-10-14）

`pause-desktop`（2200×1825）烤有「Kiwimu©」字標（y≈90–190）與「PAUSE」大字（y≈1500–1790）；Kiwimu 本體 x≈920–1445、y≈700–1335，臉部 x≈1030–1295、y≈860–1020。`pause-mobile`（900×1350）左上有「u©」殘片（y≈90–170）。

- ≥520：兩欄（文字面板 11fr／圖片 9fr）。圖片以「頁首高度的 170%」置放並以 (1182, 870) 為焦點置中，可見原圖 y≈334–1407：含整隻 Kiwimu、不含兩處烤字。
- <520：上下堆疊（圖片在上，`aspect-ratio: 13/10`），改用 `pause-mobile`，`object-position: 50% 91%`，`<source media>` 同為 `max-width: 519px`。
- 文字只在文字面板，與臉部、本體交集為 0。

### `/menu` 版面鎖定

`/menu` 是 `position: fixed` 的全螢幕目錄，只在自己的容器內捲動。為避免手機版 rail 捲走後頂端出現 49px 空白，`/menu` 開啟時在 `<html>` 加 `map-menu-view`，鎖住 html/body 捲動（樣式見 `styles/forest-a11y.css`）。

## 字體

- 中文與正文：`"Noto Sans TC"`，400 / 500 / 700。
- 等寬標籤：`"JetBrains Mono", ui-monospace, Menlo, monospace`（`.font-mono` 與程式碼用的 `MONO_FONT_STACK`），uppercase、`letter-spacing: .05em`。
- 引語體：`"Noto Serif TC"` 700（展籤 fortune slip，2026-07-12 Penso 決定保留）。其餘 `serif` 維持系統 serif。
- 三者在 `index.html` 以**同一個** Google Fonts 請求載入（`display=swap`）。Noto Serif TC 依 unicode-range 分段，抽展籤時才下載。
- WONDER / JOURNEY / PAUSE 的特殊字形由印刷主視覺承擔，不新增顯示字體依賴。
- `index.html` 是全站**唯一**的字體來源：共用 rail kit 不再 `@import` 字體（舊檔的 Space Grotesk 無人使用，已隨之消失）。請求涵蓋實際用到的字重：Noto Sans TC 含 900（hero h1、act-label 寫 `font-weight: 800`，要有 900 才會渲染成最粗）、JetBrains Mono 含 600。
- 要新增字重時改 `index.html` 的那一個請求，不要在 CSS 另外 `@import`。

## 版面與元件

- 敘事圖像可以突破 800px 內容欄，最大約 1180px。
- 功能內容維持既有 600 / 720 / 800px 容器。
- Hero、Journey、Pause 使用 24–36px 大圓角；商品卡、表單與小元件維持 8 / 12 / 20px 階級。
- `/menu` 以奶油白商品卡為主，綠色只用於頁首、分類層級、選取狀態與 CTA。
- 首頁與 `/menu` 各有一個 `<main>`（`.season04-main`，包住整個頁面內容）；rail 在 `<main>` 外。
- toast（`uiNotice`）在 rail 下方 12px（`top: calc(var(--ku-rail-height) + 12px)`），深綠底、柔金細框。

## 共用導覽（Kiwimu Universe rail）

五站共用的森林導覽 kit：`components/KiwimuUniverseRail.tsx`、`styles/kiwimu-universe.css` 與其他四站 **byte-identical**（sha256 見 kit 的 `SHA256SUMS`，用 kit 的 `verify-rail.mjs <worktree> --scan` 檢查）。**不要改這兩個檔**；站點差異走 props 或本站 CSS。

- 外觀：深綠底 `#1F2F1F`、奶油字 `#F5F0E8`、次要文字 `#D8D7C4`、目前站點柔金 `#D7C678` 底線；高度 `--ku-rail-height`（約 49px，掛載後以實測值覆蓋）；桌機 sticky、手機（≤640px）隨頁面捲走；六個入口，手機收成三個入口加「更多」。map 是「更多」站，手機收合時顯示「島嶼地圖 ＋」。焦點是 2px 柔金環（kit 用 `!important`，站點 CSS 不能蓋）。
- 層級：收合 z-index 60、展開「更多」z-index 210（`--ku-nav-z`、`--ku-nav-z-open` 可由站點覆寫，map 不覆寫）。`/menu` 的 `.season04-menu-page`（z-index 1000）在 `.container`（z-index 1）的 stacking context 內，所以不會蓋住展開的「更多」；390 的 `/menu` 已用 `elementFromPoint` 驗證三個面板連結都命中自己。
- 掛載（`index.tsx`，`ErrorBoundary` 內）：`<KiwimuUniverseRail currentSite="map" onTrack={trackEvent} getLoginStatus={getRailLoginStatus} />`。
  - `onTrack` 是 `lib/crossSiteTracking.ts` 的 `trackEvent`（`gtag('event', …)`，加 `site_id: 'moon_map'`）。每個 rail 連結點擊都送 `universe_nav_click`（12 欄，見 `CROSS_SITE_EVENTS.md`）。
  - `getLoginStatus` 是 `readSupabaseLoginStatus(supabase)`：讀本站既有的 supabase client（`lib/supabase.ts`），只做 `getSession()` 讀取。不用 `lib/auth.ts` 的 `getAuthClient()`，那會另外建立第二個沒有 pkce 設定的 client。
- 本站自己的規則在 `styles/forest-a11y.css`：`.map-site-kicker`（hero 眉標，柔金底深綠字）、`.menu-item`／`.modal-card` 的 44px 觸控與手機輸入框 16px、`.map-account-*`（奶油底、深綠字、柔金徽章）。這些原本寫在舊共用 rail CSS，Phase B 搬出 kit。

## 動效

- 首屏只做一次 1.2 秒影像 settle，不做循環視差。
- 互動元件沿用 `--ease-ui` 與 `--ease-playful`。
- 所有動效受 `index.tsx` 的全域 `prefers-reduced-motion` catch-all 降級（animation／transition 壓到 0.01ms、關閉 smooth scroll）。

## 不可破壞

1. 不改 `/api/menu`、Supabase menu contract、stable item id 與 fallback。
2. 不改購物車、結帳、LINE 導購、Discord 通知與訂單 persistence。
3. 不改 Passport 登入、GPS 徽章與 9 顆彩蛋的 reward id。
4. 不把桌機大圖直接套用到手機。
5. 不讓裝飾文字取代可存取的 HTML 標題。
6. Kiwimu 角色不可被文字、按鈕或容器邊界遮擋臉部或裁切；不用 AI 重繪或修改角色圖。

## 驗收尺寸

- Mobile：390 × 844（另測 320）。
- Tablet：768 × 1024。
- Desktop：1440 × 900（另測 1920、1280、1024）。
- 驗證：`npm ci`、`npx tsc --noEmit`、`npm run build`（與 `.github/workflows/ci.yml` 相同）；首頁與 `/menu` 的 console error；菜單加入購物車與結帳入口。
