'use client'

import Link from 'next/link'
import { Calendar, MessageCircle, Archive, Layers } from 'lucide-react'
import QRCodeShare from '@/components/QRCodeShare'

interface AdminDashboardHeaderProps {
  currentRole: 'admin' | 'supervisor' | 'other'
  supervisorPermissions: {
    can_manage_routes: boolean
    can_create_trips: boolean
    can_assign_requests: boolean
    can_verify_payments: boolean
    can_view_all_requests: boolean
  } | null
  showRouteManagement: boolean
  showInvitesManagement: boolean
  showBookingsManagement: boolean
  showCustomersManagement: boolean
  showSupervisorsManagement: boolean
  showContactMessages: boolean
  showDeletedRequests: boolean
  showSupervisorCustomers: boolean
  showSupervisorInvites: boolean
  onSectionToggle: (section: 'routes' | 'invites' | 'bookings' | 'customers' | 'supervisors' | 'deleted' | 'supervisor-customers' | 'supervisor-invites' | 'contact-messages') => void
}

export default function AdminDashboardHeader({
  currentRole,
  supervisorPermissions,
  showRouteManagement,
  showInvitesManagement,
  showBookingsManagement,
  showCustomersManagement,
  showSupervisorsManagement,
  showContactMessages,
  showDeletedRequests,
  showSupervisorCustomers,
  showSupervisorInvites,
  onSectionToggle,
}: AdminDashboardHeaderProps) {
  return (
    <header className="bg-white shadow-md rounded-xl w-full">
      <div className="container mx-auto px-2 sm:px-3 md:px-4 py-2 sm:py-3 max-w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 min-w-0 flex-1">
            <div className="flex flex-col min-w-0">
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-extrabold text-gray-900 leading-tight truncate">
                {currentRole === 'supervisor' ? 'لوحة المشرف' : 'لوحة تحكم الإدارة'}
              </h1>
              <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-600 truncate font-semibold">
                إدارة الطلبات والخطوط
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3 w-full sm:w-auto justify-end sm:justify-start">
            <QRCodeShare title="سوريا بلس (Syria Plus) خدمات - لوحة الإدارة" />
            {(currentRole === 'admin' || (currentRole === 'supervisor' && supervisorPermissions?.can_manage_routes)) && (
              <button
                onClick={() => onSectionToggle('routes')}
                className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-sm sm:text-base md:text-lg transition font-semibold ${
                  showRouteManagement 
                    ? 'text-blue-600 bg-blue-50 rounded-lg' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                إدارة الخطوط
              </button>
            )}
            {currentRole === 'admin' && (
              <button
                onClick={() => onSectionToggle('invites')}
                className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-sm sm:text-base md:text-lg transition font-semibold ${
                  showInvitesManagement 
                    ? 'text-blue-600 bg-blue-50 rounded-lg' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                الدعوات
              </button>
            )}
            {currentRole === 'admin' && (
              <button
                onClick={() => onSectionToggle('bookings')}
                className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm md:text-base transition flex items-center gap-1 ${
                  showBookingsManagement 
                    ? 'text-blue-600 bg-blue-50 rounded-lg' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                الحجوزات
              </button>
            )}
            {currentRole === 'admin' && (
              <button
                onClick={() => onSectionToggle('customers')}
                className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-sm sm:text-base md:text-lg transition font-semibold ${
                  showCustomersManagement 
                    ? 'text-blue-600 bg-blue-50 rounded-lg' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                المنتسبين
              </button>
            )}
            {currentRole === 'admin' && (
              <button
                onClick={() => onSectionToggle('contact-messages')}
                className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm md:text-base transition flex items-center gap-1 ${
                  showContactMessages 
                    ? 'text-cyan-600 bg-cyan-50 rounded-lg' 
                    : 'text-gray-700 hover:text-cyan-600'
                }`}
              >
                <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                التواصل المباشر
              </button>
            )}
            {currentRole === 'admin' && (
              <button
                onClick={() => onSectionToggle('supervisors')}
                className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-sm sm:text-base md:text-lg transition font-semibold ${
                  showSupervisorsManagement 
                    ? 'text-blue-600 bg-blue-50 rounded-lg' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                المشرفين
              </button>
            )}
            {currentRole === 'admin' && (
              <button
                onClick={() => onSectionToggle('deleted')}
                className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm md:text-base transition flex items-center gap-1 ${
                  showDeletedRequests 
                    ? 'text-red-600 bg-red-50 rounded-lg' 
                    : 'text-gray-700 hover:text-red-600'
                }`}
              >
                <Archive className="w-3 h-3 sm:w-4 sm:h-4" />
                المحذوفة
              </button>
            )}
            {currentRole === 'supervisor' && (
              <>
                <button
                  onClick={() => onSectionToggle('supervisor-customers')}
                  className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm md:text-base transition font-semibold ${
                    showSupervisorCustomers 
                      ? 'text-blue-600 bg-blue-50 rounded-lg' 
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  المنتسبين
                </button>
                <button
                  onClick={() => onSectionToggle('supervisor-invites')}
                  className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm md:text-base transition font-semibold ${
                    showSupervisorInvites 
                      ? 'text-blue-600 bg-blue-50 rounded-lg' 
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  الدعوات
                </button>
              </>
            )}
            <Link
              href="/admin/profile"
              className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm md:text-base text-gray-700 hover:text-blue-600 transition"
            >
              {currentRole === 'supervisor' ? 'إعدادات المشرف' : 'إعدادات الإدمن'}
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

