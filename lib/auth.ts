/**
 * Moon Map — Supabase Auth（跨網域 cookie）
 * 讀取 .kiwimu.com cookie session（由 Passport 設定）
 * 登入入口統一導向 passport.kiwimu.com
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { buildPassportLoginUrl, createSharedAuthStorage } from './authStorage';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
// ── Auth Client（cookie storage，單例）───────────────────────────────────────

let _authClient: SupabaseClient | null = null;

export function getAuthClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (_authClient) return _authClient;

  _authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      storage: createSharedAuthStorage(),
    },
  });

  return _authClient;
}

// ── Auth 方法 ─────────────────────────────────────────────────────────────────

/** 取得目前登入 user（null = 未登入） */
export async function getCurrentUser(): Promise<User | null> {
  const client = getAuthClient();
  if (!client) return null;
  const { data: { user } } = await client.auth.getUser();
  return user;
}

/** 統一導向 Passport 登入中心 */
export async function signInWithGoogle(): Promise<void> {
  window.location.href = buildPassportLoginUrl();
}

/** 登出 */
export async function signOut(): Promise<void> {
  const client = getAuthClient();
  if (!client) return;
  await client.auth.signOut();
}
