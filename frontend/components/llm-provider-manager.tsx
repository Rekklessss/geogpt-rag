'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Loader2, CheckCircle, AlertCircle, Zap, DollarSign, Clock } from 'lucide-react'

interface LLMProvider {
  name: string
  status: 'healthy' | 'unhealthy'
  model: string
  response_time?: number
  error?: string
}

interface LLMProvidersResponse {
  available_providers: string[]
  current_provider: string
  health_status: Record<string, LLMProvider>
}

export function LLMProviderManager() {
  const [providers, setProviders] = useState<LLMProvidersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState<string | null>(null)

  const fetchProviders = async () => {
    try {
      const response = await fetch(`http://54.224.133.45:8812/llm/providers`)
      if (response.ok) {
        const data = await response.json()
        setProviders(data)
      }
    } catch (error) {
      console.error('Failed to fetch LLM providers:', error)
    } finally {
      setLoading(false)
    }
  }

  const switchProvider = async (providerName: string) => {
    setSwitching(providerName)
    try {
      const response = await fetch(`http://54.224.133.45:8812/llm/providers/${providerName}`, {
        method: 'POST'
      })
      if (response.ok) {
        await fetchProviders() // Refresh data
      }
    } catch (error) {
      console.error('Failed to switch provider:', error)
    } finally {
      setSwitching(null)
    }
  }

  useEffect(() => {
    fetchProviders()
    const interval = setInterval(fetchProviders, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const getProviderInfo = (providerName: string) => {
    const info = {
      openai: {
        displayName: 'OpenAI',
        description: 'GPT-4.1 Nano - Cost optimized ($0.10/$0.40 per 1M tokens)',
        icon: '🤖',
        cost: 'Very Low',
        speed: 'Fast',
        quality: 'High'
      },
      sagemaker: {
        displayName: 'AWS Sagemaker',
        description: 'Custom GeoGPT model - Specialized for geospatial tasks',
        icon: '🌍',
        cost: 'Medium',
        speed: 'Medium',
        quality: 'Specialized'
      }
    }
    return info[providerName as keyof typeof info] || {
      displayName: providerName,
      description: 'Unknown provider',
      icon: '❓',
      cost: 'Unknown',
      speed: 'Unknown',
      quality: 'Unknown'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading LLM Providers...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (!providers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Failed to Load Providers</CardTitle>
          <CardDescription>Unable to connect to LLM service</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchProviders} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            LLM Provider Management
          </CardTitle>
          <CardDescription>
            Current: <Badge variant="default">{providers.current_provider}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {providers.available_providers.map((providerName) => {
            const providerHealth = providers.health_status[providerName]
            const info = getProviderInfo(providerName)
            const isActive = providers.current_provider === providerName
            const isHealthy = providerHealth?.status === 'healthy'

            return (
              <div
                key={providerName}
                className={`p-4 border rounded-lg transition-all ${
                  isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{info.icon}</span>
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {info.displayName}
                        {isActive && <Badge variant="default">Current</Badge>}
                        {isHealthy ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </h3>
                      <p className="text-sm text-gray-600">{info.description}</p>
                      {providerHealth?.model && (
                        <p className="text-xs text-gray-500">Model: {providerHealth.model}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>{info.cost}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {providerHealth?.response_time ? 
                          `${(providerHealth.response_time * 1000).toFixed(0)}ms` : 
                          info.speed
                        }
                      </div>
                    </div>
                    {!isActive && isHealthy && (
                      <Button
                        onClick={() => switchProvider(providerName)}
                        disabled={switching === providerName}
                        size="sm"
                      >
                        {switching === providerName ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Switch'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                {providerHealth?.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    <strong>Error:</strong> {providerHealth.error}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
} 