/**
 * Executions API service.
 */

import { API_BASE_URL } from './api'
import type { ExecutionSession, ExecutionLog, Provider, Agent } from '@/types'

export interface ExecuteRequest {
  prompt: string
  model?: {
    provider_id: string
    model_id: string
  }
}

export interface ExecuteResponse {
  id: string
  session_id?: string // Legacy field, use 'id' instead
  status: string
}

export interface StreamEvent {
  type: 'message' | 'tool_call' | 'tool_result' | 'error' | 'complete' | 'stream' | 'system' | 'tool' | 'status'
  timestamp?: string
  content?: Record<string, unknown>
  status?: string
  result?: Record<string, unknown>
  error?: { code: string; message: string }
  message?: string
}

/**
 * Start skill execution.
 */
export async function executeSkill(
  skillId: string,
  request: ExecuteRequest
): Promise<ExecuteResponse> {
  const response = await fetch(`${API_BASE_URL}/executions/skills/${skillId}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail?.error?.message || 'Failed to start execution')
  }

  return response.json()
}

/**
 * Stream execution logs as Server-Sent Events.
 */
export function streamExecution(
  sessionId: string,
  onEvent: (event: StreamEvent) => void,
  onError: (error: Error) => void,
  onComplete: () => void,
  debug: boolean = false
): () => void {
  const url = debug
    ? `${API_BASE_URL}/executions/${sessionId}/stream?debug=true`
    : `${API_BASE_URL}/executions/${sessionId}/stream`
  const eventSource = new EventSource(url)

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as StreamEvent
      onEvent(data)

      // Check for completion
      if (data.type === 'complete' || data.type === 'error') {
        eventSource.close()
        onComplete()
      }
    } catch (err) {
      console.error('Failed to parse SSE event:', err)
    }
  }

  eventSource.onerror = (err) => {
    console.error('SSE error:', err)
    eventSource.close()
    onError(new Error('Connection lost'))
  }

  // Return cleanup function
  return () => {
    eventSource.close()
  }
}

/**
 * Cancel a running execution.
 */
export async function cancelExecution(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/executions/${sessionId}/cancel`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail?.error?.message || 'Failed to cancel execution')
  }
}

/**
 * Get execution session details.
 */
export async function getExecution(sessionId: string): Promise<ExecutionSession> {
  const response = await fetch(`${API_BASE_URL}/executions/${sessionId}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail?.error?.message || 'Failed to get execution')
  }

  return response.json()
}

/**
 * Get execution logs.
 */
export async function getExecutionLogs(
  sessionId: string
): Promise<{ session_id: string; logs: ExecutionLog[] }> {
  const response = await fetch(`${API_BASE_URL}/executions/${sessionId}/logs`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail?.error?.message || 'Failed to get logs')
  }

  return response.json()
}

/**
 * List execution sessions.
 */
export async function listExecutions(skillId?: string): Promise<{ sessions: ExecutionSession[] }> {
  const url = skillId
    ? `${API_BASE_URL}/executions?skill_id=${skillId}`
    : `${API_BASE_URL}/executions`

  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail?.error?.message || 'Failed to list executions')
  }

  return response.json()
}

/**
 * Get available providers and models.
 */
export async function getProviders(): Promise<{ providers: Provider[] }> {
  const response = await fetch(`${API_BASE_URL}/config/providers`)

  if (!response.ok) {
    throw new Error('Failed to get providers')
  }

  return response.json()
}

/**
 * Get available agents.
 */
export async function getAgents(): Promise<{ agents: Agent[] }> {
  const response = await fetch(`${API_BASE_URL}/config/agents`)

  if (!response.ok) {
    throw new Error('Failed to get agents')
  }

  return response.json()
}
