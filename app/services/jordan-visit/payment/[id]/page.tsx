import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import PaymentPage from '@/components/JordanVisitPayment'

export default async function JordanVisitPaymentPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return <PaymentPage requestId={params.id} userId={user.id} />
}




