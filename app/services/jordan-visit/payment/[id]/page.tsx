import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import PaymentPage from '@/components/JordanVisitPayment'

export default async function JordanVisitPaymentPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const resolvedParams = await Promise.resolve(params)
  return <PaymentPage requestId={resolvedParams.id} userId={user.id} />
}






