import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ProfileSettings from '@/components/ProfileSettings'

export default async function AdminProfilePage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (profileError) {
    console.error('Admin profile role check error:', profileError)
  }

  if (!profile || (profile.role || '').toLowerCase() !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <ProfileSettings
      userId={user.id}
      backHref="/admin"
      backLabel="العودة للوحة الإدارة"
    />
  )
}



