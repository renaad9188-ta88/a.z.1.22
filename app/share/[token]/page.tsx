'use client'

import SharedTracking from '@/components/tracking/SharedTracking'

export default function ShareTrackingPage({ params }: { params: { token: string } }) {
  return <SharedTracking token={params.token} />
}


