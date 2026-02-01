'use client'

import { CheckCircle, Clock } from 'lucide-react'

interface Step {
  id: number
  title: string
  done: boolean
  help: string
}

interface AdminRequestFollowStepperProps {
  steps: Step[]
  activeStep: number
  onStepClick: (stepId: number) => void
}

export default function AdminRequestFollowStepper({
  steps,
  activeStep,
  onStepClick,
}: AdminRequestFollowStepperProps) {
  return (
    <div className="flex items-start gap-3 overflow-x-auto pb-2 -mx-1 px-1 sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0">
      {steps.map((s, idx) => {
        const isActive = s.id === activeStep
        const isDone = s.done
        const isClickable = s.id <= activeStep
        return (
          <div key={s.id} className="flex-1 min-w-[92px] sm:min-w-0 flex-shrink-0 sm:flex-shrink">
            <button
              type="button"
              onClick={() => isClickable && onStepClick(s.id)}
              className={`w-full flex flex-col items-center gap-1 ${
                isClickable ? 'cursor-pointer' : 'cursor-default'
              }`}
              disabled={!isClickable}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 ${
                  isDone
                    ? 'bg-green-600 border-green-600 text-white'
                    : isActive
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-500'
                }`}
              >
                {isDone ? <CheckCircle className="w-5 h-5" /> : <span className="font-bold">{s.id}</span>}
              </div>
              <div
                className={`text-[11px] sm:text-xs font-bold text-center leading-snug ${
                  isActive ? 'text-blue-700' : 'text-gray-700'
                }`}
              >
                {s.title}
              </div>
            </button>
            {idx < steps.length - 1 && (
              <div className="hidden sm:block h-0.5 bg-gray-200 -mt-5 mx-6"></div>
            )}
          </div>
        )
      })}
    </div>
  )
}



