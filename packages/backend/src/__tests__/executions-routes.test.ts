/**
 * Tests for executions routes.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { executionsRoutes } from '../routes/executions.js';
import { resetExecutionStorage } from '../services/execution.storage.js';
import { resetExecutionService, getExecutionService } from '../services/execution.service.js';
import { resetSkillStorage, getSkillStorage } from '../services/skill.storage.js';
import { resetSkillService } from '../services/skill.service.js';

// Create test app
const app = new Hono();
app.route('/api/v1/executions', executionsRoutes);

// Type definitions for responses
interface ExecutionResponse {
  id: string;
  skill_package_id: string;
  skill_name: string;
  user_prompt: string;
  status: string;
  started_at: string;
  stream_url: string;
  error?: { code: string; message: string };
}

interface LogsResponse {
  logs: Array<{ timestamp: string; type: string; content: { text?: string } }>;
  total: number;
  limit: number;
  offset: number;
}

interface ListResponse {
  executions: ExecutionResponse[];
  total: number;
  limit: number;
  offset: number;
}

describe('Executions Routes', () => {
  beforeEach(() => {
    resetExecutionStorage();
    resetExecutionService();
    resetSkillStorage();
    resetSkillService();
  });

  afterEach(() => {
    resetExecutionStorage();
    resetExecutionService();
    resetSkillStorage();
    resetSkillService();
  });

  // Helper to create a valid skill package
  const createValidSkillPackage = () => {
    const storage = getSkillStorage();
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
      files: [{ path: 'SKILL.md', file_type: 'file' as const, size: 100 }],
      file_tree: [],
      uploaded_at: new Date().toISOString(),
      size_bytes: 100,
    };
    storage.save(pkg);
    return pkg;
  };

  describe('POST /api/v1/executions/skills/:id/execute', () => {
    it('should start execution for valid skill', async () => {
      createValidSkillPackage();

      const res = await app.request('/api/v1/executions/skills/test-skill-1/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Test prompt' }),
      });

      expect(res.status).toBe(201);

      const body = await res.json() as ExecutionResponse;
      expect(body.id).toBeDefined();
      expect(body.skill_package_id).toBe('test-skill-1');
      expect(body.user_prompt).toBe('Test prompt');
      expect(body.status).toBe('running');
      expect(body.stream_url).toContain(body.id);
    });

    it('should return 400 when prompt is missing', async () => {
      createValidSkillPackage();

      const res = await app.request('/api/v1/executions/skills/test-skill-1/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);

      const body = await res.json() as { error: { code: string; message: string } };
      expect(body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 404 for non-existent skill', async () => {
      const res = await app.request('/api/v1/executions/skills/non-existent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Test prompt' }),
      });

      expect(res.status).toBe(404);
    });

    it('should include model info when provided', async () => {
      createValidSkillPackage();

      const res = await app.request('/api/v1/executions/skills/test-skill-1/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Test prompt',
          model: { provider_id: 'anthropic', model_id: 'claude-3' },
        }),
      });

      expect(res.status).toBe(201);

      const body = await res.json() as ExecutionResponse & { model?: { provider_id: string; model_id: string } };
      expect(body.model).toEqual({ provider_id: 'anthropic', model_id: 'claude-3' });
    });
  });

  describe('GET /api/v1/executions/:id', () => {
    it('should return execution details', async () => {
      createValidSkillPackage();
      const service = getExecutionService();
      const session = await service.startExecution('test-skill-1', { prompt: 'Test' });

      const res = await app.request(`/api/v1/executions/${session.id}`);

      expect(res.status).toBe(200);

      const body = await res.json() as ExecutionResponse;
      expect(body.id).toBe(session.id);
      expect(body.status).toBe('running');
    });

    it('should return 404 for non-existent execution', async () => {
      const res = await app.request('/api/v1/executions/non-existent');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/executions/:id/cancel', () => {
    it('should cancel running execution', async () => {
      createValidSkillPackage();
      const service = getExecutionService();
      const session = await service.startExecution('test-skill-1', { prompt: 'Test' });

      const res = await app.request(`/api/v1/executions/${session.id}/cancel`, {
        method: 'POST',
      });

      expect(res.status).toBe(200);

      const body = await res.json() as { session_id: string; status: string; cancelled_at: string };
      expect(body.session_id).toBe(session.id);
      expect(body.status).toBe('cancelled');
      expect(body.cancelled_at).toBeDefined();
    });

    it('should return 404 for non-existent execution', async () => {
      const res = await app.request('/api/v1/executions/non-existent/cancel', {
        method: 'POST',
      });

      expect(res.status).toBe(404);
    });

    it('should return error for already completed execution', async () => {
      createValidSkillPackage();
      const service = getExecutionService();
      const session = await service.startExecution('test-skill-1', { prompt: 'Test' });
      service.updateStatus(session.id, 'completed');

      const res = await app.request(`/api/v1/executions/${session.id}/cancel`, {
        method: 'POST',
      });

      expect(res.status).toBe(400); // AlreadyCompletedError returns 400
    });
  });

  describe('GET /api/v1/executions/:id/logs', () => {
    it('should return execution logs', async () => {
      createValidSkillPackage();
      const service = getExecutionService();
      const session = await service.startExecution('test-skill-1', { prompt: 'Test' });

      const res = await app.request(`/api/v1/executions/${session.id}/logs`);

      expect(res.status).toBe(200);

      const body = await res.json() as LogsResponse;
      expect(body.logs).toBeDefined();
      expect(Array.isArray(body.logs)).toBe(true);
      expect(body.total).toBeGreaterThan(0);
    });

    it('should support pagination parameters', async () => {
      createValidSkillPackage();
      const service = getExecutionService();
      const session = await service.startExecution('test-skill-1', { prompt: 'Test' });

      // Add more logs
      for (let i = 0; i < 10; i++) {
        service.addLog(session.id, {
          timestamp: new Date().toISOString(),
          type: 'system',
          content: { text: `Log ${i}` },
        });
      }

      const res = await app.request(`/api/v1/executions/${session.id}/logs?limit=5&offset=2`);

      expect(res.status).toBe(200);

      const body = await res.json() as LogsResponse;
      expect(body.logs.length).toBe(5);
      expect(body.limit).toBe(5);
      expect(body.offset).toBe(2);
    });

    it('should return 404 for non-existent execution', async () => {
      const res = await app.request('/api/v1/executions/non-existent/logs');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/executions', () => {
    it('should return empty list when no executions', async () => {
      const res = await app.request('/api/v1/executions');

      expect(res.status).toBe(200);

      const body = await res.json() as ListResponse;
      expect(body.executions).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('should return list of executions', async () => {
      createValidSkillPackage();
      const service = getExecutionService();
      await service.startExecution('test-skill-1', { prompt: 'Test 1' });
      await service.startExecution('test-skill-1', { prompt: 'Test 2' });

      const res = await app.request('/api/v1/executions');

      expect(res.status).toBe(200);

      const body = await res.json() as ListResponse;
      expect(body.executions.length).toBe(2);
      expect(body.total).toBe(2);
    });

    it('should support pagination', async () => {
      createValidSkillPackage();
      const service = getExecutionService();
      for (let i = 0; i < 5; i++) {
        await service.startExecution('test-skill-1', { prompt: `Test ${i}` });
      }

      const res = await app.request('/api/v1/executions?limit=2&offset=1');

      expect(res.status).toBe(200);

      const body = await res.json() as ListResponse;
      expect(body.executions.length).toBe(2);
      expect(body.limit).toBe(2);
      expect(body.offset).toBe(1);
      expect(body.total).toBe(5);
    });

    it('should filter by skill_package_id', async () => {
      createValidSkillPackage();

      // Create another skill package
      const storage = getSkillStorage();
      storage.save({
        id: 'test-skill-2',
        filename: 'test2.zip',
        validation_status: 'valid' as const,
        validation_errors: [],
        metadata: {
          name: 'Test Skill 2',
          description: 'Another test skill',
          raw_content: '---\nname: Test Skill 2\ndescription: Another\n---\nInstructions',
          instruction: 'Instructions',
          extra_fields: {},
        },
        files: [{ path: 'SKILL.md', file_type: 'file' as const, size: 100 }],
        file_tree: [],
        uploaded_at: new Date().toISOString(),
        size_bytes: 100,
      });

      const service = getExecutionService();
      await service.startExecution('test-skill-1', { prompt: 'Test 1' });
      await service.startExecution('test-skill-2', { prompt: 'Test 2' });

      const res = await app.request('/api/v1/executions?skill_package_id=test-skill-1');

      expect(res.status).toBe(200);

      const body = await res.json() as ListResponse;
      expect(body.executions.length).toBe(1);
      expect(body.executions[0].skill_package_id).toBe('test-skill-1');
    });
  });

  describe('GET /api/v1/executions/:id/stream', () => {
    it('should return SSE stream for existing execution', async () => {
      createValidSkillPackage();
      const service = getExecutionService();
      const session = await service.startExecution('test-skill-1', { prompt: 'Test' });

      // Mark as completed so stream ends quickly
      service.updateStatus(session.id, 'completed');

      const res = await app.request(`/api/v1/executions/${session.id}/stream`);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');
    });

    it('should return 404 for non-existent execution', async () => {
      const res = await app.request('/api/v1/executions/non-existent/stream');

      expect(res.status).toBe(404);
    });
  });
});
