'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Loader2, Settings, Save, RefreshCw, Server, MapPin } from 'lucide-react'

interface ServiceHealth {
  status: string
  error?: string
  url: string
}

interface InstanceConfig {
  api_base_url: string
  embedding_url: string
  reranking_url: string
  frontend_url: string
  ec2_instance_ip: string
  ports: {
    embedding: number
    reranking: number
    main_api: number
  }
}

interface ConfigResponse {
  instance_config: InstanceConfig
  service_health: {
    embedding: ServiceHealth
    reranking: ServiceHealth
    main_api: ServiceHealth
  }
}

export function ConfigurationManager() {
  const [config, setConfig] = useState<ConfigResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editConfig, setEditConfig] = useState<Partial<InstanceConfig>>({})

  const fetchConfig = async () => {
    try {
      const response = await fetch(`http://54.224.133.45:8812/config`)
      if (response.ok) {
        const data: ConfigResponse = await response.json()
        setConfig(data)
        setEditConfig(data.instance_config)
      }
    } catch (error) {
      console.error('Failed to fetch configuration:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    setSaving(true)
    try {
      const response = await fetch(`http://54.224.133.45:8812/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editConfig),
      })
      if (response.ok) {
        await fetchConfig() // Refresh data
        setEditMode(false)
      }
    } catch (error) {
      console.error('Failed to save configuration:', error)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Configuration...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Failed to Load Configuration</CardTitle>
          <CardDescription>Unable to connect to configuration service</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchConfig} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const instanceConfig = config.instance_config
  const serviceHealth = config.service_health

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Instance Configuration
          </CardTitle>
          <CardDescription>
            Manage EC2 instance and service configuration
          </CardDescription>
          <div className="flex gap-2">
            <Button
              onClick={() => setEditMode(!editMode)}
              variant="outline"
              size="sm"
            >
              {editMode ? 'Cancel' : 'Edit'}
            </Button>
            <Button
              onClick={fetchConfig}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* EC2 Instance Info */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Server className="h-4 w-4" />
              EC2 Instance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Instance IP</label>
                {editMode ? (
                  <Input
                    value={editConfig.ec2_instance_ip || ''}
                    onChange={(e) => setEditConfig({
                      ...editConfig,
                      ec2_instance_ip: e.target.value
                    })}
                    placeholder="e.g., 54.224.133.45"
                  />
                ) : (
                  <p className="text-sm bg-gray-50 p-2 rounded">{instanceConfig.ec2_instance_ip}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">API Base URL</label>
                <p className="text-sm bg-gray-50 p-2 rounded">{instanceConfig.api_base_url}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Embedding URL</label>
                <p className="text-sm bg-gray-50 p-2 rounded">{instanceConfig.embedding_url}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Reranking URL</label>
                <p className="text-sm bg-gray-50 p-2 rounded">{instanceConfig.reranking_url}</p>
              </div>
            </div>
          </div>

          {/* Service Ports */}
          <div className="space-y-3">
            <h3 className="font-semibold">Service Ports & Health</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Embedding Service</label>
                {editMode ? (
                  <Input
                    type="number"
                    value={editConfig.ports?.embedding || ''}
                    onChange={(e) => setEditConfig({
                      ...editConfig,
                      ports: {
                        ...editConfig.ports!,
                        embedding: parseInt(e.target.value)
                      }
                    })}
                  />
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{instanceConfig.ports.embedding}</Badge>
                      <span className="text-xs text-gray-500">Embedding API</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={serviceHealth.embedding.status === 'healthy' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {serviceHealth.embedding.status}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Reranking Service</label>
                {editMode ? (
                  <Input
                    type="number"
                    value={editConfig.ports?.reranking || ''}
                    onChange={(e) => setEditConfig({
                      ...editConfig,
                      ports: {
                        ...editConfig.ports!,
                        reranking: parseInt(e.target.value)
                      }
                    })}
                  />
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{instanceConfig.ports.reranking}</Badge>
                      <span className="text-xs text-gray-500">Reranking API</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={serviceHealth.reranking.status === 'healthy' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {serviceHealth.reranking.status}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Main API</label>
                {editMode ? (
                  <Input
                    type="number"
                    value={editConfig.ports?.main_api || ''}
                    onChange={(e) => setEditConfig({
                      ...editConfig,
                      ports: {
                        ...editConfig.ports!,
                        main_api: parseInt(e.target.value)
                      }
                    })}
                  />
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{instanceConfig.ports.main_api}</Badge>
                      <span className="text-xs text-gray-500">GeoGPT API</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={serviceHealth.main_api.status === 'healthy' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {serviceHealth.main_api.status}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Service Health Details */}
          <div className="space-y-3">
            <h3 className="font-semibold">Service Health Details</h3>
            <div className="space-y-2">
              {Object.entries(serviceHealth).map(([service, health]) => (
                <div key={service} className="bg-gray-50 p-3 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium capitalize">{service} Service</span>
                    <Badge 
                      variant={health.status === 'healthy' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {health.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">{health.url}</p>
                  {health.error && (
                    <p className="text-xs text-red-600 mt-1">{health.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {editMode && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={saveConfig}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </Button>
              <Button
                onClick={() => {
                  setEditMode(false)
                  setEditConfig(instanceConfig)
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 