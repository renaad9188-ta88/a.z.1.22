'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { X, UserPlus, UserX, Search, Users } from 'lucide-react'

interface SupervisorCustomersModalProps {
  supervisorId: string
  supervisorName: string
  onClose: () => void
  onUpdate: () => void
}

type CustomerRow = {
  customer_id: string
  full_name: string | null
  phone: string | null
  jordan_phone?: string | null
  whatsapp_phone?: string | null
}

type SearchResult = {
  user_id: string
  full_name: string | null
  phone: string | null
  jordan_phone?: string | null
  whatsapp_phone?: string | null
  role: string | null
}

export default function SupervisorCustomersModal({
  supervisorId,
  supervisorName,
  onClose,
  onUpdate,
}: SupervisorCustomersModalProps) {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadCustomers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supervisorId])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('supervisor_customers')
        .select(`
          customer_id,
          profiles:customer_id (
            user_id,
            full_name,
            phone,
            jordan_phone,
            whatsapp_phone
          )
        `)
        .eq('supervisor_id', supervisorId)

      if (error) throw error

      const customersList = (data || []).map((item: any) => ({
        customer_id: item.customer_id,
        full_name: item.profiles?.full_name || null,
        phone: item.profiles?.phone || null,
        jordan_phone: item.profiles?.jordan_phone || null,
        whatsapp_phone: item.profiles?.whatsapp_phone || null,
      }))

      setCustomers(customersList)
    } catch (e: any) {
      console.error('Load customers error:', e)
      toast.error('تعذر تحميل المنتسبين')
    } finally {
      setLoading(false)
    }
  }

  const normalizePhoneForSearch = (phone: string) => {
    if (!phone) return ''
    let digits = phone.replace(/[^\d]/g, '')
    digits = digits.replace(/^0+/, '')
    if (!digits.startsWith('962') && digits.length > 0) {
      digits = '962' + digits
    }
    return digits
  }

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    try {
      const normalizedQuery = query.trim().toLowerCase()
      const normalizedPhone = normalizePhoneForSearch(query)

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, jordan_phone, whatsapp_phone, role')
        .or(`full_name.ilike.%${normalizedQuery}%,phone.ilike.%${normalizedQuery}%,jordan_phone.ilike.%${normalizedQuery}%,whatsapp_phone.ilike.%${normalizedQuery}%`)
        .neq('role', 'admin')
        .neq('role', 'supervisor')
        .order('updated_at', { ascending: false })
        .limit(20)

      if (error) throw error

      const filtered = (data || []).filter((p: any) => {
        const matchesName = p.full_name?.toLowerCase().includes(normalizedQuery)
        const matchesPhone = 
          p.phone?.toLowerCase().includes(normalizedQuery) ||
          p.jordan_phone?.toLowerCase().includes(normalizedQuery) ||
          p.whatsapp_phone?.toLowerCase().includes(normalizedQuery) ||
          (normalizedPhone && (
            normalizePhoneForSearch(p.phone || '') === normalizedPhone ||
            normalizePhoneForSearch(p.jordan_phone || '') === normalizedPhone ||
            normalizePhoneForSearch(p.whatsapp_phone || '') === normalizedPhone
          ))
        return matchesName || matchesPhone
      })

      // استثناء المنتسبين الحاليين
      const currentCustomerIds = customers.map(c => c.customer_id)
      const available = filtered.filter((p: any) => !currentCustomerIds.includes(p.user_id))

      setSearchResults(available as any)
      setShowSearchResults(true)
    } catch (e: any) {
      console.error('Search users error:', e)
      toast.error('تعذر البحث عن المستخدمين')
      setSearchResults([])
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (value.trim()) {
      searchUsers(value)
    } else {
      setSearchResults([])
      setShowSearchResults(false)
    }
  }

  const handleAddCustomer = async (customerId: string) => {
    try {
      setAdding(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('supervisor_customers')
        .insert({
          supervisor_id: supervisorId,
          customer_id: customerId,
          assigned_by: user?.id || null,
        })

      if (error) throw error
      toast.success('تم إضافة المنتسب بنجاح')
      setSearchQuery('')
      setSearchResults([])
      setShowSearchResults(false)
      await loadCustomers()
      onUpdate()
    } catch (e: any) {
      console.error('Add customer error:', e)
      toast.error(e?.message || 'تعذر إضافة المنتسب')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveCustomer = async (customerId: string) => {
    if (!confirm('إزالة هذا المنتسب من قائمة المشرف؟')) return

    try {
      const { error } = await supabase
        .from('supervisor_customers')
        .delete()
        .eq('supervisor_id', supervisorId)
        .eq('customer_id', customerId)

      if (error) throw error
      toast.success('تمت إزالة المنتسب')
      await loadCustomers()
      onUpdate()
    } catch (e: any) {
      console.error('Remove customer error:', e)
      toast.error(e?.message || 'تعذر إزالة المنتسب')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">منتسبو المشرف: {supervisorName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* البحث وإضافة منتسب */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="text-sm font-bold text-gray-800 mb-2">إضافة منتسب</div>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="ابحث بالاسم أو رقم الهاتف..."
                className="w-full pr-10 pl-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.user_id}
                      type="button"
                      onClick={() => handleAddCustomer(user.user_id)}
                      disabled={adding}
                      className="w-full text-right px-3 py-2 hover:bg-blue-50 transition text-sm border-b border-gray-100 last:border-b-0 disabled:opacity-60"
                    >
                      <div className="font-semibold text-gray-900">{user.full_name || 'بدون اسم'}</div>
                      <div className="text-xs text-gray-600">
                        {user.phone || user.jordan_phone || user.whatsapp_phone || 'بدون رقم'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* قائمة المنتسبين */}
          {loading ? (
            <div className="text-center py-8 text-gray-600">جاري التحميل...</div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-gray-600">لا يوجد منتسبين حالياً</div>
          ) : (
            <div className="space-y-2">
              {customers.map((customer) => (
                <div
                  key={customer.customer_id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 truncate">
                      {customer.full_name || 'بدون اسم'}
                    </div>
                    <div className="text-xs text-gray-600 truncate">
                      {customer.phone || customer.jordan_phone || customer.whatsapp_phone || 'بدون رقم'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomer(customer.customer_id)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 text-xs font-bold"
                  >
                    <UserX className="w-4 h-4" />
                    إزالة
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

