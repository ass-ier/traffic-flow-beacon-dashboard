import { cn } from "@/lib/utils"

interface StatusIndicatorProps {
  status: "online" | "offline" | "warning" | "loading"
  label?: string
  className?: string
}

export function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  const statusConfig = {
    online: {
      color: "bg-green-500",
      animation: "animate-pulse",
      label: label || "Online"
    },
    offline: {
      color: "bg-red-500", 
      animation: "",
      label: label || "Offline"
    },
    warning: {
      color: "bg-yellow-500",
      animation: "animate-pulse",
      label: label || "Warning"
    },
    loading: {
      color: "bg-blue-500",
      animation: "animate-spin",
      label: label || "Loading"
    }
  }

  const config = statusConfig[status]

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className={cn("w-2 h-2 rounded-full", config.color, config.animation)}></div>
      {label && (
        <span className="text-xs text-gray-600 font-medium">{config.label}</span>
      )}
    </div>
  )
}