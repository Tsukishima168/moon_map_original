// 菜單「開賣日／截止日」與季節品置頂的 node 檢查（map 沒有測試 runner）。
// 用法：node scripts/test-menu-availability.mjs
// 以 esbuild 打包真程式，supabase-admin 換成記憶體 stub：不連資料庫、不打網路。
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = async (relativePath, plugins = []) => {
  const { outputFiles } = await build({
    entryPoints: [new URL(relativePath, import.meta.url).pathname],
    bundle: true, platform: 'node', format: 'esm', target: 'es2022', write: false, plugins,
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
};
const stubAdminClient = {
  name: 'stub-supabase-admin',
  setup(b) {
    b.onResolve({ filter: /supabase-admin\.js$/ }, () => ({ path: 'supabase-admin', namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
      contents: 'export const createAdminClient = () => globalThis.__MENU_TEST_CLIENT__;',
      loader: 'js',
    }));
  },
};

const { getAvailabilityState, isSeasonalWindow } = await bundle('../lib/menu-availability.ts');
const { fetchCanonicalMenuSnapshot } = await bundle('../api/_utils/menu-source.ts', [stubAdminClient]);
const { buildMenuFromSharedCategories } = await bundle('../lib/menu-shared.ts');

// 1. getAvailabilityState
const NOW = Date.parse('2026-11-20T00:00:00+08:00');
const iso = (ms) => new Date(ms).toISOString();
const DAY = 86400000;
assert.equal(getAvailabilityState({ available_from: null, available_until: null }, NOW), 'active');
assert.equal(getAvailabilityState({}, NOW), 'active');
assert.equal(getAvailabilityState({ available_from: '', available_until: '' }, NOW), 'active');
assert.equal(getAvailabilityState({ available_from: 'not-a-date', available_until: 'xx' }, NOW), 'active');
assert.equal(getAvailabilityState({ available_from: iso(NOW + DAY) }, NOW), 'upcoming');
assert.equal(getAvailabilityState({ available_from: iso(NOW - DAY) }, NOW), 'active');
assert.equal(getAvailabilityState({ available_until: iso(NOW - DAY) }, NOW), 'ended');
assert.equal(getAvailabilityState({ available_until: iso(NOW + DAY) }, NOW), 'active');
assert.equal(getAvailabilityState({ available_from: iso(NOW) }, NOW), 'active');
assert.equal(getAvailabilityState({ available_until: iso(NOW) }, NOW), 'active');
assert.equal(isSeasonalWindow({}), false);
assert.equal(isSeasonalWindow({ available_from: '', available_until: 'bad' }), false);
assert.equal(isSeasonalWindow({ available_from: iso(NOW) }), true);
assert.equal(isSeasonalWindow({ available_until: iso(NOW) }), true);

// 2. fetchCanonicalMenuSnapshot（stub）
const real = Date.now();
const later1 = iso(real + 10 * DAY);
const later2 = iso(real + 3 * DAY);
const stubClient = (tables) => ({
  from(table) {
    const result = { data: structuredClone(tables[table] ?? []), error: null };
    const chain = { select: () => chain, order: () => chain, then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
    return chain;
  },
});
const item = (id, name, extra = {}) => ({ id, category_id: 'cakes', name, image: null, description: null, sort_order: 1, is_available: true, ...extra });
const tables = {
  menu_categories: [{ id: 'cakes', title: '蛋糕', subtitle: null, sort_order: 1 }],
  menu_items: [
    item('plain', '一般蛋糕'),
    item('up-late', '草莓遠期', { available_from: later1 }),
    item('up-early', '草莓近期', { available_from: later2 }),
    item('up-off', '下架未來品', { available_from: iso(real + DAY), is_available: false }),
    item('season', '草莓季品', { available_from: iso(real - DAY), available_until: iso(real + DAY) }),
    item('ended', '已結束品', { available_until: iso(real - DAY) }),
  ],
  menu_variants: [],
};
globalThis.__MENU_TEST_CLIENT__ = stubClient(tables);
{
  const snap = await fetchCanonicalMenuSnapshot();
  const names = snap.categories[0].items.map((i) => i.name).sort();
  assert.deepEqual(names, ['一般蛋糕', '草莓季品']);
  assert.equal(snap.categories[0].items.find((i) => i.name === '草莓季品').seasonal, true);
  assert.equal('seasonal' in snap.categories[0].items.find((i) => i.name === '一般蛋糕'), false);
  assert.equal(snap.seasonal.active, true);
  assert.equal(snap.seasonal.upcomingFrom, later2);
}
{
  // 沒有任何季節品、也沒有即將開賣
  globalThis.__MENU_TEST_CLIENT__ = stubClient({ ...tables, menu_items: [item('plain', '一般蛋糕'), item('up-off', '下架未來品', { available_from: later1, is_available: false })] });
  const snap = await fetchCanonicalMenuSnapshot();
  assert.deepEqual(snap.seasonal, { active: false, upcomingFrom: null });
}

// 3. buildMenuFromSharedCategories：季節品置頂、彼此依品名；非季節品順序不變
{
  const staticCats = [{ id: 'cakes', title: '蛋糕', subtitle: '', items: [] }];
  const plain = ['甲蛋糕', '乙蛋糕', '丙蛋糕'].map((name) => ({ name, prices: [{ spec: '標準', price: 100 }] }));
  const seasonalItems = ['草莓乙', '草莓甲'].map((name) => ({ name, seasonal: true, prices: [{ spec: '標準', price: 200 }] }));
  const baseline = buildMenuFromSharedCategories(staticCats, [{ id: 'cakes', title: '蛋糕', items: plain }])[0].items.map((i) => i.name);
  const mixed = buildMenuFromSharedCategories(staticCats, [{ id: 'cakes', title: '蛋糕', items: [plain[0], seasonalItems[0], plain[1], seasonalItems[1], plain[2]] }])[0].items;
  const mixedNames = mixed.map((i) => i.name);
  assert.deepEqual(mixedNames.slice(0, 2), ['草莓乙', '草莓甲'].sort((a, b) => a.localeCompare(b, 'zh-Hant')));
  assert.deepEqual(mixedNames.slice(2), baseline);
  assert.equal(mixed[0].seasonal, true);
  assert.equal('seasonal' in mixed[2], false);
}

// 4. /api/menu handler：seasonal.active 以實際輸出的品項為準（真的 public/menu.json 當分類清單）
{
  process.chdir(new URL('..', import.meta.url).pathname);
  const { default: menuHandler } = await bundle('../api/menu.ts', [stubAdminClient]);
  const callMenu = async (menuItems) => {
    globalThis.__MENU_TEST_CLIENT__ = stubClient({
      menu_categories: [{ id: 'chiffon', title: '戚風', subtitle: null, sort_order: 1 }, { id: 'not_in_menu', title: '新分類', subtitle: null, sort_order: 2 }],
      menu_items: menuItems,
      menu_variants: menuItems.map((row) => ({ menu_item_id: row.id, spec: '六吋', price: 1000, sort_order: 1 })),
    });
    let body = null;
    const res = { status: () => res, setHeader: () => res, json: (payload) => { body = payload; return res; } };
    await menuHandler({ method: 'GET', query: {}, headers: {} }, res);
    return body;
  };
  const window = { available_from: iso(real - DAY) };
  const shown = await callMenu([item('plain', '一般戚風', { category_id: 'chiffon' }), item('season', '草莓戚風', { category_id: 'chiffon', ...window })]);
  assert.equal(shown.source, 'supabase_merged');
  assert.deepEqual(shown.seasonal, { active: true, upcomingFrom: null });
  assert.deepEqual(shown.data.find((c) => c.id === 'chiffon').items.map((i) => i.name), ['草莓戚風', '一般戚風']);
  // 季節品掛在顯示清單沒有的分類：畫面上不會出現，公告不可以說開放中
  const hidden = await callMenu([item('plain', '一般戚風', { category_id: 'chiffon' }), item('season', '草莓新分類', { category_id: 'not_in_menu', ...window })]);
  assert.equal(hidden.data.some((c) => c.items.some((i) => i.name === '草莓新分類')), false);
  assert.deepEqual(hidden.seasonal, { active: false, upcomingFrom: null });
}

console.log('Menu availability: window states, canonical snapshot filtering (upcoming / ended / unavailable), seasonal flags, upcomingFrom, seasonal-first ordering, /api/menu seasonal.active from rendered items passed; no DB or network accessed.');
