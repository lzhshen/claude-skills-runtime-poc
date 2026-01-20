/**
 * Execution service for managing skill executions.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { ExecutionSession, ExecutionLog, ExecutionStatus } from '@skills-runtime/shared';
import { getExecutionStorage, type StoredExecutionSession } from './execution.storage.js';
import { getSkillService } from './skill.service.js';
import { getOpenCodeClient } from './opencode.client.js';
import { getOpenCodeEventBus } from './opencode.events.js';
import { NotFoundError, InvalidSkillError, AlreadyCompletedError } from '../utils/errors.js';

/**
 * Execution request options.
 */
export interface ExecuteOptions {
  prompt: string;
  model?: {
    provider_id: string;
    model_id: string;
  };
}

/**
 * Service for managing skill executions.
 */
export class ExecutionService extends EventEmitter {
  private storage = getExecutionStorage();
  private skillService = getSkillService();
  private openCodeClient = getOpenCodeClient();
  private eventBus = getOpenCodeEventBus();

  constructor() {
    super();
  }

  /**
   * Start a new execution for a skill.
   */
  async startExecution(skillPackageId: string, options: ExecuteOptions): Promise<ExecutionSession> {
    // Get the skill package
    const pkg = this.skillService.getPackage(skillPackageId);
    if (!pkg) {
      throw new NotFoundError('Skill package', skillPackageId);
    }

    // Check if skill is valid
    if (pkg.validation_status !== 'valid') {
      throw new InvalidSkillError('Skill package validation failed, cannot execute');
    }

    // Create execution session
    const sessionId = uuidv4();
    const session: StoredExecutionSession = {
      id: sessionId,
      skill_package_id: skillPackageId,
      skill_name: pkg.metadata?.name ?? 'Unknown',
      user_prompt: options.prompt,
      model: options.model,
      status: 'pending' as ExecutionStatus,
      started_at: new Date().toISOString(),
      logs: [],
      stream_url: `/api/v1/executions/${sessionId}/stream`,
    };

    this.storage.save(session);

    // Add initial log
    this.addLog(sessionId, {
      timestamp: new Date().toISOString(),
      type: 'system',
      content: { text: 'Execution started' },
    });

    // Update status to running
    session.status = 'running';
    this.storage.save(session);
    this.emit('status', { sessionId, status: 'running' });

    // Execute asynchronously with OpenCode
    this.executeWithOpenCode(sessionId, options).catch((error) => {
      console.error('OpenCode execution error:', error);
      this.addLog(sessionId, {
        timestamp: new Date().toISOString(),
        type: 'error',
        content: { text: `Execution error: ${error.message}` },
      });
      this.updateStatus(sessionId, 'failed', undefined, {
        code: 'EXECUTION_ERROR',
        message: error.message,
        occurred_at: new Date().toISOString(),
      });
    });

    return this.toExecutionSession(session);
  }

