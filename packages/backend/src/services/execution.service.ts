/**
 * Execution service for managing skill executions.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ExecutionSession, ExecutionLog, ExecutionStatus } from '@skills-runtime/shared';
import { getExecutionStorage, type StoredExecutionSession } from './execution.storage.js';
import { getSkillService } from './skill.service.js';
import { getOpenCodeClient } from './opencode.client.js';
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
export class ExecutionService {
  private storage = getExecutionStorage();
  private skillService = getSkillService();
  private openCodeClient = getOpenCodeClient();

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

    // Create OpenCode session
    const createResult = await this.openCodeClient.createSession();
    if (createResult.error || !createResult.id) {
      throw new Error(createResult.error || 'Failed to create OpenCode session');
    }

    const openCodeSessionId = createResult.id;

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

    // Add log for sending message
    this.addLog(sessionId, {
      timestamp: new Date().toISOString(),
      type: 'message',
      content: {
        message: { role: 'user', content: options.prompt },
      },
    });

    // Send message to OpenCode
    const messageResult = await this.openCodeClient.sendMessage(
      openCodeSessionId,
      options.prompt,
      {
        providerId: options.model?.provider_id,
        modelId: options.model?.model_id,
      }
    );

    if (!messageResult.success) {
      throw new Error(messageResult.error || 'Failed to send message');
    }

    // Add assistant response to logs
    if (messageResult.response) {
      this.addLog(sessionId, {
        timestamp: new Date().toISOString(),
        type: 'message',
        content: {
          message: { role: 'assistant', content: messageResult.response.text },
        },
      });

      // Add detailed part logs if available
      for (const part of messageResult.response.parts) {
        if (part.type !== 'text') {
          this.addLog(sessionId, {
            timestamp: new Date().toISOString(),
            type: part.type,
            content: part,
          });
        }
      }
    }

    // Mark as completed
    this.updateStatus(sessionId, 'completed', {
      response: messageResult.response?.text || '',
      messages: [],
      tool_calls_count: 0,
    });

    this.addLog(sessionId, {
      timestamp: new Date().toISOString(),
      type: 'system',
      content: { text: 'Execution completed' },
    });
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
    return this.storage.addLog(sessionId, log);
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
