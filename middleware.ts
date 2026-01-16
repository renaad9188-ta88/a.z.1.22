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
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    // Enforce separation: admins and drivers should not land in user dashboard routes
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const userRole = (profile?.role || '').toLowerCase()
    if (!profileError && userRole === 'admin') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    if (!profileError && userRole === 'driver') {
      return NextResponse.redirect(new URL('/driver', req.url))
    }
  }

  // Protect admin routes
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    // Enforce role separation: only admins can access /admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (profileError) {
      // If we can't verify role, default to safest behavior: block access
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    if ((profile?.role || '').toLowerCase() !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Protect driver routes
  if (req.nextUrl.pathname.startsWith('/driver')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    // Enforce role separation: only drivers can access /driver
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (profileError) {
      // If we can't verify role, default to safest behavior: block access
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    if ((profile?.role || '').toLowerCase() !== 'driver') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Protect request-visit route
  if (req.nextUrl.pathname.startsWith('/request-visit') && !user) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/driver/:path*', '/request-visit/:path*'],
}

