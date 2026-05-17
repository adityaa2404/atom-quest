import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Debug: expose on window so we can test in browser console
if (typeof window !== 'undefined') window._supabase = supabase
