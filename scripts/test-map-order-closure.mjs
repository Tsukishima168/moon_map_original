// /api/map-order 伺服器端「公休日不收單」的 node 檢查（map 沒有測試 runner）。
// 用法：node scripts/test-map-order-closure.mjs
// 以 esbuild 打包真正的 api/map-order.ts，把 supabase-admin 換成記憶體 stub：
// 不連任何資料庫、不打任何網路。
//
// 2026 年 11 月曆（測試用日期）：11/02 週一、11/12 週四、11/13 週五、11/14 週六、
// 11/15 週日、11/16 週一、11/17 週二。
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
const {
  default: handler,
  extractPickupDay,
  checkPickupDateClosure,
  CLOSED_PICKUP_DATE_MESSAGE,
} = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);

// 正式庫 2026-11-01 店主設定 11/13–11/15 店休後的實際值。
const PROD_DAILY_CAPACITY = { default_limit: 5, special_dates: { '2026-11-13': 0, '2026-11-14': 0, '2026-11-15': 0 } };
const PROD_BUSINESS_HOURS = {
  closed_days: [1], weekday_hours: '10:00-18:00', weekend_hours: '10:00-18:00',
  special_closures: ['2026-11-13', '2026-11-14', '2026-11-15'],
};
const PROD_SETTINGS_ROWS = [
  { setting_key: 'daily_capacity', setting_value: PROD_DAILY_CAPACITY },
  { setting_key: 'business_hours', setting_value: PROD_BUSINESS_HOURS },
];

const warnings = [];
const errors = [];
console.warn = (...args) => warnings.push(args);
console.error = (...args) => errors.push(args);

