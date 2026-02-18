'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { UserPlus, Plus, RefreshCw } from 'lucide-react'
import type { InviteRow, ImportItem } from './invites/InvitesManagementTypes'
import { normalizeDigits, waHrefFor, parseImport } from './invites/InvitesManagementUtils'
import InvitesImportSection from './invites/InvitesImportSection'
import InvitesBatchSection from './invites/InvitesBatchSection'
import InvitesBatchDetailsModal from './invites/InvitesBatchDetailsModal'
import InvitesBatchSentDetailsModal from './invites/InvitesBatchSentDetailsModal'
import InvitesListSection from './invites/InvitesListSection'
import InvitesAddToBatchSection from './invites/InvitesAddToBatchSection'

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
        whatsapp_phone: phone,
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
            whatsapp_phone: x.whatsapp_phone || x.phone,
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

  const createNewBatch = async () => {
    if (!newBatchName.trim()) {
      toast.error('أدخل اسم المجموعة')
      return
    }

    try {
      setCreatingBatches(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('يجب تسجيل الدخول')
        return
      }

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

  const addInvitesToBatch = async (batchId: string) => {
    if (selectedInvites.size === 0) {
      toast.error('اختر أرقام لإضافتها للمجموعة')
      return
    }

    try {
      const inviteIds = Array.from(selectedInvites)
      const { error: updateError } = await supabase
        .from('invites')
        .update({
          batch_id: batchId,
          status: 'queued',
          updated_at: new Date().toISOString(),
        })
        .in('id', inviteIds)
      
      if (updateError) throw updateError

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

  const sendBatch = useCallback(async (batchId: string) => {
    try {
      setSendingBatch(batchId)
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

      let sentCount = 0
      for (let i = 0; i < batchInvites.length; i++) {
        const invite = batchInvites[i] as InviteRow
        const digits = invite.whatsapp_phone || invite.phone
        const href = waHrefFor(digits, inviteMessage(invite))
        
        if (href) {
          window.open(href, '_blank', 'noopener,noreferrer')
          sentCount++
          await supabase
            .from('invites')
            .update({
              status: 'sent',
              invited_at: new Date().toISOString(),
              batch_sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', invite.id)
          
          if (i < batchInvites.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 3000))
          }
        }
      }

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

  const loadBatches = async () => {
    try {
      setLoadingBatches(true)
      const { data, error } = await supabase
        .from('invite_batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (error) throw error
      
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

  const deleteBatch = async (batchId: string) => {
    const batch = batches.find((b: any) => b.id === batchId)
    if (!batch) return

    const hasInvites = (batch.total_count || 0) > 0
    const confirmMessage = hasInvites
      ? `هل أنت متأكد من حذف المجموعة "${batch.name}"؟\n\nتحذير: سيتم إزالة ${batch.total_count} رقم من هذه المجموعة (لن يتم حذف الأرقام نفسها، فقط إزالة الربط).`
      : `هل أنت متأكد من حذف المجموعة "${batch.name}"؟`

    if (!confirm(confirmMessage)) return

    try {
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

  const moveToBatch = async (inviteId: string, targetBatchId: string | null) => {
    try {
      const { data: currentInvite } = await supabase
        .from('invites')
        .select('batch_id')
        .eq('id', inviteId)
        .single()

      const oldBatchId = currentInvite?.batch_id

      const { error } = await supabase
        .from('invites')
        .update({
          batch_id: targetBatchId,
          batch_scheduled_at: targetBatchId ? new Date().toISOString() : null,
          batch_sent_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', inviteId)
      
      if (error) throw error

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

  const confirmBatchSent = async (batchId: string) => {
    if (!currentUserId || !currentUserRole) {
      toast.error('يجب تسجيل الدخول')
      return
    }

    try {
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

  const showBatchSentDetails = (batchId: string) => {
    setBatchSentDetails(batchId)
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

  const addToBatch = async () => {
    if (!selectedBatch) return
    const phone = normalizeDigits(addForm.phone)
    if (!phone || phone.length < 9) {
      toast.error('أدخل رقم هاتف صحيح')
      return
    }
    try {
      setSavingOne(true)
      const { data: existing } = await supabase
        .from('invites')
        .select('id')
        .eq('phone', phone)
        .maybeSingle()
      
      if (existing) {
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

  const selectedBatchData = batches.find((b: any) => b.id === selectedBatch)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
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

        {/* Stats */}
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

      {/* Batch Section */}
      <InvitesBatchSection
        batches={batches}
        loadingBatches={loadingBatches}
        showCreateBatch={showCreateBatch}
        setShowCreateBatch={setShowCreateBatch}
        newBatchName={newBatchName}
        setNewBatchName={setNewBatchName}
        creatingBatches={creatingBatches}
        onCreateBatch={createNewBatch}
        onBatchClick={handleBatchClick}
        sendingBatch={sendingBatch}
        onSendBatch={sendBatch}
        onConfirmBatchSent={confirmBatchSent}
        onShowBatchSentDetails={showBatchSentDetails}
        onDeleteBatch={deleteBatch}
      />

      {/* Import Section */}
      <InvitesImportSection
        importText={importText}
        setImportText={setImportText}
        importing={importing}
        onImport={doImport}
        addForm={addForm}
        setAddForm={setAddForm}
        savingOne={savingOne}
        onAddOne={addOne}
        messageTpl={messageTpl}
        setMessageTpl={setMessageTpl}
      />

      {/* Add to Batch Section */}
      <InvitesAddToBatchSection
        selectedInvites={selectedInvites}
        setSelectedInvites={setSelectedInvites}
        rows={rows}
        batches={batches}
        onAddToBatch={addInvitesToBatch}
      />

      {/* List Section */}
      <InvitesListSection
        filtered={filtered}
        loading={loading}
        q={q}
        setQ={setQ}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        selectedInvites={selectedInvites}
        setSelectedInvites={setSelectedInvites}
        batches={batches}
        movingInvite={movingInvite}
        setMovingInvite={setMovingInvite}
        onMoveToBatch={moveToBatch}
        onOpenWhatsApp={openWhatsApp}
      />

      {/* Batch Details Modal */}
      <InvitesBatchDetailsModal
        batchId={selectedBatch}
        batchName={selectedBatchData?.name || 'تفاصيل المجموعة'}
        batchInvites={batchInvites}
        loadingBatchInvites={loadingBatchInvites}
        onClose={() => {
          setSelectedBatch(null)
          setBatchInvites([])
        }}
        onDeleteBatch={deleteBatch}
        onLoadBatchInvites={loadBatchInvites}
        editingInvite={editingInvite}
        setEditingInvite={setEditingInvite}
        editForm={editForm}
        setEditForm={setEditForm}
        onSaveEdit={saveEdit}
        onConfirmSent={confirmSent}
        onRemoveFromBatch={removeFromBatch}
        onOpenWhatsApp={openWhatsApp}
        addForm={addForm}
        setAddForm={setAddForm}
        savingOne={savingOne}
        onAddToBatch={addToBatch}
        supabase={supabase}
        messageTpl={messageTpl}
        setMessageTpl={setMessageTpl}
        batches={batches}
      />

      {/* Batch Sent Details Modal */}
      {batchSentDetails && (
        <InvitesBatchSentDetailsModal
          batch={batches.find((b: any) => b.id === batchSentDetails) || null}
          onClose={() => setBatchSentDetails(null)}
        />
      )}
    </div>
  )
}
