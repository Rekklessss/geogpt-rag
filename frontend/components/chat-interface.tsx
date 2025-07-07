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
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ChatMessage, DocumentSource } from '@/types'
import { DeepDiscovery } from './deep-discovery'
import { EnhancedChatInput } from './enhanced-chat-input'
import { CodeExecution } from './code-execution'
import { chatService, handleApiError } from '@/lib/api'

interface ChatInterfaceProps {
  selectedFiles: string[]
  onFileDeselect: (fileId: string) => void
  className?: string
}

// Mock chat data with fixed timestamps to prevent hydration errors
const mockMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Hello! I\'m GeoGPT, your AI assistant for geospatial analysis. I can help you analyze documents, generate code, and solve complex spatial problems. How can I assist you today?',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    type: 'text'
  },
  {
    id: '2',
    role: 'user',
    content: 'Can you analyze the urban development patterns in the uploaded city planning document?',
    timestamp: new Date('2024-01-15T10:05:00Z'),
    type: 'text'
  },
  {
    id: '3',
    role: 'assistant',
    content: 'I\'ll analyze the urban development patterns in your city planning document. Let me examine the data systematically.',
    timestamp: new Date('2024-01-15T10:07:00Z'),
    type: 'thinking',
    metadata: {
      thinking: 'First, I need to examine the document structure and identify key urban development indicators. I\'ll look for population density data, zoning information, and infrastructure development timelines. Then I\'ll analyze spatial patterns and correlations.',
      sources: [
        {
          filename: 'City_Planning_Data.xlsx',
          relevanceScore: 0.95,
          excerpt: 'Population density increased by 23% in downtown area from 2020-2023...'
        }
      ]
    }
  },
  {
    id: '4',
    role: 'assistant',
    content: 'Here\'s the Python code to analyze urban development patterns:',
    timestamp: new Date('2024-01-15T10:09:00Z'),
    type: 'code',
    metadata: {
      code: `import geopandas as gpd
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from shapely.geometry import Point

# Load urban development data
development_data = pd.read_excel('City_Planning_Data.xlsx')
print(f"Loaded {len(development_data)} development records")

# Create spatial analysis
def analyze_development_patterns(data):
    # Calculate development density by district
    density_by_district = data.groupby('district').agg({
        'population': 'sum',
        'area_sqkm': 'sum',
        'new_buildings': 'count'
    }).reset_index()
    
    density_by_district['pop_density'] = (
        density_by_district['population'] / 
        density_by_district['area_sqkm']
    )
    
    return density_by_district

# Perform analysis
results = analyze_development_patterns(development_data)
print("\\nDevelopment Analysis Results:")
print(results.head())

# Create visualization
plt.figure(figsize=(12, 8))
plt.subplot(2, 2, 1)
sns.barplot(data=results, x='district', y='pop_density')
plt.title('Population Density by District')
plt.xticks(rotation=45)

plt.subplot(2, 2, 2)
sns.scatterplot(data=results, x='pop_density', y='new_buildings')
plt.title('Population Density vs New Development')

plt.tight_layout()
plt.savefig('urban_analysis.png', dpi=300, bbox_inches='tight')
print("\\nAnalysis complete! Visualization saved as 'urban_analysis.png'")`,
       codeLanguage: 'python'
    }
  }
]

