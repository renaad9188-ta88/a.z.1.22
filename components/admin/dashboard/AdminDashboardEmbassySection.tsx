'use client'

import { Building2, MessageCircle, Phone } from 'lucide-react'
import Link from 'next/link'
import type { VisitRequest, UserProfile } from '../types'
import { parseAdminNotes } from '@/components/request-details/utils'

interface AdminDashboardEmbassySectionProps {
  requests: VisitRequest[]
  userProfiles: { [key: string]: UserProfile }
  onRequestClick: (request: VisitRequest) => void
  onQuickResponse: (request: VisitRequest, responseText: string) => Promise<void>
}

export default function AdminDashboardEmbassySection({
  requests,
  userProfiles,
  onRequestClick,
  onQuickResponse,
}: AdminDashboardEmbassySectionProps) {
  const embassyRequests = requests.filter(r => r.visit_type === 'embassy')
  
  if (embassyRequests.length === 0) return null

  return (
    <div className="mb-8 bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg p-4 sm:p-6 border-2 border-green-200">
      <div className="flex items-center gap-3 mb-4">
        <Building2 className="w-6 h-6 text-green-600" />
        <h2 className="text-xl font-bold text-gray-800">طلبات مواعيد السفارة</h2>
        <span className="px-3 py-1 bg-green-600 text-white rounded-full text-sm font-bold">
          {embassyRequests.length}
        </span>
      </div>
      
      <div className="space-y-4">
        {embassyRequests.map((request) => {
          const userProfile = userProfiles[request.user_id]
          const adminInfo = parseAdminNotes((request.admin_notes || '') as string) || {}
          
          const phoneMatch = (request.admin_notes || '').match(/الهاتف:\s*([^\n]+)/)
          const phone = phoneMatch?.[1]?.trim() || userProfile?.phone || adminInfo.syrianPhone || adminInfo.jordanPhone || ''
          const waDigits = String(phone).replace(/[^\d]/g, '')
          const callDigits = String(phone).replace(/[^\d+]/g, '')
          
          const quickResponse = '✅ تم استلام طلبك. سنتواصل معك قريباً لإكمال الإجراءات.'
          
          return (
            <div key={request.id} className="bg-white rounded-lg p-4 border-2 border-green-200 hover:shadow-md transition">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 mb-1">{request.visitor_name}</h3>
                  <p className="text-sm text-gray-600 mb-2">#{request.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-gray-500 mb-2">{request.city}</p>
                  {request.admin_notes && (
                    <div className="text-xs text-gray-600 mt-2 whitespace-pre-line max-h-20 overflow-y-auto">
                      {request.admin_notes.split('\n').slice(0, 5).join('\n')}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  {waDigits && (
                    <a
                      href={`https://wa.me/${waDigits}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      واتساب
                    </a>
                  )}
                  {callDigits && (
                    <a
                      href={`tel:${callDigits}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <Phone className="w-4 h-4" />
                      اتصال
                    </a>
                  )}
                  <button
                    onClick={() => onQuickResponse(request, quickResponse)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-semibold"
                  >
                    رد سريع
                  </button>
                  <button
                    onClick={() => onRequestClick(request)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm font-semibold"
                  >
                    عرض التفاصيل
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

