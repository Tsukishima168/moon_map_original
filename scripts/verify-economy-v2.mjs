import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const claimApi = read('api/rewards/claim.ts');
const progressApi = read('api/rewards/progress.ts');
const app = read('index.tsx');
const productionAdapter = read('lib/economy.ts');
const adapter = read('lib/economyAdapter.ts');
const proofPanel = read('components/StoreVisitProofPanel.tsx');
const packageJson = read('package.json');

for (const [name, source] of [['claim', claimApi], ['progress', progressApi]]) {
  assert.doesNotMatch(source, /createAdminClient|\.from\s*\(|reward_claims|reward_claim_progress/,
    `${name} legacy endpoint can still mutate reward tables`);
  assert.match(source, /status\(410\)/, `${name} legacy endpoint is not an explicit tombstone`);
}

assert.doesNotMatch(app, /\/api\/rewards\/(?:claim|progress)|claim_code=|STORE_BADGE_CODE_KEY/,
  'Map client still invokes a legacy reward authority');
assert.doesNotMatch(app, /moonmoon_(?:egg_master_code|store_visit_code|pending_reward_claim)|reward_claimed|stamp_unlock/,
  'Map client still treats local state or GPS as a formal asset authority');
assert.match(app, /<StoreVisitProofPanel/,
  'Map does not render the canonical staff-proof journey');
assert.match(app, /closeStoreVisitProof/,
  'Map store-proof modal does not restore focus on close');
assert.match(app, /storeVisitDialogRef/,
  'Map store-proof modal does not contain keyboard focus');
assert.match(app, /useDialogFocusTrap\(\s*showLogin/,
  'Map login modal does not contain keyboard focus');
assert.match(app, /aria-labelledby="login-dialog-title"/,
  'Map login modal does not expose an accessible dialog name');
assert.match(app, /aria-hidden=\{showLogin \? true : undefined\}/,
  'Map does not hide the preserved proof panel from assistive technology during login');
assert.match(productionAdapter, /createEconomyAdapter/,
  'Map production client does not use the tested Economy adapter');
assert.match(adapter, /issue_store_visit_proof/);
assert.match(adapter, /claim_store_visit_proof/);
assert.match(adapter, /xlqwfaailjyvsycjnzkz/);
assert.match(adapter, /AbortController/);
assert.match(adapter, /parseStoreVisitIssueData/);
assert.match(adapter, /parseStoreVisitClaimData/);
assert.doesNotMatch(adapter, /p_(?:amount|points|reward_points|points_delta)\s*:/,
  'Map client can submit an economic amount');
assert.match(proofPanel, /正式印章仍需店員短效憑證/,
  'Map does not label GPS as an auxiliary-only signal');
assert.match(proofPanel, /claimStoreVisitProof/);
assert.match(proofPanel, /issueStoreVisitProof/);
assert.match(proofPanel, /disabled=\{claiming\}/,
  'Map allows the submitted proof to change while a claim is active');
assert.match(proofPanel, /claimAttemptId/,
  'Map does not ignore stale claim responses');
assert.match(proofPanel, /createInFlightLatch/,
  'Map proof actions do not synchronously reject double entry');
assert.match(proofPanel, /markEventOnce/,
  'Map can emit duplicate client events for an idempotent server result');
assert.doesNotMatch(proofPanel, /all:\s*['"]unset['"]/,
  'Map removes the credential copy button focus affordance');
assert.match(packageJson, /"deploy":\s*"npm run vercel-build && vercel deploy --prebuilt --prod"/,
  'Map production deploy bypasses compiled Economy tombstone verification');

console.log('Map Economy v2 static authority checks passed');
