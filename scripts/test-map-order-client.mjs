// 菜單頁送單流程（依 /api/map-order 回應分流）的 node 檢查（map 沒有測試 runner）。
// 用法：node scripts/test-map-order-client.mjs
// 1) lib/map-order-client.ts 的純函式；2) 從 index.tsx 抽出真正的 confirmAndSend，
//    在 vm 裡以 stub 執行（fetch／GA4／Discord／LINE 導頁全部攔截，不送任何外部請求）；
// 3) api/notify-discord-order.ts 的訊息內容（global fetch 換成 stub，不連 Discord）。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { build, transform, transformSync } from 'esbuild';

const toModule = async (code) => import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const clientSrc = readFileSync(new URL('../lib/map-order-client.ts', import.meta.url), 'utf8');
const client = await toModule((await transform(clientSrc, { loader: 'ts', format: 'esm', target: 'es2022' })).code);
const plain = (value) => JSON.parse(JSON.stringify(value)); // 跨 vm realm 比對用

const CART = [
  { name: '巴斯克乳酪蛋糕', spec: '6吋', price: '$1,890', count: 2 }, // 畫面上的舊價
  { name: '月島餅乾', spec: '標準', price: '$120', count: 1 },
];
const SERVER_ORDER = {
  order_id: 'ORD-SERVER-1', order_number: 'ORD-SERVER-1', total_price: 4100,
  items: [
    { id: 'a', name: '巴斯克乳酪蛋糕', variant_name: '6吋', price: 1990, quantity: 2 },
    { id: 'b', name: '月島餅乾', variant_name: '標準', price: 120, quantity: 1 },
  ],
};
const REJECT_MESSAGE = '商品「門市展示禮盒」（一般）為門市限定，無法線上預訂';
// 400 的結帳視窗訊息：伺服器原因 + 固定的「問題持續就聯繫門市」提示（只是文字，不自動開 LINE）。
const REJECT_UI_MESSAGE = `${REJECT_MESSAGE}。${client.LINE_CONTACT_HINT}`;

// ── 1. 純函式：依 API 回應決定下一步 ─────────────────────────────────────────
{
  const resolve = (status, body, cart = CART) => client.resolveMapOrderOutcome({ status, body, proposedOrderId: 'ORD-PROP', cart });
  assert.deepEqual(plain(resolve(400, { error: REJECT_MESSAGE })), { kind: 'rejected', message: REJECT_UI_MESSAGE });
  for (const body of [{ error: 'Invalid total_amount: must be a finite positive number <= 100000' }, null, { error: '' }, { error: '超'.repeat(201) }]) {
    assert.equal(resolve(400, body).message, client.ORDER_REJECTED_FALLBACK_MESSAGE);
  }
  // 400 一律以「聯繫門市」提示收尾，而且只出現一次：伺服器中文訊息、已帶句號的訊息、通用說明都一樣。
  for (const body of [{ error: REJECT_MESSAGE }, { error: `${REJECT_MESSAGE}。` }, { error: '找不到商品「X」，請重新整理菜單後再試' }, { error: 'Invalid payment_status' }, null, { error: '' }]) {
    const { message } = resolve(400, body);
    assert.ok(message.endsWith(client.LINE_CONTACT_HINT), `400 message must end with the LINE hint: ${message}`);
    assert.match(message, /LINE/);
    assert.equal(message.split(client.LINE_CONTACT_HINT).length - 1, 1, `hint must appear exactly once: ${message}`);
    assert.doesNotMatch(message, /。。/);
  }
  assert.equal(resolve(400, { error: `${REJECT_MESSAGE}。` }).message, REJECT_UI_MESSAGE);
  for (const status of [null, 401, 404, 429, 500, 502, 503]) {
    assert.deepEqual(plain(resolve(status, { error: 'x' })), { kind: 'unconfirmed', orderNumber: 'ORD-PROP' });
  }
  const confirmed = resolve(200, { success: true, order: SERVER_ORDER });
  assert.equal(confirmed.kind, 'confirmed');
  assert.equal(confirmed.total, 4100);
  assert.equal(confirmed.orderNumber, 'ORD-SERVER-1');
  assert.equal(confirmed.priceUpdated, true);
  const samePriceCart = [{ ...CART[0], price: '$1,990' }, CART[1]];
  assert.equal(resolve(200, { order: SERVER_ORDER }, samePriceCart).priceUpdated, false);
  // 2xx 但沒有可信的伺服器金額：不拿前端金額冒充已確認。
  assert.equal(resolve(200, { order: { ...SERVER_ORDER, total_price: undefined } }).kind, 'unconfirmed');
  assert.equal(resolve(200, { order: { ...SERVER_ORDER, total_price: 1 } }).kind, 'unconfirmed');
  assert.equal(resolve(200, { order: { ...SERVER_ORDER, items: [] } }).kind, 'unconfirmed');
  assert.equal(resolve(200, null).kind, 'unconfirmed');
}

