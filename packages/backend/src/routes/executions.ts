/**
 * Execution API routes.
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { getExecutionService } from '../services/execution.service.js';
import { NotFoundError, errorToResponse, getErrorStatusCode } from '../utils/errors.js';

export const executionsRoutes = new Hono();

// POST /api/v1/executions/skills/:id/execute - Start execution
executionsRoutes.post('/skills/:id/execute', async (c) => {
  try {
    const skillId = c.req.param('id');
    const body = await c.req.json<{ prompt: string; model?: { provider_id: string; model_id: string } }>();

    if (!body.prompt) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: 'Prompt is required' } }, 400);
    }

    const service = getExecutionService();
    const session = await service.startExecution(skillId, {
      prompt: body.prompt,
      model: body.model,
    });

    return c.json(session, 201);
  } catch (error) {
    return c.json(errorToResponse(error), getErrorStatusCode(error));
  }
});

// GET /api/v1/executions/:id/stream - SSE log streaming
executionsRoutes.get('/:id/stream', async (c) => {
  const sessionId = c.req.param('id');
  const service = getExecutionService();
  const session = service.getExecution(sessionId);

  if (!session) {
    return c.json(errorToResponse(new NotFoundError('Execution session', sessionId)), 404);
  }

  return streamSSE(c, async (stream) => {
    // Send current status
    await stream.writeSSE({
      event: 'status',
      data: JSON.stringify({
        status: session.status,
        timestamp: new Date().toISOString(),
      }),
    });

    // Get current logs and send them
    const logsResult = service.getLogs(sessionId);
    if (logsResult) {
      for (const log of logsResult.logs) {
        await stream.writeSSE({
          event: log.type,
          data: JSON.stringify(log),
        });
      }
    }

    // If session is already complete, send complete event
    if (['completed', 'failed', 'cancelled', 'timeout'].includes(session.status)) {
      await stream.writeSSE({
        event: 'complete',
        data: JSON.stringify({
          status: session.status,
          duration_ms: session.duration_ms,
          timestamp: new Date().toISOString(),
        }),
      });
      return;
    }

    // For running sessions, poll for updates
    let lastLogCount = logsResult?.logs.length ?? 0;
    let attempts = 0;
    const maxAttempts = 600; // 10 minutes at 1 second intervals

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const currentSession = service.getExecution(sessionId);
      if (!currentSession) {
        break;
      }

      // Check for new logs
      const currentLogs = service.getLogs(sessionId);
      if (currentLogs && currentLogs.logs.length > lastLogCount) {
        const newLogs = currentLogs.logs.slice(lastLogCount);
        for (const log of newLogs) {
          await stream.writeSSE({
            event: log.type,
            data: JSON.stringify(log),
          });
        }
        lastLogCount = currentLogs.logs.length;
      }

      // Check if session is complete
      if (['completed', 'failed', 'cancelled', 'timeout'].includes(currentSession.status)) {
        await stream.writeSSE({
          event: 'complete',
          data: JSON.stringify({
            status: currentSession.status,
            duration_ms: currentSession.duration_ms,
            timestamp: new Date().toISOString(),
          }),
        });
        break;
      }

      attempts++;
    }
  });
});

// POST /api/v1/executions/:id/cancel - Cancel execution
executionsRoutes.post('/:id/cancel', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const service = getExecutionService();
    const session = await service.cancelExecution(sessionId);

    return c.json({
      session_id: session.id,
      status: 'cancelled',
      cancelled_at: session.ended_at,
    });
  } catch (error) {
    return c.json(errorToResponse(error), getErrorStatusCode(error));
  }
});

// GET /api/v1/executions/:id - Get execution details
executionsRoutes.get('/:id', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const service = getExecutionService();
    const session = service.getExecution(sessionId);

    if (!session) {
      throw new NotFoundError('Execution session', sessionId);
    }

    return c.json(session);
  } catch (error) {
    return c.json(errorToResponse(error), getErrorStatusCode(error));
  }
});

// GET /api/v1/executions/:id/logs - Get execution logs
executionsRoutes.get('/:id/logs', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const limit = parseInt(c.req.query('limit') ?? '100', 10);
    const offset = parseInt(c.req.query('offset') ?? '0', 10);

    const service = getExecutionService();
    const result = service.getLogs(sessionId, limit, offset);

    if (!result) {
      throw new NotFoundError('Execution session', sessionId);
    }

    return c.json(result);
  } catch (error) {
    return c.json(errorToResponse(error), getErrorStatusCode(error));
  }
});

// GET /api/v1/executions - List executions
executionsRoutes.get('/', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') ?? '20', 10);
    const offset = parseInt(c.req.query('offset') ?? '0', 10);
    const skillPackageId = c.req.query('skill_package_id');

    const service = getExecutionService();
    const result = service.listExecutions(limit, offset, skillPackageId);

    return c.json(result);
  } catch (error) {
    return c.json(errorToResponse(error), getErrorStatusCode(error));
  }
});
