/**
 * Tests for config routes.
 */

import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { configRoutes } from '../routes/config.js';

// Create test app
const app = new Hono();
app.route('/api/v1/config', configRoutes);

describe('Config Routes', () => {
  describe('GET /api/v1/config/providers', () => {
    it('should return list of providers', async () => {
      const res = await app.request('/api/v1/config/providers');

      expect(res.status).toBe(200);

      const body = await res.json() as { providers: Array<{ id: string; name: string; models: Array<{ id: string; name: string }> }> };
      expect(body.providers).toBeDefined();
      expect(Array.isArray(body.providers)).toBe(true);
      expect(body.providers.length).toBeGreaterThan(0);

      // Check first provider structure
      const firstProvider = body.providers[0];
      expect(firstProvider.id).toBeDefined();
      expect(firstProvider.name).toBeDefined();
      expect(firstProvider.models).toBeDefined();
      expect(Array.isArray(firstProvider.models)).toBe(true);
    });

    it('should include OpenCode provider', async () => {
      const res = await app.request('/api/v1/config/providers');
      const body = await res.json() as { providers: Array<{ id: string; name: string; models: Array<{ id: string; name: string }> }> };

      const opencode = body.providers.find(p => p.id === 'opencode');
      expect(opencode).toBeDefined();
      expect(opencode?.name).toBe('OpenCode');
      expect(opencode?.models.length).toBeGreaterThan(0);
    });

    it('should include Local provider', async () => {
      const res = await app.request('/api/v1/config/providers');
      const body = await res.json() as { providers: Array<{ id: string; name: string; models: Array<{ id: string; name: string }> }> };

      const local = body.providers.find(p => p.id === 'local');
      expect(local).toBeDefined();
      expect(local?.name).toBe('Local');
      expect(local?.models.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/config/agents', () => {
    it('should return list of agents', async () => {
      const res = await app.request('/api/v1/config/agents');

      expect(res.status).toBe(200);

      const body = await res.json() as { agents: Array<{ id: string; name: string; description: string }> };
      expect(body.agents).toBeDefined();
      expect(Array.isArray(body.agents)).toBe(true);
      expect(body.agents.length).toBeGreaterThan(0);

      // Check first agent structure
      const firstAgent = body.agents[0];
      expect(firstAgent.id).toBeDefined();
      expect(firstAgent.name).toBeDefined();
      expect(firstAgent.description).toBeDefined();
    });

    it('should include default agent', async () => {
      const res = await app.request('/api/v1/config/agents');
      const body = await res.json() as { agents: Array<{ id: string; name: string; description: string }> };

      const defaultAgent = body.agents.find(a => a.id === 'default');
      expect(defaultAgent).toBeDefined();
      expect(defaultAgent?.name).toBe('Default Agent');
    });

    it('should include coder agent', async () => {
      const res = await app.request('/api/v1/config/agents');
      const body = await res.json() as { agents: Array<{ id: string; name: string; description: string }> };

      const coderAgent = body.agents.find(a => a.id === 'coder');
      expect(coderAgent).toBeDefined();
      expect(coderAgent?.name).toBe('Coder Agent');
    });
  });
});