// ── 2. 真正的 confirmAndSend（從 index.tsx 抽出），所有外部請求都攔截 ─────────────
const indexSrc = readFileSync(new URL('../index.tsx', import.meta.url), 'utf8');
const confirmAndSendSrc = indexSrc.match(/const confirmAndSend = (async \(\) => \{[\s\S]*?\n  \});/)[1];
const confirmAndSendCode = transformSync(`(${confirmAndSendSrc})()`, { loader: 'ts' }).code;
const LINE_PREFIX = 'https://line.me/R/oaMessage/@931cxefd/?text=';

async function runCheckout(api, { mobile = true, cart = CART } = {}) {
  const calls = { fetch: [], ga: [], discord: [], notices: [], checkoutErrors: [], cleared: 0, orderMessage: null, desktopSuccess: false, submitting: [] };
  const window = { location: { href: 'https://map.kiwimu.com/menu' }, open() { throw new Error('window.open must not be called'); } };
  const context = {
    ...client,
    cart, submitting: false, user: null, orderNote: '',
    customerName: '測試顧客', customerPhone: '0912345678', pickupDate: new Date(2026, 9, 25),
    setSubmitting: (value) => calls.submitting.push(value),
    setCheckoutError: (value) => calls.checkoutErrors.push(value),
    setShowCheckoutConfirm() {},
    showUiNotice: (message, tone) => calls.notices.push({ message, tone }),
    generateOrderNumberCandidate: () => 'ORD-PROP',
    calculateTotal: () => cart.reduce((sum, item) => sum + client.parseCartUnitPrice(item.price) * item.count, 0),
    getGAClientId: () => null,
    storedUTMParams: null,
    getUTMParams: () => ({ utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null, referrer: null }),
    getOrderAttribution: () => ({ utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null, mbti_type: null, from_mbti_test: false }),
    fetch: async (url, init) => {
      if (url !== '/api/map-order') throw new Error(`unexpected external request: ${url}`);
      calls.fetch.push(JSON.parse(init.body));
      if (api === 'network') throw new TypeError('Failed to fetch');
      return { ok: api.status >= 200 && api.status < 300, status: api.status, json: async () => (api.body === undefined ? Promise.reject(new SyntaxError('not json')) : api.body) };
    },
    sendReliableGaEvent: async (name, payload) => { calls.ga.push({ name, payload: plain(payload) }); },
    notifyDiscordOrder: async (payload) => { calls.discord.push(plain(payload)); },
    clearCart: () => { calls.cleared += 1; },
    isMobileDevice: () => mobile,
    window,
    setOrderMessage: (value) => { calls.orderMessage = value; },
    setShowDesktopOrderSuccess: (value) => { calls.desktopSuccess = value; },
    console: { error() {}, warn() {}, log() {} },
  };
  await vm.runInNewContext(confirmAndSendCode, context);
  const href = window.location.href;
  const lineMessage = href.startsWith(LINE_PREFIX) ? decodeURIComponent(href.slice(LINE_PREFIX.length)) : null;
  return { calls, href, lineMessage };
}

