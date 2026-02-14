// Utility functions for AdminRequestFollow

export const POST_APPROVAL_SUBMITTED_MARK = 'حالة الاستكمال: مرسل'

export function extractLatestAdminResponse(notes: string): { body: string; dateText?: string } | null {
  const marker = '=== رد الإدارة ==='
  const idx = notes.lastIndexOf(marker)
  if (idx === -1) return null
  const after = notes.slice(idx + marker.length).trim()
  if (!after) return null
  const dateIdx = after.lastIndexOf('تاريخ الرد:')
  if (dateIdx !== -1) {
    const body = after.slice(0, dateIdx).trim()
    const dateText = after.slice(dateIdx).replace('تاريخ الرد:', '').trim()
    return body ? { body, dateText } : null
  }
  return { body: after }
}

export function extractAllAdminResponses(notes: string): Array<{ body: string; dateText?: string }> {
  const marker = '=== رد الإدارة ==='
  if (!notes.includes(marker)) return []
  const parts = notes.split(marker).slice(1) // content after each marker
  const res: Array<{ body: string; dateText?: string }> = []
  for (const p of parts) {
    const chunk = (p || '').trim()
    if (!chunk) continue
    const dateIdx = chunk.lastIndexOf('تاريخ الرد:')
    if (dateIdx !== -1) {
      const body = chunk.slice(0, dateIdx).trim()
      const dateText = chunk.slice(dateIdx).replace('تاريخ الرد:', '').trim()
      if (body) res.push({ body, dateText })
      continue
    }
    res.push({ body: chunk })
  }
  // newest first (because we append to notes)
  return res.reverse()
}

export function extractTripModifications(notes: string): Array<{ oldTripId?: string; newTripId?: string; tripInfo?: string; stopInfo?: string; dateText?: string }> {
  const marker = '=== تعديل الحجز ==='
  if (!notes.includes(marker)) return []
  const parts = notes.split(marker).slice(1) // content after each marker
  const res: Array<{ oldTripId?: string; newTripId?: string; tripInfo?: string; stopInfo?: string; dateText?: string }> = []
  for (const p of parts) {
    const chunk = (p || '').trim()
    if (!chunk) continue
    const mod: any = {}
    const lines = chunk.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('الرحلة السابقة:')) {
        mod.oldTripId = trimmed.replace('الرحلة السابقة:', '').trim()
      } else if (trimmed.startsWith('الرحلة الجديدة:')) {
        mod.newTripId = trimmed.replace('الرحلة الجديدة:', '').trim()
      } else if (trimmed.startsWith('نقطة النزول:') || trimmed.startsWith('نقطة التحميل:')) {
        mod.stopInfo = trimmed.split(':')[1]?.trim()
      } else if (trimmed.startsWith('تاريخ التعديل:')) {
        mod.dateText = trimmed.replace('تاريخ التعديل:', '').trim()
      } else if (trimmed && !trimmed.startsWith('تم تعديل الحجز') && !trimmed.startsWith('من قبل')) {
        // معلومات الرحلة (المسار والتاريخ)
        if (!mod.tripInfo) {
          mod.tripInfo = trimmed
        }
      }
    }
    if (mod.newTripId || mod.tripInfo) {
      res.push(mod)
    }
  }
  // newest first
  return res.reverse()
}

