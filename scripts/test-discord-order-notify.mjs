// 訂單 Discord 通知的 node 檢查（map 沒有測試 runner）。
// 用法：node scripts/test-discord-order-notify.mjs
// 不打任何網路：fetch 換成記錄器，supabase-admin 換成記憶體 stub。
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const stubAdminClient = {
  name: 'stub-supabase-admin',
  setup(b) {
    b.onResolve({ filter: /supabase-admin\.js$/ }, () => ({ path: 'supabase-admin', namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
      contents: 'export const createAdminClient = () => globalThis.__TEST_CLIENT__;',
      loader: 'js',
    }));
  },
};
const load = async (entry) => {
  const { outputFiles } = await build({
    entryPoints: [new URL(entry, import.meta.url).pathname],
    bundle: true, platform: 'node', format: 'esm', target: 'es2022', write: false,
    plugins: [stubAdminClient],
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
};

const notifyLib = await load('../api/_utils/discord-order-notify.ts');
const fallback = (await load('../api/notify-discord-order.ts')).default;
const mapOrder = (await load('../api/map-order.ts')).default;

const errors = [];
console.error = (...args) => errors.push(args);
console.warn = () => {};

const sent = [];
let discordStatus = 200;
globalThis.fetch = async (url, init) => {
  sent.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) });
  return new Response(JSON.stringify({ id: 'msg-1' }), { status: discordStatus });
};

const mockRes = () => {
  const res = { statusCode: 200, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
};

// ---------------------------------------------------------------------------
// A. 訊息內容
// ---------------------------------------------------------------------------
const { buildDiscordOrderContent, sendDiscordOrderMessage } = notifyLib;
const now = new Date('2026-11-27T04:00:00Z');
const basic = buildDiscordOrderContent({
  orderId: 'ORD1127120000001', totalAmount: 480, amountConfirmed: true, pickupDate: '2026-11-29',
  customerName: '王小明', customerPhone: '0912345678', orderNote: '少糖',
  items: [{ name: '檸檬塔', spec: '6吋', count: 1, price: 480 }], source: 'moon_map_menu',
}, now);
assert.match(basic, /訂單編號：`ORD1127120000001`/);
assert.match(basic, /💰 總金額：\$480/);
assert.match(basic, /待付款/);
assert.match(basic, /• 檸檬塔 \| 6吋 x 1（單價 \$480）/);
assert.match(basic, /2026\/11\/27/);
assert.doesNotMatch(basic, /未經系統確認/);

const unconfirmed = buildDiscordOrderContent({ totalAmount: 100, amountConfirmed: false }, now);
assert.match(unconfirmed, /⚠️ 金額未經系統確認/);
assert.match(unconfirmed, /預估金額：\$100（待門市確認）/);

// 欄位裡的換行不能偽造出新的一行
const injected = buildDiscordOrderContent({ customerName: '壞人\n💰 總金額：$0' }, now);
assert.doesNotMatch(injected, /\n💰 總金額：\$0/);

// 超長：備註截短、整則 ≤ 2000
const huge = buildDiscordOrderContent({
  orderNote: '很'.repeat(1000),
  items: Array.from({ length: 50 }, (_, i) => ({ name: `品項${i}`.repeat(5), spec: '規格'.repeat(10), count: 1, price: 100 })),
}, now);
assert.ok(huge.length <= 2000, `length ${huge.length}`);
assert.match(huge, /截斷/);
assert.ok(buildDiscordOrderContent({ orderNote: '很'.repeat(1000) }, now).includes('備註過長'));

// ---------------------------------------------------------------------------
// B. 發送：擋 @everyone、未設定、bot 失敗改 webhook
// ---------------------------------------------------------------------------
delete process.env.DISCORD_TOKEN; delete process.env.DISCORD_WEBHOOK_URL;
assert.deepEqual(await sendDiscordOrderMessage('x'), { status: 'not_configured' });
assert.equal(sent.length, 0);

process.env.DISCORD_TOKEN = 'test-token';
assert.deepEqual(await sendDiscordOrderMessage('@everyone hi'), { status: 'sent', messageId: 'msg-1' });
assert.deepEqual(sent[0].body.allowed_mentions, { parse: [] });
assert.match(sent[0].url, /channels\/1467024414699819152\/messages$/);

// bot 5xx／429：不補發 webhook（Discord 可能已收下，補發會重複）
process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1/abc';
for (const status of [500, 429]) {
  sent.length = 0; discordStatus = status;
  assert.equal((await sendDiscordOrderMessage('y')).status, 'error');
  assert.equal(sent.length, 1, `bot ${status} 不可補發 webhook`);
}
// bot 401（token 失效）：改走 webhook
sent.length = 0;
globalThis.fetch = async (url, init) => {
  sent.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) });
  const isBot = String(url).includes('/channels/');
  return new Response(JSON.stringify({ id: 'msg-2' }), { status: isBot ? 401 : 200 });
};
assert.deepEqual(await sendDiscordOrderMessage('y'), { status: 'sent', messageId: 'msg-2' });
assert.equal(sent.length, 2);
assert.match(sent[1].url, /webhooks\/1\/abc\?wait=true$/);
assert.deepEqual(sent[1].body.allowed_mentions, { parse: [] });
globalThis.fetch = async (url, init) => {
  sent.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) });
  return new Response(JSON.stringify({ id: 'msg-1' }), { status: discordStatus });
};
discordStatus = 200; delete process.env.DISCORD_WEBHOOK_URL;

