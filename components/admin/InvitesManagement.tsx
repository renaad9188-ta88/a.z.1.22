'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Phone, MessageCircle, Upload, Search, CheckCircle2, UserPlus, RefreshCw, Plus, Pencil, Clock, Send, Zap, Users, X, Edit2, Eye, Trash2, Save, AlertTriangle, ArrowRight, FileText, Calendar, User, MoreVertical } from 'lucide-react'

type InviteRow = {
  id: string
  invite_token: string
  full_name: string | null
  phone: string
  whatsapp_phone: string | null
  country: string | null
  status: 'new' | 'queued' | 'sent' | 'joined' | 'failed' | 'opted_out'
  invited_at: string | null
  joined_at: string | null
  joined_user_id: string | null
  notes: string | null
  batch_id: string | null
  batch_scheduled_at: string | null
  batch_sent_at: string | null
  manually_confirmed_sent?: boolean | null
  confirmed_sent_by?: string | null
  confirmed_sent_at?: string | null
  confirmed_sent_role?: 'admin' | 'supervisor' | null
  created_at: string
  updated_at: string
}

type ImportItem = {
  full_name: string | null
  phone: string
  whatsapp_phone: string | null
  country: string | null
}

function normalizeDigits(raw: string) {
  let s = (raw || '').trim()
  s = s.replace(/\s+/g, '').replace(/[^\d+]/g, '')
  s = s.replace(/^\+?0+/, '')
  if (s.startsWith('00')) s = s.slice(2)
  // keep only digits
  s = s.replace(/[^\d]/g, '')
  return s
}

function waHrefFor(digits: string, text?: string) {
  if (!digits) return ''
  const base = `https://wa.me/${digits}`
  if (!text) return base
  return `${base}?text=${encodeURIComponent(text)}`
}

