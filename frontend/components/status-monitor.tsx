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
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { statusService, handleApiError } from '@/lib/api'

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
  metrics?: {
    requestCount: number
    errorRate: number
    avgResponseTime: number
  }
}

const mockServices: ServiceStatus[] = [
  {
    id: 'embedding',
    name: 'GeoEmbedding API',
    status: 'online',
    responseTime: 124,
    uptime: 99.8,
    lastChecked: new Date(),
    endpoint: '3.234.222.18:8810',
    icon: <Database className="h-4 w-4" />,
    description: 'Text embedding service for geospatial documents',
    metrics: {
      requestCount: 1247,
      errorRate: 0.2,
      avgResponseTime: 135
    }
  },
  {
    id: 'reranking',
    name: 'GeoReranker API',
    status: 'online',
    responseTime: 89,
    uptime: 99.9,
    lastChecked: new Date(),
    endpoint: '3.234.222.18:8811',
    icon: <Activity className="h-4 w-4" />,
    description: 'Document reranking service for relevance scoring',
    metrics: {
      requestCount: 892,
      errorRate: 0.1,
      avgResponseTime: 98
    }
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
    metrics: {
      requestCount: 456,
      errorRate: 0.5,
      avgResponseTime: 2456
    }
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
    metrics: {
      requestCount: 2134,
      errorRate: 0.0,
      avgResponseTime: 52
    }
  },
  {
    id: 'code-execution',
    name: 'Code Execution',
    status: 'degraded',
    responseTime: 0,
    uptime: 95.2,
    lastChecked: new Date(),
    endpoint: 'localhost:8812',
    icon: <Zap className="h-4 w-4" />,
    description: 'Python code execution environment',
    metrics: {
      requestCount: 123,
      errorRate: 4.8,
      avgResponseTime: 3200
    }
  }
]

