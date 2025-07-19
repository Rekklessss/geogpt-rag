"use client"

import React, { useState, useEffect } from 'react'
import {
  Map,
  BarChart3,
  PieChart,
  LineChart,
  Globe,
  Layers,
  Maximize2,
  Minimize2,
  Download,
  Settings,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  MousePointer,
  Circle,
  Square,

  Ruler,
  Eye,
  EyeOff,
  Filter,
  Palette,
  Info,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Building,
  Droplets,
  Leaf,
  Sun,
  Cloud,
  Wind,
  Thermometer,
  Gauge,
  Target,
  Zap,
  Database,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Navigation,
  Crosshair,
  Grid,
  Compass,
  Share2,
  Bookmark,
  MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface VisualizationDashboardProps {
  isVisible: boolean
  onToggle: () => void
  className?: string
}

interface MapLayer {
  id: string
  name: string
  type: 'base' | 'overlay' | 'analysis'
  visible: boolean
  opacity: number
  icon: React.ReactNode
  description: string
  source: string
  updatedAt: Date
  features?: number
  style?: {
    color: string
    fillColor: string
    weight: number
  }
}

interface ChartData {
  id: string
  name: string
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'timeseries'
  data: any[]
  config: {
    xAxis: string
    yAxis: string
    title: string
    description: string
    color: string
  }
  metadata: {
    dataPoints: number
    lastUpdated: Date
    source: string
    unit: string
  }
}

interface DashboardMetric {
  id: string
  name: string
  value: number
  unit: string
  change: number
  changeType: 'increase' | 'decrease' | 'neutral'
  icon: React.ReactNode
  color: string
  description: string
  trend: number[]
}

interface AnalysisResult {
  id: string
  type: 'spatial' | 'temporal' | 'statistical' | 'predictive'
  title: string
  description: string
  confidence: number
  insights: string[]
  recommendations: string[]
  timestamp: Date
  status: 'completed' | 'running' | 'error'
}

// Mock data for visualization
const mockMapLayers: MapLayer[] = [
  {
    id: 'base_satellite',
    name: 'Satellite Imagery',
    type: 'base',
    visible: true,
    opacity: 1,
    icon: <Globe className="h-4 w-4" />,
    description: 'High-resolution satellite imagery',
    source: 'Sentinel-2',
    updatedAt: new Date('2024-12-15'),
    style: { color: '#3388ff', fillColor: '#3388ff', weight: 2 }
  },
  {
    id: 'flood_zones',
    name: 'Flood Risk Zones',
    type: 'overlay',
    visible: true,
    opacity: 0.7,
    icon: <Droplets className="h-4 w-4" />,
    description: 'Flood risk assessment zones',
    source: 'Hydrological Analysis',
    updatedAt: new Date('2024-12-14'),
    features: 1247,
    style: { color: '#ff4444', fillColor: '#ff4444', weight: 3 }
  },
  {
    id: 'vegetation_health',
    name: 'Vegetation Health (NDVI)',
    type: 'analysis',
    visible: false,
    opacity: 0.6,
    icon: <Leaf className="h-4 w-4" />,
    description: 'Normalized Difference Vegetation Index',
    source: 'Landsat 8',
    updatedAt: new Date('2024-12-13'),
    features: 850000,
    style: { color: '#22c55e', fillColor: '#22c55e', weight: 1 }
  },
  {
    id: 'urban_areas',
    name: 'Urban Development',
    type: 'overlay',
    visible: true,
    opacity: 0.8,
    icon: <Building className="h-4 w-4" />,
    description: 'Urban development patterns',
    source: 'OpenStreetMap',
    updatedAt: new Date('2024-12-12'),
    features: 5678,
    style: { color: '#8b5cf6', fillColor: '#8b5cf6', weight: 2 }
  },
  {
    id: 'population_density',
    name: 'Population Density',
    type: 'analysis',
    visible: false,
    opacity: 0.5,
    icon: <Users className="h-4 w-4" />,
    description: 'Population density distribution',
    source: 'Census Data',
    updatedAt: new Date('2024-12-11'),
    features: 2340,
    style: { color: '#f59e0b', fillColor: '#f59e0b', weight: 1 }
  }
]

const mockChartData: ChartData[] = [
  {
    id: 'ndvi_timeseries',
    name: 'NDVI Time Series',
    type: 'timeseries',
    data: [
      { date: '2024-01', value: 0.65 },
      { date: '2024-02', value: 0.68 },
      { date: '2024-03', value: 0.72 },
      { date: '2024-04', value: 0.78 },
      { date: '2024-05', value: 0.82 },
      { date: '2024-06', value: 0.85 },
      { date: '2024-07', value: 0.83 },
      { date: '2024-08', value: 0.79 },
      { date: '2024-09', value: 0.75 },
      { date: '2024-10', value: 0.71 },
      { date: '2024-11', value: 0.67 },
      { date: '2024-12', value: 0.63 }
    ],
    config: {
      xAxis: 'date',
      yAxis: 'value',
      title: 'Vegetation Health Over Time',
      description: 'Monthly NDVI values showing seasonal vegetation patterns',
      color: '#22c55e'
    },
    metadata: {
      dataPoints: 12,
      lastUpdated: new Date('2024-12-15'),
      source: 'Landsat 8',
      unit: 'NDVI'
    }
  },
  {
    id: 'flood_risk_distribution',
    name: 'Flood Risk Distribution',
    type: 'pie',
    data: [
      { category: 'High Risk', value: 23, color: '#ef4444' },
      { category: 'Medium Risk', value: 45, color: '#f59e0b' },
      { category: 'Low Risk', value: 32, color: '#22c55e' }
    ],
    config: {
      xAxis: 'category',
      yAxis: 'value',
      title: 'Flood Risk Zone Distribution',
      description: 'Percentage distribution of flood risk zones',
      color: '#ef4444'
    },
    metadata: {
      dataPoints: 3,
      lastUpdated: new Date('2024-12-14'),
      source: 'Hydrological Model',
      unit: '%'
    }
  },
  {
    id: 'population_growth',
    name: 'Population Growth',
    type: 'bar',
    data: [
      { year: '2020', population: 1234567 },
      { year: '2021', population: 1289456 },
      { year: '2022', population: 1345678 },
      { year: '2023', population: 1402345 },
      { year: '2024', population: 1459876 }
    ],
    config: {
      xAxis: 'year',
      yAxis: 'population',
      title: 'Population Growth Trend',
      description: 'Annual population growth in the study area',
      color: '#3b82f6'
    },
    metadata: {
      dataPoints: 5,
      lastUpdated: new Date('2024-12-13'),
      source: 'Census Bureau',
      unit: 'people'
    }
  }
]

const mockDashboardMetrics: DashboardMetric[] = [
  {
    id: 'total_area',
    name: 'Total Area Analyzed',
    value: 1247.5,
    unit: 'km²',
    change: 12.5,
    changeType: 'increase',
    icon: <Map className="h-4 w-4" />,
    color: '#3b82f6',
    description: 'Total geographical area under analysis',
    trend: [1100, 1150, 1200, 1235, 1247.5]
  },
  {
    id: 'vegetation_health',
    name: 'Avg Vegetation Health',
    value: 0.73,
    unit: 'NDVI',
    change: -0.05,
    changeType: 'decrease',
    icon: <Leaf className="h-4 w-4" />,
    color: '#22c55e',
    description: 'Average NDVI across all vegetation areas',
    trend: [0.78, 0.76, 0.75, 0.74, 0.73]
  },
  {
    id: 'flood_risk_areas',
    name: 'High Risk Areas',
    value: 287.2,
    unit: 'km²',
    change: 15.8,
    changeType: 'increase',
    icon: <Droplets className="h-4 w-4" />,
    color: '#ef4444',
    description: 'Areas classified as high flood risk',
    trend: [250, 260, 270, 280, 287.2]
  },
  {
    id: 'population_density',
    name: 'Population Density',
    value: 1170,
    unit: 'people/km²',
    change: 45,
    changeType: 'increase',
    icon: <Users className="h-4 w-4" />,
    color: '#f59e0b',
    description: 'Average population density',
    trend: [1100, 1125, 1145, 1160, 1170]
  },
  {
    id: 'urban_growth',
    name: 'Urban Expansion',
    value: 156.7,
    unit: 'km²',
    change: 8.3,
    changeType: 'increase',
    icon: <Building className="h-4 w-4" />,
    color: '#8b5cf6',
    description: 'New urban development area',
    trend: [140, 145, 150, 155, 156.7]
  },
  {
    id: 'data_accuracy',
    name: 'Data Accuracy',
    value: 94.2,
    unit: '%',
    change: 1.2,
    changeType: 'increase',
    icon: <Target className="h-4 w-4" />,
    color: '#06b6d4',
    description: 'Overall data accuracy score',
    trend: [92, 93, 93.5, 94, 94.2]
  }
]

const mockAnalysisResults: AnalysisResult[] = [
  {
    id: 'flood_analysis',
    type: 'spatial',
    title: 'Flood Risk Assessment',
    description: 'Comprehensive flood risk analysis using elevation, rainfall, and drainage data',
    confidence: 89,
    insights: [
      'High risk areas increased by 15.8% compared to last year',
      'Drainage infrastructure insufficient in 12 districts',
      'Monsoon season shows 67% higher flood probability'
    ],
    recommendations: [
      'Improve drainage systems in high-risk zones',
      'Implement early warning systems',
      'Relocate vulnerable populations'
    ],
    timestamp: new Date('2024-12-15T10:30:00'),
    status: 'completed'
  },
  {
    id: 'vegetation_analysis',
    type: 'temporal',
    title: 'Vegetation Health Monitoring',
    description: 'NDVI-based vegetation health assessment over 12-month period',
    confidence: 92,
    insights: [
      'Vegetation health declined by 6.8% during drought period',
      'Agricultural areas show seasonal stress patterns',
      'Forest cover remains stable at 78.5%'
    ],
    recommendations: [
      'Implement irrigation systems in stressed areas',
      'Monitor crop health during dry seasons',
      'Protect existing forest cover'
    ],
    timestamp: new Date('2024-12-14T14:15:00'),
    status: 'completed'
  },
  {
    id: 'urban_growth_analysis',
    type: 'predictive',
    title: 'Urban Growth Prediction',
    description: 'Predicting urban expansion patterns for next 5 years',
    confidence: 76,
    insights: [
      'Urban area expected to grow by 23% by 2029',
      'Residential development trending towards north',
      'Infrastructure development required for 45,000 new residents'
    ],
    recommendations: [
      'Plan infrastructure development proactively',
      'Preserve green corridors during expansion',
      'Implement sustainable urban planning practices'
    ],
    timestamp: new Date('2024-12-13T16:45:00'),
    status: 'running'
  }
]

export function VisualizationDashboard({ isVisible, onToggle, className }: VisualizationDashboardProps) {
  const [selectedTab, setSelectedTab] = useState<'map' | 'charts' | 'dashboard' | 'analysis'>('map')
  const [mapLayers, setMapLayers] = useState<MapLayer[]>(mockMapLayers)
  const [chartData] = useState<ChartData[]>(mockChartData)
  const [dashboardMetrics] = useState<DashboardMetric[]>(mockDashboardMetrics)
  const [analysisResults] = useState<AnalysisResult[]>(mockAnalysisResults)
  const [mapTool, setMapTool] = useState<'pan' | 'zoom' | 'measure' | 'select'>('pan')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedChart, setSelectedChart] = useState<string | null>(null)
  const [animationPlaying, setAnimationPlaying] = useState(false)
  
  // Simulate real-time updates
  useEffect(() => {
    if (!isVisible) return
    
    const interval = setInterval(() => {
      // Update metrics with small variations
      // This would be replaced with real data updates
    }, 5000)
    
    return () => clearInterval(interval)
  }, [isVisible])

  const toggleLayerVisibility = (layerId: string) => {
    setMapLayers(prev => prev.map(layer => 
      layer.id === layerId 
        ? { ...layer, visible: !layer.visible }
        : layer
    ))
  }

  const updateLayerOpacity = (layerId: string, opacity: number) => {
    setMapLayers(prev => prev.map(layer => 
      layer.id === layerId 
        ? { ...layer, opacity }
        : layer
    ))
  }

  const getMetricIcon = (changeType: DashboardMetric['changeType']) => {
    switch (changeType) {
      case 'increase': return <TrendingUp className="h-3 w-3 text-green-500" />
      case 'decrease': return <TrendingDown className="h-3 w-3 text-red-500" />
      default: return <Activity className="h-3 w-3 text-gray-500" />
    }
  }

  const getAnalysisStatusIcon = (status: AnalysisResult['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'running': return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  if (!isVisible) return null

  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-background",
      isFullscreen ? "m-0" : "m-4 rounded-lg border shadow-lg"
    )}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Visualization Dashboard</h2>
            </div>
            
            <div className="flex items-center space-x-1">
              <Button
                variant={selectedTab === 'map' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedTab('map')}
              >
                <Map className="h-4 w-4 mr-1" />
                Map
              </Button>
              <Button
                variant={selectedTab === 'charts' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedTab('charts')}
              >
                <LineChart className="h-4 w-4 mr-1" />
                Charts
              </Button>
              <Button
                variant={selectedTab === 'dashboard' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedTab('dashboard')}
              >
                <Gauge className="h-4 w-4 mr-1" />
                Dashboard
              </Button>
              <Button
                variant={selectedTab === 'analysis' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedTab('analysis')}
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Analysis
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onToggle}>
              ✕
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {selectedTab === 'map' && (
            <div className="flex h-full">
              {/* Map Controls Sidebar */}
              <div className="w-80 border-r bg-muted/30 overflow-y-auto">
                <div className="p-4 space-y-4">
                  {/* Map Tools */}
                  <div>
                    <h3 className="font-medium mb-2">Map Tools</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={mapTool === 'pan' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMapTool('pan')}
                      >
                        <Move className="h-4 w-4 mr-1" />
                        Pan
                      </Button>
                      <Button
                        variant={mapTool === 'zoom' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMapTool('zoom')}
                      >
                        <ZoomIn className="h-4 w-4 mr-1" />
                        Zoom
                      </Button>
                      <Button
                        variant={mapTool === 'measure' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMapTool('measure')}
                      >
                        <Ruler className="h-4 w-4 mr-1" />
                        Measure
                      </Button>
                      <Button
                        variant={mapTool === 'select' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMapTool('select')}
                      >
                        <MousePointer className="h-4 w-4 mr-1" />
                        Select
                      </Button>
                    </div>
                  </div>

                  {/* Map Layers */}
                  <div>
                    <h3 className="font-medium mb-2">Map Layers</h3>
                    <div className="space-y-2">
                      {mapLayers.map((layer) => (
                        <div key={layer.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="text-muted-foreground">{layer.icon}</div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{layer.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {layer.features && `${layer.features.toLocaleString()} features`}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleLayerVisibility(layer.id)}
                              className="h-6 w-6"
                            >
                              {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            </Button>
                          </div>
                          
                          {layer.visible && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span>Opacity</span>
                                <span>{Math.round(layer.opacity * 100)}%</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={layer.opacity}
                                onChange={(e) => updateLayerOpacity(layer.id, parseFloat(e.target.value))}
                                className="w-full"
                              />
                            </div>
                          )}
                          
                          <div className="text-xs text-muted-foreground mt-1">
                            {layer.description}
                          </div>
                          
                          <div className="flex items-center justify-between mt-2">
                            <Badge variant="outline" className="text-xs">
                              {layer.type}
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              {layer.updatedAt.toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Animation Controls */}
                  <div>
                    <h3 className="font-medium mb-2">Time Animation</h3>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Temporal Analysis</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setAnimationPlaying(!animationPlaying)}
                          className="h-6 w-6"
                        >
                          {animationPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span>2020</span>
                          <span>2024</span>
                        </div>
                        <input
                          type="range"
                          min="2020"
                          max="2024"
                          value="2024"
                          className="w-full"
                        />
                        <div className="text-xs text-muted-foreground text-center">
                          Current: December 2024
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map Display */}
              <div className="flex-1 relative bg-gray-100">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Map className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600">Interactive Map</h3>
                    <p className="text-sm text-gray-500">
                      Geospatial visualization with {mapLayers.filter(l => l.visible).length} active layers
                    </p>
                    <div className="mt-4 flex items-center justify-center space-x-2">
                      <Badge variant="secondary">
                        Tool: {mapTool}
                      </Badge>
                      <Badge variant="secondary">
                        Zoom: 12
                      </Badge>
                      <Badge variant="secondary">
                        Coordinates: 12.97°N, 77.59°E
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Map Overlay Controls */}
                <div className="absolute top-4 right-4 space-y-2">
                  <div className="bg-white rounded-lg border p-2 shadow-sm">
                    <div className="flex flex-col space-y-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Navigation className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Compass className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg border p-2 shadow-sm">
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Bookmark className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Scale and Coordinates */}
                <div className="absolute bottom-4 left-4 bg-white rounded-lg border p-2 shadow-sm">
                  <div className="flex items-center space-x-4 text-xs">
                    <div className="flex items-center space-x-1">
                      <Ruler className="h-3 w-3" />
                      <span>1:50,000</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3" />
                      <span>12.97°N, 77.59°E</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'charts' && (
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {chartData.map((chart) => (
                  <div key={chart.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium">{chart.config.title}</h3>
                        <p className="text-sm text-muted-foreground">{chart.config.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedChart(selectedChart === chart.id ? null : chart.id)}
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center mb-4">
                      <div className="text-center">
                        {chart.type === 'timeseries' && <LineChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />}
                        {chart.type === 'bar' && <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />}
                        {chart.type === 'pie' && <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />}
                        <p className="text-sm text-gray-500">
                          {chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart
                        </p>
                        <p className="text-xs text-gray-400">
                          {chart.metadata.dataPoints} data points
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Database className="h-3 w-3" />
                        <span>{chart.metadata.source}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-3 w-3" />
                        <span>{chart.metadata.lastUpdated.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTab === 'dashboard' && (
            <div className="p-6 overflow-y-auto">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {dashboardMetrics.map((metric) => (
                  <div key={metric.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div style={{ color: metric.color }}>{metric.icon}</div>
                        <span className="text-sm font-medium">{metric.name}</span>
                      </div>
                      {getMetricIcon(metric.changeType)}
                    </div>
                    
                    <div className="flex items-baseline space-x-2 mb-2">
                      <span className="text-2xl font-bold">{formatNumber(metric.value)}</span>
                      <span className="text-sm text-muted-foreground">{metric.unit}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1 text-xs">
                      <span className={cn(
                        "font-medium",
                        metric.changeType === 'increase' ? 'text-green-600' :
                        metric.changeType === 'decrease' ? 'text-red-600' : 'text-gray-600'
                      )}>
                        {metric.changeType === 'increase' ? '+' : metric.changeType === 'decrease' ? '-' : ''}
                        {Math.abs(metric.change)} {metric.unit}
                      </span>
                      <span className="text-muted-foreground">vs last period</span>
                    </div>
                    
                    <div className="mt-3 h-12 bg-gray-50 rounded flex items-center justify-center">
                      <div className="text-xs text-gray-500">Mini trend chart</div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-2">{metric.description}</p>
                  </div>
                ))}
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-4">Data Quality Overview</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Spatial Accuracy</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={94} className="w-20" />
                        <span className="text-sm font-medium">94%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Temporal Coverage</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={87} className="w-20" />
                        <span className="text-sm font-medium">87%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Data Completeness</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={96} className="w-20" />
                        <span className="text-sm font-medium">96%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-4">Processing Status</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Completed Analyses</span>
                      </div>
                      <span className="text-sm font-medium">47</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Activity className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">Running Processes</span>
                      </div>
                      <span className="text-sm font-medium">3</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">Pending Reviews</span>
                      </div>
                      <span className="text-sm font-medium">8</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'analysis' && (
            <div className="p-6 overflow-y-auto">
              <div className="space-y-4">
                {analysisResults.map((result) => (
                  <div key={result.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start space-x-3">
                        {getAnalysisStatusIcon(result.status)}
                        <div>
                          <h3 className="font-medium">{result.title}</h3>
                          <p className="text-sm text-muted-foreground">{result.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {result.type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {result.confidence}% confidence
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2">Key Insights</h4>
                        <ul className="space-y-1 text-sm">
                          {result.insights.map((insight, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-muted-foreground">{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm mb-2">Recommendations</h4>
                        <ul className="space-y-1 text-sm">
                          {result.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <div className="w-1 h-1 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-muted-foreground">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-3 w-3" />
                        <span>{result.timestamp.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Download className="h-3 w-3 mr-1" />
                          Export
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 