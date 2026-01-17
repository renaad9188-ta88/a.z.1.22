'use client'

import { MessageSquare, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'

interface AdminResponseProps {
  adminNotes: string | null
}

export default function AdminResponse({ adminNotes }: AdminResponseProps) {
  if (!adminNotes) return null

  // استخراج الرد من admin_notes
  const responseIndex = adminNotes.indexOf('=== رد الإدارة ===')
  if (responseIndex === -1) return null

  const responseSection = adminNotes.substring(responseIndex)
  const lines = responseSection.split('\n')
  
  // استخراج الرد (كل شيء بعد العنوان)
  const responseLines: string[] = []
  let foundResponse = false
  let responseDate = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.includes('=== رد الإدارة ===')) {
      foundResponse = true
      continue
    }
    if (foundResponse) {
      if (line.includes('تاريخ الرد:')) {
        responseDate = line.replace('تاريخ الرد:', '').trim()
        continue
      }
      if (line) {
        responseLines.push(line)
      }
    }
  }

  const responseText = responseLines.join('\n').trim()

  if (!responseText) return null

  return (
    <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-blue-200 shadow-md">
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="bg-blue-600 p-2 sm:p-2.5 rounded-lg">
          <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-800">رد الإدارة</h3>
          {responseDate && (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 mt-1">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{responseDate}</span>
            </div>
          )}
        </div>
      </div>
      <div className="bg-white rounded-lg p-4 sm:p-5 border border-blue-100">
        <p className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap leading-relaxed">
          {responseText}
        </p>
      </div>
    </div>
  )
}




