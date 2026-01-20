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

  // Set headers to prevent buffering at any proxy level
  c.header('X-Accel-Buffering', 'no');
  c.header('Cache-Control', 'no-cache, no-transform');

  return streamSSE(c, async (stream) => {
    // Send current status
    await stream.writeSSE({
      data: JSON.stringify({
        type: 'status',
        status: session.status,
        timestamp: new Date().toISOString(),
      }),
    });

    // Get current logs and send them
    const logsResult = service.getLogs(sessionId);
    if (logsResult) {
      for (const log of logsResult.logs) {
        await stream.writeSSE({
          data: JSON.stringify(log),
        });
      }
    }

    // If session is already complete, send complete event and close
    if (['completed', 'failed', 'cancelled', 'timeout'].includes(session.status)) {
      await stream.writeSSE({
        data: JSON.stringify({
          type: 'complete',
          status: session.status,
          duration_ms: session.duration_ms,
          timestamp: new Date().toISOString(),
        }),
      });
      return;
    }

    // Event listeners - with timing logs
    let logCount = 0;
    let lastLogTime = Date.now();

    const onLog = async (payload: { sessionId: string; log: any }) => {
      if (payload.sessionId === sessionId) {
        const now = Date.now();
        logCount++;
        console.log(`[SSE:${sessionId.slice(0, 8)}] Forwarding log #${logCount}, delta: ${now - lastLogTime}ms`);
        lastLogTime = now;

        await stream.writeSSE({
          data: JSON.stringify(payload.log),
        });
      }
    };

    const onStatus = async (payload: { sessionId: string; status: string }) => {
      if (payload.sessionId === sessionId) {
        // Send status update if needed (frontend might care)
        // Check for completion
        if (['completed', 'failed', 'cancelled', 'timeout'].includes(payload.status)) {
          // We need to fetch the final session state to get duration/result
          const finalSession = service.getExecution(sessionId);
          await stream.writeSSE({
            data: JSON.stringify({
              type: 'complete',
              status: finalSession?.status || payload.status,
              duration_ms: finalSession?.duration_ms,
              timestamp: new Date().toISOString(),
            }),
          });
          // Allow the stream to close naturally by resolving the promise? 
          // Hono's streamSSE keeps connection open while the async callback is running.
          // To close it from valid completion, we can't easily break the "onAbort" wait unless we return.
          // But we are in a callback.
          // Actually, we can just remove listeners. The stream will stay open until client disconnects 
          // OR we can try to return. But we are inside event handlers.

          // For now, let's keep sending events. The frontend will close EventSource on 'complete'.
          // When frontend closes, onAbort will fire.
        } else {
          await stream.writeSSE({
            data: JSON.stringify({
              type: 'status',
              status: payload.status,
              timestamp: new Date().toISOString(),
            }),
          });
        }
      }
    };

    service.on('log', onLog);
    service.on('status', onStatus);

    // Wait for client disconnect
    // Hono streamSSE keeps running until this async function returns.
    // If we return, the stream closes.
    // So we need to hang here.
    await new Promise<void>((resolve) => {
      stream.onAbort(() => {
        resolve();
      });
    });

    // Cleanup
    service.off('log', onLog);
    service.off('status', onStatus);
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