export function StatusMonitor({ isVisible, onToggle, className }: StatusMonitorProps) {
  const [services, setServices] = useState<ServiceStatus[]>(mockServices)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Real-time status updates
  useEffect(() => {
    if (!isVisible) return

    const fetchStatus = async () => {
      try {
        const systemStatus = await statusService.getSystemStatus()
        
        // Helper function to ensure valid status values
        const normalizeStatus = (status: string): ServiceStatus['status'] => {
          switch (status) {
            case 'online': return 'online'
            case 'offline': return 'offline'
            case 'degraded': return 'degraded'
            case 'maintenance': return 'maintenance'
            default: return 'offline'
          }
        }
        
        const updatedServices: ServiceStatus[] = [
          {
            id: 'embedding',
            name: 'GeoEmbedding API',
            status: normalizeStatus(systemStatus.services.geoEmbeddingApi?.status || 'offline'),
            responseTime: systemStatus.services.geoEmbeddingApi?.responseTime || 0,
            uptime: systemStatus.services.geoEmbeddingApi?.uptime || 0,
            lastChecked: new Date(systemStatus.services.geoEmbeddingApi?.lastCheck || Date.now()),
            endpoint: '3.234.222.18:8810',
            icon: <Database className="h-4 w-4" />,
            description: 'Text embedding service for geospatial documents',
            metrics: {
              requestCount: systemStatus.services.geoEmbeddingApi?.requests || 0,
              errorRate: systemStatus.services.geoEmbeddingApi?.errors || 0,
              avgResponseTime: systemStatus.services.geoEmbeddingApi?.responseTime || 0
            }
          },
          {
            id: 'reranking',
            name: 'GeoReranker API',
            status: normalizeStatus(systemStatus.services.geoRerankerApi?.status || 'offline'),
            responseTime: systemStatus.services.geoRerankerApi?.responseTime || 0,
            uptime: systemStatus.services.geoRerankerApi?.uptime || 0,
            lastChecked: new Date(systemStatus.services.geoRerankerApi?.lastCheck || Date.now()),
            endpoint: '3.234.222.18:8811',
            icon: <Activity className="h-4 w-4" />,
            description: 'Document reranking service for relevance scoring',
            metrics: {
              requestCount: systemStatus.services.geoRerankerApi?.requests || 0,
              errorRate: systemStatus.services.geoRerankerApi?.errors || 0,
              avgResponseTime: systemStatus.services.geoRerankerApi?.responseTime || 0
            }
          },
          {
            id: 'geogpt',
            name: 'GeoGPT Model',
            status: normalizeStatus(systemStatus.services.geoGptModel?.status || 'offline'),
            responseTime: systemStatus.services.geoGptModel?.responseTime || 0,
            uptime: systemStatus.services.geoGptModel?.uptime || 0,
            lastChecked: new Date(systemStatus.services.geoGptModel?.lastCheck || Date.now()),
            endpoint: 'sagemaker.us-east-1.amazonaws.com',
            icon: <Brain className="h-4 w-4" />,
            description: 'Large language model for geospatial analysis',
            metrics: {
              requestCount: systemStatus.services.geoGptModel?.requests || 0,
              errorRate: systemStatus.services.geoGptModel?.errors || 0,
              avgResponseTime: systemStatus.services.geoGptModel?.responseTime || 0
            }
          },
          {
            id: 'vector-db',
            name: 'Vector Database',
            status: systemStatus.services.vectorDb?.status || 'offline',
            responseTime: systemStatus.services.vectorDb?.responseTime || 0,
            uptime: systemStatus.services.vectorDb?.uptime || 0,
            lastChecked: new Date(systemStatus.services.vectorDb?.lastCheck || Date.now()),
            endpoint: 'zilliz.cloud',
            icon: <Server className="h-4 w-4" />,
            description: 'Vector storage for document embeddings',
            metrics: {
              requestCount: systemStatus.services.vectorDb?.requests || 0,
              errorRate: systemStatus.services.vectorDb?.errors || 0,
              avgResponseTime: systemStatus.services.vectorDb?.responseTime || 0
            }
          },
          {
            id: 'code-execution',
            name: 'Code Execution',
            status: systemStatus.services.codeExecution?.status || 'offline',
            responseTime: systemStatus.services.codeExecution?.responseTime || 0,
            uptime: systemStatus.services.codeExecution?.uptime || 0,
            lastChecked: new Date(systemStatus.services.codeExecution?.lastCheck || Date.now()),
            endpoint: '3.234.222.18:8812',
            icon: <Zap className="h-4 w-4" />,
            description: 'Python code execution environment',
            metrics: {
              requestCount: systemStatus.services.codeExecution?.requests || 0,
              errorRate: systemStatus.services.codeExecution?.errors || 0,
              avgResponseTime: systemStatus.services.codeExecution?.responseTime || 0
            }
          }
        ]
        
        setServices(updatedServices)
        setLastUpdate(new Date())
        
      } catch (error) {
        console.error('Failed to fetch system status:', handleApiError(error))
        // Keep existing services on error, just update timestamp
        setLastUpdate(new Date())
      }
    }

    // Initial fetch
    fetchStatus()

    // Set up interval for updates
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [isVisible])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLastUpdate(new Date())
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

  const overallHealth = services.filter(s => s.status === 'online').length / services.length * 100

  if (!isVisible) return null

  return (
    <div className={cn("fixed inset-y-0 right-0 w-96 bg-background border-l shadow-lg z-40", className)}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">System Status</h2>
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
            <span className="font-medium">Overall Health</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(overallHealth)}%
            </span>
          </div>
          <Progress value={overallHealth} className="mb-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{services.filter(s => s.status === 'online').length} of {services.length} services online</span>
            <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Services List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {services.map((service) => (
            <div key={service.id} className="p-4 border-b hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className={getStatusColor(service.status)}>
                    {service.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">{service.name}</h3>
                    <p className="text-xs text-muted-foreground">{service.description}</p>
                  </div>
                </div>
                <div className={cn("flex items-center space-x-1", getStatusColor(service.status))}>
                  {getStatusIcon(service.status)}
                  <span className="text-xs font-medium capitalize">{service.status}</span>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Response Time</span>
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
                  <span className="text-muted-foreground">Endpoint</span>
                  <div className="font-mono text-xs truncate">{service.endpoint}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Check</span>
                  <div>{service.lastChecked.toLocaleTimeString()}</div>
                </div>
              </div>

              {/* Detailed Metrics */}
              {service.metrics && (
                <div className="mt-3 pt-3 border-t">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Requests</span>
                      <div className="font-medium">{service.metrics.requestCount.toLocaleString()}</div>
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
                      <span className="text-muted-foreground">Avg Response</span>
                      <div className={cn("font-medium", getResponseTimeColor(service.metrics.avgResponseTime))}>
                        {Math.round(service.metrics.avgResponseTime)}ms
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Auto-refresh every 5s</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 