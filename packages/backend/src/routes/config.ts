/**
 * Configuration API routes.
 */

import { Hono } from 'hono';

export const configRoutes = new Hono();

// GET /api/v1/config/providers - List providers
configRoutes.get('/providers', async (c) => {
  // TODO: Fetch from OpenCode server when available
  // For now, return mock data
  return c.json({
    providers: [
      {
        id: 'opencode',
        name: 'OpenCode',
        models: [
          { id: 'glm-4.7-free', name: 'GLM-4.7 Free' },
          { id: 'minimax-m2.1-free', name: 'MiniMax M2.1 Free' },
        ],
      },
      {
        id: 'local',
        name: 'Local',
        models: [
          { id: 'claude-opus-4-5-thinking', name: 'Claude Opus 4.5 Thinking' },
          { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
          { id: 'claude-sonnet-4-5-thinking', name: 'Claude Sonnet 4.5 Thinking' },
          { id: 'gemini-3-flash', name: 'Gemini 3 Flash' },
          { id: 'gemini-3-pro-high', name: 'Gemini 3 Pro High' },
        ],
      },
    ],
  });
});

// GET /api/v1/config/agents - List agents
configRoutes.get('/agents', async (c) => {
  // TODO: Fetch from OpenCode server when available
  // For now, return mock data
  return c.json({
    agents: [
      {
        id: 'default',
        name: 'Default Agent',
        description: 'Standard agent with all capabilities',
      },
      {
        id: 'coder',
        name: 'Coder Agent',
        description: 'Specialized for coding tasks',
      },
    ],
  });
});
