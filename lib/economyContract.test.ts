import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getSupabaseProjectRef,
  isIsoTimestamp,
  isStoreVisitProof,
  parseEconomyResponse,
  parseStoreVisitClaimData,
  parseStoreVisitIssueData,
} from './economyContract.ts';

const REQUEST_ID = '11111111-1111-4111-8111-111111111111';

test('accepts only the canonical economy envelope and matching request id', () => {
  const response = parseEconomyResponse({
    ok: true,
    code: 'OK',
    request_id: REQUEST_ID,
    data: { stamp_key: 'map_staff_visit' },
  }, REQUEST_ID);
  assert.equal(response?.code, 'OK');

  assert.equal(parseEconomyResponse({
    ok: true,
    code: 'OK',
    request_id: '22222222-2222-4222-8222-222222222222',
    data: {},
  }, REQUEST_ID), null);
  assert.equal(parseEconomyResponse({
    ok: true,
    code: 'ROLLOUT_DISABLED',
    request_id: REQUEST_ID,
    data: {},
  }), null);
  assert.equal(parseEconomyResponse({
    ok: false,
    code: 'UNKNOWN',
    request_id: REQUEST_ID,
    data: {},
  }), null);
  assert.equal(parseEconomyResponse({
    ok: true,
    code: 'OK',
    request_id: REQUEST_ID,
    data: {},
    points: 999999,
  }), null);
});

test('validates only canonical one-time store proof credentials', () => {
  assert.equal(isStoreVisitProof(`VIS-${'A'.repeat(16)}.${'b'.repeat(48)}`), true);
  assert.equal(isStoreVisitProof(`VIS-${'A'.repeat(16)}.${'b'.repeat(47)}`), false);
  assert.equal(isStoreVisitProof(` VIS-${'A'.repeat(16)}.${'b'.repeat(48)} `), false);
  assert.equal(isStoreVisitProof('store_legacy_claim'), false);
});

test('accepts only complete ISO timestamps', () => {
  assert.equal(isIsoTimestamp('2026-07-16T12:30:45.123Z'), true);
  assert.equal(isIsoTimestamp('2026-07-16T20:30:45+08:00'), true);
  assert.equal(isIsoTimestamp('2026-07-16'), false);
  assert.equal(isIsoTimestamp('0'), false);
  assert.equal(isIsoTimestamp('2026-07-16T12:30:45'), false);
});

test('accepts only the exact issue response schema', () => {
  const data = {
    proof_id: '22222222-2222-4222-8222-222222222222',
    credential: `VIS-${'A'.repeat(16)}.${'b'.repeat(48)}`,
    expires_at: '2099-07-16T12:30:45Z',
    location_id: 'annan-store',
  };

  assert.deepEqual(parseStoreVisitIssueData(data), data);
  assert.equal(parseStoreVisitIssueData({ ...data, points: 999999 }), null);
  assert.equal(parseStoreVisitIssueData({ ...data, expires_at: '0' }), null);
  assert.equal(parseStoreVisitIssueData({ ...data, location_id: 'other-store' }), null);
  const { credential: _credential, ...missingCredential } = data;
  assert.equal(parseStoreVisitIssueData(missingCredential), null);
});

test('accepts only the exact claim response schema', () => {
  const data = {
    stamp_key: 'map_staff_visit',
    location_id: 'annan-store',
    awarded_at: '2026-07-16T12:30:45Z',
    event_id: '33333333-3333-4333-8333-333333333333',
  };

  assert.deepEqual(parseStoreVisitClaimData(data), data);
  assert.equal(parseStoreVisitClaimData({ ...data, points: 999999 }), null);
  assert.equal(parseStoreVisitClaimData({ ...data, stamp_key: 'client_visit' }), null);
  assert.equal(parseStoreVisitClaimData({ ...data, awarded_at: '2026-07-16' }), null);
  const { event_id: _eventId, ...missingEventId } = data;
  assert.equal(parseStoreVisitClaimData(missingEventId), null);
});

test('extracts and pins the Supabase project ref', () => {
  assert.equal(
    getSupabaseProjectRef('https://xlqwfaailjyvsycjnzkz.supabase.co'),
    'xlqwfaailjyvsycjnzkz',
  );
  assert.equal(getSupabaseProjectRef('https://attacker.example.com'), null);
  assert.equal(getSupabaseProjectRef('not-a-url'), null);
});
