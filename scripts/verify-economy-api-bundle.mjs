import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROUTES = [
  {
    name: 'claim',
    retiredReason: 'legacy_reward_claim_retired',
  },
  {
    name: 'progress',
    retiredReason: 'client_progress_retired',
  },
];

function invoke(handler, method, headers = {}) {
  const response = {
    statusCode: 200,
    headers: {},
    body: null,
  };
  const res = {
    setHeader(name, value) {
      response.headers[String(name).toLowerCase()] = String(value);
      return this;
    },
    status(statusCode) {
      response.statusCode = statusCode;
      return this;
    },
    json(body) {
      response.body = body;
      return this;
    },
  };

  handler({ method, headers }, res);
  return response;
}

function assertEnvelope(response, statusCode, code, data) {
  assert.equal(response.statusCode, statusCode);
  assert.deepEqual(Object.keys(response.body).sort(), ['code', 'data', 'ok', 'request_id']);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.code, code);
  assert.match(response.body.request_id, UUID_PATTERN);
  assert.deepEqual(response.body.data, data);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
}

for (const route of ROUTES) {
  const bundleUrl = new URL(
    `../.vercel/output/functions/api/rewards/${route.name}.func/index.cjs`,
    import.meta.url,
  );
  const bundleSource = readFileSync(bundleUrl, 'utf8');
  assert.doesNotMatch(
    bundleSource,
    /createClient|reward_claims|reward_claim_progress/,
    `${route.name} compiled tombstone contains a reward-table authority`,
  );

  const module = require(bundleUrl.pathname);
  assert.equal(typeof module.default, 'function');
  assertEnvelope(
    invoke(module.default, 'GET'),
    405,
    'NOT_ELIGIBLE',
    { reason: 'method_not_allowed' },
  );
  assertEnvelope(
    invoke(module.default, 'POST'),
    403,
    'INVALID_PROOF',
    {},
  );
  assertEnvelope(
    invoke(module.default, 'POST', { origin: 'https://map.kiwimu.com' }),
    410,
    'ROLLOUT_DISABLED',
    { reason: route.retiredReason },
  );
}

console.log('Map compiled Economy tombstone behavior checks passed');
