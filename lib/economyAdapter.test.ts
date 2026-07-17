import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEconomyAdapter,
  ECONOMY_PROJECT_REF,
  type EconomyRpcCaller,
} from './economyAdapter.ts';

const PROJECT_URL = `https://${ECONOMY_PROJECT_REF}.supabase.co`;
const REQUEST_ID = '11111111-1111-4111-8111-111111111111';
const PROOF_ID = '22222222-2222-4222-8222-222222222222';
const EVENT_ID = '33333333-3333-4333-8333-333333333333';
const PROOF = `VIS-${'A'.repeat(16)}.${'b'.repeat(48)}`;

const issueData = {
  proof_id: PROOF_ID,
  credential: PROOF,
  expires_at: '2099-07-16T12:30:45Z',
  location_id: 'annan-store',
};

const claimData = {
  stamp_key: 'map_staff_visit',
  location_id: 'annan-store',
  awarded_at: '2026-07-16T12:30:45Z',
  event_id: EVENT_ID,
};

function ok(data: Record<string, unknown>) {
  return {
    data: { ok: true, code: 'OK', request_id: REQUEST_ID, data },
    error: null,
  };
}

test('rejects an invalid request id before invoking the RPC', async () => {
  let calls = 0;
  const rpc: EconomyRpcCaller = async () => {
    calls += 1;
    return ok(issueData);
  };
  const adapter = createEconomyAdapter({ projectUrl: PROJECT_URL, rpc });

  await assert.rejects(adapter.issueStoreVisitProof('not-a-uuid'), TypeError);
  await assert.rejects(adapter.claimStoreVisitProof(PROOF, 'not-a-uuid'), TypeError);
  assert.equal(calls, 0);
});

test('fails closed when the canonical project is unavailable', async () => {
  let calls = 0;
  const rpc: EconomyRpcCaller = async () => {
    calls += 1;
    return ok(issueData);
  };
  const adapter = createEconomyAdapter({
    projectUrl: 'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',
    rpc,
  });

  const response = await adapter.issueStoreVisitProof(REQUEST_ID);
  assert.equal(response.code, 'ROLLOUT_DISABLED');
  assert.equal(calls, 0);
});

test('issues a proof with the exact canonical parameters and response schema', async () => {
  const calls: Array<{ operation: string; parameters: Record<string, unknown> }> = [];
  const rpc: EconomyRpcCaller = async (operation, parameters) => {
    calls.push({ operation, parameters });
    return ok(issueData);
  };
  const adapter = createEconomyAdapter({ projectUrl: PROJECT_URL, rpc });

  const response = await adapter.issueStoreVisitProof(REQUEST_ID);
  assert.equal(response.ok, true);
  assert.deepEqual(response.data, issueData);
  assert.deepEqual(calls, [{
    operation: 'issue_store_visit_proof',
    parameters: {
      p_subject_user_id: null,
      p_location_id: 'annan-store',
      p_request_id: REQUEST_ID,
    },
  }]);
  assert.equal(JSON.stringify(calls).includes('points'), false);
  assert.equal(JSON.stringify(calls).includes('amount'), false);
});

test('normalizes a valid proof once and claims with exact canonical parameters', async () => {
  const calls: Array<{ operation: string; parameters: Record<string, unknown> }> = [];
  const rpc: EconomyRpcCaller = async (operation, parameters) => {
    calls.push({ operation, parameters });
    return ok(claimData);
  };
  const adapter = createEconomyAdapter({ projectUrl: PROJECT_URL, rpc });

  const response = await adapter.claimStoreVisitProof(`  ${PROOF}  `, REQUEST_ID);
  assert.equal(response.ok, true);
  assert.deepEqual(response.data, claimData);
  assert.deepEqual(calls, [{
    operation: 'claim_store_visit_proof',
    parameters: { p_proof: PROOF, p_request_id: REQUEST_ID },
  }]);
});

test('rejects malformed successful payloads and forbidden economic fields', async () => {
  const malformedIssue: EconomyRpcCaller = async () => ok({ ...issueData, points: 999999 });
  const malformedClaim: EconomyRpcCaller = async () => ok({ ...claimData, awarded_at: '0' });

  const issueResponse = await createEconomyAdapter({
    projectUrl: PROJECT_URL,
    rpc: malformedIssue,
  }).issueStoreVisitProof(REQUEST_ID);
  const claimResponse = await createEconomyAdapter({
    projectUrl: PROJECT_URL,
    rpc: malformedClaim,
  }).claimStoreVisitProof(PROOF, REQUEST_ID);

  assert.equal(issueResponse.code, 'NOT_ELIGIBLE');
  assert.equal(claimResponse.code, 'NOT_ELIGIBLE');
});

test('passes through a valid server denial without treating it as success', async () => {
  const rpc: EconomyRpcCaller = async () => ({
    data: { ok: false, code: 'AUTH_REQUIRED', request_id: REQUEST_ID, data: {} },
    error: null,
  });
  const response = await createEconomyAdapter({ projectUrl: PROJECT_URL, rpc })
    .claimStoreVisitProof(PROOF, REQUEST_ID);

  assert.equal(response.ok, false);
  assert.equal(response.code, 'AUTH_REQUIRED');
});

test('fails closed for RPC errors and network failures', async () => {
  const rpcError: EconomyRpcCaller = async () => ({ data: null, error: { code: 'PGRST301' } });
  const networkError: EconomyRpcCaller = async () => {
    throw new Error('offline');
  };

  const rpcResponse = await createEconomyAdapter({ projectUrl: PROJECT_URL, rpc: rpcError })
    .issueStoreVisitProof(REQUEST_ID);
  const networkResponse = await createEconomyAdapter({ projectUrl: PROJECT_URL, rpc: networkError })
    .issueStoreVisitProof(REQUEST_ID);

  assert.equal(rpcResponse.code, 'ROLLOUT_DISABLED');
  assert.equal(networkResponse.code, 'ROLLOUT_DISABLED');
});

test('replays the same request with identical server-authoritative parameters', async () => {
  const calls: Record<string, unknown>[] = [];
  const rpc: EconomyRpcCaller = async (_operation, parameters) => {
    calls.push(parameters);
    return ok(issueData);
  };
  const adapter = createEconomyAdapter({ projectUrl: PROJECT_URL, rpc });

  const first = await adapter.issueStoreVisitProof(REQUEST_ID);
  const replay = await adapter.issueStoreVisitProof(REQUEST_ID);
  assert.deepEqual(first.data, replay.data);
  assert.deepEqual(calls, [calls[0], calls[0]]);
});

test('aborts a stalled request at the configured timeout', async () => {
  let aborted = false;
  const rpc: EconomyRpcCaller = async (_operation, _parameters, signal) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => {
      aborted = true;
      reject(new Error('aborted'));
    }, { once: true });
  });
  const response = await createEconomyAdapter({
    projectUrl: PROJECT_URL,
    rpc,
    timeoutMs: 5,
  }).issueStoreVisitProof(REQUEST_ID);

  assert.equal(aborted, true);
  assert.equal(response.code, 'ROLLOUT_DISABLED');
});
