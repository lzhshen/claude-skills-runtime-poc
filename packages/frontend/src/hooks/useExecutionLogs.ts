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

      if (eventType === 'stream') {
        const streamContent = event.content as { type: string, text: string };
        const textDelta = streamContent?.text || '';

        if (!textDelta) return;

        setLogs(prev => {
          const lastLog = prev[prev.length - 1];

          // Check if we are already streaming a message
          // We use a custom flag _isStreaming on the log object to track this state
          const isStreamingMessage = lastLog &&
            lastLog.type === 'message' &&
            (lastLog as any)._isStreaming === true;

          if (isStreamingMessage) {
            // Append to existing log
            const currentMessage = lastLog.content.message as any;
            let newText = currentMessage.content || '';

            // Append delta
            newText += textDelta;

            const updatedLog: ExecutionLog = {
              ...lastLog,
              timestamp: event.timestamp || new Date().toISOString(),
              content: {
                ...lastLog.content,
                message: {
                  ...currentMessage,
                  content: newText
                }
              }
            };
            // Replace the last log with the updated one
            return [...prev.slice(0, -1), updatedLog];
          } else {
            // Start a new streaming message log
            const newLog: ExecutionLog = {
              type: 'message',
              timestamp: event.timestamp || new Date().toISOString(),
              content: {
                message: {
                  role: 'assistant',
                  content: textDelta
                }
              },
              // Internal flag to track streaming state
              // @ts-ignore
              _isStreaming: true
            };
            return [...prev, newLog];
          }
        });
        return;
      }

      setLogs(prev => {
        // If we receive a non-stream log, it might interrupt a stream, 
        // or just be a separate log (e.g. tool call).
        // If the last log was streaming, we effectively "finish" it by not carrying over the _isStreaming flag 
        // to strictly this new log (obviously), but we don't need to explicitly unset it on the old one 
        // unless we want to "close" it visually. 
        // For now, just appending is fine.
        return [...prev, newLog]
      })
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
