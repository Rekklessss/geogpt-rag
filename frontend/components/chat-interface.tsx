"use client"

import React, { useState, useRef, useEffect } from 'react'
import { 
  Send, 
  Brain, 
  Code, 
  Play, 
  FileText, 
  X, 
  Loader2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Search,
  Globe,
  Database,
  ExternalLink,
  Clock,
  Zap,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ChatMessage, DocumentSource } from '@/types'
import { DeepDiscovery } from './deep-discovery'
import { EnhancedChatInput } from './enhanced-chat-input'
import { CodeExecution } from './code-execution'

interface ChatInterfaceProps {
  selectedFiles: string[]
  onFileDeselect: (fileId: string) => void
  onFileAttach?: () => void
  className?: string
}

interface ChatApiRequest {
  message: string
  context_files?: string[]
  include_thinking?: boolean
  include_sources?: boolean
  use_web_search?: boolean
  max_context_length?: number
  conversation_id?: string
}

interface ChatApiResponse {
  response: string
  thinking?: string | null
  sources?: Array<{
    title: string
    excerpt: string
    relevance: number
    type: string
    url?: string
  }> | null
  processing_time: number
  tokens: {
    input: number
    output: number
    total: number
  }
  metadata: {
    context_length: number
    sources_used: number
    web_search_used: boolean
  }
}

