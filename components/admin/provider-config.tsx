'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { createBrowserClient } from '@supabase/ssr'
import { 
  Server, 
  Loader2, 
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Zap,
  Cloud,
  HardDrive
} from 'lucide-react'

interface LLMConfig {
  provider: string
  model: string
  apiKey?: string
  temperature: number
  maxTokens: number
  ollama?: {
    baseUrl: string
    enabled: boolean
  }
}

const PROVIDER_MODELS = {
  'openai': [
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
  ],
  'vercel-ai': [
    { value: 'gpt-5', label: 'GPT-5' },
    { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
    { value: 'gpt-5-nano', label: 'GPT-5 Nano' }
  ],
  'groq': [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' }
  ],
  'deepseek': [
    { value: 'deepseek-chat', label: 'DeepSeek Chat' },
    { value: 'deepseek-coder', label: 'DeepSeek Coder' }
  ],
  'ollama': [],
  'mock': [
    { value: 'mock', label: 'Mock Model' }
  ]
}

export function LLMProviderConfig() {
  const [config, setConfig] = useState<LLMConfig>({
    provider: 'vercel-ai',
    model: 'gpt-5-nano',
    temperature: 0.7,
    maxTokens: 4000,
    ollama: {
      baseUrl: 'http://localhost:11434',
      enabled: false
    }
  })
  const [ollamaModels, setOllamaModels] = useState<{ value: string; label: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [useLocal, setUseLocal] = useState(false)
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadConfig()
    checkOllamaConnection() // Check Ollama on component mount
  }, [])

  useEffect(() => {
    if (config.provider === 'ollama' || useLocal) {
      fetchOllamaModels()
    }
  }, [config.provider, useLocal, config.ollama?.baseUrl])
  
  // Check Ollama connection periodically
  useEffect(() => {
    const interval = setInterval(checkOllamaConnection, 5000) // Check every 5 seconds
    return () => clearInterval(interval)
  }, [config.ollama?.baseUrl])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'llm_config')
        .single()

      if (data) {
        setConfig(data.setting_value as LLMConfig)
        setUseLocal(data.setting_value.ollama?.enabled || false)
      }
    } catch (error) {
      console.error('Error loading config:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkOllamaConnection = async () => {
    try {
      const response = await fetch('/api/admin/ollama/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: config.ollama?.baseUrl || 'http://localhost:11434' })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.connected) {
          setOllamaStatus('connected')
          const models = data.models?.map((m: any) => ({
            value: m.name || m.value,
            label: m.label || m.name || m.value
          })) || []
          if (models.length > 0) {
            setOllamaModels(models)
            // If no model is selected and we're in Ollama mode, auto-select the first one
            if (useLocal && !config.model) {
              setConfig(prev => ({ ...prev, model: models[0].value }))
            }
          }
        } else {
          setOllamaStatus('disconnected')
          setOllamaModels([])
        }
      } else {
        setOllamaStatus('disconnected')
        setOllamaModels([])
      }
    } catch (error) {
      setOllamaStatus('disconnected')
      setOllamaModels([])
    }
  }

  const fetchOllamaModels = async () => {
    await checkOllamaConnection()
  }

  const testConnection = async () => {
    setTesting(true)
    setConnectionStatus('testing')
    setMessage('')

    try {
      const response = await fetch('/api/admin/test-llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      const result = await response.json()

      if (result.success) {
        setConnectionStatus('success')
        setMessage(`Connection successful! Response: "${result.response}"`)
      } else {
        setConnectionStatus('error')
        setMessage(result.error || 'Connection failed')
      }
    } catch (error) {
      setConnectionStatus('error')
      setMessage('Failed to test connection')
    } finally {
      setTesting(false)
    }
  }

  const saveConfig = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const finalConfig = {
        ...config,
        ollama: {
          ...config.ollama,
          enabled: useLocal
        }
      }

      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          setting_key: 'llm_config',
          setting_value: finalConfig,
          updated_by: user?.id
        })

      if (error) throw error

      setMessage('Configuration saved successfully!')
      setConnectionStatus('success')
    } catch (error) {
      console.error('Error saving config:', error)
      setMessage('Failed to save configuration')
      setConnectionStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const availableModels = config.provider === 'ollama' 
    ? ollamaModels 
    : PROVIDER_MODELS[config.provider as keyof typeof PROVIDER_MODELS] || []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>LLM Provider Configuration</CardTitle>
          <CardDescription>
            Configure your language model provider and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Local vs Cloud Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Cloud className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Cloud Provider</span>
              </div>
              <Switch
                checked={useLocal}
                onCheckedChange={setUseLocal}
              />
              <div className="flex items-center gap-3">
                <span className="font-medium">Local Ollama</span>
                <HardDrive className="h-5 w-5 text-green-500" />
              </div>
            </div>
            
            {/* Ollama Status Indicator */}
            {(useLocal || ollamaStatus === 'connected') && (
              <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-lg">
                {ollamaStatus === 'connected' ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400">
                      Ollama is running • {ollamaModels.length} models available
                    </span>
                  </>
                ) : ollamaStatus === 'checking' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
                    <span className="text-sm text-yellow-600 dark:text-yellow-400">
                      Checking Ollama connection...
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-600 dark:text-red-400">
                      Ollama not detected - Start with: ollama serve
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {!useLocal ? (
            <>
              {/* Cloud Provider Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider</Label>
                  <Select
                    value={config.provider}
                    onValueChange={(value) => setConfig({ ...config, provider: value, model: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="vercel-ai">Vercel AI Gateway</SelectItem>
                      <SelectItem value="groq">Groq</SelectItem>
                      <SelectItem value="deepseek">DeepSeek</SelectItem>
                      <SelectItem value="mock">Mock (Testing)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Select
                    value={config.model}
                    onValueChange={(value) => setConfig({ ...config, model: value })}
                    disabled={!config.provider || availableModels.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* API Key (optional override) */}
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key Override (Optional)</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={config.apiKey || ''}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="Leave empty to use environment variables"
                />
                <p className="text-xs text-muted-foreground">
                  Only set this if you want to override the default API key
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Ollama Configuration */}
              <div className="space-y-4">
                {ollamaStatus === 'connected' ? (
                  <>
                    {/* Show available models immediately */}
                    <div className="space-y-2">
                      <Label htmlFor="ollamaModel">Select Local Model</Label>
                      <Select
                        value={config.model}
                        onValueChange={(value) => setConfig({ ...config, provider: 'ollama', model: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an Ollama model" />
                        </SelectTrigger>
                        <SelectContent>
                          {ollamaModels.map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                              <div className="flex items-center justify-between w-full">
                                <span>{model.label}</span>
                                {model.value.includes(':') && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {model.value.split(':')[1]}
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Models are automatically detected from your local Ollama installation
                      </p>
                    </div>
                    
                    {/* Advanced Ollama Settings */}
                    <div className="space-y-2">
                      <Label htmlFor="ollamaUrl">Ollama Server URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="ollamaUrl"
                          value={config.ollama?.baseUrl || 'http://localhost:11434'}
                          onChange={(e) => setConfig({
                            ...config,
                            ollama: { ...config.ollama!, baseUrl: e.target.value }
                          })}
                          placeholder="http://localhost:11434"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={checkOllamaConnection}
                          disabled={testing}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Show connection instructions */}
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p>Ollama is not currently running. To use local models:</p>
                          <ol className="list-decimal list-inside space-y-1 text-sm">
                            <li>Ensure Ollama is installed: <code className="px-1 py-0.5 bg-muted rounded">brew install ollama</code></li>
                            <li>Start Ollama server: <code className="px-1 py-0.5 bg-muted rounded">ollama serve</code></li>
                            <li>Pull a model: <code className="px-1 py-0.5 bg-muted rounded">ollama pull llama3.2</code></li>
                          </ol>
                        </div>
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-2">
                      <Label htmlFor="ollamaUrl">Ollama Server URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="ollamaUrl"
                          value={config.ollama?.baseUrl || 'http://localhost:11434'}
                          onChange={(e) => setConfig({
                            ...config,
                            ollama: { ...config.ollama!, baseUrl: e.target.value }
                          })}
                          placeholder="http://localhost:11434"
                        />
                        <Button
                          variant="outline"
                          onClick={checkOllamaConnection}
                          disabled={testing}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Retry
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Advanced Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                min="100"
                max="32000"
                value={config.maxTokens}
                onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
              />
            </div>
          </div>

          {/* Status Messages */}
          {message && (
            <Alert className={connectionStatus === 'success' ? 'border-green-500' : connectionStatus === 'error' ? 'border-red-500' : ''}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={testConnection}
              disabled={testing || loading || !config.provider || !config.model}
              variant="outline"
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Test Connection
                </>
              )}
            </Button>

            <Button
              onClick={saveConfig}
              disabled={loading || !config.provider || !config.model}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Provider Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              <span className="text-sm font-medium">Active Provider:</span>
              <Badge variant="default">
                {useLocal ? 'Ollama (Local)' : config.provider}
              </Badge>
            </div>
            {connectionStatus === 'success' && (
              <Badge variant="outline" className="text-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            )}
            {connectionStatus === 'error' && (
              <Badge variant="outline" className="text-red-600">
                <XCircle className="h-3 w-3 mr-1" />
                Error
              </Badge>
            )}
          </div>
          
          {/* Show Ollama models if detected */}
          {ollamaStatus === 'connected' && ollamaModels.length > 0 && (
            <div className="pt-3 border-t">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Available Local Models:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ollamaModels.map((model) => (
                  <Badge 
                    key={model.value} 
                    variant={config.model === model.value ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {model.label}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Location: ~/.ollama/models
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}