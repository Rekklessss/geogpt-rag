"use client"

import React, { useState, useRef, useEffect } from 'react'
import {
  Send,
  Paperclip,
  Mic,
  Square,
  Code,
  Brain,
  Search,
  Zap,
  Command,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import TextareaAutosize from 'react-textarea-autosize'

interface EnhancedChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onDeepDiscovery?: () => void
  onGenerateCode?: () => void
  onAnalyzePattern?: () => void
  disabled?: boolean
  placeholder?: string
  selectedFiles?: string[]
  webSearchEnabled?: boolean
  onWebSearchToggle?: (enabled: boolean) => void
  className?: string
}

interface Suggestion {
  id: string
  text: string
  type: 'prompt' | 'command' | 'file'
  icon: React.ReactNode
  description?: string
}

const predefinedSuggestions: Suggestion[] = [
  {
    id: '1',
    text: 'Analyze the spatial patterns in',
    type: 'prompt',
    icon: <Brain className="h-4 w-4" />,
    description: 'Spatial pattern analysis'
  },
  {
    id: '2',
    text: 'Generate Python code to',
    type: 'command',
    icon: <Code className="h-4 w-4" />,
    description: 'Code generation'
  },
  {
    id: '3',
    text: 'What are the flood risks for',
    type: 'prompt',
    icon: <Search className="h-4 w-4" />,
    description: 'Risk assessment'
  },
  {
    id: '4',
    text: 'Create a visualization showing',
    type: 'command',
    icon: <Zap className="h-4 w-4" />,
    description: 'Data visualization'
  },
  {
    id: '5',
    text: 'Compare land use changes between',
    type: 'prompt',
    icon: <Brain className="h-4 w-4" />,
    description: 'Temporal analysis'
  },
  {
    id: '6',
    text: 'Calculate the distance from',
    type: 'command',
    icon: <Code className="h-4 w-4" />,
    description: 'Spatial calculations'
  }
]

export function EnhancedChatInput({
  value,
  onChange,
  onSend,
  onDeepDiscovery,
  onGenerateCode,
  onAnalyzePattern,
  disabled = false,
  placeholder = "Ask me about your geospatial data...",
  selectedFiles = [],
  webSearchEnabled = false,
  onWebSearchToggle,
  className
}: EnhancedChatInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [isRecording, setIsRecording] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Filter suggestions based on input
  useEffect(() => {
    if (value.length > 0) {
      const filtered = predefinedSuggestions.filter(suggestion =>
        suggestion.text.toLowerCase().includes(value.toLowerCase()) ||
        suggestion.description?.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredSuggestions(filtered)
      setShowSuggestions(filtered.length > 0 && value.length > 2)
    } else {
      setFilteredSuggestions(predefinedSuggestions)
      setShowSuggestions(false)
    }
    setSelectedSuggestionIndex(-1)
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && filteredSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        )
      } else if (e.key === 'Tab' && selectedSuggestionIndex >= 0) {
        e.preventDefault()
        const suggestion = filteredSuggestions[selectedSuggestionIndex]
        onChange(suggestion.text)
        setShowSuggestions(false)
      }
    }

    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow new line with Shift+Enter
        return
      } else {
        e.preventDefault()
        if (showSuggestions && selectedSuggestionIndex >= 0) {
          const suggestion = filteredSuggestions[selectedSuggestionIndex]
          onChange(suggestion.text)
          setShowSuggestions(false)
        } else if (value.trim()) {
          onSend()
        }
      }
    }

    // Keyboard shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'k':
          e.preventDefault()
          onGenerateCode?.()
          break
        case 'd':
          e.preventDefault()
          onDeepDiscovery?.()
          break
        case 'b':
          e.preventDefault()
          onAnalyzePattern?.()
          break
      }
    }
  }

  const handleSuggestionClick = (suggestion: Suggestion) => {
    onChange(suggestion.text)
    setShowSuggestions(false)
    textareaRef.current?.focus()
  }

  const handleVoiceToggle = () => {
    setIsRecording(!isRecording)
    // Voice recording logic would go here
  }

  const getSuggestionTypeColor = (type: Suggestion['type']) => {
    switch (type) {
      case 'prompt': return 'text-blue-600'
      case 'command': return 'text-green-600'
      case 'file': return 'text-purple-600'
      default: return 'text-muted-foreground'
    }
  }

  return (
    <div className={cn("relative", className)}>
      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div 
          ref={suggestionsRef}
          className="absolute bottom-full left-0 right-0 mb-2 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50"
        >
          <div className="p-2">
            <div className="text-xs text-muted-foreground mb-2 flex items-center">
              <Command className="h-3 w-3 mr-1" />
              Suggestions • Tab to complete
            </div>
            {filteredSuggestions.map((suggestion, index) => (
              <div
                key={suggestion.id}
                className={cn(
                  "flex items-center space-x-3 p-2 rounded cursor-pointer transition-colors text-sm",
                  index === selectedSuggestionIndex 
                    ? "bg-primary/10 border border-primary/20" 
                    : "hover:bg-muted/50"
                )}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className={getSuggestionTypeColor(suggestion.type)}>
                  {suggestion.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{suggestion.text}</div>
                  {suggestion.description && (
                    <div className="text-xs text-muted-foreground">{suggestion.description}</div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                  {suggestion.type}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Input Container */}
      <div className="border rounded-lg bg-background focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
        {/* Selected Files Display */}
        {selectedFiles.length > 0 && (
          <div className="p-3 border-b bg-muted/30">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Paperclip className="h-4 w-4" />
              <span>{selectedFiles.length} file(s) selected for context</span>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="flex items-end p-3 space-x-2">
          {/* File Attachment */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={disabled}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Voice Input */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 shrink-0",
              isRecording && "text-red-500 bg-red-50 dark:bg-red-950/20"
            )}
            onClick={handleVoiceToggle}
            disabled={disabled}
          >
            {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <TextareaAutosize
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              maxRows={6}
              className="w-full resize-none border-0 bg-transparent px-0 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0"
            />
            
            {/* Input Actions Overlay */}
            <div className="absolute right-2 bottom-2 flex items-center space-x-1">
              {value.trim() && (
                <div className="flex items-center space-x-1">
                  <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                  <span className="hidden sm:block text-xs text-muted-foreground">for code</span>
                </div>
              )}
            </div>
          </div>

          {/* Send Button */}
          <Button
            onClick={onSend}
            disabled={!value.trim() || disabled}
            size="icon"
            className="h-9 w-9 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex space-x-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7"
              onClick={onGenerateCode}
              disabled={!value.trim() || disabled}
            >
              <Code className="h-3 w-3 mr-1" />
              Code
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7"
              onClick={onAnalyzePattern}
              disabled={!value.trim() || disabled}
            >
              <Brain className="h-3 w-3 mr-1" />
              Analyze
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7"
              onClick={onDeepDiscovery}
              disabled={!value.trim() || disabled}
            >
              <Search className="h-3 w-3 mr-1" />
              Discovery
            </Button>
            {onWebSearchToggle && (
              <Button 
                variant={webSearchEnabled ? "default" : "ghost"}
                size="sm" 
                className="text-xs h-7"
                onClick={() => onWebSearchToggle(!webSearchEnabled)}
                disabled={disabled}
              >
                <Search className="h-3 w-3 mr-1" />
                Web Search
              </Button>
            )}
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            {isRecording && (
              <div className="flex items-center space-x-1 text-red-500">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span>Recording...</span>
              </div>
            )}
            <div className="hidden sm:flex items-center space-x-1">
              <span>Shift + Enter for new line</span>
              <span>•</span>
              <span>Tab to complete</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 