'use client'

import { ChevronDown, Layers } from 'lucide-react'
import RequestCard from '../RequestCard'
import type { VisitRequest, UserProfile } from '../types'
import { typeLabel, groupedByType, typeOrder } from './AdminDashboardUtils'

interface AdminDashboardRequestsListProps {
  filteredRequests: VisitRequest[]
  userProfiles: { [key: string]: UserProfile }
  typeFilter: string
  collapsedTypes: Record<string, boolean>
  currentRole: 'admin' | 'supervisor' | 'other'
  onRequestClick: (request: VisitRequest) => void
  onScheduleTrip: (request: VisitRequest) => void
  onDeleteRequest: (requestId: string) => Promise<void>
  onAssignSupervisor: (request: VisitRequest) => void
  onToggleCollapse: (type: string) => void
}

export default function AdminDashboardRequestsList({
  filteredRequests,
  userProfiles,
  typeFilter,
  collapsedTypes,
  currentRole,
  onRequestClick,
  onScheduleTrip,
  onDeleteRequest,
  onAssignSupervisor,
  onToggleCollapse,
}: AdminDashboardRequestsListProps) {
  // Grouped view when typeFilter == all
  if (typeFilter === 'all') {
    const groups = groupedByType(filteredRequests)
    const types = [
      ...typeOrder.filter(t => (groups[t] || []).length > 0),
      ...Object.keys(groups).filter(t => !typeOrder.includes(t)).sort(),
    ]

    return (
      <div className="space-y-4">
        {types.map((t) => {
          const list = groups[t] || []
          const isCollapsed = Boolean(collapsedTypes[t])
          return (
            <div key={t} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => onToggleCollapse(t)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Layers className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="font-extrabold text-gray-800 truncate">
                    {typeLabel(t)}
                  </span>
                  <span className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 flex-shrink-0">
                    {list.length}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
              </button>

              {!isCollapsed && (
                <div className="p-3 sm:p-4 space-y-3">
                  {list.map((request, idx) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      userProfile={userProfiles[request.user_id]}
                      onClick={() => onRequestClick(request)}
                      onScheduleTrip={() => onScheduleTrip(request)}
                      onDelete={currentRole === 'admin' ? () => onDeleteRequest(request.id) : undefined}
                      onAssignSupervisor={currentRole === 'admin' ? () => onAssignSupervisor(request) : undefined}
                      isAdmin={currentRole === 'admin'}
                      index={idx}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Flat view when typeFilter != all
  return (
    <>
      {filteredRequests.map((request, index) => (
        <RequestCard
          key={request.id}
          request={request}
          userProfile={userProfiles[request.user_id]}
          onClick={() => onRequestClick(request)}
          onScheduleTrip={() => onScheduleTrip(request)}
          onDelete={currentRole === 'admin' ? () => onDeleteRequest(request.id) : undefined}
          onAssignSupervisor={currentRole === 'admin' ? () => onAssignSupervisor(request) : undefined}
          isAdmin={currentRole === 'admin'}
          index={index}
        />
      ))}
    </>
  )
}

