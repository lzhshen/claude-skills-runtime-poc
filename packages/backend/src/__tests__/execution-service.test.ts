/**
 * Tests for ExecutionService.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ExecutionService,
  getExecutionService,
  resetExecutionService,
} from '../services/execution.service.js';
import { resetExecutionStorage } from '../services/execution.storage.js';
import { resetSkillStorage } from '../services/skill.storage.js';
import { resetSkillService, getSkillService } from '../services/skill.service.js';
import { NotFoundError, InvalidSkillError, AlreadyCompletedError } from '../utils/errors.js';

describe('ExecutionService', () => {
  let service: ExecutionService;

  beforeEach(() => {
    resetExecutionStorage();
    resetExecutionService();
    resetSkillStorage();
    resetSkillService();
    service = new ExecutionService();
  });

  afterEach(() => {
    resetExecutionStorage();
    resetExecutionService();
    resetSkillStorage();
    resetSkillService();
  });

  // Helper to create a valid skill package for testing
  const createValidSkillPackage = async () => {
    const skillService = getSkillService();
    // Create a mock valid skill package
    const pkg = {
      id: 'test-skill-1',
      filename: 'test.zip',
      validation_status: 'valid' as const,
      validation_errors: [],
      metadata: {
        name: 'Test Skill',
        description: 'A test skill',
        raw_content: '---\nname: Test Skill\ndescription: A test skill\n---\nInstructions',
        instruction: 'Instructions',
        extra_fields: {},
      },
      files: [
        { path: 'SKILL.md', file_type: 'file' as const, size: 100 },
      ],
      file_tree: [],
      uploaded_at: new Date().toISOString(),
      size_bytes: 100,
    };
    // Directly access storage to add the package
    const storage = (skillService as any).storage;
    storage.save(pkg);
    return pkg;
  };

  describe('startExecution', () => {
    it('should throw NotFoundError for non-existent skill', async () => {
      await expect(
        service.startExecution('non-existent', { prompt: 'test' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw InvalidSkillError for invalid skill', async () => {
      const skillService = getSkillService();
      const invalidPkg = {
        id: 'invalid-skill',
        filename: 'test.zip',
        validation_status: 'invalid' as const,
        validation_errors: [{ code: 'TEST', message: 'Test error' }],
        files: [],
        file_tree: [],
        uploaded_at: new Date().toISOString(),
        size_bytes: 100,
      };
      const storage = (skillService as any).storage;
      storage.save(invalidPkg);

      await expect(
        service.startExecution('invalid-skill', { prompt: 'test' })
      ).rejects.toThrow(InvalidSkillError);
    });

    it('should create execution session for valid skill', async () => {
      await createValidSkillPackage();

      const session = await service.startExecution('test-skill-1', {
        prompt: 'Test prompt',
      });

      expect(session.id).toBeDefined();
      expect(session.skill_package_id).toBe('test-skill-1');
      expect(session.skill_name).toBe('Test Skill');
      expect(session.user_prompt).toBe('Test prompt');
      expect(session.status).toBe('running');
      expect(session.started_at).toBeDefined();
      expect(session.stream_url).toContain(session.id);
    });

    it('should include model info when provided', async () => {
      await createValidSkillPackage();

      const session = await service.startExecution('test-skill-1', {
        prompt: 'Test prompt',
        model: { provider_id: 'anthropic', model_id: 'claude-3' },
      });

      expect(session.model).toEqual({
        provider_id: 'anthropic',
        model_id: 'claude-3',
      });
    });
  });

  describe('getExecution', () => {
    it('should return undefined for non-existent session', () => {
      const session = service.getExecution('non-existent');
      expect(session).toBeUndefined();
    });

    it('should return session when exists', async () => {
      await createValidSkillPackage();
      const created = await service.startExecution('test-skill-1', {
        prompt: 'Test',
      });

      const retrieved = service.getExecution(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });
  });

  describe('cancelExecution', () => {
    it('should throw NotFoundError for non-existent session', async () => {
      await expect(service.cancelExecution('non-existent')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw AlreadyCompletedError for completed session', async () => {
      await createValidSkillPackage();
      const session = await service.startExecution('test-skill-1', {
        prompt: 'Test',
      });

      // Complete the session
      service.updateStatus(session.id, 'completed');

      await expect(service.cancelExecution(session.id)).rejects.toThrow(
        AlreadyCompletedError
      );
    });

    it('should cancel running session', async () => {
      await createValidSkillPackage();
      const session = await service.startExecution('test-skill-1', {
        prompt: 'Test',
      });

      const cancelled = await service.cancelExecution(session.id);

      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.ended_at).toBeDefined();
      expect(cancelled.duration_ms).toBeDefined();
    });
  });

  describe('getLogs', () => {
    it('should return undefined for non-existent session', () => {
      const result = service.getLogs('non-existent');
      expect(result).toBeUndefined();
    });

    it('should return logs for existing session', async () => {
      await createValidSkillPackage();
      const session = await service.startExecution('test-skill-1', {
        prompt: 'Test',
      });

      const result = service.getLogs(session.id);
      expect(result).toBeDefined();
      expect(result?.logs.length).toBeGreaterThan(0); // Should have initial log
      expect(result?.total).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      await createValidSkillPackage();
      const session = await service.startExecution('test-skill-1', {
        prompt: 'Test',
      });

      // Add more logs
      for (let i = 0; i < 5; i++) {
        service.addLog(session.id, {
          timestamp: new Date().toISOString(),
          type: 'system',
          content: { text: `Log ${i}` },
        });
      }

      const result = service.getLogs(session.id, 2, 1);
      expect(result?.logs.length).toBe(2);
      expect(result?.limit).toBe(2);
      expect(result?.offset).toBe(1);
    });
  });

  describe('listExecutions', () => {
    it('should return empty list when no executions', () => {
      const result = service.listExecutions();
      expect(result.executions).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return all executions', async () => {
      await createValidSkillPackage();
      await service.startExecution('test-skill-1', { prompt: 'Test 1' });
      await service.startExecution('test-skill-1', { prompt: 'Test 2' });

      const result = service.listExecutions();
      expect(result.executions.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should filter by skill package ID', async () => {
      await createValidSkillPackage();

      // Create another skill package
      const skillService = getSkillService();
      const pkg2 = {
        id: 'test-skill-2',
        filename: 'test2.zip',
        validation_status: 'valid' as const,
        validation_errors: [],
        metadata: {
          name: 'Test Skill 2',
          description: 'Another test skill',
          raw_content: '---\nname: Test Skill 2\ndescription: Another test skill\n---\nInstructions',
          instruction: 'Instructions',
          extra_fields: {},
        },
        files: [{ path: 'SKILL.md', file_type: 'file' as const, size: 100 }],
        file_tree: [],
        uploaded_at: new Date().toISOString(),
        size_bytes: 100,
      };
      const storage = (skillService as any).storage;
      storage.save(pkg2);

      await service.startExecution('test-skill-1', { prompt: 'Test 1' });
      await service.startExecution('test-skill-2', { prompt: 'Test 2' });

      const result = service.listExecutions(20, 0, 'test-skill-1');
      expect(result.executions.length).toBe(1);
      expect(result.executions[0].skill_package_id).toBe('test-skill-1');
    });

    it('should support pagination', async () => {
      await createValidSkillPackage();
      for (let i = 0; i < 5; i++) {
        await service.startExecution('test-skill-1', { prompt: `Test ${i}` });
      }

      const result = service.listExecutions(2, 1);
      expect(result.executions.length).toBe(2);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(1);
      expect(result.total).toBe(5);
    });
  });

  describe('addLog', () => {
    it('should return false for non-existent session', () => {
      const result = service.addLog('non-existent', {
        timestamp: new Date().toISOString(),
        type: 'system',
        content: { text: 'Test' },
      });
      expect(result).toBe(false);
    });

    it('should add log to existing session', async () => {
      await createValidSkillPackage();
      const session = await service.startExecution('test-skill-1', {
        prompt: 'Test',
      });

      const result = service.addLog(session.id, {
        timestamp: new Date().toISOString(),
        type: 'assistant',
        content: { text: 'Response' },
      });

      expect(result).toBe(true);

      const logs = service.getLogs(session.id);
      expect(logs?.logs.some(l => l.content.text === 'Response')).toBe(true);
    });
  });

  describe('updateStatus', () => {
    it('should return undefined for non-existent session', () => {
      const result = service.updateStatus('non-existent', 'completed');
      expect(result).toBeUndefined();
    });

    it('should update status', async () => {
      await createValidSkillPackage();
      const session = await service.startExecution('test-skill-1', {
        prompt: 'Test',
      });

      const updated = service.updateStatus(session.id, 'completed');
      expect(updated?.status).toBe('completed');
      expect(updated?.ended_at).toBeDefined();
      expect(updated?.duration_ms).toBeDefined();
    });

    it('should include result when provided', async () => {
      await createValidSkillPackage();
      const session = await service.startExecution('test-skill-1', {
        prompt: 'Test',
      });

      const updated = service.updateStatus(session.id, 'completed', {
        summary: 'Task completed',
      });

      expect(updated?.result).toEqual({ summary: 'Task completed' });
    });

    it('should include error when provided', async () => {
      await createValidSkillPackage();
      const session = await service.startExecution('test-skill-1', {
        prompt: 'Test',
      });

      const updated = service.updateStatus(session.id, 'failed', undefined, {
        code: 'EXECUTION_ERROR',
        message: 'Something went wrong',
      });

      expect(updated?.error).toEqual({
        code: 'EXECUTION_ERROR',
        message: 'Something went wrong',
      });
    });
  });

  describe('getStoredSession', () => {
    it('should return undefined for non-existent session', () => {
      const result = service.getStoredSession('non-existent');
      expect(result).toBeUndefined();
    });

    it('should return stored session with logs', async () => {
      await createValidSkillPackage();
      const session = await service.startExecution('test-skill-1', {
        prompt: 'Test',
      });

      const stored = service.getStoredSession(session.id);
      expect(stored).toBeDefined();
      expect(stored?.logs).toBeDefined();
      expect(Array.isArray(stored?.logs)).toBe(true);
    });
  });

  describe('getExecutionService', () => {
    it('should return singleton instance', () => {
      resetExecutionService();
      const instance1 = getExecutionService();
      const instance2 = getExecutionService();
      expect(instance1).toBe(instance2);
    });
  });
});
