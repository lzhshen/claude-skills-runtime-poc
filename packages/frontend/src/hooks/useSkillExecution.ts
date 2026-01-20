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
  debugMode: boolean
  setPrompt: (prompt: string) => void
  setSelectedProvider: (provider: string) => void
  setSelectedModel: (model: string) => void
  setDebugMode: (debug: boolean) => void
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
  const [debugMode, setDebugMode] = useState(false)

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
    } else if (event.type === 'stream') {
      // Handle streaming text deltas - coalesce into a single message
      const streamContent = event.content as { type?: string; text?: string } | undefined
      const textDelta = streamContent?.text || ''

      if (!textDelta) return

      setLogs((prev) => {
        const lastLog = prev[prev.length - 1]

        // Check if we are already streaming a message
        const isStreamingMessage =
          lastLog &&
          lastLog.type === 'message' &&
          (lastLog as any)._isStreaming === true

        if (isStreamingMessage) {
          // Append to existing streaming message
          const currentMessage = lastLog.content.message as { role: string; content: string }
          const newText = (currentMessage.content || '') + textDelta

          const updatedLog: ExecutionLog = {
            ...lastLog,
            timestamp: event.timestamp || new Date().toISOString(),
            content: {
              ...lastLog.content,
              message: {
                ...currentMessage,
                content: newText,
              },
            },
          }
          return [...prev.slice(0, -1), updatedLog]
        } else {
          // Start a new streaming message log
          const newLog: ExecutionLog = {
            type: 'message',
            timestamp: event.timestamp || new Date().toISOString(),
            content: {
              message: {
                role: 'assistant',
                content: textDelta,
              },
            },
            // @ts-ignore - Internal flag to track streaming state
            _isStreaming: true,
          }
          return [...prev, newLog]
        }
      })
    } else {
      // Handle other log types (system, tool, message, etc.)
      const log: ExecutionLog = {
        timestamp: event.timestamp || new Date().toISOString(),
        type: event.type,
        content: event.content || {},
      }

      setLogs((prev) => {
        if (event.type === 'message' && event.content?.message) {
          const msg = event.content.message as { role: string; content: string }
          const newContent = msg.content?.trim() || ''

          const existingIdx = prev.findIndex((l) => {
            if (l.type !== 'message') return false
            const lMsg = (l.content as { message?: { role: string; content: string } })?.message
            if (!lMsg) return false
            if (lMsg.role !== msg.role) return false
            const existingContent = lMsg.content?.trim() || ''
            if (!existingContent || !newContent) return false
            // Only match if one is a prefix of the other (same message being updated)
            return newContent.startsWith(existingContent) || existingContent.startsWith(newContent)
          })

          if (existingIdx >= 0) {
            // Only update if new content is longer (streaming adds more content)
            const existingMsg = (prev[existingIdx].content as { message?: { role: string; content: string } })?.message
            const existingLen = existingMsg?.content?.trim().length || 0
            if (newContent.length >= existingLen) {
              const updated = [...prev]
              updated[existingIdx] = log
              return updated
            }
            // New content is shorter, keep the existing longer content
            return prev
          }
        }
        return [...prev, log]
      })
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
        model:
          selectedProvider && selectedModel
            ? {
              provider_id: selectedProvider,
              model_id: selectedModel,
            }
            : undefined,
      }

      const response = await executeSkill(currentSkill.id, request)
      const executionId = response.id || response.session_id
      setSessionId(executionId!)

      // Start streaming
      cleanupRef.current = streamExecution(
        executionId!,
        handleEvent,
        handleError,
        handleComplete,
        debugMode
      )
    } catch (err) {
      setStatus('failed')
      setError(err instanceof Error ? err.message : 'Failed to start execution')
    }
  }, [
    currentSkill,
    prompt,
    selectedModel,
    selectedProvider,
    debugMode,
    handleEvent,
    handleError,
    handleComplete,
  ])

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
    debugMode,
    setPrompt,
    setSelectedProvider,
    setSelectedModel,
    setDebugMode,
    startExecution,
    cancelCurrentExecution,
    clearLogs,
    loadProviders,
  }
}
