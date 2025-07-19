"use client"

import React, { useEffect, useState } from 'react'
import { Menu, Settings, Moon, Sun, Monitor, Activity, Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface HeaderProps {
  onToggleSidebar: () => void
  sidebarOpen: boolean
  onToggleStatus?: () => void
  className?: string
}

export function Header({ onToggleSidebar, sidebarOpen, onToggleStatus, className }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [systemStatus, setSystemStatus] = useState<'online' | 'degraded' | 'offline'>('online')

  // Prevent hydration mismatch by only rendering theme-dependent content after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const getThemeIcon = () => {
    if (!mounted) {
      // Return a default icon before hydration to prevent mismatch
      return <Sun className="h-4 w-4" />
    }
    
    switch (theme) {
      case 'light': return <Sun className="h-4 w-4" />
      case 'dark': return <Moon className="h-4 w-4" />
      default: return <Monitor className="h-4 w-4" />
    }
  }

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 h-16 bg-background/95 backdrop-blur-sm border-b",
      className
    )}>
      <div className="flex items-center justify-between h-full px-4">
        {/* Left side - Menu and Logo */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="hover:bg-accent"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <img 
              src="/logo.png" 
              alt="JugJugGeo Logo" 
              className="w-8 h-8 object-contain"
            />
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold text-foreground">JugJugGeo</h1>
              <p className="text-xs text-muted-foreground -mt-1">Geospatial AI Assistant</p>
            </div>
          </div>
        </div>

        {/* Center - Enhanced Status indicators */}
        <div className="hidden md:flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            {systemStatus === 'online' && (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-600 font-medium">All Systems Online</span>
              </>
            )}
            {systemStatus === 'degraded' && (
              <>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-yellow-600 font-medium">Some Issues Detected</span>
              </>
            )}
            {systemStatus === 'offline' && (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span className="text-red-600 font-medium">Service Unavailable</span>
              </>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground">
            5 services • 99.8% uptime
          </div>
        </div>

        {/* Right side - Status monitor, Theme toggle and Settings */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleStatus}
            className="hover:bg-accent relative"
            title="System Status"
          >
            <Activity className="h-5 w-5" />
            {systemStatus !== 'online' && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-background"></div>
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="hover:bg-accent"
            suppressHydrationWarning
            title="Toggle Theme"
          >
            {getThemeIcon()}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-accent"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
} 