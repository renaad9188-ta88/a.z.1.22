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

  const role = ((profile?.role || '') as string).toLowerCase()
  if (!profile || (role !== 'admin' && role !== 'supervisor')) {
    redirect('/dashboard')
  }

  // التحقق من أن المشرف نشط (إذا كان مشرف)
  if (role === 'supervisor') {
    const { data: permissions, error: permError } = await supabase
      .from('supervisor_permissions')
      .select('is_active')
      .eq('supervisor_id', user.id)
      .maybeSingle()

    if (permError && permError.code !== 'PGRST116') {
      console.error('Error checking supervisor status:', permError)
    }

    // إذا كان المشرف معطل (is_active = false)، منع الوصول
    if (permissions && permissions.is_active === false) {
      redirect('/dashboard')
    }
  }

  return <AdminDashboard />
}

