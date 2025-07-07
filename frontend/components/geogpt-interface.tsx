"use client"

import React, { useState } from 'react'
import { FileLibrary } from './file-library'
import { ChatInterface } from './chat-interface'
import { Header } from './header'
import { StatusMonitor } from './status-monitor'
import { cn } from '@/lib/utils'

interface GeoGPTInterfaceProps {
  className?: string
}

export function GeoGPTInterface({ className }: GeoGPTInterfaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [statusMonitorOpen, setStatusMonitorOpen] = useState(false)

  return (
    <div className={cn("flex h-screen bg-background", className)}>
      {/* Header */}
      <Header 
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        onToggleStatus={() => setStatusMonitorOpen(!statusMonitorOpen)}
      />
      
      {/* Main Content */}
      <div className="flex flex-1 pt-16"> {/* pt-16 for header height */}
        {/* Sidebar - File Library */}
        <div className={cn(
          "transition-all duration-300 ease-in-out bg-card border-r",
          sidebarOpen ? "w-80" : "w-0 overflow-hidden"
        )}>
          <FileLibrary 
            selectedFiles={selectedFiles}
            onFileSelect={setSelectedFiles}
          />
        </div>
        
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <ChatInterface 
            selectedFiles={selectedFiles}
            onFileDeselect={(fileId: string) => 
              setSelectedFiles(files => files.filter(id => id !== fileId))
            }
          />
        </div>
      </div>
      
      {/* Status Monitor Sidebar */}
      <StatusMonitor
        isVisible={statusMonitorOpen}
        onToggle={() => setStatusMonitorOpen(false)}
      />
    </div>
  )
} 