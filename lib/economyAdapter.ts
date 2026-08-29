import {
  getSupabaseProjectRef,
  isStoreVisitProof,
  isUuid,
  parseEconomyResponse,
  parseStoreVisitClaimData,
  parseStoreVisitIssueData,
  type EconomyResponse,
  type EconomyResponseCode,
} from './economyContract.ts';

export const ECONOMY_PROJECT_REF = 'xlqwfaailjyvsycjnzkz';
export const STORE_LOCATION_ID = 'annan-store';

type EconomyOperation = 'issue_store_visit_proof' | 'claim_store_visit_proof';

export interface EconomyRpcResult {
  data: unknown;
  error: { code?: string | null } | null;
}

export type EconomyRpcCaller = (
  operation: EconomyOperation,
  parameters: Record<string, unknown>,
  signal: AbortSignal,
) => Promise<EconomyRpcResult>;

interface EconomyAdapterOptions {
  projectUrl: unknown;
  rpc: EconomyRpcCaller | null;
  timeoutMs?: number;
  now?: () => number;
}

function localResponse(
  requestId: string,
  code: EconomyResponseCode,
  data: Record<string, unknown> = {},
): EconomyResponse {
  return { ok: code === 'OK', code, request_id: requestId, data };
}

function assertRequestId(requestId: string): void {
  if (!isUuid(requestId)) {
    throw new TypeError('Economy request id must be a UUID');
  }
}

export function createEconomyRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('Secure random UUID generation is unavailable');
  }

  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createEconomyAdapter({
  projectUrl,
  rpc,
  timeoutMs = 8_000,
  now = Date.now,
}: EconomyAdapterOptions) {
  const configuredForCanonicalProject =
    getSupabaseProjectRef(projectUrl) === ECONOMY_PROJECT_REF;

  const callEconomyRpc = async (
    operation: EconomyOperation,
    parameters: Record<string, unknown>,
    requestId: string,
  ): Promise<EconomyResponse> => {
    assertRequestId(requestId);

    if (!rpc || !configuredForCanonicalProject) {
      return localResponse(requestId, 'ROLLOUT_DISABLED', {
        reason: 'canonical_project_unavailable',
      });
    }

    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const { data, error } = await rpc(operation, parameters, controller.signal);
      if (error) {
        console.warn('[economy] Map RPC unavailable', {
          operation,
          code: error.code || null,
        });
        return localResponse(requestId, 'ROLLOUT_DISABLED', {
          reason: 'rpc_unavailable',
        });
      }

      return parseEconomyResponse(data, requestId)
        ?? localResponse(requestId, 'NOT_ELIGIBLE', {
          reason: 'invalid_rpc_response',
        });
    } catch {
      console.warn('[economy] Map RPC request failed', { operation });
      return localResponse(requestId, 'ROLLOUT_DISABLED', {
        reason: 'rpc_unavailable',
      });
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  };

  const issueStoreVisitProof = async (requestId: string): Promise<EconomyResponse> => {
    assertRequestId(requestId);
    const result = await callEconomyRpc('issue_store_visit_proof', {
      p_subject_user_id: null,
      p_location_id: STORE_LOCATION_ID,
      p_request_id: requestId,
    }, requestId);

    if (!result.ok) return result;
    const data = parseStoreVisitIssueData(result.data);
    if (!data || Date.parse(data.expires_at) <= now()) {
      return localResponse(requestId, 'NOT_ELIGIBLE', {
        reason: 'invalid_issue_response',
      });
    }

    return { ...result, data };
  };

  const claimStoreVisitProof = async (
    proof: string,
    requestId: string,
  ): Promise<EconomyResponse> => {
    assertRequestId(requestId);
    const normalizedProof = proof.trim();
    if (!isStoreVisitProof(normalizedProof)) {
      return localResponse(requestId, 'INVALID_PROOF');
    }

    const result = await callEconomyRpc('claim_store_visit_proof', {
      p_proof: normalizedProof,
      p_request_id: requestId,
    }, requestId);

    if (!result.ok) return result;
    const data = parseStoreVisitClaimData(result.data);
    if (!data) {
      return localResponse(requestId, 'NOT_ELIGIBLE', {
        reason: 'invalid_claim_response',
      });
    }

    return { ...result, data };
  };

  return { issueStoreVisitProof, claimStoreVisitProof };
}
