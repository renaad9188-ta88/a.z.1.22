import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import RequestDetails from '@/components/RequestDetails'

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const resolvedParams = await Promise.resolve(params)
  return <RequestDetails requestId={resolvedParams.id} userId={user.id} />
}

