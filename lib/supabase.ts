import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 
    'https://dcnywvixlcysalzfchye.supabase.co'
  
  if (!url || url === 'your_supabase_url') {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL')
    console.error('📝 Please create .env.local file in the root directory with:')
    console.error('   NEXT_PUBLIC_SUPABASE_URL=https://dcnywvixlcysalzfchye.supabase.co')
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL. ' +
      'Please create .env.local file in the root directory. ' +
      'See env.local.content file for the template.'
    )
  }
  return url
}

const getSupabaseAnonKey = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjbnl3dml4bGN5c2FsemZjaHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTgxMzAsImV4cCI6MjA4Mzc5NDEzMH0.IpOCivcWhnDwTTNVs7PcCVLP6x7W9FIc26Ue32-lqSA'
  
  if (!key || key === 'your_supabase_anon_key') {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
    console.error('📝 Please create .env.local file in the root directory with:')
    console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...')
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

