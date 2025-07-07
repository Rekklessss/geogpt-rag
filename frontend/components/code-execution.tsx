"use client"

import React, { useState, useEffect } from 'react'
import {
  Play,
  Square,
  Copy,
  Check,
  Terminal,
  Code,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { codeService, handleApiError } from '@/lib/api'

interface CodeExecutionProps {
  code: string
  language: string
  output?: string
  error?: string
  isExecuting?: boolean
  onExecute?: () => void
  onStop?: () => void
  className?: string
  isExpandable?: boolean
}

interface ExecutionResult {
  type: 'output' | 'error' | 'plot' | 'data'
  content: string
  timestamp: Date
}

const mockResults: ExecutionResult[] = [
  {
    type: 'output',
    content: 'Importing libraries...\nLoading geospatial data from coordinates (40.7128, -74.0060)\nProcessing 1,247 data points...',
    timestamp: new Date()
  },
  {
    type: 'data',
    content: 'GeoDataFrame with 1247 rows and 12 columns:\n  id    latitude   longitude   elevation   land_use\n  0     40.7128    -74.0060    10.2       residential\n  1     40.7129    -74.0061    11.5       commercial\n  ...',
    timestamp: new Date()
  },
  {
    type: 'plot',
    content: 'Generated visualization: elevation_heatmap.png\nSaved to: /outputs/analysis_2024_01_15.png',
    timestamp: new Date()
  }
]

export function CodeExecution({
  code,
  language = 'python',
  output,
  error,
  isExecuting = false,
  onExecute,
  onStop,
  className,
  isExpandable = true
}: CodeExecutionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [executionState, setExecutionState] = useState<'idle' | 'running' | 'completed' | 'error'>('idle')
  const [results, setResults] = useState<ExecutionResult[]>([])
  const [currentOutput, setCurrentOutput] = useState('')

  // Real code execution
  useEffect(() => {
    if (isExecuting) {
      executeCode()
    }
  }, [isExecuting])

  const executeCode = async () => {
    setExecutionState('running')
    setResults([])
    setCurrentOutput('')
    
    try {
      // Start execution with timeout and security settings
      const execution = await codeService.executeCode(
        code, 
        language,
        30, // 30 second timeout
        false // No network access for security
      )
      const executionId = execution.execution_id
      
      // Poll for results
      const pollResults = async () => {
        const maxAttempts = 30 // 30 seconds max
        let attempts = 0
        
        const poll = async (): Promise<void> => {
          if (attempts >= maxAttempts) {
            setExecutionState('error')
            setResults([{
              type: 'error',
              content: 'Execution timeout - code took too long to complete',
              timestamp: new Date()
            }])
            return
          }
          
          try {
            const statusResponse = await codeService.getExecutionStatus(executionId) as any
            
            if (statusResponse.status === 'completed') {
              setExecutionState('completed')
              if (statusResponse.output) {
                setResults([{
                  type: 'output',
                  content: statusResponse.output,
                  timestamp: new Date()
                }])
                setCurrentOutput(statusResponse.output)
              }
            } else if (statusResponse.status === 'error') {
              setExecutionState('error')
              setResults([{
                type: 'error',
                content: statusResponse.error || 'Unknown execution error',
                timestamp: new Date()
              }])
            } else if (statusResponse.status === 'running') {
              // Still running, continue polling
              attempts++
              setTimeout(poll, 1000)
            }
          } catch (error) {
            setExecutionState('error')
            setResults([{
              type: 'error',
              content: `Execution failed: ${handleApiError(error)}`,
              timestamp: new Date()
            }])
          }
        }
        
        poll()
      }
      
      pollResults()
      
    } catch (error) {
      setExecutionState('error')
      setResults([{
        type: 'error',
        content: `Failed to start execution: ${handleApiError(error)}`,
        timestamp: new Date()
      }])
    }
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  const getExecutionStatusIcon = () => {
    switch (executionState) {
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Terminal className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getResultIcon = (type: ExecutionResult['type']) => {
    switch (type) {
      case 'output':
        return <Terminal className="h-4 w-4 text-blue-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'plot':
        return <Code className="h-4 w-4 text-purple-500" />
      case 'data':
        return <CheckCircle className="h-4 w-4 text-green-500" />
    }
  }

  return (
    <div className={cn("border rounded-lg overflow-hidden bg-card", className)}>
      {/* Code Header */}
      <div className="flex items-center justify-between p-3 bg-muted/30 border-b">
        <div className="flex items-center space-x-2">
          <Code className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium capitalize">{language} Code</span>
          {getExecutionStatusIcon()}
          {executionState === 'running' && (
            <span className="text-xs text-muted-foreground">Executing...</span>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={copyCode}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          
          {isExpandable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          )}
          
          {executionState === 'running' && onStop ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onStop}
              className="h-8"
            >
              <Square className="h-3 w-3 mr-1" />
              Stop
            </Button>
          ) : (
            onExecute && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExecute}
                disabled={executionState === 'running'}
                className="h-8"
              >
                <Play className="h-3 w-3 mr-1" />
                Run
              </Button>
            )
          )}
        </div>
      </div>

      {/* Code Content */}
      <div className={cn(
        "relative",
        isExpanded ? "max-h-none" : "max-h-64 overflow-hidden"
      )}>
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'hsl(var(--muted))',
            fontSize: '0.875rem',
            lineHeight: '1.5'
          }}
          showLineNumbers
        >
          {code}
        </SyntaxHighlighter>
        
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-muted to-transparent" />
        )}
      </div>

      {/* Execution Output */}
      {(results.length > 0 || executionState === 'running') && (
        <div className="border-t">
          <div className="flex items-center justify-between p-3 bg-muted/20 border-b">
            <div className="flex items-center space-x-2">
              <Terminal className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Execution Results</span>
              {executionState === 'running' && (
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              )}
            </div>
            
            {results.length > 0 && (
              <Button variant="ghost" size="sm" className="h-8">
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            )}
          </div>
          
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {results.map((result, index) => (
              <div key={index} className="p-3 border-b last:border-b-0">
                <div className="flex items-start space-x-3">
                  {getResultIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-medium capitalize">{result.type}</span>
                      <span className="text-xs text-muted-foreground">
                        {result.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className={cn(
                      "text-xs whitespace-pre-wrap font-mono",
                      result.type === 'error' ? "text-red-600" : "text-foreground"
                    )}>
                      {result.content}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
            
            {executionState === 'running' && (
              <div className="p-3 text-sm text-muted-foreground flex items-center space-x-2">
                <Terminal className="h-4 w-4 animate-pulse" />
                <span>Executing Python code...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="border-t bg-red-50 dark:bg-red-950/20 p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Execution Error</p>
              <pre className="text-xs text-red-600 dark:text-red-400 mt-1 whitespace-pre-wrap font-mono">
                {error}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 