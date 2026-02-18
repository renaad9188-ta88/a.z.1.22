import type { ImportItem } from './InvitesManagementTypes'

export function normalizeDigits(raw: string): string {
  let s = (raw || '').trim()
  s = s.replace(/\s+/g, '').replace(/[^\d+]/g, '')
  s = s.replace(/^\+?0+/, '')
  if (s.startsWith('00')) s = s.slice(2)
  // keep only digits
  s = s.replace(/[^\d]/g, '')
  return s
}

export function waHrefFor(digits: string, text?: string): string {
  if (!digits) return ''
  const base = `https://wa.me/${digits}`
  if (!text) return base
  return `${base}?text=${encodeURIComponent(text)}`
}

export function parseImport(text: string): ImportItem[] {
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

