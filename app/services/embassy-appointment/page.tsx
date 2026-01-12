import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import EmbassyAppointmentForm from '@/components/EmbassyAppointmentForm'

export default async function EmbassyAppointmentPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return <EmbassyAppointmentForm />
}

