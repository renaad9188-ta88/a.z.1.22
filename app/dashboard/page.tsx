import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import DashboardContent from '@/components/DashboardContent'

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // إذا كان المستخدم إدمن، لا نعرض لوحة المستخدم لتجنب الخلط
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (profileError) {
    console.error('Dashboard role check error:', profileError)
  }

  if ((profile?.role || '').toLowerCase() === 'admin') {
    redirect('/admin')
  }
  if ((profile?.role || '').toLowerCase() === 'supervisor') {
    redirect('/admin')
  }
  if ((profile?.role || '').toLowerCase() === 'driver') {
    redirect('/driver')
  }

  return <DashboardContent userId={user.id} />
}

