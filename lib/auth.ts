/**
 * Moon Map — Supabase Auth（跨網域 cookie）
 * 讀取 .kiwimu.com cookie session（由 Booking / MBTI Lab 設定）
 * 也可以直接用 Google OAuth 從這裡登入
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const COOKIE_DOMAIN = '.kiwimu.com';

// ── Cookie helpers ────────────────────────────────────────────────────────────

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, maxAgeSec = 60 * 60 * 24 * 365) {
  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    `domain=${COOKIE_DOMAIN}`,
    `path=/`,
    `max-age=${maxAgeSec}`,
    'SameSite=Lax',
  ].join('; ');
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; domain=${COOKIE_DOMAIN}; path=/; max-age=0`;
}

// ── Auth Client（cookie storage，單例）───────────────────────────────────────

let _authClient: SupabaseClient | null = null;

export function getAuthClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (_authClient) return _authClient;

  _authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      storage: {
        getItem: (key) => getCookie(key),
        setItem: (key, value) => setCookie(key, value),
        removeItem: (key) => deleteCookie(key),
      },
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

/** Google OAuth 登入 */
export async function signInWithGoogle(): Promise<void> {
  const client = getAuthClient();
  if (!client) return;
  await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}

/** 登出 */
export async function signOut(): Promise<void> {
  const client = getAuthClient();
  if (!client) return;
  await client.auth.signOut();
}
