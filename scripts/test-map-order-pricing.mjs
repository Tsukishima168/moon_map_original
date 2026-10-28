// /api/map-order 伺服器端重算價格的 node 檢查（map 沒有測試 runner）。
// 用法：node scripts/test-map-order-pricing.mjs
// 以 esbuild 打包真正的 api/map-order.ts，把 supabase-admin 換成記憶體 stub：
// 不連任何資料庫、不打任何網路。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

// lib/ 底下的純函式（靜態菜單測試要用跟正式程式一樣的 attachMenuItemIds／別名表）。
const bundleLib = async (relativePath) => {
  const { outputFiles: files } = await build({
    entryPoints: [new URL(relativePath, import.meta.url).pathname],
    bundle: true, platform: 'node', format: 'esm', target: 'es2022', write: false,
  });
  return import(`data:text/javascript;base64,${Buffer.from(files[0].text).toString('base64')}`);
};
const { attachMenuItemIds } = await bundleLib('../lib/menu-shared.ts');
const { MENU_ITEM_CATALOG, INACTIVE_MENU_ITEM_IDS, resolveMenuItemId } = await bundleLib('../lib/menu-catalog.ts');

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
  // 正式庫的重複資料型態（同名同規格同價、分類不同）：用非下架品項保留「照常接受」的覆蓋。
  { id: 'item-twin-cat-a', name: '雙胞胎千層', category_id: 'chiffon', is_available: true },
  { id: 'item-twin-cat-b', name: '雙胞胎千層', category_id: 'mille_crepe', is_available: true },
  // 重複資料：不可訂購的列先丟掉；全丟光才拒；剩下的列價格不一致才拒。
  { id: 'item-dup-ok-a', name: '雙價布丁', category_id: 'pudding', is_available: true },
  { id: 'item-dup-ok-b', name: '雙價布丁', category_id: 'pudding', is_available: false },
  { id: 'item-dup-off-a', name: '全下架布丁', category_id: 'pudding', is_available: false },
  { id: 'item-dup-off-b', name: '全下架布丁', category_id: 'pudding', is_available: false },
  { id: 'item-trip-a', name: '三胞胎塔', category_id: 'tarts', is_available: true },
  { id: 'item-trip-b', name: '三胞胎塔', category_id: 'tarts', is_available: true },
  { id: 'item-trip-c', name: '三胞胎塔', category_id: 'tarts', is_available: false },
  // 飲品分類的各種寫法：門市供應的判斷不能只認 `drinks` 這一個代碼。
  { id: 'item-drink-zh-pin', name: '冰釀烏龍', category_id: '手作飲品', is_available: true },
  { id: 'item-drink-zh-liao', name: '氣泡莓果', category_id: '冷飲料區', is_available: true },
  { id: 'item-drink-cold', name: '青檸蘇打', category_id: 'cold_drink', is_available: true },
  { id: 'item-drink-upper', name: '鮮榨果汁', category_id: 'DRINKS', is_available: true },
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
  { id: 'v-twin-cat-a', menu_item_id: 'item-twin-cat-a', spec: '六寸｜三種醬料組合', price: '$1,490' },
  { id: 'v-twin-cat-b', menu_item_id: 'item-twin-cat-b', spec: '六寸｜三種醬料組合', price: '$1,490' },
  { id: 'v-dup-ok-a', menu_item_id: 'item-dup-ok-a', spec: '標準', price: '150' },
  { id: 'v-dup-ok-b', menu_item_id: 'item-dup-ok-b', spec: '標準', price: '999' }, // 下架列的價格不同，不得影響結果
  { id: 'v-dup-off-a', menu_item_id: 'item-dup-off-a', spec: '標準', price: '150' },
  { id: 'v-dup-off-b', menu_item_id: 'item-dup-off-b', spec: '標準', price: '150' },
  { id: 'v-trip-a', menu_item_id: 'item-trip-a', spec: '標準', price: '300' },
  { id: 'v-trip-b', menu_item_id: 'item-trip-b', spec: '標準', price: '320' },
  { id: 'v-trip-c', menu_item_id: 'item-trip-c', spec: '標準', price: '300' },
  { id: 'v-drink-zh-pin', menu_item_id: 'item-drink-zh-pin', spec: '標準', price: '120' },
  { id: 'v-drink-zh-liao', menu_item_id: 'item-drink-zh-liao', spec: '標準', price: '130' },
  { id: 'v-drink-cold', menu_item_id: 'item-drink-cold', spec: '標準', price: '110' },
  { id: 'v-drink-upper', menu_item_id: 'item-drink-upper', spec: '標準', price: '140' },
];

