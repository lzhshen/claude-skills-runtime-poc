/**
 * Tests for ExecutionStorage service.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ExecutionStorage,
  getExecutionStorage,
  resetExecutionStorage,
  type StoredExecutionSession,
} from '../services/execution.storage.js';
import type { ExecutionLog } from '@skills-runtime/shared';

describe('ExecutionStorage', () => {
  let storage: ExecutionStorage;

  beforeEach(() => {
    resetExecutionStorage();
    storage = new ExecutionStorage();
  });

  const createMockSession = (id: string, skillId: string = 'skill-1'): StoredExecutionSession => ({
    id,
    skill_package_id: skillId,
    skill_name: 'Test Skill',
    user_prompt: 'Test prompt',
    status: 'pending',
    started_at: new Date().toISOString(),
    logs: [],
    stream_url: `/api/v1/executions/${id}/stream`,
  });

  describe('save and get', () => {
    it('should save and retrieve a session', () => {
      const session = createMockSession('session-1');
      storage.save(session);

      const retrieved = storage.get('session-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('session-1');
      expect(retrieved?.skill_name).toBe('Test Skill');
    });

    it('should return undefined for non-existent session', () => {
      const retrieved = storage.get('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should update existing session on save', () => {
      const session = createMockSession('session-1');
      storage.save(session);

      session.status = 'running';
      storage.save(session);

      const retrieved = storage.get('session-1');
      expect(retrieved?.status).toBe('running');
    });
  });

  describe('delete', () => {
    it('should delete an existing session', () => {
      const session = createMockSession('session-1');
      storage.save(session);

      const result = storage.delete('session-1');
      expect(result).toBe(true);
      expect(storage.get('session-1')).toBeUndefined();
    });

    it('should return false when deleting non-existent session', () => {
      const result = storage.delete('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('has', () => {
    it('should return true for existing session', () => {
      const session = createMockSession('session-1');
      storage.save(session);

      expect(storage.has('session-1')).toBe(true);
    });

    it('should return false for non-existent session', () => {
      expect(storage.has('non-existent')).toBe(false);
    });
  });

  describe('count', () => {
    it('should return 0 for empty storage', () => {
      expect(storage.count).toBe(0);
    });

    it('should return correct count after adding sessions', () => {
      storage.save(createMockSession('session-1'));
      storage.save(createMockSession('session-2'));
      storage.save(createMockSession('session-3'));

      expect(storage.count).toBe(3);
    });
  });

  describe('listAll', () => {
    it('should return empty array for empty storage', () => {
      expect(storage.listAll()).toEqual([]);
    });

    it('should return all sessions', () => {
      storage.save(createMockSession('session-1'));
      storage.save(createMockSession('session-2'));

      const sessions = storage.listAll();
      expect(sessions.length).toBe(2);
      expect(sessions.map(s => s.id).sort()).toEqual(['session-1', 'session-2']);
    });
  });

  describe('listBySkill', () => {
    it('should filter sessions by skill ID', () => {
      storage.save(createMockSession('session-1', 'skill-A'));
      storage.save(createMockSession('session-2', 'skill-B'));
      storage.save(createMockSession('session-3', 'skill-A'));

      const sessions = storage.listBySkill('skill-A');
      expect(sessions.length).toBe(2);
      expect(sessions.every(s => s.skill_package_id === 'skill-A')).toBe(true);
    });

    it('should return empty array for non-existent skill', () => {
      storage.save(createMockSession('session-1', 'skill-A'));

      const sessions = storage.listBySkill('non-existent');
      expect(sessions).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should remove all sessions', () => {
      storage.save(createMockSession('session-1'));
      storage.save(createMockSession('session-2'));

      storage.clear();

      expect(storage.count).toBe(0);
      expect(storage.listAll()).toEqual([]);
    });
  });

  describe('addLog', () => {
    it('should add log to existing session', () => {
      const session = createMockSession('session-1');
      storage.save(session);

      const log: ExecutionLog = {
        timestamp: new Date().toISOString(),
        type: 'system',
        content: { text: 'Test log' },
      };

      const result = storage.addLog('session-1', log);
      expect(result).toBe(true);

      const retrieved = storage.get('session-1');
      expect(retrieved?.logs.length).toBe(1);
      expect(retrieved?.logs[0].content.text).toBe('Test log');
    });

    it('should return false for non-existent session', () => {
      const log: ExecutionLog = {
        timestamp: new Date().toISOString(),
        type: 'system',
        content: { text: 'Test log' },
      };

      const result = storage.addLog('non-existent', log);
      expect(result).toBe(false);
    });
  });

  describe('getLogs', () => {
    it('should return logs for existing session', () => {
      const session = createMockSession('session-1');
      storage.save(session);

      // Add some logs
      for (let i = 0; i < 5; i++) {
        storage.addLog('session-1', {
          timestamp: new Date().toISOString(),
          type: 'system',
          content: { text: `Log ${i}` },
        });
      }

      const result = storage.getLogs('session-1');
      expect(result).toBeDefined();
      expect(result?.logs.length).toBe(5);
      expect(result?.total).toBe(5);
    });

    it('should support pagination', () => {
      const session = createMockSession('session-1');
      storage.save(session);

      // Add 10 logs
      for (let i = 0; i < 10; i++) {
        storage.addLog('session-1', {
          timestamp: new Date().toISOString(),
          type: 'system',
          content: { text: `Log ${i}` },
        });
      }

      const result = storage.getLogs('session-1', 3, 2);
      expect(result).toBeDefined();
      expect(result?.logs.length).toBe(3);
      expect(result?.total).toBe(10);
      expect(result?.logs[0].content.text).toBe('Log 2');
    });

    it('should return undefined for non-existent session', () => {
      const result = storage.getLogs('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getExecutionStorage', () => {
    it('should return singleton instance', () => {
      resetExecutionStorage();
      const instance1 = getExecutionStorage();
      const instance2 = getExecutionStorage();

      expect(instance1).toBe(instance2);
    });
  });

  describe('resetExecutionStorage', () => {
    it('should create new instance after reset', () => {
      const instance1 = getExecutionStorage();
      instance1.save(createMockSession('session-1'));

      resetExecutionStorage();
      const instance2 = getExecutionStorage();

      expect(instance2.count).toBe(0);
    });
  });
});
