'use client'

import { Archive, RotateCcw } from 'lucide-react'
import RequestCard from '../RequestCard'
import type { VisitRequest, UserProfile } from '../types'

interface AdminDashboardDeletedRequestsProps {
  deletedRequests: VisitRequest[]
  loadingDeleted: boolean
  userProfiles: { [key: string]: UserProfile }
  currentRole: 'admin' | 'supervisor' | 'other'
  onRequestClick: (request: VisitRequest) => void
  onScheduleTrip: (request: VisitRequest) => void
  onDeleteRequest: (requestId: string) => Promise<void>
  onRestoreRequest: (requestId: string) => Promise<void>
  onClose: () => void
}

export default function AdminDashboardDeletedRequests({
  deletedRequests,
  loadingDeleted,
  userProfiles,
  currentRole,
  onRequestClick,
  onScheduleTrip,
  onDeleteRequest,
  onRestoreRequest,
  onClose,
}: AdminDashboardDeletedRequestsProps) {
  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900 flex items-center gap-2">
          <Archive className="w-5 h-5 text-red-600" />
          الطلبات المحذوفة ({deletedRequests.length})
        </h2>
        <button
          onClick={onClose}
          className="w-full sm:w-auto px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-bold"
        >
          العودة للطلبات
        </button>
      </div>
      {loadingDeleted ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
          <p className="text-gray-600">جاري تحميل الطلبات المحذوفة...</p>
        </div>
      ) : deletedRequests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <Archive className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p className="text-gray-600">لا توجد طلبات محذوفة</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {deletedRequests.map((request, index) => (
            <RequestCard
              key={request.id}
              request={request}
              userProfile={userProfiles[request.user_id]}
              onClick={() => onRequestClick(request)}
              onScheduleTrip={() => onScheduleTrip(request)}
              onDelete={currentRole === 'admin' ? () => onDeleteRequest(request.id) : undefined}
              onRestore={currentRole === 'admin' ? () => onRestoreRequest(request.id) : undefined}
              isAdmin={currentRole === 'admin'}
              isDeleted={true}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  )
}

