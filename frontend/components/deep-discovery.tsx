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
  RefreshCw,
  ExternalLink,
  Loader2,
  TrendingUp,
  Activity,
  BookOpen,
  Zap,
  Target,
  Filter,
  ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface DeepDiscoveryProps {
  isActive: boolean
  onToggle: () => void
  query: string
  className?: string
}

interface DiscoveryApiRequest {
  query: string
  max_sources?: number
  include_web_search?: boolean
  include_knowledge_base?: boolean
  discovery_type?: string
}

interface DiscoveryStep {
  id: number
  name: string
  status: 'pending' | 'running' | 'completed' | 'error'
  progress: number
  result?: string | null
  sources?: Array<{
    title: string
    type: string
    relevance: number
    excerpt: string
    url?: string
  }> | null
  error?: string | null
}

interface DiscoverySource {
  title: string
  type: string
  relevance: number
  excerpt: string
  url?: string
  metadata?: any
}

interface DiscoveryApiResponse {
  discovery_id: string
  status: 'running' | 'completed' | 'error' | 'paused'
  progress: number
  current_step: number
  steps: DiscoveryStep[]
  sources: DiscoverySource[]
  final_report?: string | null
}

export function DeepDiscovery({ isActive, onToggle, query, className }: DeepDiscoveryProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [discoveryProgress, setDiscoveryProgress] = useState(0)
  const [expandedStep, setExpandedStep] = useState<number>(1)
  const [discoveryState, setDiscoveryState] = useState<'starting' | 'running' | 'paused' | 'completed' | 'error'>('starting')
  const [sources, setSources] = useState<DiscoverySource[]>([])
  const [steps, setSteps] = useState<DiscoveryStep[]>([])
  const [discoveryId, setDiscoveryId] = useState<string | null>(null)
  const [finalReport, setFinalReport] = useState<string | null>(null)
  const [webSearchEnabled, setWebSearchEnabled] = useState(true)
  const [knowledgeBaseEnabled, setKnowledgeBaseEnabled] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Start discovery process
  const startDiscovery = async () => {
    try {
      setStartTime(new Date())
      setError(null)
      setDiscoveryState('starting')

      const requestBody: DiscoveryApiRequest = {
        query: query,
        max_sources: 20,
        include_web_search: webSearchEnabled,
        include_knowledge_base: knowledgeBaseEnabled,
        discovery_type: filterType === 'all' ? 'comprehensive' : filterType
      }

      const response = await fetch('http://54.224.133.45:8812/discovery/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Discovery API Error: ${response.status} ${response.statusText}`)
      }

      const data: DiscoveryApiResponse = await response.json()
      setDiscoveryId(data.discovery_id)
      setDiscoveryState(data.status === 'running' ? 'running' : data.status)
      
      // Update initial state
      updateFromApiResponse(data)
      
      // Start polling for updates with timeout
      if (data.status === 'running') {
        pollDiscoveryStatus(data.discovery_id, 0)  // Add attempt counter
      }

    } catch (error) {
      console.error('Discovery Start Error:', error)
      setError(`Failed to start discovery: ${error instanceof Error ? error.message : 'Unknown error'}. Using fallback mode.`)
      
      // Fallback to simulated discovery for demo purposes
      startFallbackDiscovery()
    }
  }

  // Fallback discovery simulation when backend fails
  const startFallbackDiscovery = () => {
    setDiscoveryState('running')
    const fallbackSteps: DiscoveryStep[] = [
      { id: 1, name: "Query Analysis & Planning", status: 'running', progress: 0 },
      { id: 2, name: "Knowledge Base Search", status: 'pending', progress: 0 },
      { id: 3, name: "Web Intelligence Gathering", status: 'pending', progress: 0 },
      { id: 4, name: "Cross-Reference Analysis", status: 'pending', progress: 0 },
      { id: 5, name: "Synthesis & Report Generation", status: 'pending', progress: 0 },
    ]
    setSteps(fallbackSteps)
    
    // Simulate progressive completion
    simulateDiscoveryProgress(fallbackSteps, 0)
  }

  // Simulate discovery progress for fallback mode
  const simulateDiscoveryProgress = (steps: DiscoveryStep[], currentStepIndex: number) => {
    if (currentStepIndex >= steps.length || discoveryState !== 'running') {
      // Complete discovery
      setDiscoveryState('completed')
      setDiscoveryProgress(100)
      setFinalReport(`# Discovery Complete for: "${query}"

## Summary
The discovery process has been completed with ${sources.length} sources found and analyzed.

## Key Findings
- Query analysis identified key concepts related to geospatial analysis
- Knowledge base search found relevant documentation and resources
- Cross-reference analysis revealed important patterns and insights

## Recommendations
- Further analysis could benefit from additional data sources
- Consider implementing the suggested methodologies for best results

*Note: This is a demonstration of the discovery system. Full backend integration is in progress.*`)
      return
    }

    const currentStep = steps[currentStepIndex]
    
    // Animate current step progress
    let progress = 0
    const progressInterval = setInterval(() => {
      progress += Math.random() * 15 + 5
      
      if (progress >= 100) {
        progress = 100
        clearInterval(progressInterval)
        
        // Complete current step
        const updatedSteps = [...steps]
        updatedSteps[currentStepIndex] = {
          ...currentStep,
          status: 'completed',
          progress: 100,
          result: generateStepResult(currentStep.name)
        }
        
        // Start next step
        if (currentStepIndex + 1 < steps.length) {
          updatedSteps[currentStepIndex + 1] = {
            ...updatedSteps[currentStepIndex + 1],
            status: 'running',
            progress: 0
          }
        }
        
        setSteps(updatedSteps)
        setCurrentStep(currentStepIndex + 2)
        setDiscoveryProgress(((currentStepIndex + 1) / steps.length) * 100)
        
        // Add some demo sources
        if (currentStepIndex === 1) { // Knowledge base search
          setSources(prev => [...prev, ...generateDemoSources('knowledge_base')])
        } else if (currentStepIndex === 2) { // Web search
          setSources(prev => [...prev, ...generateDemoSources('web_search')])
        }
        
        // Continue with next step after delay
        setTimeout(() => {
          simulateDiscoveryProgress(updatedSteps, currentStepIndex + 1)
        }, 1000)
        
      } else {
        // Update progress
        const updatedSteps = [...steps]
        updatedSteps[currentStepIndex] = { ...currentStep, progress }
        setSteps(updatedSteps)
      }
    }, 800)
  }

  // Generate demo step results
  const generateStepResult = (stepName: string): string => {
    const results = {
      'Query Analysis & Planning': `Analyzed query "${query}" and identified key concepts for comprehensive research.`,
      'Knowledge Base Search': `Found relevant documents in knowledge base covering the requested topic.`,
      'Web Intelligence Gathering': `Collected recent research and information from web sources.`,
      'Cross-Reference Analysis': `Analyzed correlations and patterns across discovered sources.`,
      'Synthesis & Report Generation': `Generated comprehensive report with findings and recommendations.`
    } as Record<string, string>
    return results[stepName] || 'Analysis completed successfully'
  }

  // Generate demo sources
  const generateDemoSources = (type: string): DiscoverySource[] => {
    const baseData = {
      knowledge_base: [
        { title: "GIS Fundamentals", excerpt: "Introduction to Geographic Information Systems and spatial analysis concepts..." },
        { title: "Spatial Analysis Methods", excerpt: "Comprehensive guide to spatial analysis techniques and methodologies..." },
      ],
      web_search: [
        { title: "Recent GIS Research", excerpt: "Latest developments in geospatial technology and applications..." },
        { title: "Industry Best Practices", excerpt: "Current best practices in geographic information systems..." },
      ]
    }

    const data = baseData[type as keyof typeof baseData] || baseData.knowledge_base
    
    return data.map((item, index) => ({
      title: item.title,
      type: type,
      relevance: 0.8 + Math.random() * 0.2,
      excerpt: item.excerpt,
      url: type === 'web_search' ? `https://example.com/${item.title.toLowerCase().replace(/\s+/g, '-')}` : undefined,
      metadata: { demo: true }
    }))
  }

  // Update component state from API response
  const updateFromApiResponse = (data: DiscoveryApiResponse) => {
    setDiscoveryProgress(data.progress)
    setDiscoveryState(data.status === 'running' ? 'running' : data.status)
    setSteps(data.steps)
    setCurrentStep(data.current_step)
    setSources(data.sources)
    
    if (data.final_report) {
      setFinalReport(data.final_report)
    }
  }

  // Poll discovery status with timeout and retry logic
  const pollDiscoveryStatus = async (id: string, attempts: number = 0) => {
    if (attempts > 20) { // Stop after 20 attempts (40 seconds)
      setError('Discovery polling timed out. The backend may be processing slowly.')
      setDiscoveryState('error')
      return
    }

    try {
      const response = await fetch(`http://54.224.133.45:8812/discovery/${id}`)
      
      if (!response.ok) {
        throw new Error(`Status API Error: ${response.status} ${response.statusText}`)
      }

      const data: DiscoveryApiResponse = await response.json()
      
      // Check if discovery is stuck in error state
      if (data.status === 'error' && attempts > 2) {
        setError('Backend discovery encountered an error. Switching to demo mode.')
        startFallbackDiscovery()
        return
      }
      
      updateFromApiResponse(data)

      // Continue polling if still running
      if (data.status === 'running') {
        setTimeout(() => pollDiscoveryStatus(id, attempts + 1), 2000)
      }

    } catch (error) {
      console.error('Discovery Poll Error:', error)
      
      if (attempts > 3) {
        setError('Lost connection to discovery service. Switching to demo mode.')
        startFallbackDiscovery()
      } else {
        // Retry polling
        setTimeout(() => pollDiscoveryStatus(id, attempts + 1), 3000)
      }
    }
  }

  // Get appropriate icon for step status
  const getStepIcon = (step: DiscoveryStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  // Get appropriate icon for step type
  const getStepTypeIcon = (stepName: string) => {
    const name = stepName.toLowerCase()
    if (name.includes('web') || name.includes('search')) return <Globe className="h-4 w-4" />
    if (name.includes('knowledge') || name.includes('database')) return <Database className="h-4 w-4" />
    if (name.includes('analyze') || name.includes('process')) return <Brain className="h-4 w-4" />
    if (name.includes('report') || name.includes('synthesis')) return <FileText className="h-4 w-4" />
    return <Search className="h-4 w-4" />
  }

  // Get appropriate icon for source type
  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'knowledge_base': return <FileText className="h-4 w-4 text-blue-500" />
      case 'web_search': return <Globe className="h-4 w-4 text-green-500" />
      case 'wikipedia': return <BookOpen className="h-4 w-4 text-purple-500" />
      case 'analysis': return <TrendingUp className="h-4 w-4 text-orange-500" />
      case 'report': return <Activity className="h-4 w-4 text-red-500" />
      default: return <Database className="h-4 w-4 text-gray-500" />
    }
  }

  // Pause discovery
  const pauseDiscovery = async () => {
    if (discoveryId) {
      try {
        const response = await fetch(`http://54.224.133.45:8812/discovery/${discoveryId}/pause`, {
          method: 'POST'
        })
        
        if (response.ok) {
          setDiscoveryState('paused')
          return
        }
      } catch (error) {
        console.error('Pause Discovery Error:', error)
      }
    }
    
    // Fallback for demo mode
    setDiscoveryState('paused')
  }

  // Resume discovery
  const resumeDiscovery = async () => {
    if (discoveryId) {
      try {
        const response = await fetch(`http://54.224.133.45:8812/discovery/${discoveryId}/resume`, {
          method: 'POST'
        })
        
        if (response.ok) {
          setDiscoveryState('running')
          pollDiscoveryStatus(discoveryId, 0) // Resume polling
          return
        }
      } catch (error) {
        console.error('Resume Discovery Error:', error)
      }
    }
    
    // Fallback for demo mode
    setDiscoveryState('running')
    if (steps.length > 0) {
      const currentIndex = steps.findIndex(s => s.status === 'running' || (s.status === 'pending' && steps[steps.indexOf(s) - 1]?.status === 'completed'))
      if (currentIndex >= 0) {
        simulateDiscoveryProgress(steps, currentIndex)
      }
    }
  }

  // Initialize discovery when component becomes active
  useEffect(() => {
    if (isActive && discoveryState === 'starting' && query) {
      startDiscovery()
    }
  }, [isActive, query])

  // Update elapsed time
  useEffect(() => {
    if (discoveryState === 'running' && startTime) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000))
      }, 1000)
      
      return () => clearInterval(interval)
    }
  }, [discoveryState, startTime])

  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const filteredSources = sources.filter(source => {
    if (filterType === 'all') return true
    return source.type === filterType
  })

  const completedSteps = steps.filter(step => step.status === 'completed').length
  const totalSteps = steps.length

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
              <div className="flex items-center space-x-2 ml-4">
                <div className={cn(
                  "px-2 py-1 rounded text-xs font-medium",
                  discoveryState === 'running' && "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
                  discoveryState === 'completed' && "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400",
                  discoveryState === 'paused' && "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400",
                  discoveryState === 'error' && "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                )}>
                  {discoveryState.charAt(0).toUpperCase() + discoveryState.slice(1)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatElapsedTime(elapsedTime)}
                </div>
              </div>
            </div>
            <div className="text-lg font-medium text-muted-foreground">
              "{query}"
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {discoveryState === 'running' && (
              <Button onClick={pauseDiscovery} variant="outline" size="sm">
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}
            
            {discoveryState === 'paused' && (
              <Button onClick={resumeDiscovery} variant="outline" size="sm">
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            )}
            
            <Button onClick={onToggle} variant="outline" size="sm">
              <Square className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-600 dark:text-red-400">{error}</span>
            </div>
          </div>
        )}

        {/* Overall Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">
              Overall Progress: {completedSteps}/{totalSteps} steps completed
            </div>
            <div className="text-sm text-muted-foreground">
              {Math.round(discoveryProgress)}%
            </div>
          </div>
          <Progress value={discoveryProgress} className="h-2" />
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
          {/* Steps Panel */}
          <div className="space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Discovery Steps</h3>
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={webSearchEnabled}
                    onChange={(e) => setWebSearchEnabled(e.target.checked)}
                    className="rounded"
                    disabled={discoveryState === 'running'}
                  />
                  <span>Web Search</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={knowledgeBaseEnabled}
                    onChange={(e) => setKnowledgeBaseEnabled(e.target.checked)}
                    className="rounded"
                    disabled={discoveryState === 'running'}
                  />
                  <span>Knowledge Base</span>
                </label>
              </div>
            </div>
            
            <div className="space-y-3">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={cn(
                    "border rounded-lg p-4 transition-colors",
                    step.status === 'running' && "border-blue-500/50 bg-blue-500/5",
                    step.status === 'completed' && "border-green-500/50 bg-green-500/5",
                    step.status === 'error' && "border-red-500/50 bg-red-500/5"
                  )}
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedStep(expandedStep === step.id ? 0 : step.id)}
                  >
                    <div className="flex items-center space-x-3">
                      {getStepTypeIcon(step.name)}
                      <div>
                        <div className="font-medium">{step.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Step {step.id}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStepIcon(step)}
                      {expandedStep === step.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                  
                  {step.status !== 'pending' && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Progress</span>
                        <span className="text-xs text-muted-foreground">{Math.round(step.progress)}%</span>
                      </div>
                      <Progress value={step.progress} className="h-1" />
                    </div>
                  )}
                  
                  {expandedStep === step.id && (
                    <div className="mt-3 pt-3 border-t">
                      {step.result && (
                        <div className="text-sm text-muted-foreground mb-2">
                          {step.result}
                        </div>
                      )}
                      
                      {step.error && (
                        <div className="text-sm text-red-600 dark:text-red-400 mb-2">
                          Error: {step.error}
                        </div>
                      )}
                      
                      {step.sources && step.sources.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground">
                            Sources Found: {step.sources.length}
                          </div>
                          {step.sources.slice(0, 3).map((source, idx) => (
                            <div key={idx} className="text-xs p-2 bg-muted/50 rounded">
                              <div className="font-medium">{source.title}</div>
                              <div className="text-muted-foreground truncate">
                                {source.excerpt}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sources Panel */}
          <div className="space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Sources Discovered</h3>
              <div className="flex items-center space-x-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="all">All Sources</option>
                  <option value="knowledge_base">Knowledge Base</option>
                  <option value="web_search">Web Search</option>
                  <option value="wikipedia">Wikipedia</option>
                  <option value="analysis">Analysis</option>
                </select>
                <Badge variant="outline">
                  {filteredSources.length} sources
                </Badge>
              </div>
            </div>
            
            <div className="space-y-3">
              {filteredSources.map((source, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getSourceIcon(source.type)}
                      <div className="font-medium text-sm">{source.title}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {Math.round(source.relevance * 100)}%
                      </Badge>
                      {source.url && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={source.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {source.excerpt}
                  </div>
                </div>
              ))}
              
              {filteredSources.length === 0 && sources.length > 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No sources match the current filter.
                </div>
              )}
              
              {sources.length === 0 && discoveryState !== 'starting' && (
                <div className="text-center text-muted-foreground py-8">
                  {discoveryState === 'running' ? 'Discovering sources...' : 'No sources found yet.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Final Report */}
        {finalReport && (
          <div className="mt-6 border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Final Report</h3>
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
            <div className="prose prose-sm max-w-none text-sm">
              <pre className="whitespace-pre-wrap text-sm">{finalReport}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}