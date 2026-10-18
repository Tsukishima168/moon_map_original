// /api/map-order 伺服器端重算價格的 node 檢查（map 沒有測試 runner）。
// 用法：node scripts/test-map-order-pricing.mjs
// 以 esbuild 打包真正的 api/map-order.ts，把 supabase-admin 換成記憶體 stub：
// 不連任何資料庫、不打任何網路。
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const stubAdminClient = {
  name: 'stub-supabase-admin',
  setup(b) {
    b.onResolve({ filter: /supabase-admin\.js$/ }, () => ({ path: 'supabase-admin', namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
      contents: 'export const createAdminClient = () => globalThis.__MAP_ORDER_TEST_CLIENT__;',
      loader: 'js',
    }));
  },
};
const { outputFiles } = await build({
  entryPoints: [new URL('../api/map-order.ts', import.meta.url).pathname],
  bundle: true, platform: 'node', format: 'esm', target: 'es2022', write: false,
  plugins: [stubAdminClient],
});
const { default: handler, parseMenuPrice } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);

const MENU_ITEMS = [
  { id: 'item-cake', name: '巴斯克乳酪蛋糕', category_id: 'cakes', is_available: true },
  { id: 'item-cookie', name: '月島餅乾', category_id: 'cookies', is_available: true },
  { id: 'item-display', name: '門市展示禮盒', category_id: 'gifts', is_available: true },
  { id: 'item-latte', name: '小山園抹茶拿鐵', category_id: 'drinks', is_available: true },
  { id: 'item-off', name: '夏季限定塔', category_id: 'tarts', is_available: false },
  // 正式庫實際格式（2026-10-18 實查）：價格帶 $ 與千分位。
  { id: 'item-tiramisu', name: '經典｜提拉米蘇', category_id: 'classic', is_available: true },
  // 正式庫實際重複資料：同名同規格同價，分類不同（chiffon／mille_crepe）→ 應照常接受。
  { id: 'item-mc-chiffon', name: '母親節限定｜北海道十勝戚風千層', category_id: 'chiffon', is_available: true },
  { id: 'item-mc-crepe', name: '母親節限定｜北海道十勝戚風千層', category_id: 'mille_crepe', is_available: true },
  // 重複資料的拒單情境：價格不一致／其中一筆是飲品／其中一筆不可訂購。
  { id: 'item-twin-a', name: '雙生塔', category_id: 'tarts', is_available: true },
  { id: 'item-twin-b', name: '雙生塔', category_id: 'tarts', is_available: true },
  { id: 'item-matcha-cake', name: '抹茶戚風', category_id: 'chiffon', is_available: true },
  { id: 'item-matcha-drink', name: '抹茶戚風', category_id: 'drinks', is_available: true },
  { id: 'item-pudding-a', name: '焦糖布丁', category_id: 'pudding', is_available: true },
  { id: 'item-pudding-b', name: '焦糖布丁', category_id: 'pudding', is_available: false },
  { id: 'item-bad-price', name: '價格異常測試', category_id: 'cakes', is_available: true },
];
const MENU_VARIANTS = [
  { id: 'v-cake-6', menu_item_id: 'item-cake', spec: '6吋', price: '1990' },
  { id: 'v-cake-slice', menu_item_id: 'item-cake', spec: '切片', price: '180' },
  { id: 'v-cookie', menu_item_id: 'item-cookie', spec: null, price: '120' },
  { id: 'v-display', menu_item_id: 'item-display', spec: '一般', price: '0' },
  { id: 'v-latte', menu_item_id: 'item-latte', spec: '一般', price: '160' }, // 有價格也不開放
  { id: 'v-off', menu_item_id: 'item-off', spec: '標準', price: '220' },
  { id: 'v-cookie-box', menu_item_id: 'item-cookie', spec: '禮盒', price: 'NT$170' },
  { id: 'v-tiramisu-box', menu_item_id: 'item-tiramisu', spec: '鐵盒', price: '$450' },
  { id: 'v-tiramisu-200', menu_item_id: 'item-tiramisu', spec: '200ml', price: '$170' },
  { id: 'v-mc-chiffon', menu_item_id: 'item-mc-chiffon', spec: '六寸｜三種醬料組合', price: '$1,490' },
  { id: 'v-mc-crepe', menu_item_id: 'item-mc-crepe', spec: '六寸｜三種醬料組合', price: '$1,490' },
  { id: 'v-twin-a', menu_item_id: 'item-twin-a', spec: '標準', price: '300' },
  { id: 'v-twin-b', menu_item_id: 'item-twin-b', spec: '標準', price: '320' },
  { id: 'v-matcha-cake', menu_item_id: 'item-matcha-cake', spec: '標準', price: '200' },
  { id: 'v-matcha-drink', menu_item_id: 'item-matcha-drink', spec: '標準', price: '200' },
  { id: 'v-pudding-a', menu_item_id: 'item-pudding-a', spec: '標準', price: '150' },
  { id: 'v-pudding-b', menu_item_id: 'item-pudding-b', spec: '標準', price: '150' },
  { id: 'v-bad-neg', menu_item_id: 'item-bad-price', spec: '負數', price: '-100' },
  { id: 'v-bad-text', menu_item_id: 'item-bad-price', spec: '文字', price: 'abc' },
  { id: 'v-bad-empty', menu_item_id: 'item-bad-price', spec: '空白', price: '' },
];

