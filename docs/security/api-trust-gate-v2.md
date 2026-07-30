# API 信任閘 v2 — 根治方案規格（草案，未實作）

## 現況（本輪防禦縱深修完後）

`verifyTrustedRequest.ts` 仍然以 `Origin`/`Referer` header 作為 fallback 信任來源。
本輪已把 production 下的 localhost 白名單移除、把 Referer fallback 限制在
GET/HEAD，並加上 in-memory 限流。但根本問題沒解：**Origin header 是 client
自己送出的字串，任何腳本、curl、Postman 都能任意填寫**，瀏覽器只在「網頁發出
的 fetch/XHR」情境下強制帶正確 Origin；直接對 API 發 request 完全不受此限制。

也就是說，只要攻擊者知道 `map.kiwimu.com` 是被允許的 Origin，一行
`curl -H "Origin: https://map.kiwimu.com" ...` 就能通過現在的閘門。Origin 檢查
擋得住「瀏覽器裡的惡意網站對我們 API 發跨站請求」（傳統 CSRF 情境），但擋不住
「攻擊者直接寫程式打 API」。這正是稽核抓到的洞：production 沒有
`INTERNAL_API_TOKEN`、沒有 `ALLOWED_ORIGINS`，所以線上唯一閘門就是這個「可偽造
的 Origin」。

## 為什麼 Origin 不能當信任根據

- Origin/Referer 是 request-controlled 值，不是身份證明。
- 沒有簽章、沒有時效、沒有跟特定使用者/裝置/請求綁定。
- 只防「瀏覽器同源政策生效的路徑」，對直接呼叫 API 的攻擊者無效。
- 目前程式碼本身的註解也承認這點（見 `verifyTrustedRequest.ts` 內
  「Fixed allow-list only. Do NOT derive allowed origins from any
  request-controlled value」）——但 Origin 本身也是 request-controlled 值，只是
  白名單是 fixed 的，並不代表 Origin header 的值可信。

## 兩條根治路線比較

### 路線 A：Cloudflare Turnstile（人機驗證）

**做法**：前端下單/兌獎表單送出前先過 Turnstile，拿到一次性 token，隨表單一起
送到 API；API 端呼叫 Cloudflare `siteverify` 驗證 token 有效且未被用過。

**要動的檔案（估計）**
- 前端：`index.tsx`（或下單元件）加入 Turnstile widget、送出時附帶
  `cf-turnstile-response` 欄位。
- 新增 `api/_utils/verifyTurnstile.ts`：呼叫
  `https://challenges.cloudflare.com/turnstile/v0/siteverify`。
- `api/map-order.ts`、`api/rewards/claim.ts`、`api/rewards/progress.ts`：
  改成先驗 Turnstile token，失敗才 fallback 到現有 Origin 閘（或直接拒絕）。

**需要的環境變數**
- `TURNSTILE_SITE_KEY`（前端可見，非密鑰）
- `TURNSTILE_SECRET_KEY`（server-only，siteverify 用）

**優點**：擋機器人腳本、擋暴力刷單/刷獎，實作成熟、Cloudflare 免費額度夠用。
**缺點**：多一次網路往返、體驗上多一個互動（可設 invisible mode 降低干擾）；
不是「身份驗證」，只證明「像人類」，仍需搭配限流/驗證邏輯。

### 路線 B：由 shop 伺服器簽發短時效 HMAC token

**做法**：真正該信任的呼叫方是「shop-kiwimu-com 的後端」或「map 自己的前端頁面
在合法載入後由 server 端點簽發的 token」，用 HMAC-SHA256 簽一個帶時間戳/nonce
的 token，短時效（例如 60~120 秒）+ 一次性（防重放），API 端驗簽。

**要動的檔案（估計）**
- 新增 `api/_utils/issueRequestToken.ts`：頁面載入或表單開啟時呼叫，簽發
  token（伺服器端動作，不暴露密鑰給瀏覽器）。
- 前端：`index.tsx` 下單流程改為「先跟自家 API 要 token → 帶著 token 送
  `map-order`」。
- `api/_utils/verifyTrustedRequest.ts`：新增驗 token 分支（複用
  `authorizeDiscordNotifyRequest.ts` 裡已有的 HMAC + timestamp + replay-guard
  pattern，那段程式碼已經是這個模式的參考實作）。
- `api/map-order.ts`、`api/rewards/claim.ts`、`api/rewards/progress.ts`：改用
  token 驗證取代 Origin fallback。

**需要的環境變數**
- `REQUEST_TOKEN_SIGNING_SECRET`（server-only，Vercel production 必須設定）
- 沿用現有 `DISCORD_NOTIFY_MAX_SIGNATURE_AGE_MS` 的模式命名一個對應值，例如
  `REQUEST_TOKEN_MAX_AGE_MS`

**優點**：不需要第三方服務、不增加使用者互動、和現有
`authorizeDiscordNotifyRequest.ts` 的簽章模式一致，工程風格統一。
**缺點**：token 簽發端點本身仍然是「誰都能打」的公開端點——如果簽發端點沒有
自己的節流/驗證，等於把問題往前挪一層而非解決；需要額外設計「什麼情況下才發
token」（例如：頁面正常載入時的一次性 nonce、綁定 session）。

### 建議

兩者不互斥，且都不完美地解決「誰在打 API」這個根本問題：Turnstile 擋機器人
但不驗證身份；HMAC token 驗證來源合法性但簽發端點本身仍需要防護。中期建議：
**路線 B 打底（跟現有 Discord 簽章模式技術棧一致，維護成本低）+ 路線 A 作為下單
這類高價值端點的第二層（擋自動化刷單）**。純靠其中一個都不夠。

## 上線驗收清單（v2 落地時使用，本輪不執行）

- [ ] production 環境變數已設定：所需的 secret（token 簽章 key 和/或
      Turnstile secret）不得為空，啟動時應 fail-fast 而非靜默放行。
- [ ] `verifyTrustedRequest`（或其後繼者）在缺少必要環境變數時，
      production 模式下**預設拒絕**而不是退回 Origin 白名單。
- [ ] 有自動化測試證明：偽造 Origin 但無有效 token/Turnstile 驗證的請求會被拒。
- [ ] 有自動化測試證明：合法前端流程（帶正確 token/Turnstile）仍可完整下單。
- [ ] 簽發端點（HMAC 路線）或 Turnstile 驗證本身也掛上限流。
- [ ] 上線後對 `map-order`、`rewards/*`、`notify-discord-order` 各跑一次
      「偽造請求應被拒」的手動驗證（在 staging/preview，不對 production 發送）。
- [ ] `docs/security/api-trust-gate-v2.md` 更新為「已實作」狀態並記錄實際採用
      的路線與理由。
- [ ] 舊的 Origin-only fallback 路徑移除或降級為最後手段（不再是唯一防線）。
