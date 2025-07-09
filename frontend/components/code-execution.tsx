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
  Minimize2,
  MapPin,
  BarChart3,
  FileText,
  Image,
  Database,
  Globe,
  Layers,
  Zap,
  Activity,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  id: string
  type: 'output' | 'error' | 'map' | 'chart' | 'data' | 'file' | 'analysis'
  title: string
  content: string
  timestamp: Date
  metadata?: {
    size?: string
    format?: string
    dimensions?: string
    recordCount?: number
    processingTime?: number
  }
}

interface GISOutput {
  id: string
  type: 'map' | 'chart' | 'data' | 'report'
  title: string
  description: string
  thumbnail?: string
  fileSize: string
  format: string
  downloadUrl?: string
  previewUrl?: string
  metadata: {
    crs?: string
    extent?: [number, number, number, number]
    layerCount?: number
    resolution?: string
    features?: number
  }
}

// Enhanced mock results with realistic GIS analysis
const generateMockGISResults = (code: string): ExecutionResult[] => {
  const results: ExecutionResult[] = []
  
  // Add initial execution output
  results.push({
    id: 'exec_1',
    type: 'output',
    title: 'Initialization',
    content: `🚀 GIS Analysis Environment Started
📦 Loading libraries: geopandas, rasterio, matplotlib, folium
🌍 Coordinate system: WGS84 (EPSG:4326)
💾 Available memory: 8.2GB
🔧 PyQGIS version: 3.28.11
⚡ WhiteboxTools: 518 algorithms loaded`,
    timestamp: new Date(),
    metadata: { processingTime: 0.8 }
  })

  // Analyze code content and generate relevant outputs
  if (code.toLowerCase().includes('flood')) {
    results.push({
      id: 'exec_2',
      type: 'output',
      title: 'Data Loading',
      content: `📊 Loading elevation data from DEM...
   • Source: Copernicus DEM (30m resolution)
   • Extent: 77.5°E-77.7°E, 12.8°N-13.1°N
   • Size: 2048x2048 pixels
   • Vertical datum: EGM2008
   • Processing time: 2.1 seconds`,
      timestamp: new Date(),
      metadata: { processingTime: 2.1, size: '16.7MB', format: 'GeoTIFF' }
    })

    results.push({
      id: 'exec_3',
      type: 'analysis',
      title: 'Flood Risk Analysis',
      content: `🌊 Flood Risk Assessment Results:
   • High risk areas: 234.7 km² (12.4% of study area)
   • Medium risk areas: 456.3 km² (24.1% of study area)
   • Low risk areas: 1,203.6 km² (63.5% of study area)
   • Population at risk: ~127,000 people
   • Critical infrastructure: 23 hospitals, 145 schools
   • Average elevation in risk zones: 8.2m above sea level`,
      timestamp: new Date(),
      metadata: { processingTime: 8.7, recordCount: 15678 }
    })

    results.push({
      id: 'exec_4',
      type: 'map',
      title: 'Interactive Flood Risk Map',
      content: `🗺️ Generated flood risk visualization:
   • Layer 1: Elevation contours (5m intervals)
   • Layer 2: Flood risk zones (categorical)
   • Layer 3: Population density overlay
   • Layer 4: Infrastructure points
   • Interactive features: zoom, pan, layer toggle
   • Export formats: PNG, SVG, PDF, HTML`,
      timestamp: new Date(),
      metadata: { 
        size: '2.3MB', 
        format: 'HTML/Leaflet',
        dimensions: '1920x1080',
        processingTime: 3.4
      }
    })
  }

  if (code.toLowerCase().includes('ndvi') || code.toLowerCase().includes('vegetation')) {
    results.push({
      id: 'exec_5',
      type: 'output',
      title: 'Satellite Data Processing',
      content: `🛰️ Sentinel-2 Data Processing:
   • Date range: 2024-01-01 to 2024-01-31
   • Cloud coverage: <10%
   • Bands processed: B04 (Red), B08 (NIR)
   • Atmospheric correction: Applied
   • Geometric correction: Applied
   • Pixel count: 10,000 x 10,000`,
      timestamp: new Date(),
      metadata: { processingTime: 15.2, size: '450MB', format: 'GeoTIFF' }
    })

    results.push({
      id: 'exec_6',
      type: 'analysis',
      title: 'NDVI Analysis Results',
      content: `🌱 Vegetation Health Assessment:
   • Mean NDVI: 0.67 (Healthy vegetation)
   • Stressed areas: 145.2 km² (8.3% of agricultural land)
   • Optimal growth: 1,234.8 km² (70.1% of agricultural land)
   • Water bodies: 67.4 km² (3.8% of total area)
   • Bare soil/urban: 312.6 km² (17.8% of total area)
   • Trend analysis: +0.03 NDVI increase vs. last year`,
      timestamp: new Date(),
      metadata: { processingTime: 12.1, recordCount: 100000000 }
    })

    results.push({
      id: 'exec_7',
      type: 'chart',
      title: 'NDVI Time Series Analysis',
      content: `📈 Monthly NDVI Trends:
   • Peak vegetation: June 2024 (NDVI: 0.82)
   • Lowest vegetation: December 2023 (NDVI: 0.41)
   • Seasonal variation: 0.41 NDVI units
   • Growing season: March - October
   • Harvest period: November - February
   • Correlation with rainfall: r = 0.87`,
      timestamp: new Date(),
      metadata: { 
        size: '1.2MB', 
        format: 'PNG',
        dimensions: '1600x900',
        processingTime: 4.2
      }
    })
  }

  if (code.toLowerCase().includes('urban') || code.toLowerCase().includes('city')) {
    results.push({
      id: 'exec_8',
      type: 'analysis',
      title: 'Urban Growth Analysis',
      content: `🏙️ Urban Development Metrics (2000-2024):
   • Total urban expansion: 847.3 km² (+156%)
   • Annual growth rate: 6.5% per year
   • Population density increase: 2,340 people/km²
   • Green space reduction: -23.4% (156 km² lost)
   • New infrastructure: 234 km roads, 45 km metro
   • Land use change: 67% agricultural to urban conversion`,
      timestamp: new Date(),
      metadata: { processingTime: 18.5, recordCount: 25000 }
    })

    results.push({
      id: 'exec_9',
      type: 'map',
      title: 'Urban Growth Animation',
      content: `🎬 Time-lapse Urban Development:
   • Time period: 2000-2024 (24 years)
   • Frame rate: 2 frames per year
   • Resolution: 10m per pixel
   • Change detection: Landsat 5/7/8/9 imagery
   • Classification accuracy: 94.2%
   • Export format: MP4, GIF, WebM`,
      timestamp: new Date(),
      metadata: { 
        size: '15.7MB', 
        format: 'MP4',
        dimensions: '1920x1080',
        processingTime: 45.8
      }
    })
  }

  // Always add a final summary
  results.push({
    id: 'exec_final',
    type: 'output',
    title: 'Analysis Complete',
    content: `✅ GIS Analysis Successfully Completed
📊 Total processing time: ${Math.random() * 30 + 10}s
💾 Memory usage: ${Math.random() * 4 + 2}GB
📁 Output files: ${results.length - 1} items generated
🔍 Quality check: All outputs validated
💡 Ready for visualization and export`,
    timestamp: new Date(),
    metadata: { processingTime: Math.random() * 30 + 10 }
  })

  return results
}

