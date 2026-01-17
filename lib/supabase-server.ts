import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
  
  if (!key || key === 'your_anon_key_here') {
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

