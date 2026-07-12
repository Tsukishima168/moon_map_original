# Moon Map 設計系統契約 — Season 03.5「銀月夜」

> 建立：2026-07-12（全面升級輪）。來源：index.tsx 實碼抽取＋Penso 拍板。
> 2026-07-12 Season 03.5 換裝：Penso 拍板「更深的夜＋銀月光」，只換季節強調層（nightBlue 系＋moonYellow），creamWhite/emotionBlack 不動。
> 規則：改 UI 前先讀本檔。使用下列 token，不准發明新色值/新圓角/新緩動曲線；要新增系統值先問 Penso。

## 色彩（唯一權威：index.tsx CONFIG.BRAND_COLORS）

| Token | 值 | 角色 |
|---|---|---|
| creamWhite | `#F5F0E8` | 背景/表面；夜卡文字基色 |
| emotionBlack | `#2B2018` | 文字主色（`--c-black`） |
| moonSilver | `#C9CDD8` | 深底強調（夜間卡/深色 modal/黑框印章鈕底＋黑字組合）；黑字對比 13.2:1 |
| moonShadow | `#5A6B8C` | 淺底強調（奶油白/白底上的標題底線、標籤文字、hover 光暈、純裝飾邊框/漸層飾條）；對 `#F5F0E8` 對比 4.72:1（實算，≥3:1 達標） |
| islandBlue | `#C4745A` | 次強調（命名誤植，實為橘紅；`--c-blue`）；hover 加深用 `#A85D46` |
| grayText | `#7A6A5A` | 次階文字（`--c-gray`） |
| grayLine | `#E8E0D6` | 分隔線/表單框（`--c-line`） |
| nightBlue → nightBlueDeep | `#1B2340` → `#111830` | S03.5 夜間漸層加深版（165°/175°），僅 Season Story 卡與心情展籤 modal |
| --c-line-brand / -alt | `#06C755` / `#00B900` | LINE 第三方品牌色（固定，不歸品牌板） |

### moonSilver / moonShadow 分流準則（2026-07-12 對比度審查）

- **判準**：該處背景深或淺，以及 moonYellow 舊值是否直接托著文字。
- 深底（夜間卡、深色 modal、黑框印章鈕的底，通常搭配黑字/emotionBlack 字）→ `moonSilver`。emotionBlack 對 moonSilver 對比 9.98:1；純黑對 moonSilver 對比 13.2:1。
- 淺底且為純裝飾（邊框線、底線、outline 環、進度條、低透明度漸層飾條，無文字直接疊在色塊上）→ `moonShadow`。moonShadow 對 `#F5F0E8` 對比 4.72:1，對白底 5.36:1。
- 淺底且作為文字前景色（標題強調字、mono 標籤文字）→ `moonShadow` 當文字色，對 creamWhite/白底 4.72–5.36:1，通過 AA。
- 例外：展籤/任務卡下載圖（SVG 白底卡＋黑框＋黑字 coupon banner）→ 判讀後選 `moonSilver`：黑字在 moonShadow 上僅 3.9:1，小字（10–13px）會落到 AA 門檻以下；moonSilver 上黑字 13.2:1 穩過，且該色塊本身有 2px 黑色實框做視覺分界，不需仰賴底色對比與奶油白區分。

- 夜間區塊文字一律 `rgba(245,240,232, α)` 階梯（α 0.1–0.9），不用純白。
- 玻璃感變數：`--glass-white-light/medium/strong`、`--shadow-glass`、`--shadow-glow-blue/yellow`。

## 字體

- 全站：`"Noto Sans TC", -apple-system, …, sans-serif`（唯一載入的中文字體，400/500/700）。
- 標籤/系統感：`.font-mono`（Menlo 鏈＋`letter-spacing:.05em`＋uppercase）。
- 引語/展籤：泛型 `serif`（僅心情展籤一處用 `"Noto Serif TC", serif`）。
- 字重統一寫數字（700），不寫 `'bold'`。

## 間距與形狀

- 容器：max-width 600/720/800px（mobile/768/1024），section padding 60/80px。
- 間距事實標準：8/10/12/15/20/25/30px（含 15/25 兩個非 8-grid 的歷史標準值，沿用）。
- 圓角三級：8 / 12 / 20px；pill 用 `999px`；圓形 `50%`。btn-primary 專屬 40px。
- 陰影兩家族：柔光 `0 Npx Mpx rgba(0,0,0,.03–.25)`；硬邊貼紙 `--shadow-stamp`（3px 3px 0 rgba(0,0,0,.2)）/ `--shadow-stamp-strong`（4px 4px 0 rgba(0,0,0,.6)）。
- 復古印章語彙：`2px solid #000` 黑框＋貼紙陰影＋moonSilver 底（S03.5 展籤 CTA，深底/黑框印章鈕家族統一用 moonSilver）。

## 動效

- 預設過渡：`all .3s ease`。
- 曲線 token：`--ease-ui`（cubic-bezier(.4,0,.2,1)，UI 反饋類）／`--ease-playful`（cubic-bezier(.175,.885,.32,1.275)，彩蛋/驚喜類）。
- 全域已掛 `prefers-reduced-motion: reduce` 降級——新動畫不用另外處理，但不准移除該規則。

## Penso 拍板：以下為刻意設計，不准「順手修正」（2026-07-12）

1. 蠟封血紅 `#8b0000`/`#5d0000` — 保留，彩蛋戲劇色。
2. 必填星號 `color:'red'` — 保留，不定義 --c-error。
3. 兩套金色/警示黃家族（#FFD700 系、#fff3cd 系）— 各自保留，不合併。moonYellow 已於 2026-07-12 Season 03.5 換裝退場，拆分為 moonSilver/moonShadow（見上方分流準則），不再屬「拍板保留」清單。
4. 引語體維持泛型 `serif`，不全站載入 Noto Serif TC（效能考量）。

## 記債（升級輪未做，動工前先問）

- index.tsx 巨石全拆（5400 行）／品名字串映射收斂 ID-based／letter-spacing px→em 統一／圓角與間距孤兒值併級／訂單 API 速率限制／Sentry 錯誤監控。
