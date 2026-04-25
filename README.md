# 🌙 月島甜點店 MOON MOON - Island Landing

<div align="center">

**每一季一個主題。你路過，也算參展。**

月島 KIWIMU 品牌策展導覽網站 - 連結測驗、訂購、故事、社群的互動入口

[Instagram](https://www.instagram.com/moon_moon_dessert/) • [LINE 官方](https://lin.ee/MndRHE2) • [MBTI 測驗](https://kiwimu-mbti.vercel.app)

</div>

---

## ✨ Features

- 🎨 **品牌導覽地圖** - O2O 顧客旅程設計（線上到線下 / 線下到線上）
- 🧪 **互動 Check-in** - 5 種情緒狀態與甜點處方箋
- 🍰 **共享菜單整合** - `map/menu` 會透過同域 `/api/menu` 優先讀取 Supabase canonical menu，失敗時回退到 `shop` grouped menu contract，再回退 `public/menu.json`
- 🛒 **預購購物車與結帳** - 可加入購物車、選擇取貨日、填單後導向 LINE 完成預訂
- 🧾 **訂單落地與通知** - 下單會寫入 Supabase `shop_orders` / `shop_order_items`，並觸發 Discord 通知
- 📊 **追蹤與歸因** - GA4、UTM、站外導流事件已接上
- 📱 **完整 RWD** - 手機、平板、桌面完美適配
- 🎭 **MBTI 測驗連結** - 3 分鐘探索你的角色甜點
- 💬 **LINE 預訂整合** - LINE 官方帳號整合
- 🎁 **免費周邊** - 桌布、歌單、LINE 主題下載

## 🎯 Brand Concept

這不只是一個甜點店網站，而是一場**情緒的策展**：

```
路過 Drift → 停留 Observe → Check-in Status → 兌換 Exchange
```

我們透過「狀態選擇」取代傳統菜單，讓顧客在選擇甜點前，先確認自己的情緒狀態。每個狀態都對應：
- 📝 狀態建議
- 🍰 甜點處方
- ✅ 今日任務

## 🚀 Local Development

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 瀏覽器開啟 http://localhost:5173
```

### Build for Production

```bash
# 建置生產版本
npm run build

# 預覽生產版本
npm run preview
```

## 📦 Deployment

### Vercel (推薦)

1. 推送到 GitHub repository
2. 前往 [Vercel](https://vercel.com)
3. Import repository
4. 自動偵測 Vite 配置
5. 一鍵部署 ✨

或使用 Vercel CLI：

```bash
npm install -g vercel
vercel login
vercel --prod
```

## 🎨 Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 6
- **Styling**: CSS-in-JS (Inline Styles)
- **Serverless API**: Vercel Functions
- **Data**: Shop shared menu contract + Supabase orders / rewards / auth
- **Tracking**: GA4 + UTM attribution + Discord webhook notifications
- **Design**: Glassmorphism + Responsive Grid
- **Fonts**: Noto Sans TC (Google Fonts)

## 🧭 Runtime Architecture

- **Menu display contract**: `map.kiwimu.com/menu` -> same-origin `/api/menu` -> Supabase canonical menu -> `https://shop.kiwimu.com/api/menu/categories` fallback
- **Server-side merge**: `/api/menu` now merges canonical live menu with local display metadata before returning UI-ready categories
- **Canonical MBTI mapping**: `/api/mbti-dessert` resolves MBTI dessert mappings from Supabase `mbti_menu_links` + `menu_items`
- **Stable recommendation ids**: map runtime now resolves recommendations through local stable item ids; upstream still does not expose true `menu_item_id`
- **Opt-in display config**: server supports Supabase-backed `site_category_configs` / `site_item_configs`, but only when `ENABLE_SUPABASE_MENU_DISPLAY_CONFIG=true`; default runtime remains unchanged
- **Menu fallback**: `public/menu.json` remains the fallback and display-metadata source until parity work is complete
- **Checkout persistence**: front-end checkout posts to `/api/map-order`, which writes `shop_orders` and `shop_order_items`
- **Public landing guardrail**: MBTI and other ecosystem flows should still land users on `map/menu`, not `shop`

## 📂 Project Structure

``` 
map-kiwimu-com/
├── index.html          # HTML entry with SEO meta tags
├── index.tsx           # Main React app with inline styles
├── api/
│   ├── menu.ts         # Shared menu proxy + server-side metadata merge
│   ├── mbti-dessert.ts # Canonical MBTI dessert mapping endpoint
│   └── map-order.ts    # Order persistence endpoint
├── lib/
│   ├── menu-catalog.ts # Local stable item ids / alias catalog
│   ├── menu-shared.ts  # Shared menu merge / normalize helpers
│   └── crossSiteTracking.ts
├── package.json        # Dependencies & scripts
├── vercel.json         # Vercel deployment config
├── tsconfig.json       # TypeScript configuration
├── vite.config.ts      # Vite build configuration
└── public/
    ├── assets/
    │   ├── moon-island-bg.png   # Hero background
    │   └── favicon.png          # Site icon
    └── robots.txt               # SEO crawling rules
```

## 📍 Canonical Local Path

```bash
/Users/pensoair/Desktop/Web-Projects/sites/map-kiwimu-com
```

GitHub remote 目前仍為 `Tsukishima168/moon_map_original`，本次只做本地 canonical path 搬遷。

## 🌈 Design System

### Brand Colors

```css
--c-cream: #F8F8F8        /* 奶油白 */
--c-black: #000000        /* 情緒黑 */
--c-yellow: #D8E038       /* 月光黃 */
--c-blue: #5878F0         /* 島嶼藍 */
```

### Responsive Breakpoints

- **Mobile**: < 768px (Base design)
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🔗 Connected Platforms

- **Instagram**: [@moon_moon_dessert](https://www.instagram.com/moon_moon_dessert/)
- **LINE Official**: [加入 LINE](https://lin.ee/MndRHE2)
- **MBTI Lab**: [開始測驗](https://kiwimu-mbti.vercel.app)

## 🛣️ Roadmap

### Phase 1: MVP / Traffic Validation (已上線)
- [x] 品牌導覽介面
- [x] 互動 Check-in 系統
- [x] RWD 響應式設計
- [x] 社群媒體整合
- [x] Vercel 部署
- [x] `/menu` 共享菜單 proxy + fallback 架構
- [x] 購物車 / 預購表單 / LINE 導購
- [x] Supabase 訂單落地
- [x] GA4 / UTM / Discord 通知串接

### Phase 2: Data Convergence / Commerce Hardening (進行中)
- [x] 將 menu merge 從 client 移到 `/api/menu` server-side contract
- [x] 將推薦系統從名稱比對收斂到本地穩定 item id
- [x] 將 `/api/menu` 收斂成 Supabase-first canonical product source
- [x] 將 MBTI 商品指向收斂到 `/api/mbti-dessert` canonical mapping
- [ ] 將 map 顯示層 metadata 從 `public/menu.json` 進一步收斂到 shared display contract
- [ ] 讓 upstream shared menu payload 直接帶出真實 `menu_item_id`
- [ ] 完整驗證 live menu -> checkout -> Supabase -> Discord -> GA4 流程
- [ ] LINE Pay / 綠界金流
- [ ] 訂單管理後台 / 管理員流程
- [ ] 會員點數機制

### Phase 3: 社群擴展
- [ ] Discord 社群嵌入
- [ ] 留言互動功能
- [ ] 使用者生成內容 (UGC)
- [ ] 多語系支援 (EN/JP)

## 📄 License

© 2026 KIWIMU - Moon Moon Dessert. All rights reserved.

---

<div align="center">

**你路過，也算參展。**

Made with 🌙 by KIWIMU

</div>

---

## Phase 1 Gate (Current)
**Goal: Validate traffic funnel**

### Metrics
- MBTI completions: 1000
- Orders: 200
- AOV: TBD
- Monthly revenue: TBD
