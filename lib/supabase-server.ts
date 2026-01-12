import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 
    'https://dcnywvixlcysalzfchye.supabase.co' // Temporary default for testing
  
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
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjbnl3dml4bGN5c2FsemZjaHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTgxMzAsImV4cCI6MjA4Mzc5NDEzMH0.IpOCivcWhnDwTTNVs7PcCVLP6x7W9FIc26Ue32-lqSA' // Temporary default for testing
  
  if (!key || key === 'your_anon_key_here') {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
    console.error('📝 Please create .env.local file in the root directory with:')
    console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here')
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Please create .env.local file in the root directory. ' +
      'See env.local.content file for the template.'
    )
  }
  return key
}

export const createSupabaseServerClient = () => {
  const cookieStore = cookies()
  
  return createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set(name, value, options)
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

