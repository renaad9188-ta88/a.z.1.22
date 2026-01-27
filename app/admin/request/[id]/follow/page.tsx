import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminRequestFollow from '@/components/admin/AdminRequestFollow'

export default async function AdminRequestFollowPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // allow admin + supervisor
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const role = ((profile?.role || '') as string).toLowerCase()
  if (role !== 'admin' && role !== 'supervisor') redirect('/dashboard')

  const resolvedParams = params instanceof Promise ? await params : params
  return <AdminRequestFollow requestId={resolvedParams.id} adminUserId={user.id} role={role as any} />
}



