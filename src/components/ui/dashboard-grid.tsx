import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface DashboardGridProps {
  children: ReactNode
  className?: string
}

export function DashboardGrid({ children, className }: DashboardGridProps) {
  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50",
      className
    )}>
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  )
}

interface DashboardSectionProps {
  children: ReactNode
  className?: string
  span?: 1 | 2 | 3 | 4
  delay?: number
}

export function DashboardSection({ children, className, span = 1, delay = 0 }: DashboardSectionProps) {
  const spanClasses = {
    1: "xl:col-span-1",
    2: "xl:col-span-2", 
    3: "xl:col-span-3",
    4: "xl:col-span-4"
  }

  return (
    <div 
      className={cn(
        "space-y-6 animate-slide-up hover-lift",
        spanClasses[span],
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-1 shadow-lg hover:shadow-xl transition-all duration-300">
        {children}
      </div>
    </div>
  )
}