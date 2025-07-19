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
  ArrowDown,
  Globe,
  FileText,
  Map,
  BarChart3,
  Users,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import TextareaAutosize from 'react-textarea-autosize'

interface EnhancedChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onDeepDiscovery?: () => void
  disabled?: boolean
  placeholder?: string
  selectedFiles?: string[]
  webSearchEnabled?: boolean
  onWebSearchToggle?: (enabled: boolean) => void
  onFileAttach?: () => void
  className?: string
}

interface Suggestion {
  id: string
  text: string
  type: 'prompt' | 'command' | 'file' | 'template' | 'context'
  icon: React.ReactNode
  description?: string
  category?: string
  popularity?: number
  keywords?: string[]
}

interface VoiceRecordingState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  level: number
  transcript: string
  isProcessing: boolean
  error?: string
}

interface SmartTemplate {
  id: string
  name: string
  prompt: string
  icon: React.ReactNode
  category: string
  description: string
  variables: string[]
}

const smartTemplates: SmartTemplate[] = [
  {
    id: 'flood_analysis_workflow',
    name: 'End-to-End Flood Risk Assessment',
    prompt: 'Perform comprehensive flood risk analysis for Mumbai: 1) Download elevation data from Planetary Computer 2) Analyze historical rainfall patterns 3) Generate Python code to calculate flood zones 4) Create interactive risk maps with population overlays 5) Execute watershed analysis 6) Open visualization dashboard to create layered flood risk maps 7) Build real-time monitoring dashboard with animated flood progression 8) Generate detailed report with recommendations',
    icon: <Map className="h-4 w-4" />,
    category: 'Complete Workflow',
    description: 'Full flood risk workflow with interactive dashboard visualization',
    variables: []
  },
  {
    id: 'agricultural_monitoring_pipeline',
    name: 'Complete Agricultural Monitoring Pipeline',
    prompt: 'Execute full agricultural monitoring workflow for Punjab wheat fields: 1) Access Sentinel-2 satellite data 2) Calculate NDVI, EVI, and SAVI vegetation indices 3) Generate Python code for crop health analysis 4) Create time-series visualizations 5) Open visualization dashboard to display multi-layer crop health maps 6) Build interactive temporal analysis dashboard with NDVI progression 7) Create field-level monitoring charts and metrics dashboard 8) Generate automated reports with dashboard snapshots',
    icon: <Sparkles className="h-4 w-4" />,
    category: 'Complete Workflow',
    description: 'Comprehensive crop monitoring with interactive dashboard suite',
    variables: []
  },
  {
    id: 'urban_growth_complete',
    name: 'Urban Development Analysis Suite',
    prompt: 'Complete urban growth analysis for Bangalore (2010-2024): 1) Download Landsat time-series data 2) Perform land cover classification 3) Generate Python code for change detection 4) Calculate growth metrics and sprawl indicators 5) Open visualization dashboard for temporal urban growth mapping 6) Create animated change detection dashboard with time-slider controls 7) Build comprehensive urban metrics dashboard with population and infrastructure overlays 8) Generate interactive urban planning dashboard with future projections',
    icon: <BarChart3 className="h-4 w-4" />,
    category: 'Complete Workflow',
    description: 'Full urban development analysis with animated dashboard suite',
    variables: []
  },
  {
    id: 'disaster_response_system',
    name: 'Emergency Response GIS System',
    prompt: 'Build complete disaster response system for cyclone preparedness: 1) Access real-time weather data 2) Generate evacuation route analysis 3) Create Python scripts for risk modeling 4) Map vulnerable populations 5) Open visualization dashboard for real-time emergency monitoring 6) Build command center dashboard with live weather tracking and evacuation routes 7) Create resource allocation dashboard with shelter capacity and supply metrics 8) Generate emergency operations dashboard with automated alerts and status updates',
    icon: <AlertCircle className="h-4 w-4" />,
    category: 'Complete Workflow',
    description: 'Comprehensive emergency response with real-time command dashboard',
    variables: []
  },
  {
    id: 'site_selection_analysis',
    name: 'Multi-Criteria Site Selection',
    prompt: 'Perform comprehensive site selection for solar farm in Rajasthan: 1) Access solar radiation data 2) Analyze terrain slopes and aspects 3) Generate Python code for suitability modeling 4) Map transmission line proximity 5) Open visualization dashboard for multi-criteria site analysis 6) Create interactive suitability mapping dashboard with weighted overlay controls 7) Build comparative analysis dashboard with site ranking and scoring visualization 8) Generate decision support dashboard with detailed site evaluation metrics',
    icon: <Zap className="h-4 w-4" />,
    category: 'Complete Workflow',
    description: 'Multi-criteria decision analysis with interactive evaluation dashboard',
    variables: []
  },
  {
    id: 'environmental_monitoring',
    name: 'Environmental Impact Assessment',
    prompt: 'Complete environmental monitoring workflow for Western Ghats: 1) Download forest cover data 2) Analyze deforestation patterns 3) Generate Python code for biodiversity modeling 4) Calculate fragmentation indices 5) Open visualization dashboard for forest cover monitoring with temporal layers 6) Create biodiversity tracking dashboard with species habitat maps and corridors 7) Build conservation dashboard with priority area mapping and threat assessment 8) Generate ecosystem health dashboard with real-time monitoring metrics and alerts',
    icon: <Globe className="h-4 w-4" />,
    category: 'Complete Workflow',
    description: 'Full environmental assessment with conservation monitoring dashboard',
    variables: []
  }
]

