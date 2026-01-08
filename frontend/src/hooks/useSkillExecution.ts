import { useState, useCallback, useRef, useEffect } from 'react'
import {
  executeSkill,
  streamExecution,
  cancelExecution,
  getProviders,
  type StreamEvent,
  type ExecuteRequest,
} from '@/services/executionsApi'
import { useAppState } from './useAppState'
import type { Provider, ExecutionLog } from '@/types'

type ExecutionStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled'

interface UseSkillExecutionResult {
  status: ExecutionStatus
  sessionId: string | null
  logs: ExecutionLog[]
  error: string | null
  providers: Provider[]
  selectedProvider: string
  selectedModel: string
  prompt: string
  setPrompt: (prompt: string) => void
  setSelectedProvider: (provider: string) => void
  setSelectedModel: (model: string) => void
  startExecution: () => Promise<void>
  cancelCurrentExecution: () => Promise<void>
  clearLogs: () => void
  loadProviders: () => Promise<void>
}

export function useSkillExecution(): UseSkillExecutionResult {
  const { currentSkill } = useAppState()
  const [status, setStatus] = useState<ExecutionStatus>('idle')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [logs, setLogs] = useState<ExecutionLog[]>([])
  const [error, setError] = useState<string | null>(null)
  const [providers, setProviders] = useState<Provider[]>([])
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [prompt, setPrompt] = useState('')

  const cleanupRef = useRef<(() => void) | null>(null)

  // Load providers on mount
  const loadProviders = useCallback(async () => {
    try {
      const { providers: providerList } = await getProviders()
      setProviders(providerList)

      // Set default selections
      if (providerList.length > 0) {
        setSelectedProvider(providerList[0].id)
        if (providerList[0].models.length > 0) {
          setSelectedModel(providerList[0].models[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to load providers:', err)
    }
  }, [])

  useEffect(() => {
    loadProviders()
  }, [loadProviders])

  // Update model when provider changes
  useEffect(() => {
    const provider = providers.find((p) => p.id === selectedProvider)
    if (provider && provider.models.length > 0) {
      setSelectedModel(provider.models[0].id)
    }
  }, [selectedProvider, providers])

  const handleEvent = useCallback((event: StreamEvent) => {
    if (event.type === 'complete') {
      setStatus(event.status === 'completed' ? 'completed' : 'failed')
      if (event.error) {
        setError(event.error.message)
      }
    } else if (event.type === 'error') {
      setStatus('failed')
      setError(event.message || 'Unknown error')
    } else {
      // Add log entry
      const log: ExecutionLog = {
        timestamp: event.timestamp || new Date().toISOString(),
        type: event.type,
        content: event.content || {},
      }
      setLogs((prev) => [...prev, log])
    }
  }, [])

  const handleError = useCallback((err: Error) => {
    setStatus('failed')
    setError(err.message)
  }, [])

  const handleComplete = useCallback(() => {
    cleanupRef.current = null
  }, [])

  const startExecution = useCallback(async () => {
    if (!currentSkill || !prompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    // Reset state
    setStatus('running')
    setLogs([])
    setError(null)
    setSessionId(null)

    try {
      const request: ExecuteRequest = {
        prompt: prompt.trim(),
        model: selectedModel || undefined,
        provider: selectedProvider || undefined,
      }

      const response = await executeSkill(currentSkill.id, request)
      setSessionId(response.session_id)

      // Start streaming
      cleanupRef.current = streamExecution(
        response.session_id,
        handleEvent,
        handleError,
        handleComplete
      )
    } catch (err) {
      setStatus('failed')
      setError(err instanceof Error ? err.message : 'Failed to start execution')
    }
  }, [currentSkill, prompt, selectedModel, selectedProvider, handleEvent, handleError, handleComplete])

  const cancelCurrentExecution = useCallback(async () => {
    if (!sessionId) return

    try {
      await cancelExecution(sessionId)
      setStatus('cancelled')

      // Cleanup stream
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel execution')
    }
  }, [sessionId])

  const clearLogs = useCallback(() => {
    setLogs([])
    setError(null)
    setStatus('idle')
    setSessionId(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    }
  }, [])

  return {
    status,
    sessionId,
    logs,
    error,
    providers,
    selectedProvider,
    selectedModel,
    prompt,
    setPrompt,
    setSelectedProvider,
    setSelectedModel,
    startExecution,
    cancelCurrentExecution,
    clearLogs,
    loadProviders,
  }
}
