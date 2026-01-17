import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  
  if (!url || url === 'your_supabase_url') {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL')
    console.error('📝 Please create .env.local file in the root directory with:')
    console.error('   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co')
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL. ' +
      'Please create .env.local file in the root directory. ' +
      'See env.local.content file for the template.'
    )
  }
  return url
}

const getSupabaseAnonKey = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!key || key === 'your_supabase_anon_key') {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
    console.error('📝 Please create .env.local file in the root directory with:')
    console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here')
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Please create .env.local file in the root directory. ' +
      'See env.local.content file for the template.'
    )
  }
  return key
}

export const createSupabaseClient = () => {
  return createClient(
    getSupabaseUrl(),
    getSupabaseAnonKey()
  )
}

export const createSupabaseBrowserClient = () => {
  return createBrowserClient(
    getSupabaseUrl(),
    getSupabaseAnonKey()
  )
}