function createStubClient({ menuError = null, menuItems = MENU_ITEMS, menuVariants = MENU_VARIANTS } = {}) {
  const inserts = [];
  const tables = { menu_items: menuItems, menu_variants: menuVariants };
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
  const { res, inserts } = await submit([line('雙胞胎千層', '六寸｜三種醬料組合', 1490, 1)], { order: { total_amount: 1490 } });
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  assert.equal(inserts[0].items[0].price, 1490);
  assert.equal(inserts[0].total_price, 1490);
}

// 母親節限定（INACTIVE_MENU_ITEM_IDS）菜單已隱藏：就算資料庫兩筆都標 available、同價，
// 手工組的請求也不能訂；完整品名、空白寫法、舊別名都一樣。
{
  assert.ok(INACTIVE_MENU_ITEM_IDS.has('chiffon_mothers_day_tokachi_crepe'));
  for (const name of ['母親節限定｜北海道十勝戚風千層', '母親節限定 北海道十勝戚風千層', '北海道十勝戚風千層 六寸 三種醬料組合', '  母親節限定｜北海道十勝戚風千層  ']) {
    assertRejected(await submit([line(name, '六寸｜三種醬料組合', 1490, 1)], { order: { total_amount: 1490 } }), /目前不可訂購/);
  }
}

// 價格無法解析（負數、文字、空字串）→ 拒絕，不會被當成正數。
for (const spec of ['負數', '文字', '空白']) {
  assertRejected(await submit([line('價格異常測試', spec, 100, 1)]), /價格設定異常/);
}

// 重複資料：先丟掉不可訂購（下架）的列，一列都不剩才拒；剩下的列價格不一致才拒；剩下的列有飲品 → 依飲品防線拒。
assertRejected(await submit([line('雙生塔', '標準', 300, 1)]), /價格設定異常/);
assertRejected(await submit([line('抹茶戚風', '標準', 200, 1)]), /門市現做飲品/);
{
  // 一筆下架、一筆可訂購、同價 → 接受（舊行為是整張拒單）。
  const { res, inserts } = await submit([line('焦糖布丁', '標準', 150, 2)], { order: { total_amount: 300 } });
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  assert.equal(inserts[0].items[0].price, 150);
  assert.equal(inserts[0].total_price, 300);
  // 下架列價格不同（999）也不影響：只採可訂購那一列的價格。
  const second = await submit([line('雙價布丁', '標準', 1, 1)]);
  assert.equal(second.res.statusCode, 200, JSON.stringify(second.res.body));
  assert.equal(second.inserts[0].items[0].price, 150);
  assert.equal(second.inserts[0].total_price, 150);
}
// 全部下架 → 拒；剩下的列價格不一致（即使另有一筆下架同價）→ 拒。
assertRejected(await submit([line('全下架布丁', '標準', 150, 1)]), /目前不可訂購/);
assertRejected(await submit([line('三胞胎塔', '標準', 300, 1)]), /價格設定異常/);

// 2. 0 元規格（門市限定）拒絕。
assertRejected(await submit([line('門市展示禮盒', '一般', 0, 1)]), /門市限定/);
assertRejected(await submit([line('門市展示禮盒', '一般', 500, 1)], { order: { total_amount: 500 } }), /門市限定/);

// 3. 飲品一律門市供應，即使資料庫有正價格也拒絕。
assertRejected(await submit([line('小山園抹茶拿鐵', '一般', 160, 1)], { order: { total_amount: 160 } }), /飲品.*門市|門市.*飲品/);
// 飲品分類不只 `drinks` 一種寫法：含「飲品」「飲料」、含 drink 的代碼、大寫都要擋。
for (const [name, price] of [['冰釀烏龍', 120], ['氣泡莓果', 130], ['青檸蘇打', 110], ['鮮榨果汁', 140]]) {
  assertRejected(await submit([line(name, '標準', price, 1)], { order: { total_amount: price } }), /門市現做飲品/);
}

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

