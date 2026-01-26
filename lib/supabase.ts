import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  
  if (!url || url === 'your_supabase_url') {
    // في Vercel، لا نرمي خطأ أثناء البناء، نستخدم قيمة افتراضية
    if (typeof window === 'undefined') {
      // Server-side: نرمي خطأ فقط في runtime
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL. ' +
        'Please add NEXT_PUBLIC_SUPABASE_URL to your environment variables.'
      )
    }
    // Client-side: نستخدم قيمة افتراضية مؤقتة
    return ''
  }
  return url
}

const getSupabaseAnonKey = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!key || key === 'your_supabase_anon_key' || key === 'your_anon_key_here') {
    // في Vercel، لا نرمي خطأ أثناء البناء، نستخدم قيمة افتراضية
    if (typeof window === 'undefined') {
      // Server-side: نرمي خطأ فقط في runtime
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Please add NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.'
      )
    }
    // Client-side: نستخدم قيمة افتراضية مؤقتة
    return ''
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