const baseSuggestions: Suggestion[] = [
  {
    id: '1',
    text: 'Download satellite data, process it with Python, and create interactive visualizations for',
    type: 'prompt',
    icon: <Brain className="h-4 w-4" />,
    description: 'Complete satellite data workflow',
    category: 'End-to-End Analysis',
    popularity: 95,
    keywords: ['satellite', 'python', 'visualization', 'workflow']
  },
  {
    id: '2',
    text: 'Generate Python code for GIS analysis, execute it, and visualize results with maps and charts for',
    type: 'command',
    icon: <Code className="h-4 w-4" />,
    description: 'Python GIS workflow execution',
    category: 'Code + Visualization',
    popularity: 98,
    keywords: ['python', 'gis', 'execute', 'visualize']
  },
  {
    id: '3',
    text: 'Perform complete risk assessment with data download, Python analysis, and dashboard creation for',
    type: 'prompt',
    icon: <Search className="h-4 w-4" />,
    description: 'Full risk analysis workflow',
    category: 'Risk Assessment',
    popularity: 88,
    keywords: ['risk', 'assessment', 'dashboard', 'complete']
  },
  {
    id: '4',
    text: 'Create comprehensive visualization suite with Python code execution, open visualization dashboard, and build interactive maps showing',
    type: 'command',
    icon: <Zap className="h-4 w-4" />,
    description: 'Advanced visualization dashboard workflow',
    category: 'Visualization Suite',
    popularity: 92,
    keywords: ['visualization', 'python', 'dashboard', 'interactive', 'maps']
  },
  {
    id: '5',
    text: 'Execute multi-temporal analysis with Landsat data, Python processing, and animated visualizations for',
    type: 'prompt',
    icon: <Map className="h-4 w-4" />,
    description: 'Temporal analysis with animation',
    category: 'Change Detection',
    popularity: 85,
    keywords: ['temporal', 'landsat', 'animation', 'python']
  },
  {
    id: '6',
    text: 'Build complete geospatial analysis pipeline with data access, Python modeling, visualization dashboard, and interactive mapping for',
    type: 'command',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'Complete analysis pipeline with dashboard',
    category: 'Full Pipeline',
    popularity: 90,
    keywords: ['pipeline', 'modeling', 'visualization', 'dashboard', 'complete']
  },
  {
    id: '7',
    text: 'Execute deep discovery research, generate Python analysis code, and create presentation-ready outputs for',
    type: 'prompt',
    icon: <FileText className="h-4 w-4" />,
    description: 'Research to presentation workflow',
    category: 'Research Pipeline',
    popularity: 87,
    keywords: ['research', 'deep', 'discovery', 'presentation']
  },
  {
    id: '8',
    text: 'Download real-time data, process with PyQGIS, execute analysis, and generate automated reports for',
    type: 'command',
    icon: <Globe className="h-4 w-4" />,
    description: 'Real-time analysis workflow',
    category: 'Real-time Processing',
    popularity: 83,
    keywords: ['real-time', 'pyqgis', 'automated', 'reports']
  }
]

