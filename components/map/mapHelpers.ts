type LatLng = { lat: number; lng: number }

export const BORDER_CENTER: LatLng = { lat: 32.5456, lng: 35.825 } // معبر جابر تقريباً

export function normalizeStops(raw: any): Array<{ name: string; lat: number; lng: number; order_index: number }> {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .filter((s) => s && Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lng)))
      .map((s, idx) => ({
        name: String(s.name || `نقطة توقف ${idx + 1}`),
        lat: Number(s.lat),
        lng: Number(s.lng),
        order_index: Number.isFinite(Number(s.order_index)) ? Number(s.order_index) : idx,
      }))
  }
  return []
}

export function ensureDemoStops(
  stopsIn: Array<{ name: string; lat: number; lng: number; order_index: number }>,
  start: LatLng,
  end: LatLng
): Array<{ name: string; lat: number; lng: number; order_index: number }> {
  const target = 4
  const base = (stopsIn || [])
    .filter((s) => Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lng)))
    .map((s, idx) => ({
      name: s.name || `نقطة توقف ${idx + 1}`,
      lat: Number(s.lat),
      lng: Number(s.lng),
      order_index: Number.isFinite(Number(s.order_index)) ? Number(s.order_index) : idx,
    }))
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

  if (base.length >= target) return base.slice(0, target)

  const out = [...base]
  for (let i = out.length; i < target; i++) {
    const t = (i + 1) / (target + 1)
    const lat = start.lat + (end.lat - start.lat) * t
    const lng = start.lng + (end.lng - start.lng) * t
    const zig = (i % 2 === 0 ? 1 : -1) * 0.08
    out.push({
      name: `نقطة توقف ${i + 1}`,
      lat: lat + zig * 0.02,
      lng: lng + zig * 0.03,
      order_index: i,
    })
  }
  return out
}

