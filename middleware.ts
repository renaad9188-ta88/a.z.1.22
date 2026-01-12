import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
    'https://dcnywvixlcysalzfchye.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjbnl3dml4bGN5c2FsemZjaHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTgxMzAsImV4cCI6MjA4Mzc5NDEzMH0.IpOCivcWhnDwTTNVs7PcCVLP6x7W9FIc26Ue32-lqSA'
  
  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          res.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (req.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // Protect admin routes
  if (req.nextUrl.pathname.startsWith('/admin') && !user) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // Protect request-visit route
  if (req.nextUrl.pathname.startsWith('/request-visit') && !user) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/request-visit/:path*'],
}

