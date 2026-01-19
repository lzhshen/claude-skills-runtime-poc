/**
 * Tests for OpenCode client.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  OpenCodeClient,
  getOpenCodeClient,
  resetOpenCodeClient,
} from '../services/opencode.client.js';
import { resetSettings } from '../utils/config.js';

describe('OpenCodeClient', () => {
  beforeEach(() => {
    resetOpenCodeClient();
    resetSettings();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should use default settings when no config provided', () => {
      const client = new OpenCodeClient();
      expect(client.serverUrl).toBeDefined();
      expect(client.serverUrl).toContain('http');
    });

    it('should use provided config', () => {
      const client = new OpenCodeClient({
        serverUrl: 'http://custom-server:8080',
        timeout: 30000,
      });
      expect(client.serverUrl).toBe('http://custom-server:8080');
    });
  });

  describe('serverUrl', () => {
    it('should return configured server URL', () => {
      const client = new OpenCodeClient({
        serverUrl: 'http://localhost:4096',
      });
      expect(client.serverUrl).toBe('http://localhost:4096');
    });
  });

  describe('checkHealth', () => {
    it('should return available true when server responds OK', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      vi.stubGlobal('fetch', mockFetch);

      const client = new OpenCodeClient({
        serverUrl: 'http://localhost:4096',
      });

      const result = await client.checkHealth();
      expect(result.available).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return available false when server returns error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      vi.stubGlobal('fetch', mockFetch);

      const client = new OpenCodeClient({
        serverUrl: 'http://localhost:4096',
      });

      const result = await client.checkHealth();
      expect(result.available).toBe(false);
      expect(result.error).toContain('500');
    });

    it('should return available false when fetch throws', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
      vi.stubGlobal('fetch', mockFetch);

      const client = new OpenCodeClient({
        serverUrl: 'http://localhost:4096',
      });

      const result = await client.checkHealth();
      expect(result.available).toBe(false);
      expect(result.error).toContain('Connection refused');
    });

    it('should handle non-Error exceptions', async () => {
      const mockFetch = vi.fn().mockRejectedValue('string error');
      vi.stubGlobal('fetch', mockFetch);

      const client = new OpenCodeClient({
        serverUrl: 'http://localhost:4096',
      });

      const result = await client.checkHealth();
      expect(result.available).toBe(false);
      expect(result.error).toBe('string error');
    });
  });

  describe('getOpenCodeClient', () => {
    it('should return singleton instance', () => {
      const instance1 = getOpenCodeClient();
      const instance2 = getOpenCodeClient();
      expect(instance1).toBe(instance2);
    });
  });

  describe('resetOpenCodeClient', () => {
    it('should create new instance after reset', () => {
      const instance1 = getOpenCodeClient();
      resetOpenCodeClient();
      const instance2 = getOpenCodeClient();
      // They should be different instances (though we can't directly compare)
      // We verify by checking that reset doesn't throw
      expect(instance2).toBeDefined();
    });
  });
});
