import { z } from 'zod';

/**
 * Enumeration schemas for the Claude Skills Runtime.
 */

export const ValidationStatusSchema = z.enum(['pending', 'valid', 'invalid']);

export const FileTypeSchema = z.enum(['markdown', 'yaml', 'text', 'binary', 'directory']);

export const ErrorCodeSchema = z.enum([
  'INVALID_ZIP',
  'MISSING_SKILL_MD',
  'INVALID_YAML',
  'MISSING_NAME',
  'MISSING_DESCRIPTION',
  'FILE_TOO_LARGE',
  'PATH_TRAVERSAL',
  'ZIP_BOMB',
]);

export const ExecutionStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
  'timeout',
]);

export const LogTypeSchema = z.enum(['message', 'tool_call', 'tool_result', 'error', 'system']);

export const MessageRoleSchema = z.enum(['system', 'user', 'assistant']);

export const ToolCallStatusSchema = z.enum(['pending', 'running', 'success', 'failed']);

/**
 * Validation error schema.
 */
export const ValidationErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  suggestion: z.string().optional(),
  field: z.string().optional(),
});

/**
 * Skill file schema.
 */
export const SkillFileSchema: z.ZodType<{
  path: string;
  name: string;
  file_type: z.infer<typeof FileTypeSchema>;
  size_bytes: number;
  content?: string;
  is_modified: boolean;
  original_hash: string;
  is_binary: boolean;
  children?: z.infer<typeof SkillFileSchema>[];
}> = z.lazy(() =>
  z.object({
    path: z.string(),
    name: z.string(),
    file_type: FileTypeSchema,
    size_bytes: z.number(),
    content: z.string().optional(),
    is_modified: z.boolean(),
    original_hash: z.string(),
    is_binary: z.boolean(),
    children: z.array(SkillFileSchema).optional(),
  })
);

/**
 * Skill metadata schema.
 */
export const SkillMetadataSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  raw_content: z.string(),
  instruction: z.string(),
  extra_fields: z.record(z.unknown()),
});

/**
 * Skill package schema.
 */
export const SkillPackageSchema = z.object({
  id: z.string(),
  original_filename: z.string(),
  extracted_path: z.string(),
  validation_status: ValidationStatusSchema,
  validation_errors: z.array(ValidationErrorSchema),
  files: z.array(SkillFileSchema),
  metadata: SkillMetadataSchema.optional(),
  uploaded_at: z.string(),
  size_bytes: z.number(),
});

/**
 * Message schema.
 */
export const MessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string(),
  timestamp: z.string(),
});

/**
 * Tool call schema.
 */
export const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.record(z.unknown()),
  result: z.string().optional(),
  status: ToolCallStatusSchema,
  started_at: z.string(),
  ended_at: z.string().optional(),
});

/**
 * Model configuration schema.
 */
export const ModelConfigSchema = z.object({
  provider_id: z.string(),
  model_id: z.string(),
});

/**
 * Execution result schema.
 */
export const ExecutionResultSchema = z.object({
  response: z.string(),
  messages: z.array(MessageSchema),
  tool_calls_count: z.number(),
});

/**
 * Execution error schema.
 */
export const ExecutionErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  stack_trace: z.string().optional(),
  occurred_at: z.string(),
});

/**
 * Execution session schema.
 */
export const ExecutionSessionSchema = z.object({
  id: z.string(),
  skill_package_id: z.string(),
  skill_name: z.string(),
  user_prompt: z.string(),
  model: ModelConfigSchema.optional(),
  status: ExecutionStatusSchema,
  started_at: z.string(),
  ended_at: z.string().optional(),
  duration_ms: z.number().optional(),
  result: ExecutionResultSchema.optional(),
  error: ExecutionErrorSchema.optional(),
  opencode_session_id: z.string().optional(),
  stream_url: z.string().optional(),
});

/**
 * Log content schemas.
 */
export const MessageLogContentSchema = z.object({
  type: z.literal('message'),
  message: MessageSchema,
});

export const ToolCallLogContentSchema = z.object({
  type: z.literal('tool_call'),
  tool_call: ToolCallSchema,
});

export const ToolResultLogContentSchema = z.object({
  type: z.literal('tool_result'),
  tool_call_id: z.string(),
  result: z.string(),
});

export const ErrorLogContentSchema = z.object({
  type: z.literal('error'),
  error: ExecutionErrorSchema,
});

export const SystemLogContentSchema = z.object({
  type: z.literal('system'),
  text: z.string(),
});

export const LogContentSchema = z.discriminatedUnion('type', [
  MessageLogContentSchema,
  ToolCallLogContentSchema,
  ToolResultLogContentSchema,
  ErrorLogContentSchema,
  SystemLogContentSchema,
]);

/**
 * Execution log schema.
 */
export const ExecutionLogSchema = z.object({
  timestamp: z.string(),
  type: z.string(),
  content: z.record(z.unknown()),
});

/**
 * Model schema.
 */
export const ModelSchema = z.object({
  id: z.string(),
  name: z.string(),
});

/**
 * Provider schema.
 */
export const ProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  models: z.array(ModelSchema),
});

/**
 * Agent schema.
 */
export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

/**
 * Inferred types from schemas.
 */
export type ValidationStatusInferred = z.infer<typeof ValidationStatusSchema>;
export type FileTypeInferred = z.infer<typeof FileTypeSchema>;
export type ErrorCodeInferred = z.infer<typeof ErrorCodeSchema>;
export type ExecutionStatusInferred = z.infer<typeof ExecutionStatusSchema>;
export type LogTypeInferred = z.infer<typeof LogTypeSchema>;
export type MessageRoleInferred = z.infer<typeof MessageRoleSchema>;
export type ToolCallStatusInferred = z.infer<typeof ToolCallStatusSchema>;
export type ValidationErrorInferred = z.infer<typeof ValidationErrorSchema>;
export type SkillFileInferred = z.infer<typeof SkillFileSchema>;
export type SkillMetadataInferred = z.infer<typeof SkillMetadataSchema>;
export type SkillPackageInferred = z.infer<typeof SkillPackageSchema>;
export type MessageInferred = z.infer<typeof MessageSchema>;
export type ToolCallInferred = z.infer<typeof ToolCallSchema>;
export type ModelConfigInferred = z.infer<typeof ModelConfigSchema>;
export type ExecutionResultInferred = z.infer<typeof ExecutionResultSchema>;
export type ExecutionErrorInferred = z.infer<typeof ExecutionErrorSchema>;
export type ExecutionSessionInferred = z.infer<typeof ExecutionSessionSchema>;
export type LogContentInferred = z.infer<typeof LogContentSchema>;
export type ExecutionLogInferred = z.infer<typeof ExecutionLogSchema>;
export type ModelInferred = z.infer<typeof ModelSchema>;
export type ProviderInferred = z.infer<typeof ProviderSchema>;
export type AgentInferred = z.infer<typeof AgentSchema>;
