import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import RequestFollow from '@/components/RequestFollow'

export default async function RequestFollowPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const resolvedParams = params instanceof Promise ? await params : params
  return <RequestFollow requestId={resolvedParams.id} userId={user.id} />
}



