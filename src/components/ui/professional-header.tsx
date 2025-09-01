import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Activity, Settings, User, Bell, Maximize2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProfessionalHeaderProps {
  simulationState: string
  className?: string
}

export function ProfessionalHeader({ simulationState, className }: ProfessionalHeaderProps) {
  const getStatusColor = (state: string) => {
    switch (state) {
      case 'running': return 'bg-green-500'
      case 'paused': return 'bg-yellow-500'
      default: return 'bg-red-500'
    }
  }

  const getStatusText = (state: string) => {
    switch (state) {
      case 'running': return 'LIVE'
      case 'paused': return 'PAUSED'
      default: return 'OFFLINE'
    }
  }

  return (
    <header className={cn(
      "bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white shadow-2xl border-b border-indigo-800/30 sticky top-0 z-50",
      className
    )}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'%3E%3C/circle%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>
      
      <div className="relative max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                  Traffic Flow Beacon
                </h1>
                <p className="text-sm text-blue-200 flex items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
                  Addis Ababa Smart Traffic Management
                </p>
              </div>
            </div>
          </div>
          
          {/* Status and Controls */}
          <div className="flex items-center space-x-4">
            {/* System Status */}
            <div className="flex items-center space-x-3">
              <Badge 
                variant="outline" 
                className="bg-white/10 text-white border-white/20 backdrop-blur-sm"
              >
                <div className={cn("w-2 h-2 rounded-full mr-2 animate-pulse", getStatusColor(simulationState))}></div>
                {getStatusText(simulationState)}
              </Badge>
              
              <Badge 
                variant="outline" 
                className="bg-green-500/20 text-green-100 border-green-400/30"
              >
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                System Online
              </Badge>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-white/10 backdrop-blur-sm"
              >
                <Bell className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-white/10 backdrop-blur-sm"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-white/10 backdrop-blur-sm"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-white/10 backdrop-blur-sm"
              >
                <User className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}