export const ECONOMY_RESPONSE_CODES = [
  'OK',
  'AUTH_REQUIRED',
  'NOT_ELIGIBLE',
  'LIMIT_REACHED',
  'INSUFFICIENT_POINTS',
  'OUT_OF_STOCK',
  'EXPIRED',
  'ALREADY_PROCESSED',
  'INVALID_PROOF',
  'ROLLOUT_DISABLED',
] as const;

export type EconomyResponseCode = typeof ECONOMY_RESPONSE_CODES[number];

export interface EconomyResponse {
  ok: boolean;
  code: EconomyResponseCode;
  request_id: string;
  data: Record<string, unknown>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STORE_VISIT_PROOF_PATTERN = /^VIS-[0-9A-F]{16}\.[0-9a-f]{48}$/i;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
const RESPONSE_KEYS = ['code', 'data', 'ok', 'request_id'];
const ISSUE_DATA_KEYS = ['credential', 'expires_at', 'location_id', 'proof_id'];
const CLAIM_DATA_KEYS = ['awarded_at', 'event_id', 'location_id', 'stamp_key'];
const RESPONSE_CODE_SET = new Set<string>(ECONOMY_RESPONSE_CODES);

export interface StoreVisitIssueData extends Record<string, unknown> {
  proof_id: string;
  credential: string;
  expires_at: string;
  location_id: string;
}

export interface StoreVisitClaimData extends Record<string, unknown> {
  stamp_key: 'map_staff_visit';
  location_id: string;
  awarded_at: string;
  event_id: string;
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: string[]): boolean {
  const keys = Object.keys(value).sort();
  return keys.length === expectedKeys.length
    && keys.every((key, index) => key === expectedKeys[index]);
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string'
    && value.length <= 64
    && ISO_TIMESTAMP_PATTERN.test(value)
    && Number.isFinite(Date.parse(value));
}

export function isStoreVisitProof(value: unknown): value is string {
  return typeof value === 'string' && STORE_VISIT_PROOF_PATTERN.test(value);
}

export function getSupabaseProjectRef(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    const match = hostname.match(/^([a-z0-9]{20})\.supabase\.co$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function parseEconomyResponse(
  value: unknown,
  expectedRequestId?: string,
): EconomyResponse | null {
  if (!isPlainRecord(value)) return null;
  const keys = Object.keys(value).sort();
  if (keys.length !== RESPONSE_KEYS.length || keys.some((key, index) => key !== RESPONSE_KEYS[index])) {
    return null;
  }

  if (
    typeof value.ok !== 'boolean' ||
    typeof value.code !== 'string' ||
    !RESPONSE_CODE_SET.has(value.code) ||
    !isUuid(value.request_id) ||
    !isPlainRecord(value.data) ||
    value.ok !== (value.code === 'OK') ||
    (expectedRequestId && value.request_id !== expectedRequestId)
  ) {
    return null;
  }

  return value as unknown as EconomyResponse;
}

export function parseStoreVisitIssueData(value: unknown): StoreVisitIssueData | null {
  if (
    !isPlainRecord(value)
    || !hasExactKeys(value, ISSUE_DATA_KEYS)
    || !isUuid(value.proof_id)
    || !isStoreVisitProof(value.credential)
    || !isIsoTimestamp(value.expires_at)
    || value.location_id !== 'annan-store'
  ) {
    return null;
  }

  return value as StoreVisitIssueData;
}

export function parseStoreVisitClaimData(value: unknown): StoreVisitClaimData | null {
  if (
    !isPlainRecord(value)
    || !hasExactKeys(value, CLAIM_DATA_KEYS)
    || value.stamp_key !== 'map_staff_visit'
    || value.location_id !== 'annan-store'
    || !isIsoTimestamp(value.awarded_at)
    || !isUuid(value.event_id)
  ) {
    return null;
  }

  return value as StoreVisitClaimData;
}