// 2a. 400：停下、顯示 API 訊息；不轉 LINE、不發 Discord、不送 GA4、購物車保留。
{
  const { calls, href, lineMessage } = await runCheckout({ status: 400, body: { error: REJECT_MESSAGE } });
  assert.equal(calls.fetch.length, 1);
  assert.equal(calls.checkoutErrors.at(-1), REJECT_UI_MESSAGE);
  assert.ok(calls.checkoutErrors.at(-1).endsWith(client.LINE_CONTACT_HINT), 'rejected UI must end with the LINE contact hint');
  assert.deepEqual(calls.notices, [{ message: REJECT_UI_MESSAGE, tone: 'error' }]);
  assert.equal(calls.discord.length, 0, 'rejected order must not notify Discord');
  assert.equal(calls.ga.length, 0, 'rejected order must not send GA4 purchase');
  assert.equal(lineMessage, null, 'rejected order must not redirect to LINE');
  assert.equal(href, 'https://map.kiwimu.com/menu');
  assert.equal(calls.cleared, 0);
  assert.equal(calls.orderMessage, null);
  assert.equal(calls.submitting.at(-1), false);
}
// 2b. 400 但訊息不是給顧客看的（英文技術訊息）→ 顯示通用說明，同樣停下。
{
  const { calls, lineMessage } = await runCheckout({ status: 400, body: { error: 'Invalid payment_status' } });
  assert.equal(calls.checkoutErrors.at(-1), client.ORDER_REJECTED_FALLBACK_MESSAGE);
  assert.equal(lineMessage, null);
  assert.equal(calls.discord.length, 0);
}
// 2c. 5xx／網路失敗：照常轉 LINE，金額標成預估、待門市確認；Discord 標未確認；不送 GA4。
for (const api of [{ status: 500, body: { error: 'Internal server error' } }, { status: 502 }, 'network']) {
  const { calls, lineMessage } = await runCheckout(api);
  assert.ok(lineMessage, 'fallback must still redirect to LINE');
  assert.match(lineMessage, /預估金額：\$3900（系統暫時無法確認，待門市確認）/);
  assert.match(lineMessage, /請等門市回覆金額後再轉帳/);
  assert.doesNotMatch(lineMessage, /總金額：/);
  assert.match(lineMessage, /訂單編號：ORD-PROP/);
  assert.equal(calls.ga.length, 0);
  assert.equal(calls.discord.length, 1);
  assert.equal(calls.discord[0].amountConfirmed, false);
  assert.equal(calls.discord[0].totalAmount, 3900);
  assert.equal(calls.cleared, 1);
  assert.equal(calls.checkoutErrors.at(-1), null);
}
// 2d. 200：LINE、Discord、GA4 一律用伺服器 total_price 與逐項價格；價格不同要提示顧客。
{
  const { calls, lineMessage } = await runCheckout({ status: 200, body: { success: true, order: SERVER_ORDER } });
  assert.match(lineMessage, /訂單編號：ORD-SERVER-1/);
  assert.match(lineMessage, /總金額：\$4100\n（金額已依最新菜單更新）/);
  assert.match(lineMessage, /● 巴斯克乳酪蛋糕 \| 6吋 x 2（單價 \$1990）/);
  assert.doesNotMatch(lineMessage, /3900|預估金額|待門市確認/);
  assert.deepEqual(calls.ga, [{ name: 'purchase', payload: {
    transaction_id: 'ORD-SERVER-1', value: 4100, currency: 'TWD',
    items: [
      { item_name: '巴斯克乳酪蛋糕', item_variant: '6吋', price: 1990, quantity: 2 },
      { item_name: '月島餅乾', item_variant: '標準', price: 120, quantity: 1 },
    ],
  } }]);
  assert.equal(calls.discord[0].totalAmount, 4100);
  assert.equal(calls.discord[0].amountConfirmed, true);
  assert.deepEqual(calls.discord[0].items.map((item) => item.price), [1990, 120]);
  assert.ok(calls.notices.some((notice) => notice.message === client.PRICE_UPDATED_NOTICE));
  assert.equal(calls.cleared, 1);
}
// 2e. 200 且價格與畫面一致：不提示；桌機顯示訂單訊息、不導頁。
{
  const cart = [{ ...CART[0], price: '$1,990' }, CART[1]];
  const { calls, href } = await runCheckout({ status: 200, body: { order: SERVER_ORDER } }, { mobile: false, cart });
  assert.equal(href, 'https://map.kiwimu.com/menu');
  assert.equal(calls.desktopSuccess, true);
  assert.match(calls.orderMessage, /總金額：\$4100\n取貨日期：2026-10-25/);
  assert.equal(calls.notices.length, 0);
  assert.equal(calls.ga.length, 1);
}
// 2f. 200 但回應缺金額：當成未確認（不送 GA4、金額標待確認），沿用訂單編號。
{
  const { calls, lineMessage } = await runCheckout({ status: 200, body: { order: { order_number: 'ORD-SERVER-2' } } });
  assert.equal(calls.ga.length, 0);
  assert.match(lineMessage, /訂單編號：ORD-SERVER-2[\s\S]*預估金額：\$3900（系統暫時無法確認，待門市確認）/);
  assert.equal(calls.discord[0].amountConfirmed, false);
}

