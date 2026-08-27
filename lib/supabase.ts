import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createSharedAuthStorage } from './authStorage'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          detectSessionInUrl: true,
          // Passport 是唯一登入權威且走 PKCE；本站只讀共用 session，
          // 明確指定 pkce 以免落到 supabase-js 的 implicit 預設。
          flowType: 'pkce',
          storage: createSharedAuthStorage(),
        },
      })
    : null
