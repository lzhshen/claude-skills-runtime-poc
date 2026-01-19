import { useState, useCallback, useEffect } from 'react'
import { getExecution, listExecutions, streamExecution, type StreamEvent } from '@/services/executionsApi'
import { useAppState } from './useAppState'
import type { ExecutionSession, ExecutionLog } from '@/types'

interface UseExecutionLogsResult {
  sessions: ExecutionSession[]
  selectedSession: ExecutionSession | null
  logs: ExecutionLog[]
  isLoading: boolean
  error: string | null
  loadSessions: () => Promise<void>
  selectSession: (sessionId: string) => Promise<void>
  clearSelection: () => void
}

export function useExecutionLogs(): UseExecutionLogsResult {
  const { currentSkill } = useAppState()
  const [sessions, setSessions] = useState<ExecutionSession[]>([])
  const [selectedSession, setSelectedSession] = useState<ExecutionSession | null>(null)
  const [logs, setLogs] = useState<ExecutionLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSessions = useCallback(async () => {
    if (!currentSkill) {
      setSessions([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { sessions: sessionList } = await listExecutions(currentSkill.id)
      setSessions(sessionList)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load execution history'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [currentSkill])

  const selectSession = useCallback(async (sessionId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const session = await getExecution(sessionId)
      setSelectedSession(session)
      // Logs will be loaded via streaming in the useEffect below
      setLogs([])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load execution details'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedSession(null)
    setLogs([])
  }, [])

  // Load sessions when skill changes
  useEffect(() => {
    if (currentSkill) {
      loadSessions()
    } else {
      setSessions([])
      setSelectedSession(null)
      setLogs([])
    }
  }, [currentSkill, loadSessions])

  // Stream logs for selected session
  useEffect(() => {
    if (!selectedSession) return

    const handleEvent = (event: StreamEvent) => {
      if (event.type === 'complete') {
        // Refresh session details to get final result/status
        getExecution(selectedSession.id).then(updatedSession => {
          setSelectedSession(updatedSession)
        }).catch(console.error)
        return
      }

      if (event.type === 'error') {
        // Handle stream error if needed
        return
      }

      // Convert StreamEvent to ExecutionLog
      // Note: Backend /stream endpoint actually sends ExecutionLog objects directly as data
      // but wraps them in an SSE event. 
      // The streamExecution service parses `event.data` which IS the ExecutionLog (plus type field).
      // Let's verify if the backend sends exactly ExecutionLog structure.
      // Backend: data: JSON.stringify(log) where log is ExecutionLog.
      // Frontend service: JSON.parse(event.data) cast to StreamEvent.

      // We'll treat the event content as the log, assuming the structure matches or maps closely.
      // The `StreamEvent` interface in `executionsApi.ts` has `type`, `timestamp`, `content` etc.
      // which matches `ExecutionLog`.

      const newLog: ExecutionLog = {
        type: event.type as any, // 'message' | 'tool_call' | ...
        timestamp: event.timestamp || new Date().toISOString(),
        content: event.content || {},
      }

      // Filter out status events or check if type is valid logic type
      const eventType = event.type as string;
      if (eventType === 'status' || eventType === 'complete') return;

      setLogs(prev => [...prev, newLog])
    }

    const handleError = (err: Error) => {
      console.error('Stream error:', err)
      // Optional: set error state, but maybe don't block view of existing logs
    }

    const cleanup = streamExecution(
      selectedSession.id,
      handleEvent,
      handleError,
      () => {
        // onComplete, already handled in handleEvent via 'complete' type check usually, 
        // or we can reload here.
      }
    )

    return () => {
      cleanup()
    }
  }, [selectedSession?.id]) // Re-subscribe if ID changes

  return {
    sessions,
    selectedSession,
    logs,
    isLoading,
    error,
    loadSessions,
    selectSession,
    clearSelection,
  }
}
