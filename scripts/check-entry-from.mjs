// GA4 entry_from 的小型 node 檢查（map 沒有測試 runner）。
// 用法：node scripts/check-entry-from.mjs
// 以 esbuild 把 lib/attribution.ts 轉成 ESM，stub window/document 後驗證 resolveEntryFrom。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';

const src = readFileSync(new URL('../lib/attribution.ts', import.meta.url), 'utf8');
const { code } = await transform(src, { loader: 'ts', format: 'esm', target: 'es2022' });
const { resolveEntryFrom } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

const NOW = 1_800_000_000_000;
const MIN = 60 * 1000;
const setCookie = (obj) => {
  globalThis.document = { cookie: obj ? `kw_attr=${encodeURIComponent(JSON.stringify(obj))}` : '' };
};
globalThis.window = { location: { hostname: 'map.kiwimu.com', search: '' } };

// 1. 原始網址的 from
setCookie(null);
assert.equal(resolveEntryFrom('?from=hub_nav&mbti=INFP', NOW), 'hub_nav');
// 2. 網址 from 優先於新鮮的 cookie from
setCookie({ from: 'passport_nav', from_ts: NOW - 1000 });
assert.equal(resolveEntryFrom('?from=hub_nav', NOW), 'hub_nav');
// 3. 無網址 from → cookie from（< 30 分鐘）
assert.equal(resolveEntryFrom('', NOW), 'passport_nav');
setCookie({ from: 'passport_nav', from_ts: NOW - 29 * MIN });
assert.equal(resolveEntryFrom('?mbti=INFP', NOW), 'passport_nav');
// 4. >= 30 分鐘、缺 from_ts、from_ts 非數字／未來 → 省略
setCookie({ from: 'passport_nav', from_ts: NOW - 30 * MIN });
assert.equal(resolveEntryFrom('', NOW), undefined);
setCookie({ from: 'passport_nav' });
assert.equal(resolveEntryFrom('', NOW), undefined);
setCookie({ from: 'passport_nav', from_ts: 'x' });
assert.equal(resolveEntryFrom('', NOW), undefined);
setCookie({ from: 'passport_nav', from_ts: NOW + 5000 });
assert.equal(resolveEntryFrom('', NOW), undefined);
// 5. 格式不符：cookie from 與網址 from 都省略；網址 from 格式不符不回退到 cookie
setCookie({ from: 'Bad-Value!', from_ts: NOW - 1000 });
assert.equal(resolveEntryFrom('', NOW), undefined);
setCookie({ from: 'passport_nav', from_ts: NOW - 1000 });
assert.equal(resolveEntryFrom('?from=Bad-Value!', NOW), undefined);
// 6. 壞掉的 cookie、無 cookie
globalThis.document = { cookie: 'kw_attr=%7Bnot-json' };
assert.equal(resolveEntryFrom('', NOW), undefined);
setCookie(null);
assert.equal(resolveEntryFrom('?utm_source=ig', NOW), undefined);
// 7. 超長但合法的網址 from 截成 64 字，仍符合 ^[a-z0-9_]{1,64}$
const long = resolveEntryFrom(`?from=${'a'.repeat(80)}`, NOW);
assert.equal(long, 'a'.repeat(64));
assert.match(long, /^[a-z0-9_]{1,64}$/);
// 8. search 未傳時回退到 window.location.search
globalThis.window.location.search = '?from=menu_nav';
assert.equal(resolveEntryFrom(undefined, NOW), 'menu_nav');

console.log('entry_from checks passed');
