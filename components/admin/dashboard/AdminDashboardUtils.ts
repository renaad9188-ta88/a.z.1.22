import type { VisitRequest } from '../types'

export const typeOrder = ['visit', 'goethe', 'embassy', 'visa', 'umrah', 'tourism']

export function typeLabel(t: string): string {
  const map: Record<string, string> = {
    visit: 'الزيارات',
    umrah: 'العمرة',
    tourism: 'السياحة',
    goethe: 'امتحان جوته',
    embassy: 'موعد سفارة',
    visa: 'الفيز والتأشيرات والرحلات',
  }
  return map[t] || t
}

export function getFilterTitle(statusFilter: string): string {
  const filterLabels: Record<string, string> = {
    all: 'جميع الطلبات',
    new: 'طلبات جديدة (24 ساعة)',
    received: 'الطلبات المستلمة',
    in_progress: 'الطلبات قيد الإجراء',
    approved: 'الطلبات الموافق عليها',
    rejected: 'الطلبات المرفوضة',
    bookings: 'حجوزات الطلبات',
    drafts: 'المسودات',
    under_review: 'قيد المراجعة',
  }
  return filterLabels[statusFilter] || 'الطلبات'
}

export function groupedByType(list: VisitRequest[]): Record<string, VisitRequest[]> {
  const groups: Record<string, VisitRequest[]> = {}
  for (const r of list) {
    const t = (r.visit_type || 'visit') as string
    if (!groups[t]) groups[t] = []
    groups[t].push(r)
  }
  return groups
}

