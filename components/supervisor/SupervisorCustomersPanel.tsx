'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Users, Search, UserPlus, UserX, MessageCircle, Phone, X, Send } from 'lucide-react'

interface SupervisorCustomersPanelProps {
  supervisorId: string
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

export default function SupervisorCustomersPanel({ supervisorId }: SupervisorCustomersPanelProps) {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [adding, setAdding] = useState(false)
  const [selectedCustomerForWhatsApp, setSelectedCustomerForWhatsApp] = useState<CustomerRow | null>(null)
  const [whatsappMessage, setWhatsappMessage] = useState('')

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
    } catch (e: any) {
      console.error('Add customer error:', e)
      toast.error(e?.message || 'تعذر إضافة المنتسب')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveCustomer = async (customerId: string) => {
    if (!confirm('إزالة هذا المنتسب من قائمتك؟')) return

    try {
      const { error } = await supabase
        .from('supervisor_customers')
        .delete()
        .eq('supervisor_id', supervisorId)
        .eq('customer_id', customerId)

      if (error) throw error
      toast.success('تمت إزالة المنتسب')
      await loadCustomers()
    } catch (e: any) {
      console.error('Remove customer error:', e)
      toast.error(e?.message || 'تعذر إزالة المنتسب')
    }
  }

  const handleSendWhatsApp = (customer: CustomerRow) => {
    const phone = customer.whatsapp_phone || customer.jordan_phone || customer.phone
    if (!phone) {
      toast.error('لا يوجد رقم واتساب لهذا المنتسب')
      return
    }

    let digits = phone.replace(/[^\d]/g, '')
    digits = digits.replace(/^0+/, '')
    if (!digits.startsWith('962') && digits.length > 0) {
      digits = '962' + digits
    }

    const message = whatsappMessage.trim() || `مرحباً ${customer.full_name || 'عزيزي'}، كيف يمكنني مساعدتك؟`
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
    setSelectedCustomerForWhatsApp(null)
    setWhatsappMessage('')
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-base sm:text-lg font-extrabold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          إدارة المنتسبين
        </h3>
        <button
          type="button"
          onClick={loadCustomers}
          className="text-xs font-semibold text-blue-700 hover:text-blue-800"
          disabled={loading}
        >
          تحديث
        </button>
      </div>

      {/* البحث وإضافة منتسب */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 mb-4">
        <div className="text-sm font-bold text-gray-800 mb-2">إضافة منتسب جديد</div>
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
          {customers.map((customer) => {
            const phone = customer.whatsapp_phone || customer.jordan_phone || customer.phone
            const waDigits = phone ? phone.replace(/[^\d]/g, '').replace(/^0+/, '') : ''
            const finalWaDigits = waDigits && !waDigits.startsWith('962') ? '962' + waDigits : waDigits

            return (
              <div
                key={customer.customer_id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-900 truncate">
                    {customer.full_name || 'بدون اسم'}
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {phone || 'بدون رقم'}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {finalWaDigits && (
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerForWhatsApp(customer)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-100 hover:bg-green-100 text-xs font-bold"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      واتساب
                    </button>
                  )}
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 text-xs font-bold"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      اتصال
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomer(customer.customer_id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 text-xs font-bold"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    إزالة
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal لإرسال رسالة واتساب */}
      {selectedCustomerForWhatsApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-gray-900">إرسال رسالة واتساب</h4>
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerForWhatsApp(null)
                  setWhatsappMessage('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <div className="text-sm text-gray-700 mb-2">
                إلى: <span className="font-semibold">{selectedCustomerForWhatsApp.full_name || 'بدون اسم'}</span>
              </div>
              <textarea
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                placeholder="اكتب رسالتك هنا (اختياري)..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm min-h-[100px]"
              />
              <p className="text-xs text-gray-500 mt-1">
                إذا تركت الرسالة فارغة، سيتم استخدام رسالة افتراضية
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerForWhatsApp(null)
                  setWhatsappMessage('')
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleSendWhatsApp(selectedCustomerForWhatsApp)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-semibold"
              >
                <Send className="w-4 h-4" />
                إرسال
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