// ---------------------------------------------------------------------------
// A. 純函式：extractPickupDay
// ---------------------------------------------------------------------------
const runPureChecks = (label) => {
  const at = (message) => `${label}: ${message}`;

  // 前端實際送的格式是 YYYY-MM-DD（本地日期）；也接受 normalizePickupTime 會放行的帶 T／空白時間。
  assert.deepEqual(extractPickupDay('2026-11-13'), { date: '2026-11-13', weekday: 5 }, at('週五'));
  assert.deepEqual(extractPickupDay('2026-11-15'), { date: '2026-11-15', weekday: 0 }, at('週日'));
  assert.deepEqual(extractPickupDay('2026-11-02'), { date: '2026-11-02', weekday: 1 }, at('週一'));
  assert.deepEqual(extractPickupDay('2026-11-14T10:00:00'), { date: '2026-11-14', weekday: 6 }, at('T 時間'));
  assert.deepEqual(extractPickupDay('2026-11-14 13:00'), { date: '2026-11-14', weekday: 6 }, at('空白時間'));
  assert.deepEqual(extractPickupDay('  2026-11-17  '), { date: '2026-11-17', weekday: 2 }, at('前後空白'));
  // 跨年／閏日邊界。
  assert.equal(extractPickupDay('2028-02-29')?.weekday, 2, at('閏日 2028-02-29 週二'));
  assert.equal(extractPickupDay('2027-01-01')?.weekday, 5, at('2027-01-01 週五'));

  // 取不出日期 → null（呼叫端維持原本行為）。
  for (const bad of ['', '   ', 'tomorrow', '11/13/2026', '2026-11-1', '2026-11-130', '2026-13-01', '2026-02-31', '2026-00-10', '0050-01-01', 20261113, null, undefined, {}, ['2026-11-13']]) {
    assert.equal(extractPickupDay(bad), null, at(`extractPickupDay(${JSON.stringify(bad)}) should be null`));
  }

  // -------------------------------------------------------------------------
  // B. 純函式：checkPickupDateClosure
  // -------------------------------------------------------------------------
  const closed = (pickup, capacity, hours) => checkPickupDateClosure(pickup, capacity, hours);

  // 1. special_dates = 0 → 拒（只給 daily_capacity，排除其他條件的影響）。
  assert.deepEqual(closed('2026-11-13', PROD_DAILY_CAPACITY, {}), { closed: true, reason: 'special_date', date: '2026-11-13' }, at('special_dates=0'));
  assert.deepEqual(closed('2026-11-13', { special_dates: { '2026-11-13': 0 } }, null), { closed: true, reason: 'special_date', date: '2026-11-13' }, at('special_dates=0 且無 business_hours'));

  // 2. special_closures 含該日 → 拒（special_dates 完全沒有該日）。
  assert.deepEqual(closed('2026-11-14', { default_limit: 5, special_dates: {} }, PROD_BUSINESS_HOURS), { closed: true, reason: 'special_closure', date: '2026-11-14' }, at('special_closures'));
  assert.deepEqual(closed('2026-11-14', null, { special_closures: ['2026-11-14'] }), { closed: true, reason: 'special_closure', date: '2026-11-14' }, at('special_closures 且無 daily_capacity'));
  assert.deepEqual(closed('2026-11-14', null, { special_closures: [' 2026-11-14 '] }), { closed: true, reason: 'special_closure', date: '2026-11-14' }, at('special_closures 項目有空白'));

  // 3. 星期在 closed_days → 拒（週一 = 1）。
  assert.deepEqual(closed('2026-11-02', PROD_DAILY_CAPACITY, PROD_BUSINESS_HOURS), { closed: true, reason: 'closed_weekday', date: '2026-11-02' }, at('週一'));
  assert.deepEqual(closed('2026-11-16', PROD_DAILY_CAPACITY, PROD_BUSINESS_HOURS), { closed: true, reason: 'closed_weekday', date: '2026-11-16' }, at('下一個週一'));
  assert.equal(closed('2026-11-16T10:00:00', null, { closed_days: [1] }).closed, true, at('週一帶時間'));
  assert.equal(closed('2026-11-15', null, { closed_days: [0] }).closed, true, at('closed_days 含週日（0）'));
  assert.equal(closed('2026-11-17', null, { closed_days: [1, 2] }).closed, true, at('closed_days 多個星期'));

  // 4. 正常日放行：正式庫設定下，店休區間前後的日子。
  for (const ok of ['2026-11-12', '2026-11-17', '2026-11-18', '2026-11-01']) {
    assert.deepEqual(closed(ok, PROD_DAILY_CAPACITY, PROD_BUSINESS_HOURS), { closed: false }, at(`${ok} 應放行`));
  }

  // 5. special_dates 值不是 0（限量、不是休息）→ 放行；只認嚴格的數字 0（與前端 filterDate 一致）。
  for (const value of [3, 1, 5, 0.5, -1, null, '0', false, '', undefined]) {
    assert.deepEqual(closed('2026-11-13', { special_dates: { '2026-11-13': value } }, { closed_days: [1], special_closures: [] }), { closed: false }, at(`special_dates 值 ${JSON.stringify(value)} 應放行`));
  }

  // 6. 設定缺欄位／型別不對 → 當作空值，放行。
  const emptyish = [null, undefined, {}, [], 'oops', 123, true];
  for (const capacity of emptyish) {
    for (const hours of emptyish) {
      assert.deepEqual(closed('2026-11-13', capacity, hours), { closed: false }, at(`缺設定 ${JSON.stringify(capacity)}／${JSON.stringify(hours)} 應放行`));
      assert.deepEqual(closed('2026-11-02', capacity, hours), { closed: false }, at(`缺設定時週一也放行（沒有 closed_days 就沒有公休星期）`));
    }
  }
  assert.deepEqual(closed('2026-11-13', { default_limit: 5 }, { weekday_hours: '10:00-18:00' }), { closed: false }, at('有設定但沒有 special_dates／special_closures／closed_days'));
  assert.deepEqual(closed('2026-11-13', { special_dates: null }, { special_closures: null, closed_days: null }), { closed: false }, at('欄位是 null'));
  assert.deepEqual(closed('2026-11-13', { special_dates: ['2026-11-13'] }, { special_closures: '2026-11-13', closed_days: '1' }), { closed: false }, at('欄位型別錯（陣列／字串）'));
  assert.deepEqual(closed('2026-11-13', { special_dates: {} }, { special_closures: [null, 20261113, {}], closed_days: ['1', null] }), { closed: false }, at('陣列內容型別錯'));

  // 7. 取不出日期 → 維持原本行為（不擋），即使設定全是公休。
  for (const bad of ['', 'tomorrow', '2026-02-31', null, undefined, 20261113]) {
    assert.deepEqual(closed(bad, PROD_DAILY_CAPACITY, PROD_BUSINESS_HOURS), { closed: false }, at(`取不出日期 ${JSON.stringify(bad)} 不擋`));
  }
};

// 星期要「直接由年月日算」、不受伺服器時區影響：在差距極大的幾個時區下跑同一套檢查。
const originalTz = process.env.TZ;
const offsetsSeen = new Set();
try {
  for (const tz of ['UTC', 'Asia/Taipei', 'America/Los_Angeles', 'Pacific/Kiritimati', 'Pacific/Pago_Pago']) {
    process.env.TZ = tz;
    offsetsSeen.add(new Date(2026, 10, 13).getTimezoneOffset());
    runPureChecks(`TZ=${tz}`);
  }
} finally {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
}
assert.ok(offsetsSeen.size >= 4, `TZ 切換沒有生效（只看到 offset ${[...offsetsSeen]}），時區獨立性測試無意義`);

