'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Phone, MessageCircle, Upload, Search, CheckCircle2, UserPlus, RefreshCw, Plus, Pencil } from 'lucide-react'

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

export default function InvitesManagement() {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<InviteRow[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | InviteRow['status']>('all')
  const [q, setQ] = useState('')
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [sending, setSending] = useState(false)
  const [addForm, setAddForm] = useState<{ full_name: string; phone: string; country: string }>({
    full_name: '',
    phone: '',
    country: '',
  })
  const [savingOne, setSavingOne] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return window.location.origin
  }, [])

  const [messageTpl, setMessageTpl] = useState<string>(
    '{name}\nندعوك للتسجيل في منصة خدمات السوريين.\nرابط التسجيل: {link}\n\nإذا لا ترغب باستقبال الرسائل اكتب STOP.'
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

  const queueNext100 = async () => {
    try {
      setSending(true)
      // Fetch next 100 new invites
      const { data: next, error: e1 } = await supabase
        .from('invites')
        .select('id')
        .eq('status', 'new')
        .order('created_at', { ascending: true })
        .limit(100)
      if (e1) throw e1
      const ids = (next || []).map((x: any) => x.id)
      if (ids.length === 0) {
        toast('لا يوجد أرقام جديدة')
        return
      }
      const { error: e2 } = await supabase
        .from('invites')
        .update({ status: 'queued', updated_at: new Date().toISOString() })
        .in('id', ids)
      if (e2) throw e2
      toast.success(`تم تجهيز ${ids.length} رقم لليوم (queued)`)
      await load()
    } catch (e: any) {
      console.error('queueNext100 error:', e)
      toast.error(e?.message || 'تعذر تجهيز قائمة اليوم')
    } finally {
      setSending(false)
    }
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
              استيراد أرقام → تجهيز 100 رقم يومياً → مراسلة واتساب → تتبع joined تلقائياً بعد التسجيل
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={queueNext100}
              disabled={sending}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 text-white font-extrabold text-sm hover:bg-blue-700 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              تجهيز 100 رقم اليوم
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
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-green-600 text-white font-extrabold text-sm hover:bg-green-700 transition disabled:opacity-50"
            >
              {importing ? 'جارٍ الاستيراد...' : 'استيراد'}
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
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-extrabold text-sm hover:bg-blue-700 transition disabled:opacity-50 whitespace-nowrap"
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
            <div key={r.id} className="border border-gray-200 rounded-xl p-3 sm:p-4">
              <div className="flex flex-col lg:flex-row justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-extrabold text-gray-900 truncate">
                      {r.full_name || 'بدون اسم'}{' '}
                      <span className="text-xs text-gray-500 font-bold">({r.country || '—'})</span>
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
                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-blue-50 text-blue-800 border-blue-200 font-extrabold">
                        مربوط بحساب
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs sm:text-sm text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-4 h-4 text-gray-500" />
                      {r.phone}
                    </span>
                    {r.whatsapp_phone && (
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="w-4 h-4 text-gray-500" />
                        {r.whatsapp_phone}
                      </span>
                    )}
                    {r.invited_at && <span className="text-gray-500">آخر إرسال: {new Date(r.invited_at).toLocaleString('ar-JO')}</span>}
                    {r.joined_at && <span className="text-gray-500">انضم: {new Date(r.joined_at).toLocaleString('ar-JO')}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openWhatsApp(r)}
                    className="px-3 py-2 rounded-lg bg-green-600 text-white text-xs sm:text-sm font-extrabold hover:bg-green-700 transition inline-flex items-center justify-center gap-2"
                    title="فتح واتساب برسالة دعوة جاهزة"
                  >
                    <MessageCircle className="w-4 h-4" />
                    واتساب
                  </button>
                  <button
                    type="button"
                    onClick={() => markSent(r.id)}
                    className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs sm:text-sm font-extrabold hover:bg-blue-700 transition inline-flex items-center justify-center gap-2"
                    title="تعليم كمرسلة (بعد الإرسال)"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    تم الإرسال
                  </button>
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
    </div>
  )
}


