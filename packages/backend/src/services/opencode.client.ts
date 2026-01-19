/**
 * OpenCode SDK client factory and utilities.
 *
 * This module provides a client for interacting with the OpenCode server.
 */

import { getSettings } from '../utils/config.js';

/**
 * OpenCode client configuration.
 */
export interface OpenCodeClientConfig {
  serverUrl: string;
  timeout?: number;
}

/**
 * OpenCode session options.
 */
export interface SessionOptions {
  systemPrompt?: string;
  model?: {
    providerId: string;
    modelId: string;
  };
}

/**
 * OpenCode event types from the streaming API.
 */
export type OpenCodeEventType =
  | 'session.created'
  | 'message.start'
  | 'message.part.updated'
  | 'message.end'
  | 'tool.start'
  | 'tool.end'
  | 'session.idle'
  | 'session.error';

/**
 * OpenCode streaming event.
 */
export interface OpenCodeEvent {
  type: OpenCodeEventType;
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * OpenCode client for interacting with the OpenCode server.
 */
export class OpenCodeClient {
  private config: OpenCodeClientConfig;

  constructor(config?: Partial<OpenCodeClientConfig>) {
    const settings = getSettings();
    this.config = {
      serverUrl: config?.serverUrl ?? settings.opencodeServerUrl,
      timeout: config?.timeout ?? settings.executionTimeoutSeconds * 1000,
    };
  }

  /**
   * Get the server URL.
   */
  get serverUrl(): string {
    return this.config.serverUrl;
  }

  /**
   * Check if the OpenCode server is available.
   */
  async checkHealth(): Promise<{ available: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.config.serverUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return { available: true };
      }

      return {
        available: false,
        error: `Server returned ${response.status}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        available: false,
        error: message,
      };
    }
  }

  /**
   * Create a new session on the OpenCode server.
   */
  async createSession(): Promise<{ id: string; error?: string }> {
    try {
      const response = await fetch(`${this.config.serverUrl}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return { id: '', error: `Failed to create session: ${response.status}` };
      }

      const data = await response.json() as { id: string };
      return { id: data.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { id: '', error: message };
    }
  }

  /**
   * Send a message to a session and get the response.
   */
  async sendMessage(
    sessionId: string,
    message: string,
    options?: { providerId?: string; modelId?: string }
  ): Promise<{
    success: boolean;
    response?: {
      text: string;
      parts: Array<{ type: string; text?: string;[key: string]: unknown }>;
    };
    error?: string;
  }> {
    try {
      const body: Record<string, unknown> = {
        parts: [{ type: 'text', text: message }],
      };

      // Add provider/model if specified
      if (options?.providerId) {
        body.providerID = options.providerId;
      }
      if (options?.modelId) {
        body.modelID = options.modelId;
      }

      const response = await fetch(
        `${this.config.serverUrl}/session/${sessionId}/message`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.config.timeout ?? 300000),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Request failed: ${response.status} - ${errorText}` };
      }

      const data = await response.json() as {
        info: { id: string; modelID: string; providerID: string };
        parts: Array<{ type: string; text?: string;[key: string]: unknown }>;
      };

      // Extract text from parts
      const textParts = data.parts.filter(p => p.type === 'text');
      const fullText = textParts.map(p => p.text || '').join('');

      return {
        success: true,
        response: {
          text: fullText,
          parts: data.parts,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }
}

// Global client instance
let client: OpenCodeClient | null = null;

/**
 * Get the global OpenCode client instance.
 */
export function getOpenCodeClient(): OpenCodeClient {
  if (!client) {
    client = new OpenCodeClient();
  }
  return client;
}

/**
 * Reset the global OpenCode client (for testing).
 */
export function resetOpenCodeClient(): void {
  client = null;
}
