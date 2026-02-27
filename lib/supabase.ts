import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Cookie helpers — domain = .kiwimu.com → 跨子網域共享 session
const COOKIE_DOMAIN = '.kiwimu.com'

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}
function setCookie(name: string, value: string, maxAgeSec = 60 * 60 * 24 * 365) {
  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    `domain=${COOKIE_DOMAIN}`, `path=/`,
    `max-age=${maxAgeSec}`, 'SameSite=Lax',
  ].join('; ')
}
function deleteCookie(name: string) {
  document.cookie = `${name}=; domain=${COOKIE_DOMAIN}; path=/; max-age=0`
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    storage: {
      getItem: (key) => getCookie(key),
      setItem: (key, value) => setCookie(key, value),
      removeItem: (key) => deleteCookie(key),
    },
  },
})
