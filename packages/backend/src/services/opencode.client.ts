/**
 * OpenCode SDK client factory and utilities.
 *
 * This module provides a client for interacting with the OpenCode server using the official SDK.
 */

import { createOpencodeClient } from '@opencode-ai/sdk/v2/client';
import { getSettings } from '../utils/config.js';

export type Client = ReturnType<typeof createOpencodeClient>;

// Global client instance
let client: Client | null = null;

/**
 * Get the global OpenCode client instance.
 */
export function getOpenCodeClient(): Client {
  if (!client) {
    const settings = getSettings();
    client = createOpencodeClient({
      baseUrl: settings.opencodeServerUrl,
      // Add fetch polyfill if needed for Node environments older than 18
      // fetch: globalThis.fetch, 
    });
  }
  return client;
}

/**
 * Reset the global OpenCode client (for testing).
 */
export function resetOpenCodeClient(): void {
  client = null;
}
