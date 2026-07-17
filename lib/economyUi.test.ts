import assert from 'node:assert/strict';
import test from 'node:test';
import { createInFlightLatch, markEventOnce } from './economyUi.ts';

test('an in-flight latch rejects synchronous double entry until release', () => {
  const latch = createInFlightLatch();
  assert.equal(latch.tryAcquire(), true);
  assert.equal(latch.isActive(), true);
  assert.equal(latch.tryAcquire(), false);
  latch.release();
  assert.equal(latch.isActive(), false);
  assert.equal(latch.tryAcquire(), true);
});

test('server event ids produce at most one client-side event', () => {
  const seen = new Set<string>();
  assert.equal(markEventOnce(seen, '33333333-3333-4333-8333-333333333333'), true);
  assert.equal(markEventOnce(seen, '33333333-3333-4333-8333-333333333333'), false);
  assert.equal(markEventOnce(seen, '44444444-4444-4444-8444-444444444444'), true);
  assert.equal(markEventOnce(seen, ''), false);
});