// ---------------------------------------------------------------------------
// C. handler：stub 資料庫，確認真的在計價與寫入之前擋下
// ---------------------------------------------------------------------------
const MENU_ITEMS = [{ id: 'item-cake', name: '巴斯克乳酪蛋糕', category_id: 'cakes', is_available: true }];
const MENU_VARIANTS = [{ id: 'v-cake-6', menu_item_id: 'item-cake', spec: '6吋', price: '1990' }];

function createStubClient({ settingsRows = [], settingsError = null, settingsThrows = false } = {}) {
  const inserts = [];
  const calls = { settings: [], menu_items: 0, menu_variants: 0 };
  return {
    inserts,
    calls,
    from(table) {
      if (table === 'business_settings') {
        return {
          select: (columns) => ({
            in: async (column, values) => {
              calls.settings.push({ columns, column, values: [...values] });
              if (settingsThrows) throw new Error('boom');
              if (settingsError) return { data: null, error: settingsError };
              return { data: structuredClone(settingsRows.filter((row) => values.includes(row.setting_key))), error: null };
            },
          }),
        };
      }
      if (table === 'orders') {
        return { insert(row) {
          inserts.push(structuredClone(row));
          return { select: () => ({ single: async () => ({ data: { id: 'db-uuid', ...row }, error: null }) }) };
        } };
      }
      calls[table] += 1;
      const rows = table === 'menu_items' ? MENU_ITEMS : MENU_VARIANTS;
      return { select: async () => ({ data: structuredClone(rows), error: null }) };
    },
  };
}

const baseOrder = {
  order_number: 'ORD1101120000TEST', customer_name: '測試顧客', customer_phone: '0912345678',
  customer_email: null, total_amount: 1990, pickup_date: '2026-11-12', order_note: null, user_id: null,
  payment_status: 'pending', source: 'moon_map', ga_client_id: null,
};
const cakeLine = { item_name: '巴斯克乳酪蛋糕', item_spec: '6吋', unit_price: 1990, quantity: 1, subtotal: 1990 };

