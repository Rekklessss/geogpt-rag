"use client"

import React, { useState } from 'react'
import { FileLibrary } from './file-library'
import { ChatInterface } from './chat-interface'
import { Header } from './header'
import { StatusMonitor } from './status-monitor'
import { LLMProviderManager } from './llm-provider-manager'
import { ConfigurationManager } from './configuration-manager'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface GeoGPTInterfaceProps {
  className?: string
}

export function GeoGPTInterface({ className }: GeoGPTInterfaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [statusMonitorOpen, setStatusMonitorOpen] = useState(false)
  const [llmManagerOpen, setLlmManagerOpen] = useState(false)
  const [configManagerOpen, setConfigManagerOpen] = useState(false)
  const { toast } = useToast()

  // Close other panels when opening a new one
  const handleToggleLLMManager = () => {
    setLlmManagerOpen(!llmManagerOpen)
    if (!llmManagerOpen) {
      setStatusMonitorOpen(false)
      setConfigManagerOpen(false)
    }
  }

  const handleToggleConfig = () => {
    setConfigManagerOpen(!configManagerOpen)
    if (!configManagerOpen) {
      setStatusMonitorOpen(false)
      setLlmManagerOpen(false)
    }
  }

  const handleToggleKBManager = () => {
    // Simply toggle the sidebar open when KB button is clicked
    setSidebarOpen(true)
    // Close other panels
    setStatusMonitorOpen(false)
    setLlmManagerOpen(false)
    setConfigManagerOpen(false)
    
    // Add visual feedback
    toast({
      title: "Knowledge Base Opened",
      description: "Manage your knowledge base files in the sidebar",
    })
  }

  const handleToggleStatus = () => {
    setStatusMonitorOpen(!statusMonitorOpen)
    if (!statusMonitorOpen) {
      setLlmManagerOpen(false)
      setConfigManagerOpen(false)
    }
  }

  return (
    <div className={cn("flex h-screen bg-background", className)}>
      {/* Header */}
      <Header 
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        onToggleStatus={handleToggleStatus}
        onToggleLLMManager={handleToggleLLMManager}
        onToggleConfig={handleToggleConfig}
        onToggleKBManager={handleToggleKBManager}
      />
      
      {/* Main Content */}
      <div className="flex flex-1 pt-16"> {/* pt-16 for header height */}
        {/* Sidebar - File Library */}
        <div 
          data-sidebar="file-library"
          className={cn(
            "transition-all duration-300 ease-in-out bg-card border-r",
            sidebarOpen ? "w-80" : "w-0 overflow-hidden"
          )}
        >
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
            onFileAttach={() => {
              setSidebarOpen(true)
              toast({
                title: "Document Library Opened",
                description: "Select files from the sidebar to attach to your message.",
              })
              // Add visual feedback - briefly highlight the sidebar
              const sidebar = document.querySelector('[data-sidebar="file-library"]')
              if (sidebar) {
                sidebar.classList.add('ring-2', 'ring-primary', 'ring-opacity-50')
                setTimeout(() => {
                  sidebar.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50')
                }, 1000)
              }
            }}
          />
        </div>
      </div>
      
      {/* Right Side Management Panels */}
      
      {/* Status Monitor Sidebar */}
      <StatusMonitor
        isVisible={statusMonitorOpen}
        onToggle={() => setStatusMonitorOpen(false)}
      />

      {/* LLM Provider Manager Sidebar */}
      {llmManagerOpen && (
        <div className="w-96 bg-card border-l border-border overflow-y-auto">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">LLM Providers</h2>
              <button
                onClick={() => setLlmManagerOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="p-4">
            <LLMProviderManager />
          </div>
        </div>
      )}

      {/* Configuration Manager Sidebar */}
      {configManagerOpen && (
        <div className="w-96 bg-card border-l border-border overflow-y-auto">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Configuration</h2>
              <button
                onClick={() => setConfigManagerOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="p-4">
            <ConfigurationManager />
          </div>
        </div>
      )}


    </div>
  )
} 