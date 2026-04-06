import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
  console.error('[Supabase] VITE_SUPABASE_URL is not set. Check your .env file and restart the dev server.')
}
if (!supabaseAnonKey || supabaseAnonKey === 'placeholder-key') {
  console.error('[Supabase] VITE_SUPABASE_ANON_KEY is not set. Check your .env file and restart the dev server.')
}

console.log('[Supabase] URL:', supabaseUrl)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