async function submit({ order = {}, items = [cakeLine], client }) {
  const res = { statusCode: 0, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  const req = { method: 'POST', headers: { origin: 'https://map.kiwimu.com' }, body: { order: { ...baseOrder, ...order }, items } };
  globalThis.__MAP_ORDER_TEST_CLIENT__ = client;
  await handler(req, res);
  return { res, inserts: client.inserts, calls: client.calls };
}

const assertClosedRejection = ({ res, inserts, calls }, label) => {
  assert.equal(res.statusCode, 400, `${label}: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.error, CLOSED_PICKUP_DATE_MESSAGE, label);
  assert.match(res.body.error, /店休/, label);
  assert.equal(inserts.length, 0, `${label}: closed-day order must not be written`);
  assert.equal(calls.menu_items + calls.menu_variants, 0, `${label}: must be rejected before pricing`);
};
const assertAccepted = ({ res, inserts }, label) => {
  assert.equal(res.statusCode, 200, `${label}: ${JSON.stringify(res.body)}`);
  assert.equal(inserts.length, 1, `${label}: order should be written`);
};

// 正式庫設定下：11/13、11/14、11/15（special_dates=0＋special_closures）與週一 11/02、11/16 全部拒。
for (const pickup_date of ['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-02', '2026-11-16']) {
  const client = createStubClient({ settingsRows: PROD_SETTINGS_ROWS });
  assertClosedRejection(await submit({ order: { pickup_date }, client }), `handler ${pickup_date}`);
  // 一次查 daily_capacity 與 business_hours 兩列。
  assert.equal(client.calls.settings.length, 1, 'settings should be read in a single query');
  assert.deepEqual(client.calls.settings[0].values.sort(), ['business_hours', 'daily_capacity']);
}

// 只有其中一份設定也各自生效（另一份缺列 → 空值）。
assertClosedRejection(await submit({ order: { pickup_date: '2026-11-13' }, client: createStubClient({ settingsRows: [PROD_SETTINGS_ROWS[0]] }) }), 'handler 只有 daily_capacity');
assertClosedRejection(await submit({ order: { pickup_date: '2026-11-13' }, client: createStubClient({ settingsRows: [PROD_SETTINGS_ROWS[1]] }) }), 'handler 只有 business_hours');

// 帶時間的取貨日也要擋（normalizePickupTime 允許）。
assertClosedRejection(await submit({ order: { pickup_date: '2026-11-13T10:00:00' }, client: createStubClient({ settingsRows: PROD_SETTINGS_ROWS }) }), 'handler 帶 T 時間');

// 公休檢查在計價之前：品項根本不存在的公休日單，回的是「店休」而不是「找不到商品」。
assertClosedRejection(
  await submit({ order: { pickup_date: '2026-11-13' }, items: [{ ...cakeLine, item_name: '不存在的甜點' }], client: createStubClient({ settingsRows: PROD_SETTINGS_ROWS }) }),
  'handler 檢查順序先於計價',
);

// 正常日放行並寫入（金額仍由伺服器重算）。
{
  const client = createStubClient({ settingsRows: PROD_SETTINGS_ROWS });
  const result = await submit({ order: { pickup_date: '2026-11-12' }, client });
  assertAccepted(result, 'handler 正常日 11/12');
  assert.equal(result.inserts[0].total_price, 1990);
  assert.equal(result.inserts[0].pickup_time, '2026-11-12 13:00');
  assertAccepted(await submit({ order: { pickup_date: '2026-11-17' }, client: createStubClient({ settingsRows: PROD_SETTINGS_ROWS }) }), 'handler 正常日 11/17（店休後第一個營業日）');
}

// special_dates 值不是 0（例：限量 3）→ 放行。
assertAccepted(
  await submit({
    order: { pickup_date: '2026-11-13' },
    client: createStubClient({ settingsRows: [
      { setting_key: 'daily_capacity', setting_value: { default_limit: 5, special_dates: { '2026-11-13': 3 } } },
      { setting_key: 'business_hours', setting_value: { closed_days: [1], special_closures: [] } },
    ] }),
  }),
  'handler special_dates=3',
);

// 設定缺欄位／整列不存在 → 放行。
assertAccepted(await submit({ order: { pickup_date: '2026-11-13' }, client: createStubClient({ settingsRows: [] }) }), 'handler 設定兩列都不存在');
assertAccepted(
  await submit({
    order: { pickup_date: '2026-11-13' },
    client: createStubClient({ settingsRows: [
      { setting_key: 'daily_capacity', setting_value: { default_limit: 5 } },
      { setting_key: 'business_hours', setting_value: { weekday_hours: '10:00-18:00' } },
    ] }),
  }),
  'handler 設定缺 special_dates／special_closures／closed_days',
);
assertAccepted(
  await submit({
    order: { pickup_date: '2026-11-13' },
    client: createStubClient({ settingsRows: [
      { setting_key: 'daily_capacity', setting_value: null },
      { setting_key: 'business_hours', setting_value: null },
    ] }),
  }),
  'handler setting_value 為 null',
);

// 取不出日期 → 維持原本行為（放行），不新增拒單。
assertAccepted(await submit({ order: { pickup_date: 'tomorrow' }, client: createStubClient({ settingsRows: PROD_SETTINGS_ROWS }) }), 'handler pickup_date 取不出日期');

// 查詢失敗（error 物件）／查詢丟例外 → fail-open：放行並 console.error。
{
  const before = errors.length;
  const client = createStubClient({ settingsRows: PROD_SETTINGS_ROWS, settingsError: { message: 'relation unavailable' } });
  assertAccepted(await submit({ order: { pickup_date: '2026-11-13' }, client }), 'handler 設定查詢回 error');
  assert.equal(errors.length - before, 1, '設定查詢失敗必須 console.error 一次');
  assert.match(String(errors[errors.length - 1][0]), /公休日設定/);
}
{
  const before = errors.length;
  const client = createStubClient({ settingsRows: PROD_SETTINGS_ROWS, settingsThrows: true });
  assertAccepted(await submit({ order: { pickup_date: '2026-11-13' }, client }), 'handler 設定查詢丟例外');
  assert.equal(errors.length - before, 1, '設定查詢丟例外必須 console.error 一次');
}

// 驗證失敗（400）仍在讀設定之前：不為無效請求多打一次資料庫。
{
  const client = createStubClient({ settingsRows: PROD_SETTINGS_ROWS });
  const { res } = await submit({ order: { pickup_date: '2026-11-13', customer_name: '' }, client });
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /customer_name/);
  assert.equal(client.calls.settings.length, 0, 'invalid payload must not trigger a settings read');
}

// 客人會看到的訊息：中文、不含句號，lib/map-order-client.ts 會補上聯繫門市的提示並停在結帳視窗。
assert.match(CLOSED_PICKUP_DATE_MESSAGE, /[㐀-鿿]/);
assert.ok(CLOSED_PICKUP_DATE_MESSAGE.length <= 200);

console.log('Map order closure: server rejects special_dates=0 / special_closures / closed_days weekday before pricing, accepts normal days, special_dates!=0, missing settings, unparseable dates and settings-read failure (fail-open); weekday is timezone-independent (5 TZs); no DB or network accessed.');