const mockGISOutputs: GISOutput[] = [
  {
    id: 'map_1',
    type: 'map',
    title: 'Flood Risk Assessment Map',
    description: 'Interactive map showing flood risk zones with elevation contours and infrastructure overlay',
    thumbnail: '/api/placeholder/300/200',
    fileSize: '2.3MB',
    format: 'HTML/Leaflet',
    downloadUrl: '/downloads/flood_risk_map.html',
    previewUrl: '/previews/flood_risk_map.html',
    metadata: {
      crs: 'EPSG:4326',
      extent: [77.5, 12.8, 77.7, 13.1],
      layerCount: 4,
      resolution: '30m'
    }
  },
  {
    id: 'chart_1',
    type: 'chart',
    title: 'NDVI Time Series',
    description: 'Monthly vegetation index trends with seasonal analysis and rainfall correlation',
    thumbnail: '/api/placeholder/300/200',
    fileSize: '1.2MB',
    format: 'PNG',
    downloadUrl: '/downloads/ndvi_timeseries.png',
    previewUrl: '/previews/ndvi_timeseries.png',
    metadata: {
      resolution: '1600x900',
      features: 12
    }
  },
  {
    id: 'data_1',
    type: 'data',
    title: 'Analysis Results Dataset',
    description: 'Comprehensive dataset with spatial analysis results and statistical summaries',
    thumbnail: '/api/placeholder/300/200',
    fileSize: '15.7MB',
    format: 'GeoPackage',
    downloadUrl: '/downloads/analysis_results.gpkg',
    metadata: {
      crs: 'EPSG:4326',
      features: 15678,
      layerCount: 6
    }
  },
  {
    id: 'report_1',
    type: 'report',
    title: 'Technical Analysis Report',
    description: 'Detailed technical report with methodology, results, and recommendations',
    thumbnail: '/api/placeholder/300/200',
    fileSize: '3.8MB',
    format: 'PDF',
    downloadUrl: '/downloads/technical_report.pdf',
    metadata: {
      features: 1
    }
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
  const [gisOutputs, setGisOutputs] = useState<GISOutput[]>([])
  const [executionProgress, setExecutionProgress] = useState(0)
  const [resourceUsage, setResourceUsage] = useState({
    memory: 0,
    cpu: 0,
    storage: 0
  })

  // Enhanced code execution with realistic GIS simulation
  useEffect(() => {
    if (isExecuting) {
      executeCodeWithGIS()
    }
  }, [isExecuting])

  const executeCodeWithGIS = async () => {
    setExecutionState('running')
    setResults([])
    setCurrentOutput('')
    setGisOutputs([])
    setExecutionProgress(0)
    
    // Generate realistic GIS results based on code content
    const mockResults = generateMockGISResults(code)
    
    // Simulate progressive execution
    for (let i = 0; i < mockResults.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
      
      setResults(prev => [...prev, mockResults[i]])
      setExecutionProgress(((i + 1) / mockResults.length) * 100)
      
      // Simulate resource usage
      setResourceUsage({
        memory: Math.min(30 + (i / mockResults.length) * 50, 80),
        cpu: Math.random() * 40 + 30,
        storage: Math.min(10 + (i / mockResults.length) * 30, 45)
      })
    }
    
    // Add GIS outputs after completion
    if (code.toLowerCase().includes('flood') || code.toLowerCase().includes('ndvi') || code.toLowerCase().includes('urban')) {
      setGisOutputs(mockGISOutputs)
    }
    
    setExecutionState('completed')
    setExecutionProgress(100)
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
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
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
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'map':
        return <MapPin className="h-4 w-4 text-green-500" />
      case 'chart':
        return <BarChart3 className="h-4 w-4 text-purple-500" />
      case 'data':
        return <Database className="h-4 w-4 text-orange-500" />
      case 'analysis':
        return <TrendingUp className="h-4 w-4 text-indigo-500" />
      case 'file':
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getGISOutputIcon = (type: GISOutput['type']) => {
    switch (type) {
      case 'map':
        return <Globe className="h-5 w-5 text-green-500" />
      case 'chart':
        return <BarChart3 className="h-5 w-5 text-purple-500" />
      case 'data':
        return <Database className="h-5 w-5 text-orange-500" />
      case 'report':
        return <FileText className="h-5 w-5 text-blue-500" />
    }
  }

  return (
    <div className={cn("border rounded-lg overflow-hidden bg-card", className)}>
      {/* Code Header */}
      <div className="flex items-center justify-between p-3 bg-muted/30 border-b">
        <div className="flex items-center space-x-3">
          <Code className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">GIS Analysis Environment</span>
          <Badge variant="secondary" className="text-xs">
            {language.toUpperCase()}
          </Badge>
          {getExecutionStatusIcon()}
          {executionState === 'running' && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">Processing...</span>
              <div className="w-16">
                <Progress value={executionProgress} className="h-1" />
              </div>
              <span className="text-xs text-muted-foreground">
                {Math.round(executionProgress)}%
              </span>
            </div>
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
                Execute
              </Button>
            )
          )}
        </div>
      </div>

      {/* Resource Usage Monitor */}
      {executionState === 'running' && (
        <div className="p-3 bg-muted/10 border-b">
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground">Memory</span>
                <span className="font-medium">{resourceUsage.memory.toFixed(1)}%</span>
              </div>
              <Progress value={resourceUsage.memory} className="h-1" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground">CPU</span>
                <span className="font-medium">{resourceUsage.cpu.toFixed(1)}%</span>
              </div>
              <Progress value={resourceUsage.cpu} className="h-1" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground">Storage</span>
                <span className="font-medium">{resourceUsage.storage.toFixed(1)}%</span>
              </div>
              <Progress value={resourceUsage.storage} className="h-1" />
            </div>
          </div>
        </div>
      )}

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

      {/* Execution Results */}
      {(results.length > 0 || executionState === 'running') && (
        <div className="border-t">
          <div className="flex items-center justify-between p-3 bg-muted/20 border-b">
            <div className="flex items-center space-x-2">
              <Terminal className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Execution Log</span>
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
                Export Log
              </Button>
            )}
          </div>
          
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {results.map((result, index) => (
              <div key={result.id} className="p-3 border-b last:border-b-0">
                <div className="flex items-start space-x-3">
                  {getResultIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium">{result.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {result.timestamp.toLocaleTimeString()}
                      </span>
                      {result.metadata?.processingTime && (
                        <Badge variant="outline" className="text-xs">
                          {result.metadata.processingTime}s
                        </Badge>
                      )}
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
                <Zap className="h-4 w-4 animate-pulse" />
                <span>Running GIS analysis...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GIS Outputs */}
      {gisOutputs.length > 0 && (
        <div className="border-t">
          <div className="flex items-center justify-between p-3 bg-muted/20 border-b">
            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Generated Outputs</span>
              <Badge variant="secondary" className="text-xs">
                {gisOutputs.length} items
              </Badge>
            </div>
            
            <Button variant="ghost" size="sm" className="h-8">
              <Download className="h-3 w-3 mr-1" />
              Download All
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-3 p-3">
            {gisOutputs.map((output) => (
              <div key={output.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-start space-x-3">
                  {getGISOutputIcon(output.type)}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium mb-1">{output.title}</h4>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {output.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {output.format}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {output.fileSize}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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