// قائمة منبثقة للأزرار على الهواتف
function ActionsDropdownMenu({
  onWhatsApp,
  onEdit,
  onDelete,
}: {
  onWhatsApp: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="px-3 py-2 rounded-lg bg-gray-600 text-white font-extrabold text-xs hover:bg-gray-700 transition inline-flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md"
        title="القائمة"
      >
        <MoreVertical className="w-4 h-4 flex-shrink-0" />
        <span>القائمة</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              onWhatsApp()
              setOpen(false)
            }}
            className="w-full px-4 py-2.5 text-right text-sm font-extrabold text-gray-900 hover:bg-green-50 border-b border-gray-100 inline-flex items-center justify-end gap-2"
          >
            <MessageCircle className="w-4 h-4 text-green-600" />
            <span>واتساب</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onEdit()
              setOpen(false)
            }}
            className="w-full px-4 py-2.5 text-right text-sm font-extrabold text-gray-900 hover:bg-blue-50 border-b border-gray-100 inline-flex items-center justify-end gap-2"
          >
            <Edit2 className="w-4 h-4 text-blue-600" />
            <span>تعديل</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onDelete()
              setOpen(false)
            }}
            className="w-full px-4 py-2.5 text-right text-sm font-extrabold text-gray-900 hover:bg-red-50 inline-flex items-center justify-end gap-2"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            <span>حذف</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default function InvitesManagement() {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<InviteRow[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | InviteRow['status']>('all')
  const [q, setQ] = useState('')
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [addForm, setAddForm] = useState<{ full_name: string; phone: string; country: string }>({
    full_name: '',
    phone: '',
    country: '',
  })
  const [savingOne, setSavingOne] = useState(false)
  const [creatingBatches, setCreatingBatches] = useState(false)
  const [sendingBatch, setSendingBatch] = useState<string | null>(null)
  const [showCreateBatch, setShowCreateBatch] = useState(false)
  const [newBatchName, setNewBatchName] = useState('')
  const [selectedInvites, setSelectedInvites] = useState<Set<string>>(new Set())
  const [batches, setBatches] = useState<any[]>([])
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null)
  const [batchInvites, setBatchInvites] = useState<InviteRow[]>([])
  const [loadingBatchInvites, setLoadingBatchInvites] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'supervisor' | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [editingInvite, setEditingInvite] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ full_name: string; phone: string; country: string }>({ full_name: '', phone: '', country: '' })
  const [movingInvite, setMovingInvite] = useState<string | null>(null)
  const [batchSentDetails, setBatchSentDetails] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return window.location.origin
  }, [])

  const [messageTpl, setMessageTpl] = useState<string>(
    'مرحباً {name} 👋\n\nنقدم لك خدمات الزيارات السورية للأردن - سياحة شهر (30 يوم)\n\n✨ خدماتنا:\n• تنظيم الزيارات العائلية\n• خدمات الفيزا والتأشيرات\n• النقل البري والجوي\n• متابعة مستمرة ودعم كامل\n\n🔗 سجل الآن: {link}\n\nللتواصل: 00962798905595\n\nإذا لا ترغب باستقبال الرسائل اكتب STOP'
  )

  const inviteMessage = (r: InviteRow) => {
    const link = `${baseUrl}/auth/register?invite=${encodeURIComponent(r.invite_token)}`
    const name = (r.full_name || '').trim() || 'أهلاً بك'
    return (messageTpl || '').replaceAll('{name}', name).replaceAll('{link}', link)
  }

  const load = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('invites')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000)

      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      if (q.trim()) {
        // basic search (client-side fallback in case ilike is limited)
        // We'll still pull 1000 and filter locally.
      }

      const { data, error } = await query
      if (error) throw error
      const list = (data || []) as any as InviteRow[]
      setRows(list)
    } catch (e: any) {
      console.error('InvitesManagement load error:', e)
      toast.error(e?.message || 'تعذر تحميل الدعوات')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return rows
    return rows.filter((r) => {
      return (
        String(r.phone || '').toLowerCase().includes(qq) ||
        String(r.whatsapp_phone || '').toLowerCase().includes(qq) ||
        String(r.full_name || '').toLowerCase().includes(qq) ||
        String(r.country || '').toLowerCase().includes(qq) ||
        String(r.status || '').toLowerCase().includes(qq)
      )
    })
  }, [rows, q])

  const parseImport = (text: string) => {
    // Accept CSV (comma) or pipe or tab; ignore empty lines.
    const lines = (text || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)

    const out: ImportItem[] = []
    for (const line of lines) {
      const parts = line.includes(',') ? line.split(',') : line.includes('|') ? line.split('|') : line.split('\t')
      const name = (parts[0] || '').trim() || null
      const phone = normalizeDigits(parts[1] || parts[0] || '')
      // حسب طلب الإدارة: إذا لم يُدخل واتساب نستخدم رقم الهاتف
      const wa = normalizeDigits(parts[2] || '') || phone
      const country = (parts[3] || '').trim() || null
      if (!phone || phone.length < 9) continue
      out.push({
        full_name: name,
        phone,
        whatsapp_phone: wa && wa.length >= 9 ? wa : null,
        country,
      })
    }
    return out
  }

  const addOne = async () => {
    const phone = normalizeDigits(addForm.phone)
    if (!phone || phone.length < 9) {
      toast.error('أدخل رقم هاتف صحيح')
      return
    }
    try {
      setSavingOne(true)
      const payload = {
        full_name: addForm.full_name.trim() || null,
        phone,
        whatsapp_phone: phone, // واتساب = الهاتف
        country: addForm.country.trim() || null,
        status: 'new',
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('invites').upsert(payload as any, { onConflict: 'phone' })
      if (error) throw error
      toast.success('تمت الإضافة')
      setAddForm({ full_name: '', phone: '', country: '' })
      await load()
    } catch (e: any) {
      console.error('addOne error:', e)
      toast.error(e?.message || 'تعذر إضافة الرقم')
    } finally {
      setSavingOne(false)
    }
  }

  const doImport = async () => {
    const items = parseImport(importText)
    if (items.length === 0) {
      toast.error('لا يوجد أرقام صالحة للاستيراد')
      return
    }
    try {
      setImporting(true)
      // upsert by phone (unique index)
      const batches: ImportItem[][] = []
      const chunk = 200
      for (let i = 0; i < items.length; i += chunk) {
        batches.push(items.slice(i, i + chunk))
      }
      for (const b of batches) {
        const { error } = await supabase.from('invites').upsert(
          b.map((x: ImportItem) => ({
            full_name: x.full_name,
            phone: x.phone,
            whatsapp_phone: x.whatsapp_phone || x.phone, // واتساب = الهاتف إذا لم يُدخل
            country: x.country,
            status: 'new',
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'phone' }
        )
        if (error) throw error
      }
      toast.success(`تم استيراد/تحديث ${items.length} رقم`)
      setImportText('')
      await load()
    } catch (e: any) {
      console.error('Invites import error:', e)
      toast.error(e?.message || 'تعذر الاستيراد')
    } finally {
      setImporting(false)
    }
  }


  // إنشاء مجموعة جديدة يدوياً
  const createNewBatch = async () => {
    if (!newBatchName.trim()) {
      toast.error('أدخل اسم المجموعة')
      return
    }

    try {
      setCreatingBatches(true)
      
      // الحصول على المستخدم الحالي
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('يجب تسجيل الدخول')
        return
      }

      // إنشاء المجموعة
      const { data: batch, error: batchError } = await supabase
        .from('invite_batches')
        .insert({
          name: newBatchName.trim(),
          total_count: 0,
          sent_count: 0,
          joined_count: 0,
          created_by: user.id,
        })
        .select()
        .single()
      
      if (batchError) throw batchError

      toast.success(`تم إنشاء المجموعة "${newBatchName}"`)
      setNewBatchName('')
      setShowCreateBatch(false)
      await loadBatches()
    } catch (e: any) {
      console.error('createNewBatch error:', e)
      toast.error(e?.message || 'تعذر إنشاء المجموعة')
    } finally {
      setCreatingBatches(false)
    }
  }

  // إضافة أرقام محددة لمجموعة
  const addInvitesToBatch = async (batchId: string) => {
    if (selectedInvites.size === 0) {
      toast.error('اختر أرقام لإضافتها للمجموعة')
      return
    }

    try {
      const inviteIds = Array.from(selectedInvites)
      
      // ربط الدعوات بالمجموعة
      const { error: updateError } = await supabase
        .from('invites')
        .update({
          batch_id: batchId,
          status: 'queued',
          updated_at: new Date().toISOString(),
        })
        .in('id', inviteIds)
      
      if (updateError) throw updateError

      // تحديث عدد المجموعة
      const { data: batch } = await supabase
        .from('invite_batches')
        .select('total_count')
        .eq('id', batchId)
        .single()
      
      await supabase
        .from('invite_batches')
        .update({
          total_count: (batch?.total_count || 0) + inviteIds.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', batchId)

      toast.success(`تم إضافة ${inviteIds.length} رقم للمجموعة`)
      setSelectedInvites(new Set())
      await load()
      await loadBatches()
    } catch (e: any) {
      console.error('addInvitesToBatch error:', e)
      toast.error(e?.message || 'تعذر إضافة الأرقام للمجموعة')
    }
  }

  // إرسال مجموعة معينة (جماعي)
  const sendBatch = useCallback(async (batchId: string) => {
    try {
      setSendingBatch(batchId)
      
      // جلب جميع الدعوات في المجموعة
      const { data: batchInvites, error: e1 } = await supabase
        .from('invites')
        .select('*')
        .eq('batch_id', batchId)
        .in('status', ['queued', 'new'])
      
      if (e1) throw e1
      
      if (!batchInvites || batchInvites.length === 0) {
        toast('لا توجد دعوات في هذه المجموعة')
        return
      }

      // فتح واتساب لكل دعوة مع تأخير 3 ثوان
      let sentCount = 0
      for (let i = 0; i < batchInvites.length; i++) {
        const invite = batchInvites[i] as InviteRow
        const digits = invite.whatsapp_phone || invite.phone
        const href = waHrefFor(digits, inviteMessage(invite))
        
        if (href) {
          // فتح واتساب
          window.open(href, '_blank', 'noopener,noreferrer')
          sentCount++
          
          // تحديث الحالة
          await supabase
        .from('invites')
            .update({
              status: 'sent',
              invited_at: new Date().toISOString(),
              batch_sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', invite.id)
          
          // تأخير 3 ثوان بين كل رسالة (لتجنب الحظر)
          if (i < batchInvites.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 3000))
          }
        }
      }

      // تحديث إحصائيات المجموعة مع حفظ نص الرسالة
      const firstInvite = batchInvites[0] as InviteRow
      const messageText = inviteMessage(firstInvite)
      
      await supabase
        .from('invite_batches')
        .update({
          sent_at: new Date().toISOString(),
          sent_count: sentCount,
          last_message_sent: messageText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', batchId)

      toast.success(`تم إرسال ${sentCount} دعوة من المجموعة`)
      await load()
      await loadBatches()
    } catch (e: any) {
      console.error('sendBatch error:', e)
      toast.error(e?.message || 'تعذر إرسال المجموعة')
    } finally {
      setSendingBatch(null)
    }
  }, [supabase, inviteMessage, load])

  // تحميل المجموعات
  const loadBatches = async () => {
    try {
      setLoadingBatches(true)
      const { data, error } = await supabase
        .from('invite_batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (error) throw error
      
      // حساب الإحصائيات لكل مجموعة
      const batchesWithStats = await Promise.all(
        (data || []).map(async (batch: any) => {
          const { data: invites } = await supabase
            .from('invites')
            .select('id, status, joined_user_id')
            .eq('batch_id', batch.id)
          
          const joined = (invites || []).filter((i: any) => i.joined_user_id).length
          const sent = (invites || []).filter((i: any) => i.status === 'sent').length
          
          return {
            ...batch,
            joined_count: joined,
            sent_count: sent,
            total_count: invites?.length || 0,
          }
        })
      )
      
      setBatches(batchesWithStats)
    } catch (e: any) {
      console.error('Error loading batches:', e)
      toast.error(e?.message || 'تعذر تحميل المجموعات')
    } finally {
      setLoadingBatches(false)
    }
  }

  useEffect(() => {
    loadBatches()
    // تحميل معلومات المستخدم الحالي
    const loadCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle()
          const role = (profile?.role || '').toLowerCase()
          if (role === 'admin' || role === 'supervisor') {
            setCurrentUserRole(role as 'admin' | 'supervisor')
          }
        }
      } catch (e) {
        console.error('Error loading current user:', e)
      }
    }
    loadCurrentUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // تحميل محتوى المجموعة عند اختيارها
  const loadBatchInvites = async (batchId: string) => {
    try {
      setLoadingBatchInvites(true)
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setBatchInvites((data || []) as InviteRow[])
    } catch (e: any) {
      console.error('Error loading batch invites:', e)
      toast.error(e?.message || 'تعذر تحميل محتوى المجموعة')
      setBatchInvites([])
    } finally {
      setLoadingBatchInvites(false)
    }
  }

  // تأكيد الإرسال يدوياً
  const confirmSent = async (inviteId: string, confirmed: boolean) => {
    if (!currentUserId || !currentUserRole) {
      toast.error('يجب تسجيل الدخول')
      return
    }

    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      }

      if (confirmed) {
        updateData.manually_confirmed_sent = true
        updateData.confirmed_sent_by = currentUserId
        updateData.confirmed_sent_at = new Date().toISOString()
        updateData.confirmed_sent_role = currentUserRole
      } else {
        updateData.manually_confirmed_sent = false
        updateData.confirmed_sent_by = null
        updateData.confirmed_sent_at = null
        updateData.confirmed_sent_role = null
      }

      const { error } = await supabase
        .from('invites')
        .update(updateData)
        .eq('id', inviteId)
      
      if (error) throw error

      setBatchInvites((prev) =>
        prev.map((r) =>
          r.id === inviteId
            ? {
                ...r,
                manually_confirmed_sent: confirmed,
                confirmed_sent_by: confirmed ? currentUserId : null,
                confirmed_sent_at: confirmed ? new Date().toISOString() : null,
                confirmed_sent_role: confirmed ? currentUserRole : null,
              }
            : r
        )
      )

      toast.success(confirmed ? 'تم تأكيد الإرسال' : 'تم إلغاء التأكيد')
    } catch (e: any) {
      console.error('Error confirming sent:', e)
      toast.error(e?.message || 'تعذر تحديث الحالة')
    }
  }

  // حذف مجموعة كاملة
  const deleteBatch = async (batchId: string) => {
    const batch = batches.find((b: any) => b.id === batchId)
    if (!batch) return

    const hasInvites = (batch.total_count || 0) > 0
    const confirmMessage = hasInvites
      ? `هل أنت متأكد من حذف المجموعة "${batch.name}"؟\n\nتحذير: سيتم إزالة ${batch.total_count} رقم من هذه المجموعة (لن يتم حذف الأرقام نفسها، فقط إزالة الربط).`
      : `هل أنت متأكد من حذف المجموعة "${batch.name}"؟`

    if (!confirm(confirmMessage)) return

    try {
      // إزالة الربط من جميع الدعوات في هذه المجموعة
      if (hasInvites) {
        await supabase
          .from('invites')
          .update({
            batch_id: null,
            batch_scheduled_at: null,
            batch_sent_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('batch_id', batchId)
      }

      // حذف المجموعة
      const { error } = await supabase
        .from('invite_batches')
        .delete()
        .eq('id', batchId)

      if (error) throw error

      toast.success(`تم حذف المجموعة "${batch.name}"`)
      await loadBatches()
      if (selectedBatch === batchId) {
        setSelectedBatch(null)
        setBatchInvites([])
      }
    } catch (e: any) {
      console.error('deleteBatch error:', e)
      toast.error(e?.message || 'تعذر حذف المجموعة')
    }
  }

  // نقل رقم إلى مجموعة أخرى
  const moveToBatch = async (inviteId: string, targetBatchId: string | null) => {
    try {
      // الحصول على الرقم الحالي لمعرفة المجموعة القديمة
      const { data: currentInvite } = await supabase
        .from('invites')
        .select('batch_id')
        .eq('id', inviteId)
        .single()

      const oldBatchId = currentInvite?.batch_id

      // تحديث الرقم
      const { error } = await supabase
        .from('invites')
        .update({
          batch_id: targetBatchId,
          batch_scheduled_at: targetBatchId ? new Date().toISOString() : null,
          batch_sent_at: null, // إعادة تعيين حالة الإرسال
          updated_at: new Date().toISOString(),
        })
        .eq('id', inviteId)
      
      if (error) throw error

      // تحديث عدد المجموعة القديمة
      if (oldBatchId) {
        const { data: oldBatch } = await supabase
          .from('invite_batches')
          .select('total_count')
          .eq('id', oldBatchId)
          .single()
        
        if (oldBatch) {
          await supabase
            .from('invite_batches')
            .update({
              total_count: Math.max(0, (oldBatch.total_count || 0) - 1),
              updated_at: new Date().toISOString(),
            })
            .eq('id', oldBatchId)
        }
      }

      // تحديث عدد المجموعة الجديدة
      if (targetBatchId) {
        const { data: newBatch } = await supabase
          .from('invite_batches')
          .select('total_count')
          .eq('id', targetBatchId)
          .single()
        
        if (newBatch) {
          await supabase
            .from('invite_batches')
            .update({
              total_count: (newBatch.total_count || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetBatchId)
        }
      }

      // تحديث القوائم
      await load()
      await loadBatches()
      if (selectedBatch) {
        await loadBatchInvites(selectedBatch)
      }
      
      setMovingInvite(null)
      toast.success(targetBatchId ? 'تم نقل الرقم للمجموعة الجديدة' : 'تم إزالة الرقم من المجموعة')
    } catch (e: any) {
      console.error('Error moving to batch:', e)
      toast.error(e?.message || 'تعذر نقل الرقم')
      setMovingInvite(null)
    }
  }

  // حذف رقم من المجموعة
  const removeFromBatch = async (inviteId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الرقم من المجموعة؟')) return

    try {
      const { error } = await supabase
        .from('invites')
        .update({
          batch_id: null,
          batch_scheduled_at: null,
          batch_sent_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', inviteId)
      
      if (error) throw error

      // تحديث عدد المجموعة
      if (selectedBatch) {
        const { data: batch } = await supabase
          .from('invite_batches')
          .select('total_count')
          .eq('id', selectedBatch)
          .single()
        
        await supabase
          .from('invite_batches')
          .update({
            total_count: Math.max(0, (batch?.total_count || 0) - 1),
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedBatch)
      }

      setBatchInvites((prev) => prev.filter((r) => r.id !== inviteId))
      await loadBatches()
      toast.success('تم حذف الرقم من المجموعة')
    } catch (e: any) {
      console.error('Error removing from batch:', e)
      toast.error(e?.message || 'تعذر حذف الرقم')
    }
  }

  // حفظ التعديلات على الرقم
  const saveEdit = async (inviteId: string) => {
    try {
      const phone = normalizeDigits(editForm.phone)
      if (!phone || phone.length < 9) {
        toast.error('أدخل رقم هاتف صحيح')
        return
      }

      const { error } = await supabase
        .from('invites')
        .update({
          full_name: editForm.full_name.trim() || null,
          phone,
          whatsapp_phone: phone,
          country: editForm.country.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', inviteId)
      
      if (error) throw error

      setBatchInvites((prev) =>
        prev.map((r) =>
          r.id === inviteId
            ? {
                ...r,
                full_name: editForm.full_name.trim() || null,
                phone,
                whatsapp_phone: phone,
                country: editForm.country.trim() || null,
              }
            : r
        )
      )

      setEditingInvite(null)
      setEditForm({ full_name: '', phone: '', country: '' })
      toast.success('تم حفظ التعديلات')
    } catch (e: any) {
      console.error('Error saving edit:', e)
      toast.error(e?.message || 'تعذر حفظ التعديلات')
    }
  }

  // بدء التعديل
  const startEdit = (invite: InviteRow) => {
    setEditingInvite(invite.id)
    setEditForm({
      full_name: invite.full_name || '',
      phone: invite.phone,
      country: invite.country || '',
    })
  }

  const handleBatchClick = async (batchId: string) => {
    setSelectedBatch(batchId)
    await loadBatchInvites(batchId)
  }

  // تأكيد إرسال المجموعة يدوياً
  const confirmBatchSent = async (batchId: string) => {
    if (!currentUserId || !currentUserRole) {
      toast.error('يجب تسجيل الدخول')
      return
    }

    try {
      // الحصول على نص الرسالة من أول دعوة في المجموعة
      const { data: firstInvite } = await supabase
        .from('invites')
        .select('*')
        .eq('batch_id', batchId)
        .limit(1)
        .maybeSingle()

      const messageText = firstInvite ? inviteMessage(firstInvite as InviteRow) : messageTpl

      const { error } = await supabase
        .from('invite_batches')
        .update({
          confirmed_sent_by: currentUserId,
          confirmed_sent_at: new Date().toISOString(),
          confirmed_sent_role: currentUserRole,
          last_message_sent: messageText,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', batchId)

      if (error) throw error

      await loadBatches()
      toast.success('تم تأكيد إرسال المجموعة')
    } catch (e: any) {
      console.error('Error confirming batch sent:', e)
      toast.error(e?.message || 'تعذر تأكيد الإرسال')
    }
  }

  // عرض تفاصيل إرسال المجموعة
  const showBatchSentDetails = (batchId: string) => {
    setBatchSentDetails(batchId)
  }

  const markSent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invites')
        .update({ status: 'sent', invited_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      setRows((p) => p.map((r) => (r.id === id ? { ...r, status: 'sent', invited_at: new Date().toISOString() } : r)))
      toast.success('تم تعليمها كمرسلة')
    } catch (e: any) {
      console.error('markSent error:', e)
      toast.error(e?.message || 'تعذر تحديث الحالة')
    }
  }

  const openWhatsApp = (r: InviteRow) => {
    const digits = r.whatsapp_phone || r.phone
    const href = waHrefFor(digits, inviteMessage(r))
    if (!href) {
      toast.error('رقم واتساب غير صالح')
      return
    }
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  const stats = useMemo(() => {
    const by = (s: InviteRow['status']) => rows.filter((x) => x.status === s).length
    return {
      total: rows.length,
      new: by('new'),
      queued: by('queued'),
      sent: by('sent'),
      joined: by('joined'),
      failed: by('failed'),
      opted_out: by('opted_out'),
    }
  }, [rows])

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              الدعوات (100 يومياً عبر واتساب)
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              استيراد أرقام → إنشاء مجموعات → إضافة الأرقام للمجموعات → مراسلة واتساب → تتبع joined تلقائياً بعد التسجيل
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setShowCreateBatch(true)}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-sm hover:from-purple-700 hover:to-indigo-700 transition inline-flex items-center justify-center gap-2 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              إنشاء مجموعة جديدة
            </button>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-100 text-gray-900 font-extrabold text-sm hover:bg-gray-200 transition disabled:opacity-50"
            >
              تحديث
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {(
            [
              ['الإجمالي', stats.total, 'bg-gray-50 border-gray-200'],
              ['جديد', stats.new, 'bg-blue-50 border-blue-200 text-blue-800'],
              ['قائمة اليوم', stats.queued, 'bg-purple-50 border-purple-200 text-purple-800'],
              ['مرسلة', stats.sent, 'bg-amber-50 border-amber-200 text-amber-900'],
              ['انضم', stats.joined, 'bg-green-50 border-green-200 text-green-800'],
              ['مرفوض', stats.opted_out, 'bg-red-50 border-red-200 text-red-800'],
            ] as any
          ).map(([label, val, cls]: any) => (
            <div key={label} className={`rounded-lg border p-2 ${cls}`}>
              <div className="text-[11px] font-extrabold">{label}</div>
              <div className="text-lg font-black tabular-nums">{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* إنشاء مجموعة جديدة */}
      {showCreateBatch && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm sm:text-base font-extrabold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              إنشاء مجموعة جديدة
            </h4>
            <button
              type="button"
              onClick={() => {
                setShowCreateBatch(false)
                setNewBatchName('')
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newBatchName}
              onChange={(e) => setNewBatchName(e.target.value)}
              placeholder="اسم المجموعة (مثل: مجموعة 1)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter') createNewBatch()
              }}
            />
            <button
              type="button"
              onClick={createNewBatch}
              disabled={creatingBatches || !newBatchName.trim()}
              className="px-3 sm:px-4 py-2 rounded-lg bg-purple-600 text-white font-extrabold text-sm hover:bg-purple-700 transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md"
              title="إنشاء مجموعة جديدة"
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              <span>{creatingBatches ? 'جاري الإنشاء...' : 'إنشاء'}</span>
            </button>
          </div>
        </div>
      )}

      {/* عرض المجموعات */}
      {batches.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-5">
          <h4 className="text-sm sm:text-base font-extrabold text-gray-900 flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-blue-600" />
            المجموعات ({batches.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {batches.map((batch: any) => (
              <div
                key={batch.id}
                className="border border-gray-200 rounded-lg p-3 hover:border-purple-300 hover:shadow-md transition cursor-pointer"
                onClick={() => handleBatchClick(batch.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-extrabold text-sm text-gray-900 truncate flex-1">{batch.name}</h5>
                  {batch.sent_at && (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  )}
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>الإجمالي:</span>
                    <span className="font-bold text-gray-900 tabular-nums">{batch.total_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>مرسلة:</span>
                    <span className="font-bold text-amber-600 tabular-nums">{batch.sent_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>انضم:</span>
                    <span className={`font-bold tabular-nums ${(batch.joined_count || 0) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {batch.joined_count || 0}
                      {(batch.joined_count || 0) > 0 && (
                        <span className="mr-1 text-[10px]">✓</span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleBatchClick(batch.id)
                      }}
                      className="flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-blue-600 text-white font-extrabold text-[10px] sm:text-xs hover:bg-blue-700 transition inline-flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm hover:shadow-md"
                      title="عرض محتوى المجموعة"
                    >
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">عرض</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        sendBatch(batch.id)
                      }}
                      disabled={sendingBatch === batch.id || batch.sent_at}
                      className="flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-purple-600 text-white font-extrabold text-[10px] sm:text-xs hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm hover:shadow-md"
                      title={batch.sent_at ? 'تم الإرسال' : 'إرسال المجموعة عبر واتساب'}
                    >
                      {sendingBatch === batch.id ? (
                        <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 animate-spin" />
                      ) : batch.sent_at ? (
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      ) : (
                        <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      )}
                      <span className="whitespace-nowrap">
                        {sendingBatch === batch.id ? 'جاري الإرسال...' : batch.sent_at ? 'تم الإرسال' : 'إرسال'}
                      </span>
                    </button>
                  </div>
                  {(batch.sent_at || batch.confirmed_sent_at) ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        showBatchSentDetails(batch.id)
                      }}
                      className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-green-600 text-white font-extrabold text-[10px] sm:text-xs hover:bg-green-700 transition inline-flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm hover:shadow-md"
                      title="عرض تفاصيل الإرسال"
                    >
                      <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">تفاصيل الإرسال</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        confirmBatchSent(batch.id)
                      }}
                      className="w-full px-2 sm:px-3 py-1.5 rounded-lg bg-amber-600 text-white font-extrabold text-[10px] sm:text-xs hover:bg-amber-700 transition inline-flex items-center justify-center gap-1"
                      title="تأكيد إرسال المجموعة يدوياً"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>تم الإرسال</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteBatch(batch.id)
                    }}
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-red-600 text-white font-extrabold text-[10px] sm:text-xs hover:bg-red-700 transition inline-flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm hover:shadow-md"
                    title="حذف المجموعة"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">حذف المجموعة</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-sm sm:text-base font-extrabold text-gray-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600" />
              إدخال/استيراد أرقام
            </h4>
            <p className="text-xs text-gray-600 mt-1">
              يمكنك إضافة رقم واحد بسرعة أو لصق/رفع CSV. افتراضياً: <span className="font-bold">واتساب = الهاتف</span>
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const txt = await f.text()
                setImportText(txt)
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-100 text-gray-900 font-extrabold text-sm hover:bg-gray-200 transition"
            >
              اختيار ملف
            </button>
            <button
              type="button"
              onClick={doImport}
              disabled={importing}
              className="w-full sm:w-auto px-3 sm:px-4 py-2 rounded-lg bg-green-600 text-white font-extrabold text-sm hover:bg-green-700 transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md"
              title="استيراد الأرقام من الملف"
            >
              <Upload className="w-4 h-4 flex-shrink-0" />
              <span>{importing ? 'جارٍ الاستيراد...' : 'استيراد'}</span>
            </button>
          </div>
        </div>

        {/* Add single */}
        <div className="mt-4 border border-gray-200 rounded-xl p-3 sm:p-4">
          <div className="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            إضافة رقم واحد
            <span className="text-[11px] font-bold text-gray-500">(واتساب = الهاتف)</span>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              value={addForm.full_name}
              onChange={(e) => setAddForm((p) => ({ ...p, full_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="الاسم (اختياري)"
            />
            <input
              value={addForm.phone}
              onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="رقم الهاتف *"
            />
            <div className="flex gap-2">
              <input
                value={addForm.country}
                onChange={(e) => setAddForm((p) => ({ ...p, country: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="الدولة (اختياري) SY/JO"
              />
              <button
                type="button"
                onClick={addOne}
                disabled={savingOne}
                className="px-3 sm:px-4 py-2 rounded-lg bg-blue-600 text-white font-extrabold text-sm hover:bg-blue-700 transition disabled:opacity-50 whitespace-nowrap inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md"
              >
                {savingOne ? '...' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>

        {/* Message template */}
        <div className="mt-4 border border-gray-200 rounded-xl p-3 sm:p-4">
          <div className="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center gap-2">
            <Pencil className="w-4 h-4 text-blue-600" />
            نص الرسالة (قابل للتعديل)
            <span className="text-[11px] font-bold text-gray-500">{'{name}'} + {'{link}'}</span>
          </div>
          <textarea
            value={messageTpl}
            onChange={(e) => setMessageTpl(e.target.value)}
            rows={4}
            className="mt-2 w-full border border-gray-200 rounded-lg p-3 text-sm"
          />
        </div>

        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={6}
          className="mt-3 w-full border border-gray-200 rounded-lg p-3 text-sm font-mono"
          placeholder="مثال:\nأحمد محمد,9639xxxxxxx,9639xxxxxxx,SY\nبدون اسم,9627xxxxxxx,,JO"
        />
      </div>

      {/* Modal لعرض محتوى المجموعة */}
      {selectedBatch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4" onClick={() => setSelectedBatch(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900 flex items-center gap-1.5 sm:gap-2 truncate flex-1 min-w-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                <span className="truncate">{batches.find((b: any) => b.id === selectedBatch)?.name || 'تفاصيل المجموعة'}</span>
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('هل أنت متأكد من حذف هذه المجموعة؟ سيتم إزالة جميع الأرقام من المجموعة.')) {
                      deleteBatch(selectedBatch)
                    }
                  }}
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-red-600 text-white text-xs sm:text-sm font-extrabold hover:bg-red-700 transition inline-flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm hover:shadow-md"
                  title="حذف المجموعة"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>حذف</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBatch(null)}
                  className="text-gray-400 hover:text-gray-600 transition flex-shrink-0"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
              {loadingBatchInvites ? (
                <div className="flex items-center justify-center py-8 sm:py-12">
                  <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 animate-spin" />
                  <span className="ml-2 text-sm sm:text-base text-gray-600">جاري التحميل...</span>
                </div>
              ) : batchInvites.length === 0 ? (
                <div className="text-center py-8 sm:py-12 text-sm sm:text-base text-gray-500">
                  لا توجد أرقام في هذه المجموعة
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
                      <div className="text-[10px] sm:text-xs font-extrabold text-blue-800 mb-1">الإجمالي</div>
                      <div className="text-base sm:text-lg md:text-xl font-black text-blue-900 tabular-nums">{batchInvites.length}</div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 sm:p-3">
                      <div className="text-[10px] sm:text-xs font-extrabold text-amber-800 mb-1">مرسلة</div>
                      <div className="text-base sm:text-lg md:text-xl font-black text-amber-900 tabular-nums">{batchInvites.filter((r) => r.status === 'sent').length}</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3">
                      <div className="text-[10px] sm:text-xs font-extrabold text-green-800 mb-1 flex items-center gap-1">
                        <span>انضم</span>
                        {batchInvites.filter((r) => r.joined_user_id).length > 0 && (
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                        )}
                      </div>
                      <div className="text-base sm:text-lg md:text-xl font-black text-green-900 tabular-nums">
                        {batchInvites.filter((r) => r.joined_user_id).length}
                      </div>
                    </div>
                  </div>
                  
                  {batchInvites.map((r) => (
                    <div key={r.id} className="border border-gray-200 rounded-lg p-2.5 sm:p-3 md:p-4 hover:border-purple-300 transition">
                      {editingInvite === r.id ? (
                        <div className="space-y-2 sm:space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              value={editForm.full_name}
                              onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
                              className="px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="الاسم"
                            />
                            <input
                              value={editForm.phone}
                              onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                              className="px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="رقم الهاتف"
                            />
                            <input
                              value={editForm.country}
                              onChange={(e) => setEditForm((p) => ({ ...p, country: e.target.value }))}
                              className="px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="الدولة"
                            />
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              type="button"
                              onClick={() => saveEdit(r.id)}
                              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-green-600 text-white text-xs sm:text-sm font-extrabold hover:bg-green-700 transition inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md"
                              title="حفظ التعديلات"
                            >
                              <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span>حفظ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingInvite(null)
                                setEditForm({ full_name: '', phone: '', country: '' })
                              }}
                              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-gray-200 text-gray-800 text-xs sm:text-sm font-extrabold hover:bg-gray-300 transition inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md"
                              title="إلغاء التعديل"
                            >
                              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span>إلغاء</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 sm:gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1.5 sm:mb-2">
                                <div className="font-extrabold text-sm sm:text-base text-gray-900 truncate">
                                  {r.full_name || 'بدون اسم'}{' '}
                                  <span className="text-[10px] sm:text-xs text-gray-500 font-bold">({r.country || '—'})</span>
                                </div>
                                <span
                                  className={[
                                    'text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full border font-extrabold whitespace-nowrap',
                                    r.status === 'joined'
                                      ? 'bg-green-50 text-green-800 border-green-200'
                                      : r.status === 'sent'
                                        ? 'bg-amber-50 text-amber-900 border-amber-200'
                                        : r.status === 'queued'
                                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                                          : 'bg-gray-50 text-gray-800 border-gray-200',
                                  ].join(' ')}
                                >
                                  {r.status}
                                </span>
                              {r.joined_user_id && (
                                <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full border bg-green-50 text-green-800 border-green-200 font-extrabold whitespace-nowrap flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  تم الانتساب
                                </span>
                              )}
                              </div>
                              <div className="text-[10px] sm:text-xs md:text-sm text-gray-700 flex flex-wrap gap-2 sm:gap-2.5 mb-2 sm:mb-3">
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg border border-gray-200">
                                  <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500 flex-shrink-0" />
                                  <span className="font-semibold text-gray-800 break-all">{r.phone}</span>
                                </span>
                                {r.whatsapp_phone && r.whatsapp_phone !== r.phone && (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-lg border border-green-200">
                                    <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600 flex-shrink-0" />
                                    <span className="font-semibold text-green-800 break-all">{r.whatsapp_phone}</span>
                                  </span>
                                )}
                                {r.invited_at && (
                                  <span className="inline-flex items-center px-2 py-1 bg-blue-50 rounded-lg border border-blue-200 text-gray-600 text-[10px] sm:text-xs">
                                    📤 {new Date(r.invited_at).toLocaleDateString('ar-JO', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                                {r.joined_at && (
                                  <span className="inline-flex items-center px-2 py-1 bg-green-50 rounded-lg border border-green-200 text-green-700 text-[10px] sm:text-xs font-semibold">
                                    ✅ {new Date(r.joined_at).toLocaleDateString('ar-JO', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 sm:gap-3 mt-1 sm:mt-2">
                                <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={(r as any).manually_confirmed_sent || false}
                                    onChange={(e) => confirmSent(r.id, e.target.checked)}
                                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 flex-shrink-0"
                                  />
                                  <span className="text-[10px] sm:text-xs font-bold text-gray-700">
                                    تم الإرسال {((r as any).manually_confirmed_sent && (r as any).confirmed_sent_role) && (
                                      <span className="text-green-600">
                                        ({((r as any).confirmed_sent_role === 'admin' ? 'أدمن' : 'مشرف')})
                                      </span>
                                    )}
                                  </span>
                                </label>
                              </div>
                            </div>
                            {/* الأزرار - على الشاشات الكبيرة: جميع الأزرار، على الهواتف: قائمة منبثقة */}
                            <div className="hidden sm:flex flex-wrap gap-1.5 sm:gap-2 flex-shrink-0 justify-end sm:justify-start">
                              <button
                                type="button"
                                onClick={() => openWhatsApp(r)}
                                className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-green-600 text-white text-[10px] sm:text-xs md:text-sm font-extrabold hover:bg-green-700 transition inline-flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm hover:shadow-md"
                                title="واتساب"
                              >
                                <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="whitespace-nowrap">واتساب</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => startEdit(r)}
                                className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-blue-600 text-white text-[10px] sm:text-xs md:text-sm font-extrabold hover:bg-blue-700 transition inline-flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm hover:shadow-md"
                                title="تعديل"
                              >
                                <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="whitespace-nowrap">تعديل</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => removeFromBatch(r.id)}
                                className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-red-600 text-white text-[10px] sm:text-xs md:text-sm font-extrabold hover:bg-red-700 transition inline-flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm hover:shadow-md"
                                title="حذف من المجموعة"
                              >
                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="whitespace-nowrap">حذف</span>
                              </button>
                            </div>
                            
                            {/* قائمة منبثقة للهواتف */}
                            <div className="sm:hidden relative">
                              <ActionsDropdownMenu
                                onWhatsApp={() => openWhatsApp(r)}
                                onEdit={() => startEdit(r)}
                                onDelete={() => removeFromBatch(r.id)}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* إضافة رقم جديد للمجموعة */}
                  <div className="border-2 border-dashed border-purple-300 rounded-xl p-3 sm:p-4 md:p-5 bg-gradient-to-br from-purple-50 to-blue-50">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 bg-purple-600 rounded-lg flex items-center justify-center">
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div>
                        <h5 className="text-sm sm:text-base md:text-lg font-extrabold text-gray-900">
                          إضافة رقم جديد للمجموعة
                        </h5>
                        <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                          أدخل بيانات الرقم لإضافته مباشرة
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                        <input
                          value={addForm.full_name}
                          onChange={(e) => setAddForm((p) => ({ ...p, full_name: e.target.value }))}
                          className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                          placeholder="👤 الاسم (اختياري)"
                        />
                        <input
                          value={addForm.phone}
                          onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))}
                          className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                          placeholder="📱 رقم الهاتف *"
                          required
                        />
                        <input
                          value={addForm.country}
                          onChange={(e) => setAddForm((p) => ({ ...p, country: e.target.value }))}
                          className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                          placeholder="🌍 الدولة"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const phone = normalizeDigits(addForm.phone)
                          if (!phone || phone.length < 9) {
                            toast.error('أدخل رقم هاتف صحيح')
                            return
                          }
                          try {
                            setSavingOne(true)
                            // إضافة أو تحديث الرقم
                            const { data: existing } = await supabase
                              .from('invites')
                              .select('id')
                              .eq('phone', phone)
                              .maybeSingle()
                            
                            if (existing) {
                              // تحديث الرقم الموجود وإضافته للمجموعة
                              await supabase
                                .from('invites')
                                .update({
                                  batch_id: selectedBatch,
                                  full_name: addForm.full_name.trim() || null,
                                  country: addForm.country.trim() || null,
                                  status: 'queued',
                                  updated_at: new Date().toISOString(),
                                })
                                .eq('id', existing.id)
                            } else {
                              // إضافة رقم جديد
                              await supabase
                                .from('invites')
                                .insert({
                                  phone,
                                  whatsapp_phone: phone,
                                  full_name: addForm.full_name.trim() || null,
                                  country: addForm.country.trim() || null,
                                  batch_id: selectedBatch,
                                  status: 'queued',
                                  updated_at: new Date().toISOString(),
                                })
                            }
                            
                            // تحديث عدد المجموعة
                            const { data: batch } = await supabase
                              .from('invite_batches')
                              .select('total_count')
                              .eq('id', selectedBatch)
                              .single()
                            
                            await supabase
                              .from('invite_batches')
                              .update({
                                total_count: (batch?.total_count || 0) + 1,
                                updated_at: new Date().toISOString(),
                              })
                              .eq('id', selectedBatch)
                            
                            toast.success('تم إضافة الرقم للمجموعة')
                            setAddForm({ full_name: '', phone: '', country: '' })
                            await loadBatchInvites(selectedBatch)
                            await loadBatches()
                          } catch (e: any) {
                            console.error('Error adding to batch:', e)
                            toast.error(e?.message || 'تعذر إضافة الرقم')
                          } finally {
                            setSavingOne(false)
                          }
                        }}
                        disabled={savingOne}
                        className="w-full sm:w-auto sm:min-w-[140px] px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-extrabold text-sm sm:text-base hover:from-purple-700 hover:to-purple-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        {savingOne ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>جاري الإضافة...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>إضافة للمجموعة</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* نص الرسالة المرسلة للمجموعة */}
                  {(() => {
                    const currentBatch = batches.find((b: any) => b.id === selectedBatch)
                    return currentBatch?.last_message_sent ? (
                      <div className="border-2 border-dashed border-green-300 rounded-xl p-3 sm:p-4 md:p-5 bg-gradient-to-br from-green-50 to-emerald-50">
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                          <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 bg-green-600 rounded-lg flex items-center justify-center">
                            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm sm:text-base md:text-lg font-extrabold text-gray-900">
                              نص الرسالة المرسلة لهذه المجموعة
                            </h5>
                            <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                              آخر رسالة تم إرسالها لهذه المجموعة
                            </p>
                          </div>
                        </div>
                        <div className="bg-white border border-green-200 rounded-lg p-3 sm:p-4 mb-3">
                          <pre className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap font-medium leading-relaxed max-h-[200px] sm:max-h-[250px] overflow-y-auto">
                            {currentBatch.last_message_sent}
                          </pre>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(currentBatch.last_message_sent)
                              toast.success('تم نسخ نص الرسالة')
                            }}
                            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-green-600 text-white font-extrabold text-sm hover:bg-green-700 transition inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md"
                            title="نسخ نص الرسالة"
                          >
                            <FileText className="w-4 h-4 flex-shrink-0" />
                            <span>نسخ نص الرسالة</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMessageTpl(currentBatch.last_message_sent)
                              toast.success('تم تحميل نص الرسالة للتعديل')
                            }}
                            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-blue-600 text-white font-extrabold text-sm hover:bg-blue-700 transition inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md"
                            title="تحميل هذا النص للتعديل"
                          >
                            <Edit2 className="w-4 h-4 flex-shrink-0" />
                            <span>تحميل للتعديل</span>
                          </button>
                        </div>
                      </div>
                    ) : null
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* إضافة أرقام لمجموعة */}
      {selectedInvites.size > 0 && batches.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-lg border-2 border-purple-300 p-3 sm:p-4 md:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm sm:text-base md:text-lg font-extrabold text-gray-900">
                  إضافة {selectedInvites.size} رقم لمجموعة
                </h4>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                  اختر المجموعة لإضافة الأرقام المحددة
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedInvites(new Set())}
              className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-white border border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition"
              title="إلغاء التحديد"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  addInvitesToBatch(e.target.value)
                }
              }}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-purple-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-semibold"
              defaultValue=""
            >
              <option value="">📋 اختر المجموعة...</option>
              {batches.map((batch: any) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name} ({batch.total_count || 0} رقم)
                </option>
              ))}
            </select>
          </div>
          {selectedInvites.size <= 5 && (
            <div className="mt-3 pt-3 border-t border-purple-200">
              <p className="text-xs sm:text-sm text-gray-600 mb-2 font-semibold">الأرقام المحددة:</p>
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedInvites).slice(0, 5).map((id) => {
                  const invite = rows.find((r) => r.id === id)
                  return invite ? (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs sm:text-sm font-semibold text-gray-700"
                    >
                      <UserPlus className="w-3 h-3 text-purple-600" />
                      {invite.full_name || 'بدون اسم'} ({invite.phone.slice(-4)})
                    </span>
                  ) : null
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="بحث بالاسم/الهاتف/الحالة..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full sm:w-56 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">كل الحالات</option>
              <option value="new">جديد</option>
              <option value="queued">قائمة اليوم</option>
              <option value="sent">مرسلة</option>
              <option value="joined">انضم</option>
              <option value="failed">فشل</option>
              <option value="opted_out">مرفوض</option>
            </select>
          </div>
          <div className="text-xs text-gray-600">
            {loading ? 'جاري التحميل...' : `النتائج: ${filtered.length}`}
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {filtered.slice(0, 300).map((r) => (
            <div key={r.id} className={`border-2 rounded-xl p-3 sm:p-4 transition-all ${selectedInvites.has(r.id) ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-blue-50 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}>
              <div className="flex flex-col lg:flex-row justify-between gap-3">
                <div className="min-w-0 flex-1 flex items-start gap-2 sm:gap-3">
                  <label className="flex items-center cursor-pointer mt-0.5 sm:mt-1 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedInvites.has(r.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedInvites)
                        if (e.target.checked) {
                          newSet.add(r.id)
                        } else {
                          newSet.delete(r.id)
                        }
                        setSelectedInvites(newSet)
                      }}
                      className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-purple-600 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 cursor-pointer transition"
                    />
                    <span className="sr-only">تحديد {r.full_name || r.phone}</span>
                  </label>
                  <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-extrabold text-sm sm:text-base text-gray-900 truncate">
                      {r.full_name || 'بدون اسم'}{' '}
                      <span className="text-xs sm:text-sm text-gray-500 font-bold">({r.country || '—'})</span>
                    </div>
                    <span
                      className={[
                        'text-[11px] px-2 py-0.5 rounded-full border font-extrabold',
                        r.status === 'joined'
                          ? 'bg-green-50 text-green-800 border-green-200'
                          : r.status === 'sent'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : r.status === 'queued'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : r.status === 'opted_out'
                                ? 'bg-red-50 text-red-800 border-red-200'
                                : 'bg-gray-50 text-gray-800 border-gray-200',
                      ].join(' ')}
                    >
                      {r.status}
                    </span>
                    {r.joined_user_id && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-green-50 text-green-800 border-green-200 font-extrabold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        تم الانتساب للموقع
                      </span>
                    )}
                  </div>
                  <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-700 flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1.5 sm:gap-y-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg border border-gray-200">
                      <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                      <span className="font-semibold text-gray-800 break-all">{r.phone}</span>
                    </span>
                    {r.whatsapp_phone && r.whatsapp_phone !== r.phone && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-lg border border-green-200">
                        <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                        <span className="font-semibold text-green-800 break-all">{r.whatsapp_phone}</span>
                      </span>
                    )}
                    {r.invited_at && (
                      <span className="inline-flex items-center px-2 py-1 bg-blue-50 rounded-lg border border-blue-200 text-gray-600 text-[10px] sm:text-xs">
                        📤 آخر إرسال: {new Date(r.invited_at).toLocaleDateString('ar-JO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {r.joined_at && (
                      <span className="inline-flex items-center px-2 py-1 bg-green-50 rounded-lg border border-green-200 text-green-700 text-[10px] sm:text-xs font-semibold">
                        ✅ انضم: {new Date(r.joined_at).toLocaleDateString('ar-JO', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {r.batch_id && (
                      <span className="inline-flex items-center px-2 py-1 bg-purple-50 rounded-lg border border-purple-200 text-purple-700 text-[10px] sm:text-xs font-bold">
                        📋 {batches.find((b: any) => b.id === r.batch_id)?.name || r.batch_id}
                      </span>
                    )}
                  </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => openWhatsApp(r)}
                    className="flex-1 sm:flex-none px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg bg-green-600 text-white text-[10px] sm:text-xs md:text-sm font-extrabold hover:bg-green-700 transition inline-flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2 shadow-sm hover:shadow-md"
                    title="فتح واتساب برسالة دعوة جاهزة"
                  >
                    <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4 md:h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">واتساب</span>
                  </button>
                  {batches.length > 0 && (
                    <div className="relative flex-1 sm:flex-none min-w-[120px]">
                      {movingInvite === r.id ? (
                        <div className="flex gap-1.5 sm:gap-2">
                          <select
                            onChange={(e) => {
                              const targetBatchId = e.target.value || null
                              if (targetBatchId === 'CANCEL') {
                                setMovingInvite(null)
                              } else {
                                moveToBatch(r.id, targetBatchId)
                              }
                            }}
                            className="flex-1 px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm border-2 border-purple-400 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-semibold shadow-sm"
                            autoFocus
                          >
                            <option value="CANCEL">❌ إلغاء</option>
                            <option value="">🗑️ إزالة من المجموعة</option>
                            {batches.map((batch: any) => (
                              <option key={batch.id} value={batch.id} disabled={batch.id === r.batch_id}>
                                {batch.id === r.batch_id ? `✓ ${batch.name} (الحالية)` : `→ ${batch.name} (${batch.total_count || 0} رقم)`}
                              </option>
                            ))}
                          </select>
                  <button
                    type="button"
                            onClick={() => setMovingInvite(null)}
                            className="px-2 sm:px-2.5 py-2 sm:py-2.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition text-xs sm:text-sm font-extrabold flex-shrink-0"
                            title="إلغاء"
                  >
                            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setMovingInvite(r.id)}
                          className="w-full sm:w-auto px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg bg-purple-600 text-white text-[10px] sm:text-xs md:text-sm font-extrabold hover:bg-purple-700 transition inline-flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2 shadow-sm hover:shadow-md"
                          title="نقل إلى مجموعة أخرى"
                        >
                          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4 md:h-4 flex-shrink-0" />
                          <span className="whitespace-nowrap">نقل</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && !loading && (
            <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4">
              لا يوجد بيانات لعرضها.
            </div>
          )}

          {filtered.length > 300 && (
            <div className="text-xs text-gray-500">
              تم عرض أول 300 نتيجة فقط (لتحسين الأداء). استخدم البحث/التصفية.
            </div>
          )}
        </div>
      </div>

      {/* Modal تفاصيل إرسال المجموعة */}
      {batchSentDetails && (() => {
        const batch = batches.find((b: any) => b.id === batchSentDetails)
        if (!batch) return null
        
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setBatchSentDetails(null)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  تفاصيل إرسال المجموعة: {batch.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setBatchSentDetails(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* معلومات الإرسال */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="text-xs sm:text-sm font-extrabold text-blue-800">تاريخ الإرسال</span>
                    </div>
                    <div className="text-sm sm:text-base font-bold text-blue-900">
                      {batch.sent_at || batch.confirmed_sent_at
                        ? new Date(batch.sent_at || batch.confirmed_sent_at).toLocaleString('ar-JO', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'غير محدد'}
                    </div>
                  </div>
                  
                  {batch.confirmed_sent_by && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-green-600" />
                        <span className="text-xs sm:text-sm font-extrabold text-green-800">أكد الإرسال</span>
                      </div>
                      <div className="text-sm sm:text-base font-bold text-green-900">
                        {batch.confirmed_sent_role === 'admin' ? 'أدمن' : 'مشرف'}
                        {batch.confirmed_sent_at && (
                          <span className="block text-xs text-green-700 mt-1">
                            {new Date(batch.confirmed_sent_at).toLocaleString('ar-JO', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Send className="w-4 h-4 text-purple-600" />
                      <span className="text-xs sm:text-sm font-extrabold text-purple-800">عدد المرسلة</span>
                    </div>
                    <div className="text-sm sm:text-base font-bold text-purple-900 tabular-nums">
                      {batch.sent_count || 0} من {batch.total_count || 0}
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-600" />
                      <span className="text-xs sm:text-sm font-extrabold text-amber-800">انضم</span>
                    </div>
                    <div className="text-sm sm:text-base font-bold text-amber-900 tabular-nums">
                      {batch.joined_count || 0} شخص
                    </div>
                  </div>
                </div>

                {/* نص الرسالة */}
                {batch.last_message_sent && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageCircle className="w-5 h-5 text-gray-600" />
                      <h4 className="text-sm sm:text-base font-extrabold text-gray-900">نص الرسالة المرسلة</h4>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                      <pre className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap font-medium leading-relaxed">
                        {batch.last_message_sent}
                      </pre>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(batch.last_message_sent)
                        toast.success('تم نسخ نص الرسالة')
                      }}
                      className="mt-3 w-full px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-extrabold text-sm hover:bg-gray-300 transition inline-flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      نسخ نص الرسالة
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

