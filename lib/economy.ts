import { supabase } from './supabase';
import {
  createEconomyAdapter,
  createEconomyRequestId,
  ECONOMY_PROJECT_REF,
  STORE_LOCATION_ID,
  type EconomyRpcCaller,
} from './economyAdapter';

const economySupabase = supabase;
const rpc: EconomyRpcCaller | null = economySupabase
  ? async (operation, parameters, signal) => {
    const { data, error } = await economySupabase.rpc(operation, parameters).abortSignal(signal);
    return {
      data,
      error: error ? { code: error.code ?? null } : null,
    };
  }
  : null;

const adapter = createEconomyAdapter({
  projectUrl: import.meta.env.VITE_SUPABASE_URL,
  rpc,
});

export { createEconomyRequestId, ECONOMY_PROJECT_REF, STORE_LOCATION_ID };
export const issueStoreVisitProof = adapter.issueStoreVisitProof;
export const claimStoreVisitProof = adapter.claimStoreVisitProof;