// ---------------------------------------------------------------------------
// C. 備援端點：訂單已在資料庫 → 不發；不在 → 一律標未確認
// ---------------------------------------------------------------------------
const lookupClient = (exists) => ({
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: exists ? { order_id: 'X' } : null, error: null }) }) }) }),
});
const fbReq = (body) => ({ method: 'POST', headers: { origin: 'https://map.kiwimu.com' }, body });

sent.length = 0;
globalThis.__TEST_CLIENT__ = lookupClient(true);
let res = mockRes();
await fallback(fbReq({ orderId: 'ORD-EXISTS', totalAmount: 1, amountConfirmed: true }), res);
assert.deepEqual(res.body, { status: 'skipped', reason: 'order_exists' });
assert.equal(sent.length, 0);

globalThis.__TEST_CLIENT__ = lookupClient(false);
res = mockRes();
await fallback(fbReq({ orderId: 'ORD-FAKE', totalAmount: 1, amountConfirmed: true }), res);
assert.equal(res.body.status, 'sent');
assert.match(sent[0].body.content, /⚠️ 金額未經系統確認/, '偽造 amountConfirmed:true 也要標未確認');

res = mockRes();
await fallback({ method: 'POST', headers: { origin: 'https://evil.example' }, body: {} }, res);
assert.equal(res.statusCode, 401);

