import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import RequestFollow from '@/components/RequestFollow'

export default async function RequestFollowPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  return <RequestFollow requestId={params.id} userId={user.id} />
}