// 讀取被截斷的防線：menu_items／menu_variants 任一張讀到單次上限 1000 列 → 5xx、不寫入
// （菜單頁會走「預估金額、待門市確認」），不可對正常顧客誤報 400「找不到商品」。
{
  const pad = (rows, total, make) => rows.concat(Array.from({ length: total - rows.length }, (_, index) => make(index)));
  const padItem = (index) => ({ id: `pad-item-${index}`, name: `填充品項${index}`, category_id: 'cakes', is_available: true });
  const padVariant = (index) => ({ id: `pad-variant-${index}`, menu_item_id: `pad-item-${index}`, spec: '標準', price: '100' });
  const request = [line('巴斯克乳酪蛋糕', '6吋', 1990, 1)];
  for (const [label, client] of [
    ['menu_items 滿頁', createStubClient({ menuItems: pad(MENU_ITEMS, 1000, padItem) })],
    ['menu_variants 滿頁', createStubClient({ menuVariants: pad(MENU_VARIANTS, 1000, padVariant) })],
    ['menu_items 超過滿頁', createStubClient({ menuItems: pad(MENU_ITEMS, 1500, padItem) })],
  ]) {
    const { res, inserts } = await submit(request, { client });
    assert.equal(res.statusCode, 500, `${label}: ${JSON.stringify(res.body)}`);
    assert.match(res.body.error, /無法確認商品價格/);
    assert.equal(inserts.length, 0, `${label}: must not write`);
  }
  // 差一列就滿頁（999）仍正常計價。
  const { res, inserts } = await submit(request, {
    client: createStubClient({ menuItems: pad(MENU_ITEMS, 999, padItem), menuVariants: pad(MENU_VARIANTS, 999, padVariant) }),
  });
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  assert.equal(inserts[0].total_price, 1990);
}

// 精確品名優先於別名：資料庫同時有「經典提拉米蘇」與「經典｜提拉米蘇」時，各自用各自的價格，
// 不會因為別名表而改拿到另一個品項的價格。
{
  const client = createStubClient({
    menuItems: [
      { id: 'exact-name', name: '經典提拉米蘇', category_id: 'tiramisu', is_available: true },
      { id: 'alias-name', name: '經典｜提拉米蘇', category_id: 'tiramisu', is_available: true },
    ],
    menuVariants: [
      { id: 'v-exact-name', menu_item_id: 'exact-name', spec: '200ml', price: '111' },
      { id: 'v-alias-name', menu_item_id: 'alias-name', spec: '200ml', price: '222' },
    ],
  });
  const { res, inserts } = await submit([line('經典提拉米蘇', '200ml', 1, 1), line('經典｜提拉米蘇', '200ml', 1, 1)], { client });
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  assert.deepEqual(inserts[0].items.map((item) => item.price), [111, 222]);
}

// 別名層會把「同一個 catalog id」底下的資料庫列全部納入，不是只看第一列：
// 兩筆都可訂購、同規格、價格不同 → 不猜、拒單（不能默默挑第一筆，也不能挑便宜的那筆）。
// 兩個順序都測，避免「只拿第一列」的實作剛好因為排序而過關。
{
  const aliasRow = (id, name, price) => ({
    item: { id, name, category_id: 'tiramisu', is_available: true },
    variant: { id: `v-${id}`, menu_item_id: id, spec: '200ml', price },
  });
  const clientOf = (...rows) => createStubClient({ menuItems: rows.map((row) => row.item), menuVariants: rows.map((row) => row.variant) });
  // 「經典｜提拉米蘇」與「經典提拉米蘇鐵盒(600ml)」都是 tiramisu_classic 的別名，精確品名「經典提拉米蘇」不在資料庫。
  const pricey = aliasRow('alias-pricey', '經典｜提拉米蘇', '$170');
  const cheap = aliasRow('alias-cheap', '經典提拉米蘇鐵盒(600ml)', '$150');
  for (const rows of [[cheap, pricey], [pricey, cheap]]) {
    assertRejected(await submit([line('經典提拉米蘇', '200ml', 150, 1)], { client: clientOf(...rows) }), /價格設定異常/);
  }
  // 同一個 id 底下的列價格一致 → 照常接受。
  const twin = aliasRow('alias-twin', '經典提拉米蘇鐵盒(600ml)', '170');
  for (const rows of [[twin, pricey], [pricey, twin]]) {
    const { res, inserts } = await submit([line('經典提拉米蘇', '200ml', 1, 1)], { client: clientOf(...rows) });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(inserts[0].items[0].price, 170);
  }
}

