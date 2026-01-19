/**
 * Tests for health routes.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Hono } from 'hono';
import { healthRoutes } from '../routes/health.js';
import { resetOpenCodeClient } from '../services/opencode.client.js';
import { resetSettings } from '../utils/config.js';

// Create test app
const app = new Hono();
app.route('/api/v1/health', healthRoutes);

describe('Health Routes', () => {
  beforeEach(() => {
    resetOpenCodeClient();
    resetSettings();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetOpenCodeClient();
  });

  describe('GET /api/v1/health', () => {
    it('should return healthy status when OpenCode server is available', async () => {
      // Mock fetch to return success
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await app.request('/api/v1/health');

      expect(res.status).toBe(200);

      const body = await res.json() as {
        status: string;
        version: string;
        opencode_server: { status: string; url: string; error?: string };
      };
      expect(body.status).toBe('healthy');
      expect(body.version).toBe('0.1.0');
      expect(body.opencode_server.status).toBe('connected');
      expect(body.opencode_server.url).toBeDefined();
    });

    it('should return unhealthy status when OpenCode server is unavailable', async () => {
      // Mock fetch to return error
      const mockFetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
      vi.stubGlobal('fetch', mockFetch);

      const res = await app.request('/api/v1/health');

      expect(res.status).toBe(503);

      const body = await res.json() as {
        status: string;
        version: string;
        opencode_server: { status: string; url: string; error?: string };
      };
      expect(body.status).toBe('unhealthy');
      expect(body.opencode_server.status).toBe('disconnected');
      expect(body.opencode_server.error).toContain('Connection refused');
    });

    it('should return unhealthy when server returns non-OK status', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await app.request('/api/v1/health');

      expect(res.status).toBe(503);

      const body = await res.json() as {
        status: string;
        opencode_server: { status: string; error?: string };
      };
      expect(body.status).toBe('unhealthy');
      expect(body.opencode_server.error).toContain('500');
    });
  });
});
