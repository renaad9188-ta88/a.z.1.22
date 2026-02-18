'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { UserPlus, Search, X, Loader2, Users } from 'lucide-react'
import toast from 'react-hot-toast'

interface Supervisor {
  user_id: string
  full_name: string | null
  phone: string | null
  is_active?: boolean
  services?: string[]
}

interface SupervisorSelectorModalProps {
  requestId: string
  currentAssigned?: string | null
  onAssign: (supervisorId: string) => Promise<void>
  onClose: () => void
}

export default function SupervisorSelectorModal({
  requestId,
  currentAssigned,
  onAssign,
  onClose,
}: SupervisorSelectorModalProps) {
  const supabase = createSupabaseBrowserClient()
  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [filteredSupervisors, setFilteredSupervisors] = useState<Supervisor[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadSupervisors()
  }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      setFilteredSupervisors(
        supervisors.filter(
          (s) =>
            s.full_name?.toLowerCase().includes(query) ||
            s.phone?.includes(query)
        )
      )
    } else {
      setFilteredSupervisors(supervisors)
    }
  }, [searchQuery, supervisors])

  const loadSupervisors = async () => {
    try {
      setLoading(true)
      
      // جلب المشرفين من profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .eq('role', 'supervisor')
        .order('updated_at', { ascending: false })

      if (profilesError) throw profilesError

      if (!profilesData || profilesData.length === 0) {
        setSupervisors([])
        setFilteredSupervisors([])
        return
      }

      // جلب حالة التفعيل/التعطيل لكل مشرف
      const supervisorIds = profilesData.map((p) => p.user_id)
      const { data: permissionsData, error: permError } = await supabase
        .from('supervisor_permissions')
        .select('supervisor_id, is_active')
        .in('supervisor_id', supervisorIds)

      // جلب الخدمات المخصصة لكل مشرف
      const { data: servicesData, error: servicesError } = await supabase
        .from('supervisor_service_permissions')
        .select('supervisor_id, service_type')
        .in('supervisor_id', supervisorIds)

      // إنشاء خريطة للحالة
      const statusMap = new Map<string, boolean>()
      if (permissionsData) {
        permissionsData.forEach((p: any) => {
          statusMap.set(p.supervisor_id, p.is_active !== false)
        })
      }

      // إنشاء خريطة للخدمات
      const servicesMap = new Map<string, string[]>()
      if (servicesData) {
        servicesData.forEach((s: any) => {
          if (!servicesMap.has(s.supervisor_id)) {
            servicesMap.set(s.supervisor_id, [])
          }
          servicesMap.get(s.supervisor_id)?.push(s.service_type)
        })
      }

      // دمج البيانات
      const supervisorsList: Supervisor[] = profilesData.map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        phone: p.phone,
        is_active: statusMap.get(p.user_id) ?? true,
        services: servicesMap.get(p.user_id) || [],
      }))

      // تصفية المشرفين النشطين فقط
      const activeSupervisors = supervisorsList.filter((s) => s.is_active)
      setSupervisors(activeSupervisors)
      setFilteredSupervisors(activeSupervisors)
    } catch (error: any) {
      console.error('Error loading supervisors:', error)
      toast.error('تعذر تحميل قائمة المشرفين')
      setSupervisors([])
      setFilteredSupervisors([])
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async (supervisorId: string) => {
    if (assigning) return

    try {
      setAssigning(supervisorId)
      await onAssign(supervisorId)
      onClose()
    } catch (error: any) {
      console.error('Error assigning supervisor:', error)
      toast.error('تعذر تعيين المشرف')
    } finally {
      setAssigning(null)
    }
  }

  const getServiceLabel = (service: string) => {
    const labels: Record<string, string> = {
      visit: 'زيارة',
      goethe: 'جوته',
      embassy: 'سفارة',
      visa: 'فيز',
      umrah: 'عمرة',
      tourism: 'سياحة',
    }
    return labels[service] || service
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                نقل الطلب إلى مشرف
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                اختر المشرف المناسب للطلب
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="إغلاق"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث عن مشرف بالاسم أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Supervisors List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="mr-3 text-gray-600">جاري التحميل...</span>
            </div>
          ) : filteredSupervisors.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-semibold">
                {searchQuery ? 'لم يتم العثور على مشرفين' : 'لا يوجد مشرفين متاحين'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSupervisors.map((supervisor) => {
                const isAssigned = currentAssigned === supervisor.user_id
                const isAssigning = assigning === supervisor.user_id

                return (
                  <div
                    key={supervisor.user_id}
                    className={`border rounded-lg p-4 transition-all ${
                      isAssigned
                        ? 'bg-green-50 border-green-300'
                        : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                            {supervisor.full_name || 'مشرف'}
                          </h3>
                          {isAssigned && (
                            <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
                              معيّن حالياً
                            </span>
                          )}
                        </div>
                        {supervisor.phone && (
                          <p className="text-xs sm:text-sm text-gray-600 mb-2">
                            {supervisor.phone}
                          </p>
                        )}
                        {supervisor.services && supervisor.services.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {supervisor.services.map((service) => (
                              <span
                                key={service}
                                className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] sm:text-xs font-semibold rounded border border-blue-200"
                              >
                                {getServiceLabel(service)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleAssign(supervisor.user_id)}
                        disabled={isAssigned || isAssigning}
                        className={`px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition flex items-center gap-2 flex-shrink-0 ${
                          isAssigned
                            ? 'bg-green-100 text-green-700 cursor-not-allowed'
                            : isAssigning
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isAssigning ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            جاري التعيين...
                          </>
                        ) : isAssigned ? (
                          'معيّن'
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            تعيين
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

