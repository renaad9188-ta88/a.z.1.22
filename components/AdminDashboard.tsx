'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  LogOut, 
  FileText, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  Settings,
  Car,
  DollarSign
} from 'lucide-react'
import toast from 'react-hot-toast'

interface VisitRequest {
  id: string
  visitor_name: string
  visit_type: string
  travel_date: string
  status: string
  created_at: string
  city: string
  user_id: string
  deposit_paid: boolean
  deposit_amount: number | null
}

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [requests, setRequests] = useState<VisitRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<VisitRequest | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [statusUpdate, setStatusUpdate] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRequests(data || [])
    } catch (error: any) {
      toast.error('حدث خطأ أثناء تحميل الطلبات')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!selectedRequest) return

    try {
      const updateData: any = {
        status: statusUpdate,
        updated_at: new Date().toISOString(),
      }

      if (statusUpdate === 'rejected' && rejectionReason) {
        updateData.rejection_reason = rejectionReason
      }

      if (adminNotes) {
        updateData.admin_notes = adminNotes
      }

      const { error } = await supabase
        .from('visit_requests')
        .update(updateData)
        .eq('id', selectedRequest.id)

      if (error) throw error

      toast.success('تم تحديث حالة الطلب بنجاح')
      setShowModal(false)
      setSelectedRequest(null)
      setStatusUpdate('')
      setRejectionReason('')
      setAdminNotes('')
      loadRequests()
    } catch (error: any) {
      toast.error('حدث خطأ أثناء تحديث الطلب')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    toast.success('تم تسجيل الخروج بنجاح')
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      pending: { text: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-800' },
      under_review: { text: 'بانتظار الموافقة', color: 'bg-blue-100 text-blue-800' },
      approved: { text: 'تم القبول', color: 'bg-green-100 text-green-800' },
      rejected: { text: 'تم الرفض', color: 'bg-red-100 text-red-800' },
    }

    const statusInfo = statusMap[status] || statusMap.pending

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    )
  }

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending' || r.status === 'under_review').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/" className="flex items-center gap-1.5 sm:gap-2 group">
                {/* شعار جميل - نفس الشعار من Header */}
                <div className="relative w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center">
                  {/* خلفية متدرجة بألوان علم سوريا مع تأثير ثلاثي الأبعاد */}
                  <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-500 to-red-700 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105"></div>
                  {/* طبقة بيضاء في الوسط */}
                  <div className="absolute inset-[2px] bg-gradient-to-br from-white to-gray-50 rounded-lg"></div>
                  {/* طبقة خضراء في الأسفل */}
                  <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-b from-green-600 to-green-700 rounded-b-xl"></div>
                  {/* نجمة بيضاء تمثل الوحدة */}
                  <div className="relative z-10 flex items-center justify-center">
                    <svg 
                      className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-red-600 drop-shadow-lg" 
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                    >
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                    </svg>
                  </div>
                  {/* حلقة خارجية ذهبية */}
                  <div className="absolute -inset-0.5 border-2 border-yellow-400/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold bg-gradient-to-r from-red-600 via-gray-800 to-green-600 bg-clip-text text-transparent leading-tight group-hover:from-red-500 group-hover:to-green-500 transition-all">
                    منصة خدمات السوريين
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600">لوحة تحكم الإدارة</p>
                  <div className="h-0.5 bg-gradient-to-r from-red-500 via-yellow-400 to-green-600 rounded-full mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <Link
                href="/dashboard"
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base text-gray-700 hover:text-blue-600 transition"
              >
                لوحة المستخدم
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">إجمالي الطلبات</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-blue-600 opacity-20 flex-shrink-0" />
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">قيد المراجعة</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-yellow-600 opacity-20 flex-shrink-0" />
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">مقبولة</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-green-600 opacity-20 flex-shrink-0" />
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">مرفوضة</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-red-600 opacity-20 flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold">جميع الطلبات</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الزائر</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نوع الزيارة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ السفر</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العربون</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{request.visitor_name}</div>
                      <div className="text-sm text-gray-500">{request.city}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.visit_type === 'visit' ? 'زيارة' : request.visit_type === 'umrah' ? 'عمرة' : 'سياحة'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(request.travel_date).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.deposit_paid ? (
                        <span className="text-green-600">✓ مدفوع</span>
                      ) : (
                        <span className="text-red-600">✗ غير مدفوع</span>
                      )}
                      {request.deposit_amount && (
                        <div className="text-xs text-gray-500">{request.deposit_amount} $</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => {
                          setSelectedRequest(request)
                          setStatusUpdate(request.status)
                          setShowModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        تعديل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Update Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-2xl font-bold mb-4">تعديل حالة الطلب</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  حالة الطلب
                </label>
                <select
                  value={statusUpdate}
                  onChange={(e) => setStatusUpdate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">قيد المراجعة</option>
                  <option value="under_review">بانتظار الموافقة</option>
                  <option value="approved">تم القبول</option>
                  <option value="rejected">تم الرفض</option>
                </select>
              </div>

              {statusUpdate === 'rejected' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    سبب الرفض
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="أدخل سبب الرفض..."
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات الإدارة
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="أدخل ملاحظات إضافية..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedRequest(null)
                  setStatusUpdate('')
                  setRejectionReason('')
                  setAdminNotes('')
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                إلغاء
              </button>
              <button
                onClick={handleStatusUpdate}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

