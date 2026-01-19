/**
 * Health check API routes.
 */

import { Hono } from 'hono';
import { getOpenCodeClient } from '../services/opencode.client.js';

export const healthRoutes = new Hono();

// GET /api/v1/health - Health check
healthRoutes.get('/', async (c) => {
  const client = getOpenCodeClient();
  const healthCheck = await client.checkHealth();

  const response = {
    status: healthCheck.available ? 'healthy' : 'unhealthy',
    version: '0.1.0',
    opencode_server: {
      status: healthCheck.available ? 'connected' : 'disconnected',
      url: client.serverUrl,
      error: healthCheck.error,
    },
  };

  return c.json(response, healthCheck.available ? 200 : 503);
});
