"use client"

import React, { useState, useEffect } from 'react'
import {
  Search,
  Brain,
  FileText,
  Globe,
  Database,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  Square,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { discoveryService, handleApiError } from '@/lib/api'
import type { DiscoveryStep, DiscoverySource } from '@/types'

interface DeepDiscoveryProps {
  isActive: boolean
  onToggle: () => void
  query: string
  className?: string
}

// Using imported types from @/types

const mockSteps: DiscoveryStep[] = [
  {
    id: 1,
    name: 'Query Analysis',
    status: 'completed',
    progress: 100
  },
  {
    id: 2, 
    name: 'Knowledge Base Search',
    status: 'completed',
    progress: 100
  },
  {
    id: 3,
    name: 'Web Intelligence',
    status: 'running',
    progress: 65
  },
  {
    id: 4,
    name: 'Cross-Reference Analysis',
    status: 'pending',
    progress: 0
  },
  {
    id: 5,
    name: 'Report Generation',
    status: 'pending',
    progress: 0
  }
]

const mockSources: DiscoverySource[] = [
  {
    id: '1',
    title: 'Urban Development Patterns in Coastal Cities',
    type: 'document',
    relevance: 0.95,
    excerpt: 'Analysis of urban sprawl patterns shows 23% increase in coastal development over the past decade...',
    timestamp: new Date(Date.now() - 120000).toISOString()
  },
  {
    id: '2',
    title: 'USGS Geological Survey Database',
    type: 'database',
    url: 'https://earthquake.usgs.gov',
    relevance: 0.88,
    excerpt: 'Seismic activity data indicates increased geological instability in urban coastal regions...',
    timestamp: new Date(Date.now() - 80000).toISOString()
  },
  {
    id: '3',
    title: 'Climate Change Impact on Infrastructure',
    type: 'web',
    url: 'https://climate.gov/infrastructure',
    relevance: 0.92,
    excerpt: 'Rising sea levels and extreme weather events pose significant challenges to coastal infrastructure...',
    timestamp: new Date(Date.now() - 40000).toISOString()
  }
]

export function DeepDiscovery({ isActive, onToggle, query, className }: DeepDiscoveryProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [discoveryProgress, setDiscoveryProgress] = useState(0)
  const [expandedStep, setExpandedStep] = useState<number>(1)
  const [discoveryState, setDiscoveryState] = useState<'running' | 'paused' | 'completed'>('running')
  const [sources, setSources] = useState<DiscoverySource[]>([])
  const [steps, setSteps] = useState<DiscoveryStep[]>([])
  const [discoveryId, setDiscoveryId] = useState<string | null>(null)
  const [finalReport, setFinalReport] = useState<string | null>(null)
  const [webSearchEnabled, setWebSearchEnabled] = useState(true)
  const [knowledgeBaseEnabled, setKnowledgeBaseEnabled] = useState(true)

  // Simulate discovery progress
  useEffect(() => {
    if (!isActive || discoveryState !== 'running') return

    const interval = setInterval(() => {
      setDiscoveryProgress(prev => {
        if (prev >= 100) {
          setDiscoveryState('completed')
          return 100
        }
        return Math.min(prev + Math.random() * 5, 100)
      })

      // Update current step progress
      setSteps(prev => prev.map(step => {
        if (step.id === '3' && step.status === 'running') {
          return { ...step, progress: Math.min(step.progress + Math.random() * 3, 100) }
        }
        return step
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, discoveryState])

  const getStepIcon = (step: DiscoveryStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getSourceIcon = (type: DiscoverySource['type']) => {
    switch (type) {
      case 'document': return <FileText className="h-4 w-4 text-blue-500" />
      case 'web': return <Globe className="h-4 w-4 text-green-500" />
      case 'database': return <Database className="h-4 w-4 text-purple-500" />
      case 'model': return <Brain className="h-4 w-4 text-orange-500" />
    }
  }

  if (!isActive) return null

  return (
    <div className={cn("fixed inset-0 z-50 bg-background/95 backdrop-blur-sm", className)}>
      <div className="container mx-auto h-full flex flex-col p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Search className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Deep Discovery</h1>
            </div>
            <div className="flex items-center space-x-2">
              {discoveryState === 'running' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDiscoveryState('paused')}
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
              )}
              {discoveryState === 'paused' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDiscoveryState('running')}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Resume
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDiscoveryState('completed')}
              >
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
            </div>
          </div>
          
          <Button variant="ghost" onClick={onToggle}>
            ✕
          </Button>
        </div>

        {/* Query Display */}
        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <h3 className="font-medium mb-2">Discovery Query:</h3>
          <p className="text-muted-foreground italic">"{query}"</p>
        </div>

        {/* Progress Overview */}
        <div className="bg-card rounded-lg border p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(discoveryProgress)}% Complete
            </span>
          </div>
          <Progress value={discoveryProgress} className="mb-2" />
          <div className="text-xs text-muted-foreground">
            Step {currentStep} of {steps.length}: {steps[currentStep - 1]?.title}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
          {/* Activity Panel */}
          <div className="bg-card rounded-lg border overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-muted/30">
              <h3 className="font-semibold flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                Discovery Activity
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    "border rounded-lg transition-all",
                    step.status === 'running' ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <div 
                    className="p-3 cursor-pointer"
                    onClick={() => setExpandedStep(expandedStep === step.id ? '' : step.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStepIcon(step)}
                        <div>
                          <h4 className="font-medium text-sm">{step.title}</h4>
                          <p className="text-xs text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {step.status === 'running' && (
                          <span className="text-xs text-primary">{step.progress}%</span>
                        )}
                        {expandedStep === step.id ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </div>
                    </div>
                    
                    {(step.status === 'running' || step.status === 'completed') && (
                      <div className="mt-2">
                        <Progress value={step.progress} className="h-1" />
                      </div>
                    )}
                  </div>
                  
                  {expandedStep === step.id && (
                    <div className="border-t p-3 bg-muted/20 text-sm">
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium">Status: </span>
                          <span className={cn(
                            "capitalize",
                            step.status === 'completed' && "text-green-600",
                            step.status === 'running' && "text-blue-600",
                            step.status === 'error' && "text-red-600"
                          )}>
                            {step.status}
                          </span>
                        </div>
                        {step.duration && (
                          <div>
                            <span className="font-medium">Duration: </span>
                            <span>{step.duration}s</span>
                          </div>
                        )}
                        {step.sources.length > 0 && (
                          <div>
                            <span className="font-medium">Sources: </span>
                            <span>{step.sources.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sources Panel */}
          <div className="bg-card rounded-lg border overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-muted/30">
              <h3 className="font-semibold flex items-center justify-between">
                <span className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Sources ({sources.length})
                </span>
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  View All
                </Button>
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {sources.map((source, index) => (
                <div
                  key={source.id}
                  className="p-4 border-b hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getSourceIcon(source.type)}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{source.title}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs px-2 py-1 bg-muted rounded capitalize">
                            {source.type}
                          </span>
                          <span className="text-xs text-green-600">
                            {Math.round(source.relevance * 100)}% relevance
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
                          {source.excerpt}
                        </p>
                        {source.url && (
                          <a 
                            href={source.url}
                            className="text-xs text-primary hover:underline mt-1 block truncate"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {source.url}
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 ml-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Discovery started • {Math.round(discoveryProgress)}% complete • {sources.length} sources found
          </div>
          
          <div className="flex items-center space-x-2">
            {discoveryState === 'completed' && (
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            )}
            <Button variant="outline" onClick={onToggle}>
              Return to Chat
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 