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
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { discoveryService, handleApiError } from '@/lib/api'
import type { DiscoveryStep, DiscoverySource } from '@/types'
import { mockDiscoverySteps, mockDiscoverySources } from '@/lib/mock-data'

interface DeepDiscoveryProps {
  isActive: boolean
  onToggle: () => void
  query: string
  className?: string
}

export function DeepDiscovery({ isActive, onToggle, query, className }: DeepDiscoveryProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [discoveryProgress, setDiscoveryProgress] = useState(0)
  const [expandedStep, setExpandedStep] = useState<number>(1)
  const [discoveryState, setDiscoveryState] = useState<'starting' | 'running' | 'paused' | 'completed' | 'error'>('starting')
  const [sources, setSources] = useState<DiscoverySource[]>([])
  const [steps, setSteps] = useState<DiscoveryStep[]>(mockDiscoverySteps)
  const [discoveryId, setDiscoveryId] = useState<string | null>(null)
  const [finalReport, setFinalReport] = useState<string | null>(null)
  const [webSearchEnabled, setWebSearchEnabled] = useState(true)
  const [knowledgeBaseEnabled, setKnowledgeBaseEnabled] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Initialize discovery when component becomes active
  useEffect(() => {
    if (isActive && discoveryState === 'starting') {
      setStartTime(new Date())
      setDiscoveryId(`disc_${Date.now()}`)
      setSources(mockDiscoverySources)
      
      // Start the discovery process
      setTimeout(() => {
        setDiscoveryState('running')
      }, 1000)
    }
  }, [isActive, discoveryState])

  // Update elapsed time
  useEffect(() => {
    if (discoveryState === 'running' && startTime) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000))
      }, 1000)
      
      return () => clearInterval(interval)
    }
  }, [discoveryState, startTime])

  // Simulate discovery progress
  useEffect(() => {
    if (!isActive || discoveryState !== 'running') return

    const interval = setInterval(() => {
      setSteps(prevSteps => {
        const updatedSteps = [...prevSteps]
        const runningStepIndex = updatedSteps.findIndex(step => step.status === 'running')
        
        if (runningStepIndex !== -1) {
          const runningStep = updatedSteps[runningStepIndex]
          const newProgress = Math.min(runningStep.progress + Math.random() * 8 + 2, 100)
          
          updatedSteps[runningStepIndex] = {
            ...runningStep,
            progress: newProgress
          }
          
          // Complete current step and start next one
          if (newProgress >= 100) {
            updatedSteps[runningStepIndex] = {
              ...runningStep,
              status: 'completed',
              progress: 100,
              result: generateStepResult(runningStep.name)
            }
            
            // Start next step
            const nextStepIndex = runningStepIndex + 1
            if (nextStepIndex < updatedSteps.length) {
              updatedSteps[nextStepIndex] = {
                ...updatedSteps[nextStepIndex],
                status: 'running',
                progress: 0
              }
              setCurrentStep(nextStepIndex + 1)
            } else {
              // All steps completed
              setDiscoveryState('completed')
              setFinalReport(generateFinalReport())
            }
          }
        }
        
        return updatedSteps
      })

      // Update overall progress
      setDiscoveryProgress(prev => {
        const totalSteps = steps.length
        const completedSteps = steps.filter(step => step.status === 'completed').length
        const runningStep = steps.find(step => step.status === 'running')
        const runningProgress = runningStep ? runningStep.progress / 100 : 0
        
        return Math.min(((completedSteps + runningProgress) / totalSteps) * 100, 100)
      })
    }, 1500)

    return () => clearInterval(interval)
  }, [isActive, discoveryState, steps])

  const generateStepResult = (stepName: string): string => {
    const results = {
      'Query Analysis & Planning': 'Successfully identified key concepts: urban heat island, thermal analysis, satellite data, mitigation strategies',
      'Knowledge Base Search': 'Found 23 relevant documents in knowledge base covering UHI research, case studies, and methodologies',
      'Web Intelligence Gathering': 'Collected 47 recent research papers, government reports, and satellite data sources from web databases',
      'Cross-Reference Analysis': 'Validated findings across 15 authoritative sources with 94% consensus on key climate trends',
      'Synthesis & Report Generation': 'Generated comprehensive analysis with actionable recommendations and supporting evidence'
    } as Record<string, string>
    return results[stepName] || 'Analysis completed successfully'
  }

  const generateFinalReport = (): string => {
    return `## Urban Heat Island Analysis: Comprehensive Research Report

### Executive Summary
Based on extensive analysis of 23 knowledge base documents, 47 web sources, and cross-validation across multiple datasets, this report provides comprehensive insights into urban heat island effects and mitigation strategies.

### Key Findings
1. **Temperature Impact**: Urban areas show 3-8°C temperature differences compared to rural surroundings
2. **Growth Patterns**: UHI intensity correlates strongly with urban density and building materials
3. **Seasonal Variation**: Peak effects occur during summer months with clear sky conditions
4. **Health Implications**: Increased heat stress affects vulnerable populations disproportionately

### Data Sources Analyzed
- **Academic Papers**: 23 peer-reviewed studies from climatology journals
- **Government Reports**: 12 official climate assessment documents
- **Satellite Data**: MODIS and Landsat thermal imagery analysis
- **Municipal Studies**: 8 city-specific UHI assessments

### Recommendations
1. **Green Infrastructure**: Implement urban forest coverage of 30%+ in high-density areas
2. **Cool Materials**: Mandate reflective roofing and pavement materials
3. **Building Design**: Encourage passive cooling and natural ventilation
4. **Monitoring Systems**: Establish real-time temperature monitoring networks

### Confidence Level: 94%
This analysis demonstrates high confidence based on convergent evidence from multiple independent sources and established methodologies.`
  }

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

  const getSourceIcon = (type: DiscoverySource['type']) => {
    switch (type) {
      case 'knowledge_base': return <FileText className="h-4 w-4 text-blue-500" />
      case 'web_search': return <Globe className="h-4 w-4 text-green-500" />
      case 'wikipedia': return <BookOpen className="h-4 w-4 text-purple-500" />
      case 'analysis': return <TrendingUp className="h-4 w-4 text-orange-500" />
      case 'report': return <Activity className="h-4 w-4 text-red-500" />
      default: return <Database className="h-4 w-4 text-gray-500" />
    }
  }

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
                {startTime && (
                  <div className="text-sm text-muted-foreground">
                    {formatElapsedTime(elapsedTime)}
                  </div>
                )}
              </div>
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
              {discoveryState !== 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDiscoveryState('completed')}
                >
                  <Square className="h-4 w-4 mr-1" />
                  Stop
                </Button>
              )}
            </div>
          </div>
          
          <Button variant="ghost" onClick={onToggle}>
            ✕
          </Button>
        </div>

        {/* Query Display */}
        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium mb-2 flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Discovery Query:
              </h3>
              <p className="text-muted-foreground italic">"{query}"</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Discovery ID</div>
              <div className="font-mono text-xs">{discoveryId}</div>
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="bg-card rounded-lg border p-4 mb-6">
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{completedSteps}</div>
              <div className="text-xs text-muted-foreground">Steps Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{filteredSources.length}</div>
              <div className="text-xs text-muted-foreground">Sources Found</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(discoveryProgress)}%
              </div>
              <div className="text-xs text-muted-foreground">Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {startTime ? formatElapsedTime(elapsedTime) : '0:00'}
              </div>
              <div className="text-xs text-muted-foreground">Elapsed Time</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
          <Progress value={discoveryProgress} className="mb-2" />
          <div className="text-xs text-muted-foreground">
            {steps[currentStep - 1]?.name || 'Initializing...'}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
          {/* Activity Panel */}
          <div className="bg-card rounded-lg border overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-muted/30">
              <h3 className="font-semibold flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Discovery Activity
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    "border rounded-lg transition-all",
                    step.status === 'running' ? "border-primary bg-primary/5" : 
                    step.status === 'completed' ? "border-green-500/30 bg-green-500/10 dark:border-green-500/40 dark:bg-green-500/5" :
                    "border-border"
                  )}
                >
                  <div 
                    className="p-3 cursor-pointer"
                    onClick={() => setExpandedStep(expandedStep === step.id ? 0 : step.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStepIcon(step)}
                        <div>
                          <h4 className="font-medium text-sm">{step.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {step.status === 'pending' ? 'Waiting to start...' :
                             step.status === 'running' ? 'In progress...' :
                             step.status === 'completed' ? 'Completed successfully' :
                             step.status === 'error' ? 'Error occurred' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {step.status === 'running' && (
                          <span className="text-xs text-primary font-medium">
                            {step.progress}%
                          </span>
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
                        
                        {step.result && (
                          <div>
                            <span className="font-medium">Result: </span>
                            <p className="text-muted-foreground mt-1">{step.result}</p>
                          </div>
                        )}
                        
                        {step.error && (
                          <div>
                            <span className="font-medium text-red-600">Error: </span>
                            <p className="text-red-600 mt-1">{step.error}</p>
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
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Sources ({filteredSources.length})
                </h3>
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  View All
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-2 py-1 border rounded text-xs bg-background"
                >
                  <option value="all">All Sources</option>
                  <option value="knowledge_base">Knowledge Base</option>
                  <option value="web_search">Web Search</option>
                  <option value="wikipedia">Wikipedia</option>
                  <option value="analysis">Analysis</option>
                  <option value="report">Reports</option>
                </select>
                
                <div className="flex space-x-1">
                  {['knowledge_base', 'web_search', 'wikipedia'].map(type => (
                    <div key={type} className="flex items-center space-x-1 text-xs">
                      {getSourceIcon(type as any)}
                      <span>{sources.filter(s => s.type === type).length}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredSources.map((source, index) => (
                <div
                  key={source.id}
                  className="p-4 border-b hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getSourceIcon(source.type)}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate" title={source.title}>
                          {source.title}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs px-2 py-1 bg-muted rounded capitalize">
                            {source.type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-green-600 font-medium">
                            {Math.round(source.relevance * 100)}% match
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(source.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
                          {source.excerpt}
                        </p>
                        {source.url && (
                          <a 
                            href={source.url}
                            className="text-xs text-primary hover:underline mt-1 flex items-center"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Source
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 ml-2">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredSources.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2" />
                  <p>No sources found for the selected filter.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Final Report */}
        {discoveryState === 'completed' && finalReport && (
          <div className="mt-6 bg-green-500/10 border border-green-500/30 dark:bg-green-500/5 dark:border-green-500/40 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-green-600 dark:text-green-400 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Discovery Complete
              </h3>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700">
                <Download className="h-4 w-4 mr-2" />
                Download Full Report
              </Button>
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">
              Comprehensive analysis completed with {sources.length} sources analyzed across {totalSteps} research phases.
              <button className="text-green-700 dark:text-green-300 hover:underline ml-2">
                Preview Report →
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Discovery {discoveryId?.substring(5)} • {Math.round(discoveryProgress)}% complete • {sources.length} sources found
          </div>
          
          <div className="flex items-center space-x-2">
            {discoveryState === 'completed' && (
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Export Results
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