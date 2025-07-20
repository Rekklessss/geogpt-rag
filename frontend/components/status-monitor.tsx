"use client"

import React, { useState, useEffect } from 'react'
import {
  Wifi,
  WifiOff,
  Server,
  Database,
  Brain,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Activity,
  Zap,
  Globe,
  Shield,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Bell,
  Settings,
  Info,
  ExternalLink,
  BarChart3,
  PieChart,
  GitBranch,
  Calendar,
  Users,
  Layers
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { statusService, handleApiError } from '@/lib/api'
import { getServiceEndpoint } from '@/lib/config'

interface StatusMonitorProps {
  isVisible: boolean
  onToggle: () => void
  className?: string
}

interface ServiceStatus {
  id: string
  name: string
  status: 'online' | 'offline' | 'degraded' | 'maintenance'
  responseTime: number
  uptime: number
  lastChecked: Date
  endpoint: string
  icon: React.ReactNode
  description: string
  version: string
  region: string
  dependencies: string[]
  metrics?: {
    requestCount: number
    errorRate: number
    avgResponseTime: number
    throughput: number
    activeConnections: number
  }
  healthChecks?: {
    database: boolean
    memory: boolean
    disk: boolean
    network: boolean
  }
  resources?: {
    cpu: number
    memory: number
    disk: number
    network: number
  }
  alerts?: Alert[]
}

interface Alert {
  id: string
  type: 'error' | 'warning' | 'info'
  message: string
  timestamp: Date
  resolved: boolean
}

interface SystemInfo {
  version: string
  buildNumber: string
  deploymentDate: Date
  environment: string
  region: string
  totalUsers: number
  activeUsers: number
  totalRequests: number
  errorRate: number
  averageResponseTime: number
  lastDeployment: Date
}

// Enhanced mock data with realistic single-user metrics
const mockSystemInfo: SystemInfo = {
  version: '1.2.3',
  buildNumber: '20250709.1',
  deploymentDate: new Date('2025-07-09T10:30:00Z'),
  environment: 'Development',
  region: 'Local',
  totalUsers: 1,
  activeUsers: 1,
  totalRequests: 47,
  errorRate: 0.0,
  averageResponseTime: 235,
  lastDeployment: new Date('2025-07-09T10:30:00Z')
}

const mockAlerts: Alert[] = [
  {
    id: 'alert_1',
    type: 'warning',
    message: 'Code execution service showing elevated response times',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    resolved: false
  },
  {
    id: 'alert_2',
    type: 'info',
    message: 'Scheduled maintenance completed successfully',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    resolved: true
  }
]

const mockServices: ServiceStatus[] = [
  {
    id: 'embedding',
    name: 'GeoEmbedding API',
    status: 'online',
    responseTime: 124,
    uptime: 99.8,
    lastChecked: new Date(),
    endpoint: getServiceEndpoint('embedding'),
    icon: <Database className="h-4 w-4" />,
    description: 'Text embedding service for geospatial documents',
    version: '2.1.0',
    region: 'us-east-1',
    dependencies: ['vector-db'],
    metrics: {
      requestCount: 23,
      errorRate: 0.0,
      avgResponseTime: 135,
      throughput: 3,
      activeConnections: 1
    },
    healthChecks: {
      database: true,
      memory: true,
      disk: true,
      network: true
    },
    resources: {
      cpu: 23.4,
      memory: 67.8,
      disk: 34.2,
      network: 12.1
    },
    alerts: []
  },
  {
    id: 'reranking',
    name: 'GeoReranker API',
    status: 'online',
    responseTime: 89,
    uptime: 99.9,
    lastChecked: new Date(),
    endpoint: getServiceEndpoint('reranking'),
    icon: <Activity className="h-4 w-4" />,
    description: 'Document reranking service for relevance scoring',
    version: '1.8.2',
    region: 'us-east-1',
    dependencies: ['embedding'],
    metrics: {
      requestCount: 17,
      errorRate: 0.0,
      avgResponseTime: 98,
      throughput: 2,
      activeConnections: 1
    },
    healthChecks: {
      database: true,
      memory: true,
      disk: true,
      network: true
    },
    resources: {
      cpu: 18.7,
      memory: 45.3,
      disk: 22.1,
      network: 8.9
    },
    alerts: []
  },
  {
    id: 'geogpt',
    name: 'GeoGPT Model',
    status: 'online',
    responseTime: 2340,
    uptime: 99.5,
    lastChecked: new Date(),
    endpoint: 'sagemaker.us-east-1.amazonaws.com',
    icon: <Brain className="h-4 w-4" />,
    description: 'Large language model for geospatial analysis',
    version: '1.0.0',
    region: 'us-east-1',
    dependencies: ['embedding', 'reranking', 'vector-db'],
    metrics: {
      requestCount: 12,
      errorRate: 0.0,
      avgResponseTime: 2456,
      throughput: 2,
      activeConnections: 1
    },
    healthChecks: {
      database: true,
      memory: true,
      disk: true,
      network: true
    },
    resources: {
      cpu: 78.2,
      memory: 89.4,
      disk: 45.6,
      network: 34.5
    },
    alerts: []
  },
  {
    id: 'vector-db',
    name: 'Vector Database',
    status: 'online',
    responseTime: 45,
    uptime: 99.9,
    lastChecked: new Date(),
    endpoint: 'zilliz.cloud',
    icon: <Server className="h-4 w-4" />,
    description: 'Vector storage for document embeddings',
    version: '2.3.1',
    region: 'us-west-1',
    dependencies: [],
    metrics: {
      requestCount: 35,
      errorRate: 0.0,
      avgResponseTime: 52,
      throughput: 4,
      activeConnections: 1
    },
    healthChecks: {
      database: true,
      memory: true,
      disk: true,
      network: true
    },
    resources: {
      cpu: 12.3,
      memory: 56.7,
      disk: 78.9,
      network: 23.4
    },
    alerts: []
  },
  {
    id: 'code-execution',
    name: 'Code Execution',
    status: 'degraded',
    responseTime: 3200,
    uptime: 95.2,
    lastChecked: new Date(),
    endpoint: getServiceEndpoint('geogpt'),
    icon: <Zap className="h-4 w-4" />,
    description: 'Python code execution environment',
    version: '1.5.0',
    region: 'us-east-1',
    dependencies: ['geogpt'],
    metrics: {
      requestCount: 3,
      errorRate: 0.0,
      avgResponseTime: 3200,
      throughput: 1,
      activeConnections: 1
    },
    healthChecks: {
      database: true,
      memory: false,
      disk: true,
      network: true
    },
    resources: {
      cpu: 89.2,
      memory: 94.5,
      disk: 67.3,
      network: 45.1
    },
    alerts: [mockAlerts[0]]
  },
  {
    id: 'web-search',
    name: 'Web Search API',
    status: 'online',
    responseTime: 567,
    uptime: 98.7,
    lastChecked: new Date(),
    endpoint: 'search.api.service.com',
    icon: <Globe className="h-4 w-4" />,
    description: 'Web search integration for real-time information',
    version: '3.2.1',
    region: 'global',
    dependencies: [],
    metrics: {
      requestCount: 8,
      errorRate: 0.0,
      avgResponseTime: 567,
      throughput: 1,
      activeConnections: 1
    },
    healthChecks: {
      database: true,
      memory: true,
      disk: true,
      network: true
    },
    resources: {
      cpu: 34.5,
      memory: 67.2,
      disk: 23.8,
      network: 56.3
    },
    alerts: []
  }
]

export function StatusMonitor({ isVisible, onToggle, className }: StatusMonitorProps) {
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [selectedTab, setSelectedTab] = useState<'services' | 'system' | 'alerts'>('services')
  const [expandedService, setExpandedService] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch real system health data
  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('http://54.224.133.45:8812/health')
      if (response.ok) {
        const data = await response.json()
        
        // Transform backend health data to frontend format
        const transformedServices: ServiceStatus[] = Object.entries(data.services || {}).map(([key, status]) => ({
          id: key,
          name: getServiceDisplayName(key),
          status: status === 'online' ? 'online' : status === 'offline' ? 'offline' : 'degraded',
          responseTime: Math.random() * 300 + 50, // Mock response time for now
          uptime: status === 'online' ? 99.9 : 95.0,
          lastChecked: new Date(),
          endpoint: getServiceEndpoint(key),
          icon: getServiceIcon(key),
          description: getServiceDescription(key),
          version: '1.0.0',
          region: 'us-east-1',
          dependencies: [],
          metrics: {
            requestCount: Math.floor(Math.random() * 1000),
            errorRate: 0.1,
            avgResponseTime: Math.random() * 300 + 50,
            throughput: Math.random() * 100,
            activeConnections: 1
          }
        }))

        setServices(transformedServices)
        
        // Update system info
        const transformedSystemInfo: SystemInfo = {
          version: data.version || '1.0.0',
          buildNumber: '20250720.1',
          deploymentDate: new Date(),
          environment: 'EC2 Production',
          region: 'us-east-1',
          totalUsers: 1,
          activeUsers: 1,
          totalRequests: Math.floor(Math.random() * 1000),
          errorRate: 0.0,
          averageResponseTime: Math.random() * 300 + 100,
          lastDeployment: new Date()
        }
        
        setSystemInfo(transformedSystemInfo)
        setLastUpdate(new Date())
        
        // Generate alerts based on service status
        const newAlerts: Alert[] = []
        transformedServices.forEach(service => {
          if (service.status === 'offline') {
            newAlerts.push({
              id: `alert_${service.id}`,
              type: 'error',
              message: `${service.name} is currently offline`,
              timestamp: new Date(),
              resolved: false
            })
          } else if (service.status === 'degraded') {
            newAlerts.push({
              id: `alert_${service.id}`,
              type: 'warning',
              message: `${service.name} is experiencing issues`,
              timestamp: new Date(),
              resolved: false
            })
          }
        })
        setAlerts(newAlerts)
        
      } else {
        console.error('Failed to fetch health data')
      }
    } catch (error) {
      console.error('Error fetching system health:', error)
      // Fallback to showing offline status
      setServices([{
        id: 'connection',
        name: 'Backend Connection',
        status: 'offline',
        responseTime: 0,
        uptime: 0,
        lastChecked: new Date(),
        endpoint: 'http://54.224.133.45:8812',
        icon: <WifiOff className="h-4 w-4" />,
        description: 'Unable to connect to backend services',
        version: 'unknown',
        region: 'unknown',
        dependencies: []
      }])
    } finally {
      setLoading(false)
    }
  }

  // Helper functions to transform service names
  const getServiceDisplayName = (key: string) => {
    const names: Record<string, string> = {
      'embedding': 'GeoEmbedding API',
      'reranking': 'GeoReranking API', 
      'rag_system': 'RAG Pipeline',
      'llm': 'LLM Service'
    }
    return names[key] || key
  }

  const getServiceIcon = (key: string) => {
    const icons: Record<string, React.ReactNode> = {
      'embedding': <Database className="h-4 w-4" />,
      'reranking': <Layers className="h-4 w-4" />,
      'rag_system': <Brain className="h-4 w-4" />,
      'llm': <Zap className="h-4 w-4" />
    }
    return icons[key] || <Server className="h-4 w-4" />
  }

  const getServiceDescription = (key: string) => {
    const descriptions: Record<string, string> = {
      'embedding': 'Text embedding service for geospatial documents',
      'reranking': 'Document reranking and relevance scoring',
      'rag_system': 'Retrieval-Augmented Generation pipeline',
      'llm': 'Large Language Model processing service'
    }
    return descriptions[key] || 'System service'
  }

  const getServiceEndpoint = (key: string) => {
    const ports: Record<string, string> = {
      'embedding': '8810',
      'reranking': '8811', 
      'rag_system': '8812',
      'llm': '8812'
    }
    return `http://54.224.133.45:${ports[key] || '8812'}`
  }

  // Fetch data on mount and when visible
  useEffect(() => {
    if (!isVisible) return

    fetchSystemHealth()
    const interval = setInterval(fetchSystemHealth, 10000) // Refresh every 10 seconds

    return () => clearInterval(interval)
  }, [isVisible])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchSystemHealth()
    setIsRefreshing(false)
  }

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'online': return 'text-green-500'
      case 'degraded': return 'text-yellow-500'
      case 'offline': return 'text-red-500'
      case 'maintenance': return 'text-blue-500'
    }
  }

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'online': return <CheckCircle className="h-4 w-4" />
      case 'degraded': return <AlertTriangle className="h-4 w-4" />
      case 'offline': return <WifiOff className="h-4 w-4" />
      case 'maintenance': return <Clock className="h-4 w-4" />
    }
  }

  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime < 100) return 'text-green-600'
    if (responseTime < 500) return 'text-yellow-600'
    if (responseTime < 2000) return 'text-orange-600'
    return 'text-red-600'
  }

  const getResourceColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-600'
    if (percentage < 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info': return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const overallHealth = services.filter(s => s.status === 'online').length / services.length * 100
  const unreadAlerts = alerts.filter(a => !a.resolved).length

  if (!isVisible) return null

  return (
    <div className={cn("fixed inset-y-0 right-0 w-96 bg-background border-l shadow-lg z-40", className)}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">System Monitor</h2>
            {unreadAlerts > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadAlerts}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8">
              ✕
            </Button>
          </div>
        </div>

        {/* Overall Health */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">System Health</span>
            <div className="flex items-center space-x-2">
              <span className={cn(
                "text-sm font-medium",
                overallHealth >= 95 ? "text-green-600" :
                overallHealth >= 85 ? "text-yellow-600" : "text-red-600"
              )}>
                {Math.round(overallHealth)}%
              </span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <Progress value={overallHealth} className="mb-2" />
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <span>{services.filter(s => s.status === 'online').length} of {services.length} services online</span>
            </div>
            <div>
              <span>{systemInfo?.activeUsers || 0} active users</span>
            </div>
            <div>
              <span>Avg response: {Math.round(systemInfo?.averageResponseTime || 0)}ms</span>
            </div>
            <div>
              <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setSelectedTab('services')}
            className={cn(
              "flex-1 px-4 py-2 text-sm font-medium transition-colors",
              selectedTab === 'services' 
                ? "border-b-2 border-primary bg-primary/5" 
                : "hover:bg-muted/50"
            )}
          >
            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4" />
              <span>Services</span>
            </div>
          </button>
          <button
            onClick={() => setSelectedTab('system')}
            className={cn(
              "flex-1 px-4 py-2 text-sm font-medium transition-colors",
              selectedTab === 'system' 
                ? "border-b-2 border-primary bg-primary/5" 
                : "hover:bg-muted/50"
            )}
          >
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>System</span>
            </div>
          </button>
          <button
            onClick={() => setSelectedTab('alerts')}
            className={cn(
              "flex-1 px-4 py-2 text-sm font-medium transition-colors",
              selectedTab === 'alerts' 
                ? "border-b-2 border-primary bg-primary/5" 
                : "hover:bg-muted/50"
            )}
          >
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span>Alerts</span>
              {unreadAlerts > 0 && (
                <Badge variant="destructive" className="text-xs h-4 w-4 p-0 flex items-center justify-center">
                  {unreadAlerts}
                </Badge>
              )}
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {selectedTab === 'services' && (
            <div>
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">Loading services...</div>
              ) : services.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No services found.</div>
              ) : (
                services.map((service) => (
                  <div key={service.id} className="border-b">
                    <div 
                      className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setExpandedService(expandedService === service.id ? null : service.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className={getStatusColor(service.status)}>
                            {service.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-sm">{service.name}</h3>
                              <Badge variant="outline" className="text-xs">
                                v{service.version}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{service.description}</p>
                          </div>
                        </div>
                        <div className={cn("flex items-center space-x-1", getStatusColor(service.status))}>
                          {getStatusIcon(service.status)}
                          <span className="text-xs font-medium capitalize">{service.status}</span>
                        </div>
                      </div>

                      {/* Quick metrics */}
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Response</span>
                          <div className={cn("font-medium", getResponseTimeColor(service.responseTime))}>
                            {service.status === 'offline' ? 'N/A' : `${Math.round(service.responseTime)}ms`}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Uptime</span>
                          <div className={cn(
                            "font-medium",
                            service.uptime > 99 ? "text-green-600" : 
                            service.uptime > 95 ? "text-yellow-600" : "text-red-600"
                          )}>
                            {service.uptime.toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Region</span>
                          <div className="font-medium">{service.region}</div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedService === service.id && (
                      <div className="px-4 pb-4 bg-muted/20 border-t">
                        {/* Resource Usage */}
                        {service.resources && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2">Resource Usage</h4>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center space-x-1">
                                    <Cpu className="h-3 w-3" />
                                    <span>CPU</span>
                                  </div>
                                  <span className={cn("font-medium", getResourceColor(service.resources.cpu))}>
                                    {service.resources.cpu.toFixed(1)}%
                                  </span>
                                </div>
                                <Progress value={service.resources.cpu} className="h-1" />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center space-x-1">
                                    <MemoryStick className="h-3 w-3" />
                                    <span>Memory</span>
                                  </div>
                                  <span className={cn("font-medium", getResourceColor(service.resources.memory))}>
                                    {service.resources.memory.toFixed(1)}%
                                  </span>
                                </div>
                                <Progress value={service.resources.memory} className="h-1" />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center space-x-1">
                                    <HardDrive className="h-3 w-3" />
                                    <span>Disk</span>
                                  </div>
                                  <span className={cn("font-medium", getResourceColor(service.resources.disk))}>
                                    {service.resources.disk.toFixed(1)}%
                                  </span>
                                </div>
                                <Progress value={service.resources.disk} className="h-1" />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center space-x-1">
                                    <Network className="h-3 w-3" />
                                    <span>Network</span>
                                  </div>
                                  <span className={cn("font-medium", getResourceColor(service.resources.network))}>
                                    {service.resources.network.toFixed(1)}%
                                  </span>
                                </div>
                                <Progress value={service.resources.network} className="h-1" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Health Checks */}
                        {service.healthChecks && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2">Health Checks</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {Object.entries(service.healthChecks).map(([check, status]) => (
                                <div key={check} className="flex items-center space-x-2">
                                  {status ? (
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <AlertCircle className="h-3 w-3 text-red-500" />
                                  )}
                                  <span className="capitalize">{check}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Detailed Metrics */}
                        {service.metrics && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2">Performance Metrics</h4>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-muted-foreground">Requests</span>
                                <div className="font-medium">{service.metrics.requestCount.toLocaleString()}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Throughput</span>
                                <div className="font-medium">{service.metrics.throughput}/min</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Error Rate</span>
                                <div className={cn(
                                  "font-medium",
                                  service.metrics.errorRate < 1 ? "text-green-600" :
                                  service.metrics.errorRate < 5 ? "text-yellow-600" : "text-red-600"
                                )}>
                                  {service.metrics.errorRate.toFixed(1)}%
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Connections</span>
                                <div className="font-medium">{service.metrics.activeConnections}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Dependencies */}
                        {service.dependencies.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2">Dependencies</h4>
                            <div className="flex flex-wrap gap-1">
                              {service.dependencies.map((dep) => (
                                <Badge key={dep} variant="outline" className="text-xs">
                                  {services.find(s => s.id === dep)?.name || dep}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Endpoint */}
                        <div className="text-xs">
                          <span className="text-muted-foreground">Endpoint: </span>
                          <span className="font-mono">{service.endpoint}</span>
                          <Button variant="ghost" size="icon" className="h-4 w-4 ml-1">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {selectedTab === 'system' && (
            <div className="p-4 space-y-4">
              {/* System Information */}
              <div>
                <h3 className="font-medium mb-2">System Information</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Version</span>
                    <div className="font-medium">{systemInfo?.version || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Build</span>
                    <div className="font-medium">{systemInfo?.buildNumber || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Environment</span>
                    <div className="font-medium">{systemInfo?.environment || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Region</span>
                    <div className="font-medium">{systemInfo?.region || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Deployed</span>
                    <div className="font-medium">{systemInfo?.deploymentDate ? systemInfo.deploymentDate.toLocaleDateString() : 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Deploy</span>
                    <div className="font-medium">{systemInfo?.lastDeployment ? systemInfo.lastDeployment.toLocaleDateString() : 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Usage Statistics */}
              <div>
                <h3 className="font-medium mb-2">Usage Statistics</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Total Users</span>
                    <div className="font-medium">{systemInfo?.totalUsers || 0}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Active Users</span>
                    <div className="font-medium">{systemInfo?.activeUsers || 0}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Requests</span>
                    <div className="font-medium">{systemInfo?.totalRequests || 0}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Error Rate</span>
                                         <div className={cn(
                       "font-medium",
                       (systemInfo?.errorRate || 0) < 1 ? "text-green-600" :
                       (systemInfo?.errorRate || 0) < 5 ? "text-yellow-600" : "text-red-600"
                     )}>
                       {systemInfo?.errorRate?.toFixed(1) || '0.0'}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Overview */}
              <div>
                <h3 className="font-medium mb-2">Performance Overview</h3>
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Response Time</span>
                      <span className="text-xs font-medium">
                        {Math.round(systemInfo?.averageResponseTime || 0)}ms
                      </span>
                    </div>
                    <Progress value={Math.min((systemInfo?.averageResponseTime || 0) / 10, 100)} className="h-1" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Success Rate</span>
                      <span className="text-xs font-medium">
                        {(100 - (systemInfo?.errorRate || 0)).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={100 - (systemInfo?.errorRate || 0)} className="h-1" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'alerts' && (
            <div>
              {alerts.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No alerts at this time</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className={cn(
                    "p-4 border-b hover:bg-muted/30 transition-colors",
                    alert.resolved && "opacity-60"
                  )}>
                    <div className="flex items-start space-x-3">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant={alert.type === 'error' ? 'destructive' : 'outline'} className="text-xs">
                            {alert.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {alert.timestamp.toLocaleTimeString()}
                          </span>
                          {alert.resolved && (
                            <Badge variant="secondary" className="text-xs">
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{alert.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Auto-refresh every 10s</span>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 