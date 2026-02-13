'use client'

import { Share2, MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function InvitePlatformButton({
  url,
  title = 'منصة خدمات السوريين',
}: {
  url?: string
  title?: string
}) {
  const [shareUrl, setShareUrl] = useState('')

  useEffect(() => {
    if (url) {
      setShareUrl(url)
    } else if (typeof window !== 'undefined') {
      setShareUrl(window.location.origin)
    }
  }, [url])

  const inviteText =
    `دعوة للتسجيل في ${title}\n` +
    `منصة لتسهيل طلبات الزيارة وحجز الرحلات وتتبعها.\n` +
    `افتح الرابط للتسجيل:`

  const handleInvite = async () => {
    try {
      if (!shareUrl) return

      const nav: any = navigator
      if (nav?.share) {
        await nav.share({
          title,
          text: `${inviteText}\n${shareUrl}`,
          url: shareUrl,
        })
        return
      }

      const wa = `https://wa.me/?text=${encodeURIComponent(`${inviteText}\n${shareUrl}`)}`
      window.open(wa, '_blank', 'noopener,noreferrer')
    } catch (e) {
      try {
        await navigator.clipboard.writeText(`${inviteText}\n${shareUrl}`)
        toast.success('تم نسخ رابط الدعوة')
      } catch {
        toast.error('تعذر مشاركة رابط الدعوة')
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleInvite}
      className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs sm:text-sm font-semibold"
      title="دعوة صديق/قريب للتسجيل"
      disabled={!shareUrl}
    >
      <MessageCircle className="w-4 h-4" />
      <span>دعوة صديق</span>
      <Share2 className="w-4 h-4 opacity-90" />
    </button>
  )
}