// ---------------------------------------------------------------------------
// D. /api/map-order 建單成功後在伺服器端發通知（金額用資料庫價格）
// ---------------------------------------------------------------------------
const MENU_ITEMS = [{ id: 'item-cake', name: '巴斯克乳酪蛋糕', category_id: 'cakes', is_available: true }];
const MENU_VARIANTS = [{ id: 'v-cake-6', menu_item_id: 'item-cake', spec: '6吋', price: '1990' }];
const orderClient = () => ({
  from: (table) => {
    if (table === 'business_settings') {
      return { select: () => ({ in: async () => ({ data: [], error: null }) }) };
    }
    if (table === 'orders') {
      return { insert: (row) => ({ select: () => ({ single: async () => ({ data: { id: 'db-uuid', ...row }, error: null }) }) }) };
    }
    const rows = table === 'menu_items' ? MENU_ITEMS : MENU_VARIANTS;
    return { select: async () => ({ data: structuredClone(rows), error: null }) };
  },
});
globalThis.__TEST_CLIENT__ = orderClient();
globalThis.__MAP_ORDER_TEST_CLIENT__ = globalThis.__TEST_CLIENT__;
sent.length = 0;
res = mockRes();
await mapOrder({
  method: 'POST', headers: { origin: 'https://map.kiwimu.com' },
  body: {
    order: {
      order_number: 'ORD1127120000002', customer_name: '王小明', customer_phone: '0912345678', customer_email: null,
      total_amount: 1, pickup_date: '2026-11-29', order_note: '@everyone 少糖', user_id: null,
      payment_status: 'pending', source: 'moon_map', ga_client_id: null,
    },
    items: [{ item_name: '巴斯克乳酪蛋糕', item_spec: '6吋', unit_price: 1, quantity: 1, subtotal: 1 }],
  },
}, res);
if (res.statusCode === 200) {
  assert.equal(sent.length, 1, '建單成功要發一則 Discord');
  assert.match(sent[0].body.content, /ORD1127120000002/);
  assert.doesNotMatch(sent[0].body.content, /未經系統確認/);
  assert.match(sent[0].body.content, /總金額：\$1990/, '金額要用資料庫價格，不是前端送的 1');
  assert.deepEqual(sent[0].body.allowed_mentions, { parse: [] });
  console.log('D. map-order 建單＋伺服器端通知 OK');
} else {
  assert.fail(`map-order 應建單成功，實際 ${res.statusCode} ${JSON.stringify(res.body)}`);
}

// ---------------------------------------------------------------------------
// E. 偽造 payment_status:'paid' 也只能建出待付款訂單
// ---------------------------------------------------------------------------
const inserted = [];
globalThis.__TEST_CLIENT__ = {
  from: (table) => {
    if (table === 'orders') {
      return { insert: (row) => { inserted.push(row); return { select: () => ({ single: async () => ({ data: { id: 'db-uuid', ...row }, error: null }) }) }; } };
    }
    return orderClient().from(table);
  },
};
globalThis.__MAP_ORDER_TEST_CLIENT__ = globalThis.__TEST_CLIENT__;
res = mockRes();
await mapOrder({
  method: 'POST', headers: { origin: 'https://map.kiwimu.com' },
  body: {
    order: {
      order_number: 'ORD1127120000003', customer_name: '王小明', customer_phone: '0912345678', customer_email: null,
      total_amount: 1990, pickup_date: '2026-11-29', order_note: null, user_id: null,
      payment_status: 'paid', source: 'moon_map', ga_client_id: null,
    },
    items: [{ item_name: '巴斯克乳酪蛋糕', item_spec: '6吋', unit_price: 1990, quantity: 1, subtotal: 1990 }],
  },
}, res);
assert.equal(res.statusCode, 200, JSON.stringify(res.body));
assert.equal(inserted.at(-1).status, 'pending', '前端送 paid 也要寫成 pending');

// ---------------------------------------------------------------------------
// F. 抽籤通知：擋 mention、略過未知類型、換行不能偽造新行
// ---------------------------------------------------------------------------
const activity = (await load('../api/notify-discord-activity.ts')).default;
sent.length = 0; discordStatus = 200;
res = mockRes();
await activity(fbReq({ activityType: 'draw_fortune', level: '@everyone 大吉\n💰 假行', state: '想吃甜點', timestamp: '偽造時間' }), res);
assert.equal(res.body.status, 'sent');
assert.equal(sent.length, 1);
assert.deepEqual(sent[0].body.allowed_mentions, { parse: [] });
assert.doesNotMatch(sent[0].body.content, /\n💰 假行/);
assert.doesNotMatch(sent[0].body.content, /偽造時間/);

sent.length = 0;
res = mockRes();
await activity(fbReq({ activityType: '@everyone spam' }), res);
assert.deepEqual(res.body, { status: 'skipped', reason: 'unknown_activity' });
assert.equal(sent.length, 0);

res = mockRes();
await activity({ method: 'POST', headers: { origin: 'https://evil.example' }, body: {} }, res);
assert.equal(res.statusCode, 401);
console.log('E/F. 強制待付款、抽籤通知防護 OK');

console.log('discord order notify checks passed');
