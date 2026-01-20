import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import UserFiles from '@/components/UserFiles'

export default async function DashboardFilesPage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // نفس منطق لوحة التحكم: لا نعرض صفحة المستخدم لأدوار أخرى
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (profileError) {
    console.error('Dashboard files role check error:', profileError)
  }

  const role = (profile?.role || '').toLowerCase()
  if (role === 'admin' || role === 'supervisor') redirect('/admin')
  if (role === 'driver') redirect('/driver')

  return <UserFiles userId={user.id} />
}