  /**
   * Execute skill with OpenCode (async background task).
   */
  private async executeWithOpenCode(sessionId: string, options: ExecuteOptions): Promise<void> {
    // Add log for creating session
    this.addLog(sessionId, {
      timestamp: new Date().toISOString(),
      type: 'system',
      content: { text: 'Connecting to OpenCode server...' },
    });

    try {
      // Create OpenCode session
      console.log('[OpenCode] Creating new session...');
      const createResult = await this.openCodeClient.session.create({
        title: `Skill Execution ${sessionId}`,
      });
      if (createResult.error) {
        const err = createResult.error as any;
        const errorMessage = err.message || err.data?.message || JSON.stringify(err);
        console.error('[OpenCode] Session creation failed:', errorMessage);
        throw new Error(`Failed to create OpenCode session: ${errorMessage}`);
      }
      console.log('[OpenCode] Session created:', createResult.data.id);

      const openCodeSessionId = createResult.data.id;

      // Update session with OpenCode session ID
      const session = this.storage.get(sessionId);
      if (session) {
        session.opencode_session_id = openCodeSessionId;
        this.storage.save(session);
      }

      this.addLog(sessionId, {
        timestamp: new Date().toISOString(),
        type: 'system',
        content: { text: `OpenCode session created: ${openCodeSessionId}` },
      });

      // Subscribe to events via EventBus
      const unsubscribe = this.eventBus.subscribe(openCodeSessionId, (payload: any) => {
        try {
          if (payload.type === 'message.part.updated') {
            const part = payload.properties.part;

            // Handle streaming text updates
            if (part && (part.type === 'text' || part.type === 'reasoning')) {
              // We could accumulate this in a buffer or log every chunk.
              // For now, let's log an "update" type log which the frontend can potentially handle specially,
              // or just log it as a standard message update if we had a message ID.
              // Since the current frontend log model assumes discrete log entries, 
              // we will emit a 'stream' type log entry for the frontend to render as partial updates.

              if (payload.properties.delta) {
                this.addLog(sessionId, {
                  timestamp: new Date().toISOString(),
                  type: 'stream',
                  content: {
                    type: part.type,
                    text: payload.properties.delta,
                    partID: part.id
                  }
                });
              }
            }
          } else if (payload.type === 'message.updated') {
            // Handle completed message updates if needed
            const info = payload.properties.info;
            if (info && info.role === 'assistant') {
              // We could log the final message here if we haven't already
            }
          } else if (payload.type === 'tool.start') {
            const toolName = payload.properties.tool?.name || 'unknown-tool';
            this.addLog(sessionId, {
              timestamp: new Date().toISOString(),
              type: 'tool',
              content: { text: `Tool started: ${toolName}`, details: payload.properties }
            });
          } else if (payload.type === 'tool.end') {
            const toolName = payload.properties.tool?.name || 'unknown-tool';
            const output = payload.properties.output;
            this.addLog(sessionId, {
              timestamp: new Date().toISOString(),
              type: 'tool',
              content: { text: `Tool ended: ${toolName}`, output: output }
            });
          }
        } catch (e) {
          console.error(`Error handling event for session ${sessionId}:`, e);
        }
      });

      try {
        // Note: EventBus is initialized at server startup. Subscription auto-starts it if needed.
        // No blocking wait required - events may arrive before or during prompt execution.

        // Add log for sending message
        this.addLog(sessionId, {
          timestamp: new Date().toISOString(),
          type: 'message',
          content: {
            message: { role: 'user', content: options.prompt },
          },
        });

        // Send message to OpenCode using FIRE-AND-FORGET pattern (like OpenCode TUI)
        // DO NOT await this - it blocks until the entire LLM response is received!
        // Completion will be detected via EventBus 'session.status' events.
        console.log(`[OpenCode] Sending prompt to session ${openCodeSessionId}...`);
        console.log('[OpenCode] Prompt text:', options.prompt);

        this.openCodeClient.session.prompt({
          sessionID: openCodeSessionId,
          parts: [{ type: 'text', text: options.prompt }],
          model: options.model ? {
            providerID: options.model.provider_id,
            modelID: options.model.model_id,
          } : undefined,
        }).then((promptResult) => {
          console.log('[OpenCode] Prompt completed:', JSON.stringify(promptResult, null, 2));

          if (promptResult.error) {
            const err = promptResult.error as any;
            const errorMessage = err.message || err.data?.message || JSON.stringify(err);
            console.error('[OpenCode] Prompt failed:', errorMessage);
            this.updateStatus(sessionId, 'failed', undefined, {
              code: 'PROMPT_ERROR',
              message: errorMessage,
              occurred_at: new Date().toISOString()
            });
            return;
          }

          const responseData = promptResult.data;

          // Extract response text
          let responseText = '';
          if (responseData?.parts) {
            responseText = responseData.parts
              .filter((p: any) => p.type === 'text')
              .map((p: any) => p.text)
              .join('');

            this.addLog(sessionId, {
              timestamp: new Date().toISOString(),
              type: 'message',
              content: {
                message: { role: 'assistant', content: responseText }
              }
            });
          }

          // Mark as completed
          this.updateStatus(sessionId, 'completed', {
            response: responseText,
            messages: [],
            tool_calls_count: 0,
          });

          this.addLog(sessionId, {
            timestamp: new Date().toISOString(),
            type: 'system',
            content: { text: 'Execution completed' },
          });
        }).catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          console.error('[OpenCode] Prompt error:', message);
          this.updateStatus(sessionId, 'failed', undefined, message);
        }).finally(() => {
          // Always unsubscribe when the interaction is done
          unsubscribe();
        });

        // Return immediately - execution continues in background
        console.log('[OpenCode] Prompt sent (fire-and-forget)');

      } catch (error) {
        // Only catches errors in setting up the prompt call, not the async execution
        unsubscribe();
        throw error;
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`OpenCode interaction failed: ${message}`);
    }
  }


  /**
   * Get an execution session by ID.
   */
  getExecution(sessionId: string): ExecutionSession | undefined {
    const session = this.storage.get(sessionId);
    return session ? this.toExecutionSession(session) : undefined;
  }

  /**
   * Cancel an execution.
   */
  async cancelExecution(sessionId: string): Promise<ExecutionSession> {
    const session = this.storage.get(sessionId);
    if (!session) {
      throw new NotFoundError('Execution session', sessionId);
    }

    // Check if already completed
    if (['completed', 'failed', 'cancelled', 'timeout'].includes(session.status)) {
      throw new AlreadyCompletedError();
    }

    // Update status
    session.status = 'cancelled';
    session.ended_at = new Date().toISOString();
    if (session.started_at) {
      session.duration_ms = new Date(session.ended_at).getTime() - new Date(session.started_at).getTime();
    }

    this.storage.save(session);
    this.emit('status', { sessionId, status: 'cancelled' });

    // Add cancellation log
    this.addLog(sessionId, {
      timestamp: new Date().toISOString(),
      type: 'system',
      content: { text: 'Execution cancelled by user' },
    });

    return this.toExecutionSession(session);
  }

  /**
   * Get logs for an execution.
   */
  getLogs(
    sessionId: string,
    limit: number = 100,
    offset: number = 0
  ): { logs: ExecutionLog[]; total: number; limit: number; offset: number } | undefined {
    const result = this.storage.getLogs(sessionId, limit, offset);
    if (!result) {
      return undefined;
    }

    return {
      logs: result.logs,
      total: result.total,
      limit,
      offset,
    };
  }

  /**
   * List all executions.
   */
  listExecutions(
    limit: number = 20,
    offset: number = 0,
    skillPackageId?: string
  ): { executions: ExecutionSession[]; total: number; limit: number; offset: number } {
    let sessions = skillPackageId
      ? this.storage.listBySkill(skillPackageId)
      : this.storage.listAll();

    // Sort by started_at descending
    sessions = sessions.sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );

    const total = sessions.length;
    const paginated = sessions.slice(offset, offset + limit);

    return {
      executions: paginated.map((s) => this.toExecutionSession(s)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Add a log entry to an execution.
   */
  addLog(sessionId: string, log: ExecutionLog): boolean {
    const saved = this.storage.addLog(sessionId, log);
    if (saved) {
      this.emit('log', { sessionId, log });
    }
    return saved;
  }

  /**
   * Update execution status.
   */
  updateStatus(
    sessionId: string,
    status: ExecutionStatus,
    result?: ExecutionSession['result'],
    error?: ExecutionSession['error']
  ): ExecutionSession | undefined {
    const session = this.storage.get(sessionId);
    if (!session) {
      return undefined;
    }

    session.status = status;

    if (['completed', 'failed', 'cancelled', 'timeout'].includes(status)) {
      session.ended_at = new Date().toISOString();
      if (session.started_at) {
        session.duration_ms = new Date(session.ended_at).getTime() - new Date(session.started_at).getTime();
      }
    }

    if (result) {
      session.result = result;
    }

    if (error) {
      session.error = error;
    }

    this.storage.save(session);
    this.emit('status', { sessionId, status });

    return this.toExecutionSession(session);
  }

  /**
   * Get the stored session (internal use).
   */
  getStoredSession(sessionId: string): StoredExecutionSession | undefined {
    return this.storage.get(sessionId);
  }

  /**
   * Convert stored session to public ExecutionSession (without internal fields).
   */
  private toExecutionSession(session: StoredExecutionSession): ExecutionSession {
    return {
      id: session.id,
      skill_package_id: session.skill_package_id,
      skill_name: session.skill_name,
      user_prompt: session.user_prompt,
      model: session.model,
      status: session.status,
      started_at: session.started_at,
      ended_at: session.ended_at,
      duration_ms: session.duration_ms,
      result: session.result,
      error: session.error,
      opencode_session_id: session.opencode_session_id,
      stream_url: session.stream_url,
    };
  }
}

// Global service instance
let service: ExecutionService | null = null;

/**
 * Get the global execution service instance.
 */
export function getExecutionService(): ExecutionService {
  if (!service) {
    service = new ExecutionService();
  }
  return service;
}

/**
 * Reset the global execution service (for testing).
 */
export function resetExecutionService(): void {
  service = null;
}
