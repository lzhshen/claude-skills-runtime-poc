/**
 * In-memory execution session storage service.
 */

import type { ExecutionSession, ExecutionLog } from '@skills-runtime/shared';

/**
 * Extended ExecutionSession with logs for in-memory storage.
 */
export interface StoredExecutionSession extends ExecutionSession {
  /** Execution logs */
  logs: ExecutionLog[];
}

/**
 * In-memory storage for execution sessions.
 */
export class ExecutionStorage {
  private sessions: Map<string, StoredExecutionSession> = new Map();

  /**
   * Save an execution session.
   *
   * @param session - ExecutionSession to save.
   */
  save(session: StoredExecutionSession): void {
    this.sessions.set(session.id, session);
  }

  /**
   * Get an execution session by ID.
   *
   * @param sessionId - ID of the session to retrieve.
   * @returns ExecutionSession if found, undefined otherwise.
   */
  get(sessionId: string): StoredExecutionSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Delete an execution session.
   *
   * @param sessionId - ID of the session to delete.
   * @returns True if deleted, false if not found.
   */
  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * List all execution sessions.
   *
   * @returns List of all stored execution sessions.
   */
  listAll(): StoredExecutionSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * List execution sessions for a specific skill.
   *
   * @param skillPackageId - ID of the skill package.
   * @returns List of execution sessions for the skill.
   */
  listBySkill(skillPackageId: string): StoredExecutionSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.skill_package_id === skillPackageId
    );
  }

  /**
   * Clear all stored sessions.
   */
  clear(): void {
    this.sessions.clear();
  }

  /**
   * Check if a session exists.
   *
   * @param sessionId - ID of the session to check.
   * @returns True if exists, false otherwise.
   */
  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Get count of stored sessions.
   */
  get count(): number {
    return this.sessions.size;
  }

  /**
   * Add a log entry to a session.
   *
   * @param sessionId - ID of the session.
   * @param log - Log entry to add.
   * @returns True if added, false if session not found.
   */
  addLog(sessionId: string, log: ExecutionLog): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    session.logs.push(log);
    return true;
  }

  /**
   * Get logs for a session.
   *
   * @param sessionId - ID of the session.
   * @param limit - Maximum number of logs to return.
   * @param offset - Number of logs to skip.
   * @returns Logs for the session, or undefined if not found.
   */
  getLogs(
    sessionId: string,
    limit: number = 100,
    offset: number = 0
  ): { logs: ExecutionLog[]; total: number } | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return undefined;
    }

    const total = session.logs.length;
    const logs = session.logs.slice(offset, offset + limit);

    return { logs, total };
  }
}

// Global storage instance
let storage: ExecutionStorage | null = null;

/**
 * Get the global execution storage instance.
 */
export function getExecutionStorage(): ExecutionStorage {
  if (!storage) {
    storage = new ExecutionStorage();
  }
  return storage;
}

/**
 * Reset the global execution storage (for testing).
 */
export function resetExecutionStorage(): void {
  storage = null;
}
