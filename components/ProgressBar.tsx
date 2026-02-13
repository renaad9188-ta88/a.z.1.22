'use client'

import { CheckCircle, Circle } from 'lucide-react'

interface ProgressBarProps {
  request: {
    status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'completed'
    trip_status?: 'pending_arrival' | 'scheduled_pending_approval' | 'arrived' | 'completed' | null
    payment_verified?: boolean | null
    arrival_date?: string | null
    departure_date?: string | null
    admin_notes?: string | null
  }
  showLabels?: boolean
  compact?: boolean
}

export default function ProgressBar({ request, showLabels = true, compact = false }: ProgressBarProps) {
  const notes = (request.admin_notes || '') as string
  const isDraft = notes.startsWith('[DRAFT]')
  const isApproved = request.status === 'approved' || request.status === 'completed'
  const hasBooking = Boolean(request.arrival_date) || Boolean(request.departure_date) || Boolean(request.trip_status)
  const isArrived = request.trip_status === 'arrived'
  const isCompleted = request.status === 'completed' || request.trip_status === 'completed'
  const isRejected = request.status === 'rejected'
  const isUnderReview = request.status === 'under_review'

  const stages = [
    {
      id: 1,
      label: 'تقديم الطلب',
    },
    {
      id: 2,
      label: 'انتظار الموافقة',
    },
    {
      id: 3,
      label: 'الحجز والتتبع',
    },
  ]

  // تحديد المراحل المكتملة
  const getCompletedStages = () => {
    const completed: number[] = [1] // تقديم الطلب دائماً مكتمل
    
    if (isApproved || isRejected) completed.push(2) // الموافقة
    if (hasBooking || isArrived || isCompleted) completed.push(3) // الحجز والتتبع
    
    return completed
  }

  const completedStages = getCompletedStages()
  const currentStage = (() => {
    if (isCompleted || isArrived || hasBooking) return 3
    if (isApproved || isRejected) return 2
    if (isUnderReview) return 2
    return 1
  })()

  return (
    <div className={`w-full ${compact ? 'space-y-1' : 'space-y-4 md:space-y-5'}`}>
      {/* المراحل مع الأرقام والكتابة */}
      {showLabels && !compact && (
        <div className="relative">
          {/* خط التوصيل للشاشات الكبيرة */}
          <div className="hidden lg:block absolute top-6 left-0 right-0 h-0.5 bg-gray-200 -z-10" />
          <div 
            className="hidden lg:block absolute top-6 left-0 h-0.5 bg-blue-500 -z-10 transition-all duration-500"
            style={{ width: `${Math.max(0, (currentStage - 1) / 2) * 100}%` }}
          />
          
          <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            {stages.map((stage, index) => {
              const isCompleted = completedStages.includes(stage.id)
              const isCurrent = stage.id === currentStage && !isCompleted
              
              return (
                <div
                  key={stage.id}
                  className={`flex flex-col items-center gap-1.5 md:gap-2 lg:gap-3 relative ${
                    isCompleted ? 'opacity-100' : isCurrent ? 'opacity-80' : 'opacity-40'
                  }`}
                >
                  {/* الرقم مع الأيقونة */}
                  <div className={`relative flex items-center justify-center z-10`}>
                    <div className={`
                      w-8 h-8 sm:w-9 sm:h-9 md:w-11 md:h-11 lg:w-14 lg:h-14 xl:w-16 xl:h-16
                      rounded-full flex items-center justify-center 
                      text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-bold
                      transition-all duration-300
                      ${isCompleted 
                        ? 'bg-green-500 text-white shadow-lg shadow-green-200 md:shadow-xl md:shadow-green-300' 
                        : isCurrent 
                          ? 'bg-blue-500 text-white ring-2 md:ring-3 lg:ring-4 ring-blue-300 shadow-lg shadow-blue-200 md:shadow-xl md:shadow-blue-300' 
                          : 'bg-gray-300 text-gray-600 shadow-md'
                      }
                    `}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-9 lg:h-9 xl:w-10 xl:h-10" />
                      ) : (
                        <span>{stage.id}</span>
                      )}
                    </div>
                  </div>
                  {/* اسم المرحلة تحت الرقم */}
                  <span
                    className={`
                      text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg 
                      text-center leading-tight px-1 mt-0.5 md:mt-1 lg:mt-1.5
                      max-w-[80px] sm:max-w-[100px] md:max-w-[120px] lg:max-w-none
                      ${isCompleted ? 'text-gray-800 font-semibold' : isCurrent ? 'text-blue-700 font-bold' : 'text-gray-500'}
                    `}
                  >
                    {stage.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* حالة مختصرة للوضع المدمج */}
      {compact && (
        <div className="text-xs text-gray-600 text-center font-medium">
          {isCompleted || isArrived || hasBooking
            ? '✓ محجوز'
            : isApproved
            ? '✓ موافق عليه'
            : isRejected
            ? '✗ مرفوض'
            : isUnderReview
            ? 'قيد المراجعة'
            : 'قيد المعالجة'}
        </div>
      )}
    </div>
  )
}