// ── 3. Discord 通知內容（global fetch 換成 stub，不連 Discord）─────────────────
{
  const { outputFiles } = await build({
    entryPoints: [new URL('../api/notify-discord-order.ts', import.meta.url).pathname],
    bundle: true, platform: 'node', format: 'esm', target: 'es2022', write: false,
  });
  const { default: notifyHandler } = await toModule(outputFiles[0].text);
  for (const key of ['DISCORD_TOKEN', 'DISCORD_NOTIFY_SIGNING_SECRET', 'DISCORD_NOTIFY_REQUIRE_SIGNATURE', 'INTERNAL_API_TOKEN']) delete process.env[key];
  process.env.DISCORD_WEBHOOK_URL = 'https://discord.invalid/test-webhook';
  const sent = [];
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://discord.invalid/test-webhook', 'only the stub webhook may be called');
    sent.push(JSON.parse(init.body).content);
    return { ok: true, status: 204, statusText: 'No Content', json: async () => null };
  };
  const notify = async (body) => {
    const res = { statusCode: 0, body: null, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
    await notifyHandler({ method: 'POST', headers: { origin: 'https://map.kiwimu.com' }, body }, res);
    assert.equal(res.statusCode, 200);
    return sent.at(-1);
  };
  const contact = { customerName: '測試顧客', customerPhone: '0912345678', pickupDate: '2026-10-25', orderNote: '' };
  const unconfirmed = await notify(client.buildDiscordOrderPayload({ kind: 'unconfirmed', orderNumber: 'ORD-PROP' }, contact, CART));
  assert.match(unconfirmed, /⚠️ 金額未經系統確認/);
  assert.match(unconfirmed, /💰 預估金額：\$3900（待門市確認）/);
  assert.doesNotMatch(unconfirmed, /總金額|單價/);
  const confirmedOutcome = client.resolveMapOrderOutcome({ status: 200, body: { order: SERVER_ORDER }, proposedOrderId: 'ORD-PROP', cart: CART });
  const confirmedMsg = await notify(client.buildDiscordOrderPayload(confirmedOutcome, contact, CART));
  assert.match(confirmedMsg, /💰 總金額：\$4100/);
  assert.match(confirmedMsg, /• 巴斯克乳酪蛋糕 \| 6吋 x 2（單價 \$1990）/);
  assert.doesNotMatch(confirmedMsg, /⚠️|預估/);
  // 舊格式呼叫（沒有 amountConfirmed、price 是字串）維持原本輸出。
  const legacy = await notify({ orderId: 'X', totalAmount: 100, items: [{ name: 'A', spec: 'B', count: 1, price: '$100' }] });
  assert.match(legacy, /💰 總金額：\$100/);
  assert.match(legacy, /• A \| B x 1$/m);
}

console.log('Map order client: outcome routing (400 stop / 5xx+network fallback / 200 server prices), real confirmAndSend in vm, Discord labels passed; all external requests stubbed.');
