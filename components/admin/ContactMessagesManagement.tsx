'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { MessageCircle, Phone, Send, Search, CheckCircle, Clock, Archive, ArrowRight, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface ContactMessage {
  id: string
  name: string
  email: string | null
  phone: string
  subject: string
  message: string
  status: 'new' | 'read' | 'replied' | 'archived'
  assigned_to: string | null
  assigned_whatsapp: string | null
  admin_response: string | null
  response_sent_at: string | null
  created_at: string
}

export default function ContactMessagesManagement() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null)
  const [responseText, setResponseText] = useState('')
  const [sendingResponse, setSendingResponse] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [supervisors, setSupervisors] = useState<Array<{id: string, name: string, whatsapp: string}>>([])
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'read' | 'replied' | 'archived'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [customWhatsapp, setCustomWhatsapp] = useState('')

  // تحميل الرسائل
  useEffect(() => {
    loadMessages()
    loadSupervisors()
  }, [statusFilter])

  const loadMessages = async () => {
    try {
      const supabase = createSupabaseBrowserClient()
      let query = supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
      if (error) throw error
      setMessages(data || [])
    } catch (error: any) {
      toast.error('فشل تحميل الرسائل')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadSupervisors = async () => {
    try {
      const supabase = createSupabaseBrowserClient()
      
      // جلب المشرفين النشطين
      const { data: permissionsData, error: permError } = await supabase
        .from('supervisor_permissions')
        .select('supervisor_id, whatsapp_phone')
        .eq('is_active', true)

      if (permError) throw permError

      if (!permissionsData || permissionsData.length === 0) {
        setSupervisors([])
        return
      }

      // جلب معلومات profiles للمشرفين
      const supervisorIds = permissionsData.map(p => p.supervisor_id)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', supervisorIds)

      if (profilesError) {
        console.error('Error loading profiles:', profilesError)
        // نستمر حتى لو فشل جلب profiles
      }

      // دمج البيانات
      const profilesMap = new Map((profilesData || []).map((p: any) => [p.user_id, p.full_name]))
      
      const supervisorsList = permissionsData.map((item: any) => ({
        id: item.supervisor_id,
        name: profilesMap.get(item.supervisor_id) || 'مشرف',
        whatsapp: item.whatsapp_phone || ''
      }))
      
      setSupervisors(supervisorsList)
    } catch (error) {
      console.error('Error loading supervisors:', error)
      // لا نعرض toast هنا لأن هذا خطأ غير حرج
    }
  }

  const handleSendResponse = async (messageId: string, phone: string) => {
    if (!responseText.trim()) {
      toast.error('يرجى كتابة رد')
      return
    }

    setSendingResponse(true)
    try {
      const supabase = createSupabaseBrowserClient()
      
      // تحديث الرسالة
      const { error: updateError } = await supabase
        .from('contact_messages')
        .update({
          admin_response: responseText,
          response_sent_at: new Date().toISOString(),
          status: 'replied'
        })
        .eq('id', messageId)

      if (updateError) throw updateError

      // إرسال عبر واتساب
      const phoneDigits = phone.replace(/[^\d]/g, '')
      const whatsappUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(responseText)}`
      window.open(whatsappUrl, '_blank')

      toast.success('تم حفظ الرد وإرساله عبر واتساب')
      setResponseText('')
      setSelectedMessage(null)
      loadMessages()
    } catch (error: any) {
      toast.error('فشل إرسال الرد')
      console.error(error)
    } finally {
      setSendingResponse(false)
    }
  }

  const handleAssign = async (messageId: string, supervisorId: string | null, whatsapp: string | null) => {
    setAssigning(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase
        .from('contact_messages')
        .update({
          assigned_to: supervisorId,
          assigned_whatsapp: whatsapp
        })
        .eq('id', messageId)

      if (error) throw error

      toast.success('تم تحويل المعاملة بنجاح')
      loadMessages()
      if (selectedMessage?.id === messageId) {
        setSelectedMessage({ ...selectedMessage, assigned_to: supervisorId, assigned_whatsapp: whatsapp })
      }
    } catch (error: any) {
      toast.error('فشل تحويل المعاملة')
      console.error(error)
    } finally {
      setAssigning(false)
    }
  }

  const handleStatusChange = async (messageId: string, newStatus: string) => {
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase
        .from('contact_messages')
        .update({ status: newStatus })
        .eq('id', messageId)

      if (error) throw error
      toast.success('تم تحديث الحالة')
      loadMessages()
      if (selectedMessage?.id === messageId) {
        setSelectedMessage({ ...selectedMessage, status: newStatus as any })
      }
    } catch (error: any) {
      toast.error('فشل تحديث الحالة')
    }
  }

  const filteredMessages = messages.filter(msg => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        msg.name.toLowerCase().includes(query) ||
        msg.phone.includes(query) ||
        msg.subject.toLowerCase().includes(query) ||
        msg.message.toLowerCase().includes(query)
      )
    }
    return true
  })

  const getStatusBadge = (status: string) => {
    const badges = {
      new: { text: 'جديدة', color: 'bg-red-100 text-red-800', icon: Clock },
      read: { text: 'مقروءة', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      replied: { text: 'تم الرد', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      archived: { text: 'مؤرشفة', color: 'bg-gray-100 text-gray-800', icon: Archive }
    }
    const badge = badges[status as keyof typeof badges] || badges.new
    const Icon = badge.icon
    return (
      <span className={`${badge.color} px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    )
  }

  const newMessagesCount = messages.filter(m => m.status === 'new').length

  if (loading) {
    return <div className="p-4 text-center">جاري التحميل...</div>
  }

  return (
    <div className="space-y-4">
      {/* العنوان والإحصائيات */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">التواصل المباشر</h2>
          {newMessagesCount > 0 && (
            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
              {newMessagesCount} رسالة جديدة
            </span>
          )}
        </div>

        {/* الفلاتر والبحث */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="بحث بالاسم، الهاتف، أو الموضوع..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'new', 'read', 'replied', 'archived'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as any)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'الكل' : 
                 status === 'new' ? 'جديدة' :
                 status === 'read' ? 'مقروءة' :
                 status === 'replied' ? 'تم الرد' : 'مؤرشفة'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* قائمة الرسائل */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {filteredMessages.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
              لا توجد رسائل
            </div>
          ) : (
            filteredMessages.map((message) => (
              <div
                key={message.id}
                onClick={() => {
                  setSelectedMessage(message)
                  if (message.status === 'new') {
                    handleStatusChange(message.id, 'read')
                  }
                }}
                className={`bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-lg transition ${
                  selectedMessage?.id === message.id ? 'ring-2 ring-blue-500' : ''
                } ${message.status === 'new' ? 'border-r-4 border-red-500' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{message.name}</h3>
                    <p className="text-sm text-gray-600">{message.subject}</p>
                  </div>
                  {getStatusBadge(message.status)}
                </div>
                <p className="text-sm text-gray-700 line-clamp-2 mb-2">{message.message}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {message.phone}
                  </span>
                  <span>{new Date(message.created_at).toLocaleDateString('ar-JO')}</span>
                </div>
                {message.assigned_to && (
                  <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" />
                    محول إلى: {supervisors.find(s => s.id === message.assigned_to)?.name || 'مشرف'}
                  </div>
                )}
                {message.assigned_whatsapp && !message.assigned_to && (
                  <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" />
                    محول إلى واتساب: {message.assigned_whatsapp}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* تفاصيل الرسالة */}
        {selectedMessage ? (
          <div className="bg-white p-6 rounded-lg shadow-lg max-h-[600px] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{selectedMessage.name}</h2>
                <p className="text-sm text-gray-600">{selectedMessage.subject}</p>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            {getStatusBadge(selectedMessage.status)}

            <div className="space-y-4 mb-6 mt-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">الهاتف:</label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-gray-800">{selectedMessage.phone}</span>
                  <a
                    href={`tel:${selectedMessage.phone}`}
                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                    title="اتصال"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <a
                    href={`https://wa.me/${selectedMessage.phone.replace(/[^\d]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                    title="واتساب"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {selectedMessage.email && (
                <div>
                  <label className="text-sm font-semibold text-gray-700">البريد الإلكتروني:</label>
                  <p className="text-gray-800">{selectedMessage.email}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-gray-700">الرسالة:</label>
                <p className="text-gray-800 whitespace-pre-wrap mt-1 bg-gray-50 p-3 rounded-lg">{selectedMessage.message}</p>
              </div>

              {selectedMessage.admin_response && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <label className="text-sm font-semibold text-gray-700">الرد المرسل:</label>
                  <p className="text-gray-800 whitespace-pre-wrap mt-1">{selectedMessage.admin_response}</p>
                  {selectedMessage.response_sent_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(selectedMessage.response_sent_at).toLocaleString('ar-JO')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* كتابة رد */}
            <div className="mb-4 border-t pt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">كتابة رد:</label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="اكتب ردك هنا..."
              />
              <button
                onClick={() => handleSendResponse(selectedMessage.id, selectedMessage.phone)}
                disabled={sendingResponse || !responseText.trim()}
                className="mt-2 w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
              >
                <Send className="w-4 h-4" />
                {sendingResponse ? 'جاري الإرسال...' : 'إرسال عبر واتساب'}
              </button>
            </div>

            {/* تحويل المعاملة */}
            <div className="mb-4 border-t pt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">تحويل المعاملة:</label>
              <div className="space-y-2">
                <button
                  onClick={() => handleAssign(selectedMessage.id, null, null)}
                  disabled={assigning}
                  className="w-full py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm transition disabled:opacity-50"
                >
                  إلغاء التحويل
                </button>
                {supervisors.map((supervisor) => (
                  <button
                    key={supervisor.id}
                    onClick={() => handleAssign(selectedMessage.id, supervisor.id, supervisor.whatsapp)}
                    disabled={assigning}
                    className="w-full py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 text-sm flex items-center justify-between transition disabled:opacity-50"
                  >
                    <span>{supervisor.name}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ))}
                <div className="pt-2 border-t">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="أدخل رقم واتساب مخصص"
                      value={customWhatsapp}
                      onChange={(e) => setCustomWhatsapp(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={() => {
                        if (customWhatsapp.trim()) {
                          handleAssign(selectedMessage.id, null, customWhatsapp.trim())
                          setCustomWhatsapp('')
                        }
                      }}
                      disabled={assigning || !customWhatsapp.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-50"
                    >
                      تحويل
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* تغيير الحالة */}
            <div className="border-t pt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">تغيير الحالة:</label>
              <div className="flex gap-2">
                {['read', 'replied', 'archived'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(selectedMessage.id, status)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                      selectedMessage.status === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'read' ? 'مقروءة' : status === 'replied' ? 'تم الرد' : 'أرشفة'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500 flex items-center justify-center min-h-[400px]">
            <div>
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>اختر رسالة لعرض التفاصيل</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