export function ChatInterface({ selectedFiles, onFileDeselect, className }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages)
  const [inputValue, setInputValue] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [expandedThinking, setExpandedThinking] = useState<string | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [isDeepDiscoveryActive, setIsDeepDiscoveryActive] = useState(false)
  const [discoveryQuery, setDiscoveryQuery] = useState('')
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  
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
      // Call real GeoGPT API with enhanced parameters
      const response = await chatService.sendMessage(
        currentInput,
        selectedFiles, // Pass selected files as context
        true, // Include thinking
        true, // Include sources
        webSearchEnabled, // Use web search based on user preference
        4000 // Max context length
      )

      setIsThinking(false)
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        type: 'text',
        metadata: {
          thinking: response.thinking,
          processingTime: response.processingTime,
          tokens: response.tokens?.total || 0,
          sources: response.sources?.map(source => ({
            filename: source.filename,
            relevanceScore: source.relevance_score, // Map API field to frontend format
            excerpt: source.excerpt,
            pageNumber: source.page_number, // Map API field to frontend format
            type: source.type,
            section: source.section,
            url: source.url
          }))
        }
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
    } catch (error) {
      setIsThinking(false)
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${handleApiError(error)}. Please try again.`,
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
    if (inputValue.trim()) {
      setDiscoveryQuery(inputValue.trim())
      setInputValue('')
      setIsDeepDiscoveryActive(true)
    }
  }

  const ThinkingIndicator = () => (
    <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
      <Brain className="h-5 w-5 text-primary animate-pulse" />
      <div className="thinking-dots">
        <div></div>
        <div></div>
        <div></div>
      </div>
      <span className="text-sm text-muted-foreground">Thinking...</span>
    </div>
  )

  const MessageSources = ({ sources }: { sources: DocumentSource[] }) => (
    <div className="mt-3 p-3 bg-muted/30 rounded-lg border">
      <div className="flex items-center space-x-2 mb-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Sources</span>
      </div>
      {sources.map((source, index) => (
        <div key={index} className="text-xs text-muted-foreground mb-1">
          <span className="font-medium">{source.filename}</span>
          {source.pageNumber && <span> (Page {source.pageNumber})</span>}
          <span className="ml-2 text-green-600">
            {Math.round(source.relevanceScore * 100)}% match
          </span>
          <p className="mt-1 text-muted-foreground italic">
            "{source.excerpt}"
          </p>
        </div>
      ))}
    </div>
  )

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Selected Files Bar */}
      {selectedFiles.length > 0 && (
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center space-x-2 mb-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Context Files ({selectedFiles.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map(fileId => (
              <div
                key={fileId}
                className="flex items-center space-x-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs"
              >
                <span>File_{fileId}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 hover:bg-primary/20"
                  onClick={() => onFileDeselect(fileId)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-lg p-4 relative group",
                message.role === 'user'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              {/* Message Content */}
              <div className="prose prose-sm max-w-none">
                <p className="m-0">{message.content}</p>
              </div>

              {/* Code Execution Section */}
              {message.metadata?.code && (
                <div className="mt-3">
                  <CodeExecution
                    code={message.metadata.code}
                    language={message.metadata.codeLanguage || 'python'}
                    output={message.metadata.executionResult}
                    isExecuting={false}
                    onExecute={() => {
                      console.log('Execute code:', message.metadata?.code)
                    }}
                  />
                </div>
              )}

              {/* Thinking Section */}
              {message.metadata?.thinking && (
                <div className="mt-3 border-t pt-3">
                  <button
                    onClick={() => setExpandedThinking(
                      expandedThinking === message.id ? null : message.id
                    )}
                    className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Brain className="h-4 w-4" />
                    <span>Chain of Thought</span>
                    {expandedThinking === message.id ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                    }
                  </button>
                  
                  {expandedThinking === message.id && (
                    <div className="mt-2 p-3 bg-background/50 rounded-md text-sm">
                      <p className="text-muted-foreground italic">
                        {message.metadata.thinking}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Sources */}
              {message.metadata?.sources && (
                <MessageSources sources={message.metadata.sources} />
              )}

              {/* Message Actions */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(message.content, message.id)}
                >
                  {copiedText === message.id ? 
                    <Check className="h-3 w-3" /> : 
                    <Copy className="h-3 w-3" />
                  }
                </Button>
              </div>

              {/* Timestamp */}
              <div className="text-xs text-muted-foreground mt-2 opacity-70" suppressHydrationWarning>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {/* Thinking Indicator */}
        {isThinking && <ThinkingIndicator />}

        {/* Streaming Indicator */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Generating response...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Input Area */}
      <div className="p-4">
        <EnhancedChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          onDeepDiscovery={handleDeepDiscovery}
          onGenerateCode={() => {
            // Add code generation logic
            console.log('Generate code requested')
          }}
          onAnalyzePattern={() => {
            // Add pattern analysis logic
            console.log('Analyze pattern requested')
          }}
          disabled={isThinking || isStreaming}
          selectedFiles={selectedFiles}
          webSearchEnabled={webSearchEnabled}
          onWebSearchToggle={setWebSearchEnabled}
        />
      </div>
      
      {/* Deep Discovery Overlay */}
      <DeepDiscovery
        isActive={isDeepDiscoveryActive}
        onToggle={() => setIsDeepDiscoveryActive(false)}
        query={discoveryQuery}
      />
    </div>
  )
} 