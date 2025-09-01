import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon?: LucideIcon
  className?: string
  trend?: "up" | "down" | "stable"
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  changeType = "neutral", 
  icon: Icon,
  className,
  trend = "stable"
}: MetricCardProps) {
  const changeColors = {
    positive: "text-green-600 bg-green-50",
    negative: "text-red-600 bg-red-50", 
    neutral: "text-gray-600 bg-gray-50"
  }

  const trendIcons = {
    up: "↗",
    down: "↘", 
    stable: "→"
  }

  return (
    <Card className={cn(
      "bg-gradient-to-br from-white to-slate-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {change && (
                <span className={cn(
                  "text-xs font-medium px-2 py-1 rounded-full",
                  changeColors[changeType]
                )}>
                  {trendIcons[trend]} {change}
                </span>
              )}
            </div>
          </div>
          {Icon && (
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
              <Icon className="h-6 w-6 text-white" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}