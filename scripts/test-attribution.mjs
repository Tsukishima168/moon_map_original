import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const tsx = readFileSync(new URL('../index.tsx', import.meta.url), 'utf8');
const gaScript = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).find(script => script.includes('__isProdKiwimuHost'))
  .replace('import.meta.env.VITE_GA4_ID', "'G-TEST'");

for (const path of ['/menu', '/menu/', '/MENU']) {
  const window = { location: { hostname: 'map.kiwimu.com', pathname: path, search: '' },
    __MOON_MAP_INITIAL_SEARCH__: '?from=mbti_universe_nav&utm_source=campaign', dataLayer: [] };
  vm.runInNewContext(gaScript, { window, dataLayer: window.dataLayer, URLSearchParams,
    document: { createElement: () => ({}), head: { appendChild() {} } } });
  const calls = window.dataLayer.map(call => [...call]);
  assert.equal(calls.filter(call => call[0] === 'event' && call[1] === 'menu_view').length, 1);
  assert.equal(calls.find(call => call[0] === 'config')[2].entry_from, 'mbti_universe_nav');
  assert.equal(calls.find(call => call[1] === 'menu_view')[2].utm_source, 'campaign');
}

for (const hostname of ['localhost', 'deployment-test.vercel.app']) {
  const window = { location: { hostname, pathname: '/menu', search: '' }, dataLayer: [] };
  vm.runInNewContext(gaScript, { window });
  assert.equal(window.dataLayer.length, 0);
}

const getUTMBody = tsx.match(/const getUTMParams = (\(\) => \{[\s\S]*?\n  \});/)[1];
const getUTMCode = transformSync(`(${getUTMBody})()`, { loader: 'ts' }).code;
let search = '?utm_source=campaign&utm_medium=social&utm_campaign=launch';
const store = new Map();
const context = { window: {}, document: { referrer: '' }, URLSearchParams,
  getInitialUrlSearch: () => search,
  sessionStorage: { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) } };
const first = vm.runInNewContext(getUTMCode, context);
search = ''; // Reload after URL cleanup: use the existing session attribution.
const afterReload = vm.runInNewContext(getUTMCode, context);
assert.equal(first.utm_campaign, 'launch');
assert.equal(afterReload.utm_source, 'campaign');
assert.equal(afterReload.utm_medium, 'social');
store.set('moonmoon_utm_session', '{invalid-json');
assert.equal(vm.runInNewContext(getUTMCode, context).utm_source, null);
context.sessionStorage.getItem = () => { throw new Error('Storage unavailable'); };
assert.equal(vm.runInNewContext(getUTMCode, context).utm_source, null);
console.log('Map attribution: menu paths, production guard, initial source, reload and unavailable storage passed.');