export function ChatInterface({ selectedFiles, onFileDeselect, onFileAttach, className }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [expandedThinking, setExpandedThinking] = useState<string | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [isDeepDiscoveryActive, setIsDeepDiscoveryActive] = useState(false)
  const [discoveryQuery, setDiscoveryQuery] = useState('')
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const [executingCode, setExecutingCode] = useState<Set<string>>(new Set())
  const [conversationId] = useState(() => `chat_${Date.now()}`)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
      type: 'text'
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = inputValue
    setInputValue('')
    setIsThinking(true)

    try {
      // Call real chat API
      const requestBody: ChatApiRequest = {
        message: currentInput,
        context_files: selectedFiles,
        include_thinking: true,
        include_sources: true,
        use_web_search: webSearchEnabled,
        max_context_length: 4000,
        conversation_id: conversationId
      }

      const response = await fetch('http://54.224.133.45:8812/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }

      const data: ChatApiResponse = await response.json()
      
      setIsThinking(false)
      
      // Add thinking message if available
      if (data.thinking && data.thinking.trim()) {
        const thinkingMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Let me analyze this step by step...',
          timestamp: new Date(),
          type: 'thinking',
          metadata: {
            thinking: data.thinking,
            sources: data.sources?.map(source => ({
              filename: source.title,
              relevanceScore: source.relevance,
              excerpt: source.excerpt,
              pageNumber: 1, // Backend doesn't provide page numbers yet
              type: (source.type as 'knowledge_base' | 'web_search' | 'wikipedia' | 'analysis' | 'report') || 'knowledge_base',
              url: source.url
            }))
          }
        }
        setMessages(prev => [...prev, thinkingMessage])
      }
      
      // Add main response message
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        type: 'text',
        metadata: {
          processingTime: data.processing_time,
          tokens: data.tokens.total,
          sources: data.sources?.map(source => ({
            filename: source.title,
            relevanceScore: source.relevance,
            excerpt: source.excerpt,
            pageNumber: 1,
            type: (source.type as 'knowledge_base' | 'web_search' | 'wikipedia' | 'analysis' | 'report') || 'knowledge_base',
            url: source.url
          }))
        }
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
      // Auto-generate code if the response suggests it
      if (data.response.toLowerCase().includes('```') || data.response.toLowerCase().includes('python') || data.response.toLowerCase().includes('code')) {
        // Extract code blocks from the response
        const codeBlocks = data.response.match(/```[\s\S]*?```/g)
        if (codeBlocks && codeBlocks.length > 0) {
          const codeContent = codeBlocks[0]
            .replace(/```python\n?/g, '')
            .replace(/```\n?/g, '')
            .trim()
          
          if (codeContent) {
            const codeMessage: ChatMessage = {
              id: (Date.now() + 3).toString(),
              role: 'assistant',
              content: 'Here\'s the code from my response:',
              timestamp: new Date(),
              type: 'code',
              metadata: {
                code: codeContent,
                codeLanguage: 'python'
              }
            }
            
            setMessages(prev => [...prev, codeMessage])
          }
        }
      }
      
    } catch (error) {
      setIsThinking(false)
      console.error('Chat API Error:', error)
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I apologize, but I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or check if the backend service is running.`,
        timestamp: new Date(),
        type: 'text'
      }
      
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(messageId)
      setTimeout(() => setCopiedText(null), 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  const handleDeepDiscovery = () => {
    setDiscoveryQuery(inputValue)
    setIsDeepDiscoveryActive(true)
    setInputValue('')
  }

  const handleCodeExecution = (messageId: string) => {
    setExecutingCode(prev => new Set(prev).add(messageId))
    
    // Simulate execution completion after 3-8 seconds
    setTimeout(() => {
      setExecutingCode(prev => {
        const newSet = new Set(prev)
        newSet.delete(messageId)
        return newSet
      })
    }, 3000 + Math.random() * 5000)
  }

  const handleStopExecution = (messageId: string) => {
    setExecutingCode(prev => {
      const newSet = new Set(prev)
      newSet.delete(messageId)
      return newSet
    })
  }

  const ThinkingIndicator = () => (
    <div className="flex items-center space-x-2 text-blue-500 animate-pulse">
      <Brain className="h-4 w-4" />
      <span className="text-sm">Analyzing your request...</span>
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  )

  const MessageSources = ({ sources }: { sources: DocumentSource[] }) => (
    <div className="mt-4 border-t pt-3">
      <h4 className="text-sm font-medium text-muted-foreground mb-2">Sources:</h4>
      <div className="space-y-2">
        {sources.map((source, index) => (
          <div key={index} className="flex items-start space-x-2 text-xs bg-muted/50 rounded p-2">
            <div className="flex-shrink-0 mt-0.5">
              {source.type === 'knowledge_base' && <FileText className="h-3 w-3 text-blue-500" />}
              {source.type === 'web_search' && <Globe className="h-3 w-3 text-green-500" />}
              {source.type === 'wikipedia' && <Database className="h-3 w-3 text-purple-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-foreground">{source.filename}</span>
                {source.pageNumber && (
                  <span className="text-muted-foreground">p. {source.pageNumber}</span>
                )}
                <span className="text-xs bg-primary/10 text-primary px-1 rounded">
                  {(source.relevanceScore * 100).toFixed(0)}%
                </span>
                {source.url && (
                  <a href={source.url} target="_blank" rel="noopener noreferrer" 
                     className="text-blue-500 hover:text-blue-700">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <p className="text-muted-foreground mt-1 line-clamp-2">{source.excerpt}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const MessageMetadata = ({ metadata }: { metadata: any }) => (
    <div className="mt-2 flex items-center space-x-4 text-xs text-muted-foreground">
      {metadata.processingTime && (
        <div className="flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>{metadata.processingTime.toFixed(1)}s</span>
        </div>
      )}
      {metadata.tokens && (
        <div className="flex items-center space-x-1">
          <Zap className="h-3 w-3" />
          <span>{metadata.tokens} tokens</span>
        </div>
      )}
    </div>
  )

  const generateSampleCode = (query: string) => {
    if (query.toLowerCase().includes('flood')) {
      return `import geopandas as gpd
import rasterio
import numpy as np
from rasterio.plot import show
import matplotlib.pyplot as plt

# Load elevation data
dem = rasterio.open('elevation.tif')
elevation = dem.read(1)

# Identify flood-prone areas (elevation < 10m)
flood_prone = elevation < 10

# Calculate flood risk zones
risk_zones = np.where(flood_prone, 'High Risk', 'Low Risk')

# Visualize results
fig, ax = plt.subplots(figsize=(10, 8))
show(elevation, ax=ax, cmap='terrain', title='Flood Risk Analysis')
plt.show()

print(f"High risk area: {np.sum(flood_prone)} pixels")`
    }
    
    if (query.toLowerCase().includes('ndvi') || query.toLowerCase().includes('vegetation')) {
      return `import rasterio
import numpy as np
import matplotlib.pyplot as plt

# Load satellite bands
with rasterio.open('red_band.tif') as red_src:
    red = red_src.read(1).astype(float)

with rasterio.open('nir_band.tif') as nir_src:
    nir = nir_src.read(1).astype(float)

# Calculate NDVI
ndvi = (nir - red) / (nir + red)

# Classify vegetation health
healthy_veg = ndvi > 0.6
moderate_veg = (ndvi > 0.3) & (ndvi <= 0.6)
sparse_veg = (ndvi > 0.1) & (ndvi <= 0.3)

# Visualize results
plt.figure(figsize=(12, 8))
plt.imshow(ndvi, cmap='RdYlGn', vmin=-1, vmax=1)
plt.colorbar(label='NDVI')
plt.title('Vegetation Health Analysis')
plt.show()

print(f"Healthy vegetation: {np.sum(healthy_veg)} pixels")
print(f"Moderate vegetation: {np.sum(moderate_veg)} pixels")`
    }
    
    return `import geopandas as gpd
import pandas as pd
import matplotlib.pyplot as plt

# Load and analyze spatial data
gdf = gpd.read_file('data.shp')

# Perform spatial analysis
analysis_result = gdf.describe()
print("Spatial Analysis Results:")
print(analysis_result)

# Create visualization
gdf.plot(figsize=(10, 8), alpha=0.7)
plt.title('Geospatial Analysis Results')
plt.show()`
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Selected Files Bar */}
      {selectedFiles.length > 0 && (
        <div className="border-b bg-muted/30 p-3">
          <div className="flex items-center space-x-2 text-sm">
            <FileText className="h-4 w-4 text-primary" />
            <span className="font-medium">Selected files ({selectedFiles.length}):</span>
            <div className="flex flex-wrap gap-1">
              {selectedFiles.map((fileId) => (
                <span key={fileId} className="inline-flex items-center bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded text-xs">
                  {fileId}
                  <button 
                    onClick={() => onFileDeselect(fileId)}
                    className="ml-1 hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={cn(
            "flex items-start space-x-3",
            message.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
          )}>
            {/* Avatar */}
            <div className="flex-shrink-0">
              {message.role === 'user' ? (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-background border-2 border-primary/20 overflow-hidden flex items-center justify-center">
                  <img 
                    src="/logo.png" 
                    alt="GeoGPT" 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </div>
            
            {/* Message Content */}
            <div className={cn(
              "max-w-[calc(100%-3rem)] rounded-lg p-4",
              message.role === 'user' 
                ? 'bg-primary text-primary-foreground' 
                : message.type === 'thinking'
                  ? 'bg-muted border'
                  : message.type === 'code'
                    ? 'bg-muted border'
                    : 'bg-muted'
            )}>
              {/* Message Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {message.role === 'assistant' && message.type === 'thinking' && (
                    <Brain className="h-4 w-4 text-blue-500" />
                  )}
                  {message.role === 'assistant' && message.type === 'code' && (
                    <Code className="h-4 w-4 text-gray-500" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  {message.type === 'code' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(message.metadata?.code || '', message.id)}
                    >
                      {copiedText === message.id ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Message Content */}
              <div className="space-y-3">
                <p className="whitespace-pre-wrap">{message.content}</p>

                {/* Thinking Process */}
                {message.type === 'thinking' && message.metadata?.thinking && (
                  <div className="border-t pt-3">
                    <button
                      onClick={() => setExpandedThinking(
                        expandedThinking === message.id ? null : message.id
                      )}
                      className="flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary/80"
                    >
                      {expandedThinking === message.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      <span>View reasoning process</span>
                    </button>
                    
                    {expandedThinking === message.id && (
                      <div className="mt-3 p-3 bg-card rounded border text-sm">
                        <h4 className="font-medium mb-2">🤔 Thinking Process:</h4>
                        <div className="prose prose-sm max-w-none text-foreground">
                          {message.metadata.thinking.split('\n').map((line, index) => (
                            <p key={index} className="mb-2">{line}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Code Display */}
                {message.type === 'code' && message.metadata?.code && (
                  <div className="mt-3">
                    <CodeExecution
                      code={message.metadata.code}
                      language={message.metadata.codeLanguage || 'python'}
                      isExecuting={executingCode.has(message.id)}
                      onExecute={() => handleCodeExecution(message.id)}
                      onStop={() => handleStopExecution(message.id)}
                      isExpandable={true}
                    />
                  </div>
                )}

                {/* Sources */}
                {message.metadata?.sources && message.metadata.sources.length > 0 && (
                  <MessageSources sources={message.metadata.sources} />
                )}

                {/* Metadata */}
                {message.metadata && (message.metadata.processingTime || message.metadata.tokens) && (
                  <MessageMetadata metadata={message.metadata} />
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Thinking Indicator */}
        {isThinking && (
          <div className="flex items-start space-x-3">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-background border-2 border-primary/20 overflow-hidden flex items-center justify-center">
                <img 
                  src="/logo.png" 
                  alt="GeoGPT" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            
            {/* Thinking Content */}
            <div className="bg-muted rounded-lg p-4">
              <ThinkingIndicator />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        <EnhancedChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          onDeepDiscovery={handleDeepDiscovery}
          disabled={isThinking || isStreaming}
          selectedFiles={selectedFiles}
          webSearchEnabled={webSearchEnabled}
          onWebSearchToggle={setWebSearchEnabled}
          onFileAttach={onFileAttach}
        />
      </div>

      {/* Deep Discovery Modal */}
      {isDeepDiscoveryActive && (
        <DeepDiscovery
          isActive={isDeepDiscoveryActive}
          onToggle={() => setIsDeepDiscoveryActive(false)}
          query={discoveryQuery}
        />
      )}
    </div>
  )
} 