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
const { default: handler } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);

const MENU_ITEMS = [
  { id: 'item-cake', name: '巴斯克乳酪蛋糕', category_id: 'cakes', is_available: true },
  { id: 'item-cookie', name: '月島餅乾', category_id: 'cookies', is_available: true },
  { id: 'item-display', name: '門市展示禮盒', category_id: 'gifts', is_available: true },
  { id: 'item-latte', name: '小山園抹茶拿鐵', category_id: 'drinks', is_available: true },
  { id: 'item-off', name: '夏季限定塔', category_id: 'tarts', is_available: false },
];
const MENU_VARIANTS = [
  { id: 'v-cake-6', menu_item_id: 'item-cake', spec: '6吋', price: '1990' },
  { id: 'v-cake-slice', menu_item_id: 'item-cake', spec: '切片', price: '180' },
  { id: 'v-cookie', menu_item_id: 'item-cookie', spec: null, price: '120' },
  { id: 'v-display', menu_item_id: 'item-display', spec: '一般', price: '0' },
  { id: 'v-latte', menu_item_id: 'item-latte', spec: '一般', price: '160' }, // 有價格也不開放
  { id: 'v-off', menu_item_id: 'item-off', spec: '標準', price: '220' },
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

console.log('Map order pricing: DB price recalculation, $0 / drink / unknown spec / unavailable / quantity / cap / DB-error guards passed; no DB or network accessed.');