// 精確品名那幾列沒有可訂購的列時（已下架），別名層的列要一起納入，套用同一組資料庫防線：
// 資料庫留有與靜態菜單同名的下架舊列，走靜態備援的訂單不能因此被擋。
{
  const legacy = (price, extra = {}) => ({
    item: { id: 'legacy-exact', name: '經典提拉米蘇', category_id: 'tiramisu', is_available: false, ...extra },
    variant: { id: 'v-legacy-exact', menu_item_id: 'legacy-exact', spec: '200ml', price },
  });
  const live = (id, price, extra = {}) => ({
    item: { id, name: '經典｜提拉米蘇', category_id: 'tiramisu', is_available: true, ...extra },
    variant: { id: `v-${id}`, menu_item_id: id, spec: '200ml', price },
  });
  const clientOf = (...rows) => createStubClient({ menuItems: rows.map((row) => row.item), menuVariants: rows.map((row) => row.variant) });
  const order = (client) => submit([line('經典提拉米蘇', '200ml', 1, 2)], { client, order: { total_amount: 2 } });

  // 下架的精確品名列 + 可訂購的別名列，同價 → 接受，用資料庫（別名列）的品名與價格。
  {
    const { res, inserts } = await order(clientOf(legacy('$170'), live('live-a', '$170')));
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(inserts[0].items[0].name, '經典｜提拉米蘇');
    assert.equal(inserts[0].items[0].price, 170);
    assert.equal(inserts[0].total_price, 340);
  }
  // 下架的舊列價格不同（更便宜）也不得被採用：只採可訂購那一列的價格。
  for (const rows of [[legacy('$100'), live('live-a', '$170')], [live('live-a', '$170'), legacy('$100')]]) {
    const { res, inserts } = await order(clientOf(...rows));
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(inserts[0].items[0].price, 170);
  }
  // 合併後可訂購的別名列價格不一致 → 照樣拒單，不挑便宜的。
  for (const rows of [[legacy('$170'), live('live-a', '$170'), live('live-b', '$120')], [legacy('$170'), live('live-b', '$120'), live('live-a', '$170')]]) {
    assertRejected(await order(clientOf(...rows)), /價格設定異常/);
  }
  // 精確品名的列沒有這個規格（只有別名那邊有）→ 也併入別名層。
  {
    const noSpec = { item: { id: 'legacy-exact', name: '經典提拉米蘇', category_id: 'tiramisu', is_available: true }, variant: { id: 'v-legacy-exact', menu_item_id: 'legacy-exact', spec: '鐵盒', price: '$450' } };
    const { res, inserts } = await order(clientOf(noSpec, live('live-a', '$170')));
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(inserts[0].items[0].price, 170);
  }
  // 精確品名與別名的列全部下架 → 仍然拒單。
  assertRejected(await order(clientOf(legacy('$170'), live('live-a', '$170', { is_available: false }))), /目前不可訂購/);
  // 精確品名那邊有可訂購的列 → 不碰別名層（精確品名優先），別名那筆更便宜也不採用、也不拒單。
  {
    const exactLive = { item: { id: 'exact-live', name: '經典提拉米蘇', category_id: 'tiramisu', is_available: true }, variant: { id: 'v-exact-live', menu_item_id: 'exact-live', spec: '200ml', price: '$170' } };
    const { res, inserts } = await order(clientOf(exactLive, live('live-a', '$120')));
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(inserts[0].items[0].price, 170);
  }
}

