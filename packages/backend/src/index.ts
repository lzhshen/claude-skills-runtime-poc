import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { healthRoutes } from './routes/health.js';
import { skillsRoutes } from './routes/skills.js';
import { executionsRoutes } from './routes/executions.js';
import { configRoutes } from './routes/config.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// API routes
const api = new Hono();
api.route('/health', healthRoutes);
api.route('/skills', skillsRoutes);
api.route('/executions', executionsRoutes);
api.route('/config', configRoutes);

app.route('/api/v1', api);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Skills Runtime API',
    version: '0.1.0',
    docs: '/api/v1',
  });
});

const port = parseInt(process.env.PORT || '3001', 10);

console.log(`Starting server on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`Server running at http://localhost:${port}`);

export { app };
