import { useState, useCallback, useEffect } from 'react'
import { getExecution, getExecutionLogs, listExecutions } from '@/services/executionsApi'
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
      const [session, logsResponse] = await Promise.all([
        getExecution(sessionId),
        getExecutionLogs(sessionId),
      ])

      setSelectedSession(session)
      setLogs(logsResponse.logs)
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
