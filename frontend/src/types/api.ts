/**
 * API response types.
 */

import type {
  Agent,
  ExecutionLog,
  ExecutionSession,
  Provider,
  SkillFile,
} from './models'

// Re-export SkillPackage for external use
export type { SkillPackage } from './models'

/**
 * Generic error response.
 */
export interface ApiError {
  code: string
  message: string
  [key: string]: unknown
}

export interface ApiErrorResponse {
  error: ApiError
}

/**
 * Health check response.
 */
export interface HealthResponse {
  status: 'healthy' | 'unhealthy'
  version: string
  opencode_server: {
    status: 'connected' | 'disconnected'
    url?: string
    error?: string
  }
}

/**
 * File tree response.
 */
export interface FileTreeResponse {
  tree: SkillFile[]
  files?: SkillFile[]  // Alias for compatibility
}

/**
 * Repack response.
 */
export interface RepackResponse {
  download_url: string
  filename: string
  size_bytes: number
  expires_at: string
}

/**
 * Execute request.
 */
export interface ExecuteRequest {
  prompt: string
  model?: {
    provider_id: string
    model_id: string
  }
}

/**
 * Cancel response.
 */
export interface CancelResponse {
  session_id: string
  status: 'cancelled'
  cancelled_at: string
}

/**
 * Logs response.
 */
export interface LogsResponse {
  logs: ExecutionLog[]
  total: number
  limit: number
  offset: number
}

/**
 * Executions list response.
 */
export interface ExecutionsListResponse {
  executions: ExecutionSession[]
  total: number
  limit: number
  offset: number
}

/**
 * Providers response.
 */
export interface ProvidersResponse {
  providers: Provider[]
}

/**
 * Agents response.
 */
export interface AgentsResponse {
  agents: Agent[]
}

/**
 * File update request.
 */
export interface FileUpdateRequest {
  content: string
}

/**
 * SSE event types.
 */
export type SSEEventType =
  | 'status'
  | 'message_start'
  | 'content_delta'
  | 'tool_call_start'
  | 'tool_call_end'
  | 'message_end'
  | 'complete'
  | 'error'

export interface SSEStatusEvent {
  status: string
  timestamp: string
}

export interface SSEMessageStartEvent {
  message_id: string
  role: string
  timestamp: string
}

export interface SSEContentDeltaEvent {
  delta: string
  timestamp: string
}

export interface SSEToolCallStartEvent {
  id: string
  name: string
  arguments: Record<string, unknown>
  timestamp: string
}

export interface SSEToolCallEndEvent {
  id: string
  result: string
  status: string
  timestamp: string
}

export interface SSEMessageEndEvent {
  message_id: string
  timestamp: string
}

export interface SSECompleteEvent {
  status: string
  duration_ms: number
  timestamp: string
}

export interface SSEErrorEvent {
  code: string
  message: string
  timestamp: string
}