function createStubClient({ menuError = null } = {}) {
  const inserts = [];
  const tables = { menu_items: MENU_ITEMS, menu_variants: MENU_VARIANTS };
  return {
    inserts,
    from(table) {
      if (table === 'orders') {
        return { insert(row) {
          inserts.push(structuredClone(row));
          return { select: () => ({ single: async () => ({ data: { id: 'db-uuid', ...row }, error: null }) }) };
        } };
      }
      return { select: async () => (menuError ? { data: null, error: menuError } : { data: structuredClone(tables[table]), error: null }) };
    },
  };
}

const baseOrder = {
  order_number: 'ORD1018120000TEST', customer_name: '測試顧客', customer_phone: '0912345678',
  customer_email: null, total_amount: 1, pickup_date: '2026-10-25', order_note: null, user_id: null,
  payment_status: 'pending', source: 'moon_map', ga_client_id: null,
};
const line = (item_name, item_spec, unit_price, quantity) => ({ item_name, item_spec, unit_price, quantity, subtotal: unit_price * quantity });

async function submit(items, { order = {}, client = createStubClient() } = {}) {
  const res = { statusCode: 0, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  const req = { method: 'POST', headers: { origin: 'https://map.kiwimu.com' }, body: { order: { ...baseOrder, ...order }, items } };
  globalThis.__MAP_ORDER_TEST_CLIENT__ = client;
  await handler(req, res);
  return { res, inserts: client.inserts };
}
const assertRejected = ({ res, inserts }, pattern) => {
  assert.equal(res.statusCode, 400, JSON.stringify(res.body));
  assert.match(res.body.error, pattern);
  assert.equal(inserts.length, 0, 'rejected order must not be written');
};

const warnings = [];
const errors = [];
console.warn = (...args) => warnings.push(args);
console.error = (...args) => errors.push(args);

// 1. 正常甜點：前端送 1 元，寫入的是資料庫價格；spec 為 null 的規格以「標準」比對。
{
  const { res, inserts } = await submit([line('巴斯克乳酪蛋糕', '6吋', 1, 2), line('月島餅乾', '標準', 0, 1)], { order: { total_amount: 1 } });
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  assert.equal(inserts.length, 1);
  const row = inserts[0];
  assert.deepEqual(row.items.map(({ name, variant_name, price, quantity }) => ({ name, variant_name, price, quantity })), [
    { name: '巴斯克乳酪蛋糕', variant_name: '6吋', price: 1990, quantity: 2 },
    { name: '月島餅乾', variant_name: '標準', price: 120, quantity: 1 },
  ]);
  // 7. 寫入 payload 的金額全部由資料庫算出：1990×2 + 120×1。
  assert.equal(row.total_price, 4100);
  assert.equal(row.original_price, 4100);
  assert.equal(row.final_price, 4100);
  assert.equal(row.discount_amount, 0);
  assert.equal(res.body.order.total_price, 4100);
  assert.equal(warnings.length, 1, 'price mismatch should be logged');
  // 既有欄位不受影響：訂單編號、來源、狀態。
  assert.equal(row.order_id, 'ORD1018120000TEST');
  assert.equal(row.checkout_site, 'map');
  assert.equal(row.status, 'pending');
}

// 價格字串解析：接受 $／NT$ 開頭與千分位，拒絕負數、空字串、其他文字。
for (const [raw, expected] of [['$450', 450], ['$1,490', 1490], ['NT$170', 170], ['1990', 1990], [' $170 ', 170], [1990, 1990]]) {
  assert.equal(parseMenuPrice(raw), expected, `parseMenuPrice(${JSON.stringify(raw)})`);
}
for (const raw of ['-100', '$-100', 'abc', '', '1,49', '12abc', '$', null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
  assert.ok(Number.isNaN(parseMenuPrice(raw)), `parseMenuPrice(${String(raw)}) should be NaN`);
}

// 正式庫格式："$450"／"$170"（經典｜提拉米蘇）、"NT$170" 都能成立，金額以資料庫為準。
{
  const { res, inserts } = await submit([line('經典｜提拉米蘇', '鐵盒', 1, 1), line('經典｜提拉米蘇', '200ml', 1, 2), line('月島餅乾', '禮盒', 1, 1)]);
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  assert.deepEqual(inserts[0].items.map(item => item.price), [450, 170, 170]);
  assert.equal(inserts[0].total_price, 450 + 170 * 2 + 170);
}

// 同名同規格兩筆、同價、分類不同（chiffon／mille_crepe）且都不是飲品 → 照常接受（"$1,490"）。
{
  const { res, inserts } = await submit([line('母親節限定｜北海道十勝戚風千層', '六寸｜三種醬料組合', 1490, 1)], { order: { total_amount: 1490 } });
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  assert.equal(inserts[0].items[0].price, 1490);
  assert.equal(inserts[0].total_price, 1490);
}

// 價格無法解析（負數、文字、空字串）→ 拒絕，不會被當成正數。
for (const spec of ['負數', '文字', '空白']) {
  assertRejected(await submit([line('價格異常測試', spec, 100, 1)]), /價格設定異常/);
}

// 重複資料：價格不一致 → 拒；任一筆是飲品 → 依飲品防線拒；任一筆不可訂購 → 依不可訂購拒。
assertRejected(await submit([line('雙生塔', '標準', 300, 1)]), /價格設定異常/);
assertRejected(await submit([line('抹茶戚風', '標準', 200, 1)]), /門市現做飲品/);
assertRejected(await submit([line('焦糖布丁', '標準', 150, 1)]), /目前不可訂購/);

// 2. 0 元規格（門市限定）拒絕。
assertRejected(await submit([line('門市展示禮盒', '一般', 0, 1)]), /門市限定/);
assertRejected(await submit([line('門市展示禮盒', '一般', 500, 1)], { order: { total_amount: 500 } }), /門市限定/);

// 3. 飲品一律門市供應，即使資料庫有正價格也拒絕。
assertRejected(await submit([line('小山園抹茶拿鐵', '一般', 160, 1)], { order: { total_amount: 160 } }), /飲品.*門市|門市.*飲品/);

// 4. 不存在的規格／品項拒絕。
assertRejected(await submit([line('巴斯克乳酪蛋糕', '8吋', 2500, 1)]), /沒有「8吋」規格/);
assertRejected(await submit([line('不存在的蛋糕', '標準', 100, 1)]), /找不到商品/);

// 5. 不可訂購的品項拒絕。
assertRejected(await submit([line('夏季限定塔', '標準', 220, 1)]), /目前不可訂購/);

// 6. 數量非正整數拒絕（含小數、0、負數、字串）。
for (const quantity of [0, -1, 1.5, '2', Number.NaN, 1001]) {
  assertRejected(await submit([{ item_name: '巴斯克乳酪蛋糕', item_spec: '6吋', unit_price: 1990, quantity, subtotal: 1990 }]), /數量需為 1 到 1000 的整數/);
}

// 一筆不合法就整張不寫入（不會只寫入合法的部分）。
assertRejected(await submit([line('巴斯克乳酪蛋糕', '切片', 180, 1), line('門市展示禮盒', '一般', 0, 1)]), /門市限定/);

// 以資料庫價格計算後超過上限也拒絕（前端金額再小都一樣）。
assertRejected(await submit([line('巴斯克乳酪蛋糕', '6吋', 1, 1000)]), /超過線上預訂上限/);

// 讀不到菜單價格 → 500、不寫入（fail closed）。
{
  const { res, inserts } = await submit([line('巴斯克乳酪蛋糕', '6吋', 1990, 1)], { client: createStubClient({ menuError: { message: 'boom' } }) });
  assert.equal(res.statusCode, 500);
  assert.match(res.body.error, /無法確認商品價格/);
  assert.equal(inserts.length, 0);
}

console.log('Map order pricing: DB price recalculation ($ / NT$ / thousands formats), duplicate-row rules, $0 / drink / unknown spec / unavailable / quantity / cap / DB-error guards passed; no DB or network accessed.');
