export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if ((window as any).google?.maps) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-maps="1"]') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Google Maps failed to load')))
      return
    }

    const script = document.createElement('script')
    script.dataset.googleMaps = '1'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&language=ar`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Maps failed to load'))
    document.head.appendChild(script)
  })
}

export function toYmd(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function dateRangeDays(startYmd: string, endYmd: string): string[] {
  if (!startYmd || !endYmd) return []
  const start = new Date(startYmd + 'T00:00:00')
  const end = new Date(endYmd + 'T00:00:00')
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return []
  if (end < start) return []
  const out: string[] = []
  const cur = new Date(start)
  while (cur <= end) {
    out.push(toYmd(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

