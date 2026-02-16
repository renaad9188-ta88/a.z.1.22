'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Download, MessageCircle, Phone, Search, Users, FileText } from 'lucide-react'
import CreateVisitRequestForUserModal from './CreateVisitRequestForUserModal'

type ProfileRow = {
  user_id: string
  full_name: string | null
  phone: string | null
  jordan_phone: string | null
  whatsapp_phone: string | null
  role?: string | null
  created_at?: string | null
  updated_at?: string | null
}

function normalizeDigits(raw: string) {
  let s = (raw || '').trim()
  s = s.replace(/\s+/g, '').replace(/[^\d+]/g, '')
  s = s.replace(/^\+?0+/, '')
  if (s.startsWith('00')) s = s.slice(2)
  s = s.replace(/[^\d]/g, '')
  return s
}

function waHrefFor(digits: string, text?: string) {
  if (!digits) return ''
  const base = `https://wa.me/${digits}`
  if (!text) return base
  return `${base}?text=${encodeURIComponent(text)}`
}

export default function CustomersManagement() {
  const supabase = createSupabaseBrowserClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<ProfileRow[]>([])
  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'driver' | 'user'>('all')
  const downloadRef = useRef<HTMLAnchorElement | null>(null)
  const [createFor, setCreateFor] = useState<ProfileRow | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, jordan_phone, whatsapp_phone, role, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(5000)
      if (error) throw error
      const list = ((data || []) as any as ProfileRow[]).filter((x) => Boolean(x.user_id))

      // de-dup by user_id (keep latest updated_at)
      const map = new Map<string, ProfileRow>()
      for (const r of list) {
        const prev = map.get(r.user_id)
        if (!prev) map.set(r.user_id, r)
        else {
          const pa = prev.updated_at ? new Date(prev.updated_at).getTime() : 0
          const ra = r.updated_at ? new Date(r.updated_at).getTime() : 0
          if (ra >= pa) map.set(r.user_id, r)
        }
      }
      setRows(Array.from(map.values()))
    } catch (e: any) {
      console.error('CustomersManagement load error:', e)
      toast.error(e?.message || 'تعذر تحميل المنتسبين')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return rows.filter((r) => {
      const role = String((r.role || 'user') as string).toLowerCase()
      if (roleFilter !== 'all' && role !== roleFilter) return false
      if (!qq) return true
      return (
        String(r.full_name || '').toLowerCase().includes(qq) ||
        String(r.phone || '').toLowerCase().includes(qq) ||
        String(r.jordan_phone || '').toLowerCase().includes(qq) ||
        String(r.whatsapp_phone || '').toLowerCase().includes(qq) ||
        String(r.user_id || '').toLowerCase().includes(qq) ||
        role.includes(qq)
      )
    })
  }, [rows, q, roleFilter])

  const stats = useMemo(() => {
    const by = (x: string) => rows.filter((r) => String(r.role || 'user').toLowerCase() === x).length
    return {
      total: rows.length,
      admins: by('admin'),
      drivers: by('driver'),
      users: by('user'),
    }
  }, [rows])

  const exportCsv = () => {
    const header = ['full_name', 'phone', 'jordan_phone', 'whatsapp_phone', 'role', 'created_at', 'user_id']
    const lines = [header.join(',')]
    for (const r of filtered) {
      const row = [
        (r.full_name || '').replace(/"/g, '""'),
        r.phone || '',
        r.jordan_phone || '',
        r.whatsapp_phone || '',
        (r.role || 'user') as string,
        r.created_at || '',
        r.user_id,
      ].map((v) => `"${String(v)}"`)
      lines.push(row.join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = downloadRef.current
    if (!a) return
    a.href = url
    a.download = `customers_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const messageTemplate = (name?: string | null) =>
    `${(name || 'أهلاً بك').trim()}\nيسرّنا تواصلك معنا عبر سوريا بلس (Syria Plus) خدمات.\nرابط المنصة: ${typeof window !== 'undefined' ? window.location.origin : ''}`

  return (
    <div className="space-y-4 sm:space-y-6">
      <a ref={downloadRef} className="hidden" />

      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              العملاء / المنتسبين
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              عرض جميع الحسابات المسجّلة (الاسم + الأرقام + الدور) مع تواصل واتساب/اتصال وتصدير CSV
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-100 text-gray-900 font-extrabold text-sm hover:bg-gray-200 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              تصدير CSV
            </button>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 text-white font-extrabold text-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              تحديث
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              ['الإجمالي', stats.total, 'bg-gray-50 border-gray-200'],
              ['مستخدمين', stats.users, 'bg-blue-50 border-blue-200 text-blue-800'],
              ['سائقين', stats.drivers, 'bg-purple-50 border-purple-200 text-purple-800'],
              ['إدمن', stats.admins, 'bg-green-50 border-green-200 text-green-800'],
            ] as any
          ).map(([label, val, cls]: any) => (
            <div key={label} className={`rounded-lg border p-2 ${cls}`}>
              <div className="text-[11px] font-extrabold">{label}</div>
              <div className="text-lg font-black tabular-nums">{val}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="بحث بالاسم/الهاتف/الدور..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="w-full sm:w-56 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">كل الأدوار</option>
              <option value="user">مستخدم</option>
              <option value="driver">سائق</option>
              <option value="admin">إدمن</option>
            </select>
          </div>
          <div className="text-xs text-gray-600">{loading ? 'جاري التحميل...' : `النتائج: ${filtered.length}`}</div>
        </div>

        <div className="mt-4 grid gap-3">
          {filtered.slice(0, 500).map((r) => {
            const role = String(r.role || 'user').toLowerCase()
            const phone = normalizeDigits(r.phone || '')
            const jo = normalizeDigits(r.jordan_phone || '')
            const wa = normalizeDigits(r.whatsapp_phone || '') || phone || jo
            const waHref = wa ? waHrefFor(wa, messageTemplate(r.full_name)) : ''
            const telHref = phone ? `tel:${phone}` : jo ? `tel:${jo}` : ''

            return (
              <div key={r.user_id} className="border border-gray-200 rounded-xl p-3 sm:p-4">
                <div className="flex flex-col lg:flex-row justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-extrabold text-gray-900 truncate">{r.full_name || 'بدون اسم'}</div>
                      <span
                        className={[
                          'text-[11px] px-2 py-0.5 rounded-full border font-extrabold',
                          role === 'admin'
                            ? 'bg-green-50 text-green-800 border-green-200'
                            : role === 'driver'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200',
                        ].join(' ')}
                      >
                        {role}
                      </span>
                    </div>
                    <div className="mt-2 text-xs sm:text-sm text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-4 h-4 text-gray-500" />
                        سوري: {r.phone || '—'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-4 h-4 text-gray-500" />
                        أردني: {r.jordan_phone || '—'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="w-4 h-4 text-gray-500" />
                        واتساب: {r.whatsapp_phone || '—'}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500 break-all">
                      User ID: {r.user_id}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                    {waHref && (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-lg bg-green-600 text-white text-xs sm:text-sm font-extrabold hover:bg-green-700 transition inline-flex items-center justify-center gap-2"
                        title="فتح واتساب"
                      >
                        <MessageCircle className="w-4 h-4" />
                        واتساب
                      </a>
                    )}
                    {telHref && (
                      <a
                        href={telHref}
                        className="px-3 py-2 rounded-lg bg-amber-50 text-amber-900 text-xs sm:text-sm font-extrabold hover:bg-amber-100 transition inline-flex items-center justify-center gap-2 border border-amber-200"
                        title="اتصال"
                      >
                        <Phone className="w-4 h-4" />
                        اتصال
                      </a>
                    )}
                    {role === 'user' && (
                      <button
                        type="button"
                        onClick={() => setCreateFor(r)}
                        className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs sm:text-sm font-extrabold hover:bg-blue-700 transition inline-flex items-center justify-center gap-2"
                        title="إنشاء طلب زيارة لهذا المستخدم"
                      >
                        <FileText className="w-4 h-4" />
                        إنشاء طلب زيارة
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && !loading && (
            <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4">
              لا يوجد بيانات لعرضها. تأكد من صلاحيات RLS للأدمن على جدول profiles.
            </div>
          )}

          {filtered.length > 500 && (
            <div className="text-xs text-gray-500">
              تم عرض أول 500 نتيجة فقط (لتحسين الأداء). استخدم البحث/التصفية أو صدّر CSV.
            </div>
          )}
        </div>
      </div>

      {createFor && (
        <CreateVisitRequestForUserModal
          userId={createFor.user_id}
          initialFullName={createFor.full_name}
          onClose={() => setCreateFor(null)}
          onCreated={(requestId) => {
            setCreateFor(null)
            router.push(`/admin/request/${requestId}/follow`)
          }}
        />
      )}
    </div>
  )
}


