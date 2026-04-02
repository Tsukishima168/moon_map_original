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
- 📱 **完整 RWD** - 手機、平板、桌面完美適配
- 🎭 **MBTI 測驗連結** - 3 分鐘探索你的角色甜點
- 🛒 **預訂與宅配** - LINE 官方帳號整合
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
- **Design**: Glassmorphism + Responsive Grid
- **Fonts**: Noto Sans TC (Google Fonts)

## 📂 Project Structure

``` 
map-kiwimu-com/
├── index.html          # HTML entry with SEO meta tags
├── index.tsx           # Main React app with inline styles
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

### Phase 1: MVP (已完成)
- [x] 品牌導覽介面
- [x] 互動 Check-in 系統
- [x] RWD 響應式設計
- [x] 社群媒體整合
- [x] Vercel 部署

### Phase 2: 商業功能 (規劃中)
- [ ] 購物車系統
- [ ] LINE Pay / 綠界金流
- [ ] 會員點數機制
- [ ] LINE 貼圖商店 API

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
- AOV: NT
- Monthly revenue: NTk
