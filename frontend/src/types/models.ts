/**
 * Enumeration types for the Claude Skills Runtime.
 */

export type ValidationStatus = 'pending' | 'valid' | 'invalid'

export type FileType = 'markdown' | 'yaml' | 'text' | 'binary' | 'directory'

export type ErrorCode =
  | 'INVALID_ZIP'
  | 'MISSING_SKILL_MD'
  | 'INVALID_YAML'
  | 'MISSING_NAME'
  | 'MISSING_DESCRIPTION'
  | 'FILE_TOO_LARGE'
  | 'PATH_TRAVERSAL'
  | 'ZIP_BOMB'

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout'

export type LogType = 'message' | 'tool_call' | 'tool_result' | 'error' | 'system'

export type MessageRole = 'system' | 'user' | 'assistant'

export type ToolCallStatus = 'pending' | 'running' | 'success' | 'failed'

/**
 * Validation error model.
 */
export interface ValidationError {
  code: ErrorCode
  message: string
  suggestion?: string
  field?: string
}

/**
 * Skill file model.
 */
export interface SkillFile {
  path: string
  name: string
  file_type: FileType
  size_bytes: number
  content?: string
  is_modified: boolean
  original_hash: string
  is_binary: boolean
  children?: SkillFile[]
}

/**
 * Skill metadata model.
 */
export interface SkillMetadata {
  name: string
  description: string
  raw_content: string
  instruction: string
  extra_fields: Record<string, unknown>
}

/**
 * Skill package model.
 */
export interface SkillPackage {
  id: string
  original_filename: string
  extracted_path: string
  validation_status: ValidationStatus
  validation_errors: ValidationError[]
  files: SkillFile[]
  metadata?: SkillMetadata
  uploaded_at: string
  size_bytes: number
}

/**
 * Message model.
 */
export interface Message {
  role: MessageRole
  content: string
  timestamp: string
}

/**
 * Tool call model.
 */
export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: string
  status: ToolCallStatus
  started_at: string
  ended_at?: string
}

/**
 * Model configuration.
 */
export interface ModelConfig {
  provider_id: string
  model_id: string
}

/**
 * Execution result model.
 */
export interface ExecutionResult {
  response: string
  messages: Message[]
  tool_calls_count: number
}

/**
 * Execution error model.
 */
export interface ExecutionError {
  code: string
  message: string
  stack_trace?: string
  occurred_at: string
}

/**
 * Execution session model.
 */
export interface ExecutionSession {
  id: string
  skill_package_id: string
  skill_name: string
  user_prompt: string
  model?: ModelConfig
  status: ExecutionStatus
  started_at: string
  ended_at?: string
  duration_ms?: number
  result?: ExecutionResult
  error?: ExecutionError
  opencode_session_id?: string
  stream_url?: string
}

/**
 * Log content types.
 */
export type LogContent =
  | { type: 'message'; message: Message }
  | { type: 'tool_call'; tool_call: ToolCall }
  | { type: 'tool_result'; tool_call_id: string; result: string }
  | { type: 'error'; error: ExecutionError }
  | { type: 'system'; text: string }

/**
 * Execution log model.
 */
export interface ExecutionLog {
  timestamp: string
  type: string
  content: Record<string, unknown>
}

/**
 * Provider model.
 */
export interface Provider {
  id: string
  name: string
  models: Model[]
}

/**
 * Model info.
 */
export interface Model {
  id: string
  name: string
}

/**
 * Agent model.
 */
export interface Agent {
  id: string
  name: string
  description?: string
}