export function EnhancedChatInput({
  value,
  onChange,
  onSend,
  onDeepDiscovery,
  disabled = false,
  placeholder = "Ask me about your geospatial data...",
  selectedFiles = [],
  webSearchEnabled = false,
  onWebSearchToggle,
  onFileAttach,
  className
}: EnhancedChatInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [showTemplates, setShowTemplates] = useState(false)
  const [voiceState, setVoiceState] = useState<VoiceRecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    level: 0,
    transcript: '',
    isProcessing: false
  })
  const [recentSuggestions, setRecentSuggestions] = useState<string[]>([])
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const voiceIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Generate context-aware suggestions
  const generateContextSuggestions = (input: string, files: string[]): Suggestion[] => {
    const contextSuggestions: Suggestion[] = []
    
    // File-based suggestions
    if (files.length > 0) {
      contextSuggestions.push({
        id: 'file_context',
        text: `Analyze the data in my uploaded files`,
        type: 'context',
        icon: <FileText className="h-4 w-4" />,
        description: `Work with ${files.length} selected file(s)`,
        category: 'Context',
        popularity: 100
      })
    }

    // Smart suggestions based on input patterns
    const inputLower = input.toLowerCase()
    if (inputLower.includes('flood') || inputLower.includes('water')) {
      contextSuggestions.push({
        id: 'flood_context',
        text: 'Analyze flood risk patterns using elevation and rainfall data',
        type: 'context',
        icon: <Map className="h-4 w-4" />,
        description: 'Flood risk analysis',
        category: 'Contextual',
        popularity: 95
      })
    }

    if (inputLower.includes('urban') || inputLower.includes('city')) {
      contextSuggestions.push({
        id: 'urban_context',
        text: 'Compare urban growth patterns over time',
        type: 'context',
        icon: <BarChart3 className="h-4 w-4" />,
        description: 'Urban development analysis',
        category: 'Contextual',
        popularity: 90
      })
    }

    if (inputLower.includes('vegetation') || inputLower.includes('ndvi') || inputLower.includes('crop')) {
      contextSuggestions.push({
        id: 'vegetation_context',
        text: 'Monitor vegetation health using satellite imagery',
        type: 'context',
        icon: <Sparkles className="h-4 w-4" />,
        description: 'Vegetation analysis',
        category: 'Contextual',
        popularity: 88
      })
    }

    return contextSuggestions
  }

  // Enhanced suggestion filtering
  useEffect(() => {
    if (value.length > 0) {
      const contextSuggestions = generateContextSuggestions(value, selectedFiles)
      const allSuggestions = [...contextSuggestions, ...baseSuggestions]
      
      const filtered = allSuggestions.filter(suggestion => {
        const matchesText = suggestion.text.toLowerCase().includes(value.toLowerCase())
        const matchesDescription = suggestion.description?.toLowerCase().includes(value.toLowerCase())
        const matchesKeywords = suggestion.keywords?.some(keyword => 
          keyword.toLowerCase().includes(value.toLowerCase())
        )
        return matchesText || matchesDescription || matchesKeywords
      }).sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      
      setFilteredSuggestions(filtered)
      setShowSuggestions(filtered.length > 0 && value.length > 2)
    } else {
      const contextSuggestions = generateContextSuggestions('', selectedFiles)
      setFilteredSuggestions([...contextSuggestions, ...baseSuggestions])
      setShowSuggestions(false)
    }
    setSelectedSuggestionIndex(-1)
  }, [value, selectedFiles])

  // Voice recording simulation
  useEffect(() => {
    if (voiceState.isRecording && !voiceState.isPaused) {
      voiceIntervalRef.current = setInterval(() => {
        setVoiceState(prev => ({
          ...prev,
          duration: prev.duration + 0.1,
          level: Math.random() * 100,
          transcript: prev.transcript + (Math.random() > 0.95 ? ' ' + generateRandomWord() : '')
        }))
      }, 100)
    } else if (voiceIntervalRef.current) {
      clearInterval(voiceIntervalRef.current)
    }

    return () => {
      if (voiceIntervalRef.current) {
        clearInterval(voiceIntervalRef.current)
      }
    }
  }, [voiceState.isRecording, voiceState.isPaused])

  const generateRandomWord = () => {
    const words = ['analyzing', 'geospatial', 'data', 'patterns', 'urban', 'development', 'flood', 'risk', 'vegetation', 'satellite']
    return words[Math.floor(Math.random() * words.length)]
  }

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
        addToRecentSuggestions(suggestion.text)
      }
    }

    if (e.key === 'Enter') {
      if (e.shiftKey) {
        return
      } else {
        e.preventDefault()
        if (showSuggestions && selectedSuggestionIndex >= 0) {
          const suggestion = filteredSuggestions[selectedSuggestionIndex]
          onChange(suggestion.text)
          setShowSuggestions(false)
          addToRecentSuggestions(suggestion.text)
        } else if (value.trim()) {
          onSend()
        }
      }
    }

    // Enhanced keyboard shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'd':
          e.preventDefault()
          onDeepDiscovery?.()
          break
        case 't':
          e.preventDefault()
          setShowTemplates(!showTemplates)
          break
        case 'r':
          e.preventDefault()
          handleVoiceToggle()
          break
        case 'w':
          e.preventDefault()
          onWebSearchToggle?.(!webSearchEnabled)
          break
      }
    }
  }

  const addToRecentSuggestions = (text: string) => {
    setRecentSuggestions(prev => [text, ...prev.filter(s => s !== text)].slice(0, 5))
  }

  const handleSuggestionClick = (suggestion: Suggestion) => {
    onChange(suggestion.text)
    setShowSuggestions(false)
    addToRecentSuggestions(suggestion.text)
    textareaRef.current?.focus()
  }

  const handleTemplateClick = (template: SmartTemplate) => {
    let promptText = template.prompt
    template.variables.forEach(variable => {
      promptText = promptText.replace(`[${variable}]`, `[${variable}]`)
    })
    onChange(promptText)
    setShowTemplates(false)
    textareaRef.current?.focus()
  }

  const handleVoiceToggle = () => {
    if (voiceState.isRecording) {
      // Stop recording
      setVoiceState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        isProcessing: true
      }))
      
      // Simulate processing
      setTimeout(() => {
        setVoiceState(prev => ({
          ...prev,
          isProcessing: false,
          transcript: prev.transcript || 'Analyze flood risk patterns in Mumbai using recent satellite data'
        }))
        
        // Add transcript to input
        setTimeout(() => {
          onChange(voiceState.transcript || 'Analyze flood risk patterns in Mumbai using recent satellite data')
          setVoiceState(prev => ({
            ...prev,
            transcript: '',
            duration: 0,
            level: 0
          }))
        }, 500)
      }, 2000)
    } else {
      // Start recording
      setVoiceState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0,
        level: 0,
        transcript: '',
        isProcessing: false,
        error: undefined
      }))
    }
  }

  const handleVoicePause = () => {
    setVoiceState(prev => ({ ...prev, isPaused: !prev.isPaused }))
  }

  const handleVoiceReset = () => {
    setVoiceState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      level: 0,
      transcript: '',
      isProcessing: false
    })
  }

  const getSuggestionTypeColor = (type: Suggestion['type']) => {
    switch (type) {
      case 'prompt': return 'text-blue-600'
      case 'command': return 'text-green-600'
      case 'file': return 'text-purple-600'
      case 'template': return 'text-orange-600'
      case 'context': return 'text-pink-600'
      default: return 'text-muted-foreground'
    }
  }

  const formatVoiceDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className={cn("relative", className)}>
      {/* Voice Recording Modal */}
      {voiceState.isRecording && (
        <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm rounded-lg border">
          <div className="flex flex-col items-center justify-center h-full p-6">
            <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-500/30 flex items-center justify-center">
                <Mic className="h-8 w-8 text-red-500" />
              </div>
            </div>
            
            <div className="text-center mb-6">
              <h3 className="font-semibold text-lg mb-2">Voice Recording</h3>
              <p className="text-sm text-muted-foreground">
                {voiceState.isPaused ? 'Recording paused' : 'Listening...'}
              </p>
            </div>

            <div className="w-full max-w-md space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Duration</span>
                <span className="font-mono">{formatVoiceDuration(voiceState.duration)}</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Audio Level</span>
                  <span>{Math.round(voiceState.level)}%</span>
                </div>
                <Progress value={voiceState.level} className="h-2" />
              </div>

              {voiceState.transcript && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Transcript Preview:</span>
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    {voiceState.transcript}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 mt-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleVoicePause}
                disabled={voiceState.isProcessing}
              >
                {voiceState.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleVoiceReset}
                disabled={voiceState.isProcessing}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              
              <Button
                variant="destructive"
                onClick={handleVoiceToggle}
                disabled={voiceState.isProcessing}
                className="px-6"
              >
                {voiceState.isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Stop Recording
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border rounded-lg shadow-lg z-50 max-w-4xl">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold">End-to-End Workflow Templates</h3>
                <p className="text-xs text-muted-foreground">Complete workflows with Python code execution and visualization</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowTemplates(false)}>
                ✕
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {smartTemplates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleTemplateClick(template)}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="text-primary">{template.icon}</div>
                    <div className="font-medium text-sm">{template.name}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {template.description}
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Code className="h-3 w-3" />
                      <span>Python</span>
                      <BarChart3 className="h-3 w-3" />
                      <span>Viz</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Each template includes data access, Python code generation, execution, and visualization</span>
                <div className="flex items-center space-x-2">
                  <kbd className="h-4 select-none items-center gap-1 rounded border bg-muted px-1 font-mono text-[9px] font-medium text-muted-foreground">
                    ⌘T
                  </kbd>
                  <span>to toggle</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div 
          ref={suggestionsRef}
          className="absolute bottom-full left-0 right-0 mb-2 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50"
        >
          <div className="p-2">
            <div className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
              <div className="flex items-center">
                <Command className="h-3 w-3 mr-1" />
                Smart Suggestions • Tab to complete
              </div>
              <div className="flex items-center space-x-2">
                <span>{filteredSuggestions.length} suggestions</span>
                <Button variant="ghost" size="sm" onClick={() => setShowTemplates(true)}>
                  <Sparkles className="h-3 w-3" />
                </Button>
              </div>
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
                <div className="flex items-center space-x-1">
                  <Badge variant="outline" className="text-xs">
                    {suggestion.category || suggestion.type}
                  </Badge>
                  {suggestion.popularity && suggestion.popularity > 90 && (
                    <Sparkles className="h-3 w-3 text-yellow-500" />
                  )}
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
              <Badge variant="secondary" className="text-xs">
                Enhanced suggestions available
              </Badge>
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
            onClick={onFileAttach}
            title="Attach documents"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Voice Input */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 shrink-0",
              voiceState.isRecording && "text-red-500 bg-red-50 dark:bg-red-950/20"
            )}
            onClick={handleVoiceToggle}
            disabled={disabled}
          >
            {voiceState.isRecording ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
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
                    <span className="text-xs">⌘</span>T
                  </kbd>
                  <span className="hidden sm:block text-xs text-muted-foreground">templates</span>
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
              onClick={onDeepDiscovery}
              disabled={!value.trim() || disabled}
            >
              <Search className="h-3 w-3 mr-1" />
              Discovery
              <kbd className="hidden sm:inline-flex h-4 select-none items-center gap-1 rounded border bg-muted px-1 font-mono text-[9px] font-medium text-muted-foreground ml-1">
                ⌘D
              </kbd>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7"
              onClick={() => setShowTemplates(true)}
              disabled={disabled}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Templates
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Web Search Toggle */}
            {onWebSearchToggle && (
              <Button 
                variant={webSearchEnabled ? "default" : "outline"}
                size="sm" 
                className="text-xs h-7"
                onClick={() => onWebSearchToggle(!webSearchEnabled)}
                disabled={disabled}
              >
                <Globe className="h-3 w-3 mr-1" />
                Web Search
                {webSearchEnabled && (
                  <CheckCircle className="h-3 w-3 ml-1 text-green-500" />
                )}
              </Button>
            )}
            
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              {voiceState.isProcessing && (
                <div className="flex items-center space-x-1 text-blue-500">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                  <span>Processing voice...</span>
                </div>
              )}
              <div className="hidden sm:flex items-center space-x-1">
                <span>⌘R record</span>
                <span>•</span>
                <span>⌘D discovery</span>
                <span>•</span>
                <span>⌘W web search</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 