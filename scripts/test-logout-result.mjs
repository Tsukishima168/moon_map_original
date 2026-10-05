import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';

const source = readFileSync(new URL('../index.tsx', import.meta.url), 'utf8');
const handler = source.match(/const handleLogout = (async \(\) => \{[\s\S]*?\n  \});/)[1];
const code = transformSync(`(${handler})()`, { loader: 'ts' }).code;
for (const scenario of ['success', 'returned-error', 'thrown-error', 'busy', 'missing-client']) {
  const notices = []; const busy = []; let calls = 0;
  const context = {
    isLogoutBusy: scenario === 'busy',
    supabase: scenario === 'missing-client' ? null : { auth: { signOut: async () => {
      calls++;
      if (scenario === 'thrown-error') throw new Error('network');
      return { error: scenario === 'returned-error' ? new Error('provider') : null };
    } } },
    setIsLogoutBusy: value => busy.push(value),
    showUiNotice: (message, kind) => notices.push({ message, kind }),
  };
  await vm.runInNewContext(code, context);
  if (scenario === 'busy' || scenario === 'missing-client') {
    assert.equal(calls, 0); assert.equal(notices.length, 0); assert.equal(busy.length, 0);
  } else {
    assert.equal(calls, 1); assert.deepEqual(busy, [true, false]);
    assert.equal(notices.length, 1);
    assert.equal(notices[0].kind, scenario === 'success' ? 'success' : 'warning');
    if (scenario !== 'success') assert.ok(notices[0].message.includes('重試'));
  }
}
console.log('Map logout: 5 actual-handler scenarios passed; no account or network accessed.');