// ── 靜態菜單（public/menu.json）打進來的訂單 ──────────────────────────────────────
// /api/menu 在資料庫失敗時回 public/menu.json，前端也會直接讀它；購物車帶的是靜態品名
// （例：「經典提拉米蘇」），資料庫正本是「經典｜提拉米蘇」。伺服器必須靠 lib/menu-catalog.ts
// 的別名找到同一個資料庫品項，而不是回 400 找不到商品、讓所有訂單都下不了。
// 資料庫列由 menu-catalog 的別名（資料庫命名「X｜Y」）與 menu.json 的規格／分類組成，不查正式庫。
{
  const rawStaticMenu = JSON.parse(readFileSync(new URL('../public/menu.json', import.meta.url), 'utf8'));
  // 前端／api/menu 靜態備援實際顯示的菜單（已排除隱藏品項）。
  const shownStaticMenu = attachMenuItemIds(rawStaticMenu);
  const shownItems = shownStaticMenu.flatMap((category) => category.items.map((item) => ({ ...item, categoryId: category.id })));
  const orderableStaticItems = shownItems.filter((item) => item.prices.length > 0); // 飲品在靜態菜單沒有價格

  const dbNameOf = (catalogId) => {
    const entry = MENU_ITEM_CATALOG.find((candidate) => candidate.id === catalogId);
    return entry.aliases.find((alias) => alias.includes('｜') && alias !== entry.label);
  };
  // 靜態品名 → 資料庫品名：catalog 內的品項靜態短名與資料庫「X｜Y」不同（走別名層）；
  // 現行新品（例：北海道十勝戚風蛋糕）不在 catalog，靜態品名就是資料庫品名（走精確品名）。
  const dbNameForStatic = (item) => {
    const catalogId = resolveMenuItemId(item.name);
    return catalogId ? dbNameOf(catalogId) : item.name;
  };
  const toNumber = (staticPrice) => Number(String(staticPrice).replace(/[^\d]/g, ''));
  // 正式庫價格格式輪流用：純數字、$、$ 加千分位；資料庫價格一律比靜態價格多 10 元（代表靜態菜單已過期）。
  const formatDbPrice = (value, index) => [String(value), `$${value}`, `$${value.toLocaleString('en-US')}`][index % 3];

  const dbItems = [];
  const dbVariants = [];
  const expectedDbPrice = new Map(); // `${靜態品名}|${規格}` → 資料庫價格
  orderableStaticItems.forEach((item, itemIndex) => {
    const catalogId = resolveMenuItemId(item.name);
    const dbName = dbNameForStatic(item);
    if (catalogId) {
      assert.ok(dbName && dbName !== item.name, `fixture must use a different production-style DB name for ${item.name}`);
      assert.equal(resolveMenuItemId(dbName), catalogId);
    }
    const dbKey = catalogId ?? `exact-${itemIndex}`;
    dbItems.push({ id: `db-${dbKey}`, name: dbName, category_id: item.categoryId, is_available: true });
    item.prices.forEach((variant, variantIndex) => {
      const dbPrice = toNumber(variant.price) + 10;
      dbVariants.push({ id: `db-${dbKey}-${variantIndex}`, menu_item_id: `db-${dbKey}`, spec: variant.spec, price: formatDbPrice(dbPrice, itemIndex + variantIndex) });
      expectedDbPrice.set(`${item.name}|${variant.spec}`, dbPrice);
    });
  });
  // 隱藏的母親節限定（資料庫兩筆都 available）、門市飲品（資料庫有正價格）也放進資料庫。
  dbItems.push(
    { id: 'db-md-chiffon', name: '母親節限定｜北海道十勝戚風千層', category_id: 'chiffon', is_available: true },
    { id: 'db-md-crepe', name: '母親節限定｜北海道十勝戚風千層', category_id: 'mille_crepe', is_available: true },
    { id: 'db-americano', name: '經典美式咖啡', category_id: 'drinks', is_available: true },
  );
  dbVariants.push(
    { id: 'db-md-chiffon-v', menu_item_id: 'db-md-chiffon', spec: '六寸｜三種醬料組合', price: '$1,490' },
    { id: 'db-md-crepe-v', menu_item_id: 'db-md-crepe', spec: '六寸｜三種醬料組合', price: '$1,490' },
    { id: 'db-americano-v', menu_item_id: 'db-americano', spec: '標準', price: '100' },
  );
  const withDb = (mutate) => {
    const items = structuredClone(dbItems);
    const variants = structuredClone(dbVariants);
    mutate({ items, variants });
    return createStubClient({ menuItems: items, menuVariants: variants });
  };

  // 靜態菜單目前 22 個可訂購甜點（共 40 個品名＋規格），全部都要被接受，金額是資料庫價格。
  assert.ok(orderableStaticItems.length >= 22, `expected >= 22 orderable static items, got ${orderableStaticItems.length}`);
  const staticLines = orderableStaticItems.flatMap((item) => item.prices.map((variant) => ({ item, variant })));
  assert.equal(staticLines.length, expectedDbPrice.size);
  for (const { item, variant } of staticLines) {
    const clientPrice = toNumber(variant.price);
    const { res, inserts } = await submit([line(item.name, variant.spec, clientPrice, 2)], {
      order: { total_amount: clientPrice * 2 },
      client: withDb(() => {}),
    });
    const dbPrice = expectedDbPrice.get(`${item.name}|${variant.spec}`);
    assert.equal(res.statusCode, 200, `${item.name}／${variant.spec}: ${JSON.stringify(res.body)}`);
    assert.equal(inserts[0].items[0].name, dbNameForStatic(item), 'stored name should be the DB name');
    assert.equal(inserts[0].items[0].price, dbPrice, `${item.name}／${variant.spec} should be priced from the DB`);
    assert.equal(inserts[0].total_price, dbPrice * 2);
  }
  // 整張靜態菜單一次送出也行（金額 = 資料庫價格加總）。
  {
    const { res, inserts } = await submit(
      staticLines.map(({ item, variant }) => line(item.name, variant.spec, toNumber(variant.price), 1)),
      { order: { total_amount: 1 }, client: withDb(() => {}) },
    );
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(inserts[0].items.length, staticLines.length);
    assert.equal(inserts[0].total_price, [...expectedDbPrice.values()].reduce((sum, price) => sum + price, 0));
  }

  // 被隱藏的母親節限定（2026-10-28 起 public/menu.json 已不再收錄，舊版快取的前端仍可能送來）：
  // 資料庫即使兩筆都 available，也拒。
  assert.ok(INACTIVE_MENU_ITEM_IDS.has(resolveMenuItemId('母親節限定｜北海道十勝戚風千層')));
  assertRejected(await submit([line('母親節限定｜北海道十勝戚風千層', '六寸｜三種醬料組合', 1490, 1)], { client: withDb(() => {}) }), /目前不可訂購/);

  const lemonBasque = { name: '檸檬巴斯克', spec: '四吋', price: 299 };
  // 別名對到的資料庫品項已下架 → 拒（別名不能繞過 is_available）。
  assertRejected(
    await submit([line(lemonBasque.name, lemonBasque.spec, lemonBasque.price, 1)], {
      client: withDb(({ items }) => { items.find((row) => row.name === dbNameOf('basque_lemon')).is_available = false; }),
    }),
    /目前不可訂購/,
  );
  // 別名對到的規格是 $0（門市限定）→ 拒。
  assertRejected(
    await submit([line('特濃抹茶千層', '九吋', 1990, 1)], {
      client: withDb(({ items, variants }) => {
        const id = items.find((row) => row.name === dbNameOf('mille_crepe_matcha')).id;
        variants.find((row) => row.menu_item_id === id).price = '$0';
      }),
    }),
    /門市限定/,
  );
  // 別名對到的是飲品分類 → 拒（靜態菜單的「美式咖啡」對到資料庫「經典美式咖啡」）。
  assertRejected(await submit([line('美式咖啡', '標準', 100, 1)], { client: withDb(() => {}) }), /門市現做飲品/);
  // 別名對得到 catalog id，但資料庫沒有這個品項 → 找不到商品。
  assertRejected(
    await submit([line('伯爵茶千層', '九吋', 1990, 1)], {
      client: withDb(({ items }) => { items.splice(items.findIndex((row) => row.name === dbNameOf('mille_crepe_earlgrey')), 1); }),
    }),
    /找不到商品/,
  );
  // 別名找到品項但規格不存在 → 仍然拒（只放寬品名，不放寬規格）。
  assertRejected(await submit([line('經典提拉米蘇', '三公升', 170, 1)], { client: withDb(() => {}) }), /沒有「三公升」規格/);
  // 完全不在別名表也不在資料庫 → 找不到商品。
  assertRejected(await submit([line('不存在的甜點', '標準', 100, 1)], { client: withDb(() => {}) }), /找不到商品/);
}

console.log('Map order pricing: DB price recalculation ($ / NT$ / thousands formats), static-menu alias lookup (all available static desserts), duplicate-row rules, hidden item, $0 / drink (all category spellings) / unknown spec / unavailable / quantity / cap / DB-error / full-page guards passed; no DB or network accessed.');
