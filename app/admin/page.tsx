import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminDashboard from '@/components/AdminDashboard'

export default async function AdminPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // التحقق من أن المستخدم إداري
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (profileError) {
    // لو في duplicates أو مشكلة RLS، لا نعتبره admin بالخطأ — نعيده للداشبورد
    console.error('Admin role check error:', profileError)
  }

  if (!profile || (profile.role || '').toLowerCase() !== 'admin') {
    redirect('/dashboard')
  }

  return <AdminDashboard />
}

