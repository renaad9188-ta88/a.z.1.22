export function extractAllAdminResponses(notes: string): Array<{ body: string; dateText?: string }> {
  const marker = '=== رد الإدارة ==='
  if (!notes.includes(marker)) return []
  const parts = notes.split(marker).slice(1)
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
  return res.reverse()
}

export function extractUserBookingChanges(notes: string): Array<{ tripInfo?: string; stopInfo?: string; dateText?: string }> {
  const marker = '=== تعديل الحجز ==='
  if (!notes.includes(marker)) return []
  const parts = notes.split(marker).slice(1)
  const res: Array<{ tripInfo?: string; stopInfo?: string; dateText?: string }> = []
  for (const p of parts) {
    const chunk = (p || '').trim()
    if (!chunk) continue
    const mod: any = {}
    const lines = chunk.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('نقطة النزول:') || trimmed.startsWith('نقطة التحميل:')) {
        mod.stopInfo = trimmed.split(':')[1]?.trim()
      } else if (trimmed.startsWith('تاريخ التعديل:')) {
        mod.dateText = trimmed.replace('تاريخ التعديل:', '').trim()
      } else if (trimmed && !trimmed.startsWith('تم تعديل الحجز') && !trimmed.startsWith('من قبل') && !trimmed.startsWith('الرحلة السابقة:') && !trimmed.startsWith('الرحلة الجديدة:')) {
        if (!mod.tripInfo) mod.tripInfo = trimmed
      }
    }
    if (mod.tripInfo || mod.stopInfo) res.push(mod)
  }
  return res.reverse()
}

export function extractAdminBookings(notes: string): Array<{ tripInfo?: string; stopInfo?: string; dateText?: string; tripType?: string }> {
  const marker = '=== حجز من الإدارة ==='
  if (!notes.includes(marker)) return []
  const parts = notes.split(marker).slice(1)
  const res: Array<{ tripInfo?: string; stopInfo?: string; dateText?: string; tripType?: string }> = []
  for (const p of parts) {
    const chunk = (p || '').trim()
    if (!chunk) continue
    const out: any = {}
    const lines = chunk.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('تم حجز رحلة')) {
        const match = trimmed.match(/تم حجز رحلة (قدوم|مغادرة)/)
        if (match) out.tripType = match[1]
      } else if (trimmed.startsWith('نقطة النزول:') || trimmed.startsWith('نقطة التحميل:')) {
        out.stopInfo = trimmed.split(':')[1]?.trim()
      } else if (trimmed.startsWith('تاريخ الحجز:')) {
        out.dateText = trimmed.replace('تاريخ الحجز:', '').trim()
      } else if (trimmed && !trimmed.startsWith('بواسطة الإدارة')) {
        if (!out.tripInfo) out.tripInfo = trimmed
      }
    }
    if (out.tripInfo || out.stopInfo) res.push(out)
  }
  return res.reverse()
}

export function extractAdminCreated(notes: string): { adminId?: string; dateText?: string } | null {
  const marker = '=== إنشاء من الإدارة ==='
  const idx = notes.lastIndexOf(marker)
  if (idx === -1) return null
  const after = notes.slice(idx + marker.length).trim()
  if (!after) return null
  const adminIdLine = after.split('\n').map((x) => x.trim()).find((l) => l.startsWith('معرّف الإدمن:'))
  const dateLine = after.split('\n').map((x) => x.trim()).find((l) => l.startsWith('تاريخ الإنشاء:'))
  const adminId = adminIdLine ? adminIdLine.replace('معرّف الإدمن:', '').trim() : undefined
  const dateText = dateLine ? dateLine.replace('تاريخ الإنشاء:', '').trim() : undefined
  return { adminId, dateText }
}


