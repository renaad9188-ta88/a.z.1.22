import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import RequestTracking from '@/components/tracking/RequestTracking'

export default async function RequestTrackingPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return <RequestTracking requestId={params.id} userId={user.id} />
}



