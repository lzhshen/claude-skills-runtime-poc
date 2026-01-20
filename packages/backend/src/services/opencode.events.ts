/**
 * OpenCode Event Bus Service.
 * 
 * Manages a singleton connection to the OpenCode global event stream
 * and dispatches events to subscribers based on session ID.
 * 
 * Uses SDK's for-await approach with detailed timing logs to debug buffering.
 */

import { EventEmitter } from 'events';
import { createOpencodeClient } from '@opencode-ai/sdk/v2/client';
import { getSettings } from '../utils/config.js';

type Client = ReturnType<typeof createOpencodeClient>;

// Events emitted by the bus
export const EVENT_TYPES = {
    SESSION_EVENT: 'session_event',
    CONNECTED: 'connected',
    ERROR: 'error',
} as const;

export class OpenCodeEventBus extends EventEmitter {
    private client: Client;
    private isListening: boolean = false;
    private isStarted: boolean = false;
    private retryCount: number = 0;
    private readonly MAX_RETRIES = 5;
    private readonly RETRY_DELAY_MS = 2000;

    constructor() {
        super();
        const settings = getSettings();
        this.client = createOpencodeClient({
            baseUrl: settings.opencodeServerUrl,
        });
    }

    /**
     * Start the global event listener using a fire-and-forget pattern.
     */
    public start(): void {
        if (this.isStarted) {
            return;
        }
        this.isStarted = true;
        void this.runEventLoop();
    }

    /**
     * Check if the bus is currently connected and listening.
     */
    public get connected(): boolean {
        return this.isListening;
    }

    /**
     * The main event loop that consumes the global event stream.
     * Uses SDK's for-await pattern with timing logs to debug buffering.
     */
    private async runEventLoop(): Promise<void> {
        try {
            console.log('[EventBus] Starting OpenCode global event listener...');
            const eventStream = await this.client.global.event();

            this.isListening = true;
            this.retryCount = 0;
            console.log('[EventBus] OpenCode global event listener connected.');
            this.emit(EVENT_TYPES.CONNECTED);

            let eventCount = 0;
            let lastEventTime = Date.now();

            for await (const event of eventStream.stream) {
                const now = Date.now();
                const timeSinceLast = now - lastEventTime;
                eventCount++;

                // Log timing for debugging - shows if events arrive in batches
                console.log(`[EventBus] Event #${eventCount} arrived, delta: ${timeSinceLast}ms`);
                lastEventTime = now;

                this.dispatchEvent(event);

                // Yield to event loop immediately after each event
                await new Promise<void>((resolve) => setImmediate(resolve));
            }

            console.warn('[EventBus] OpenCode event stream closed externally. Will reconnect...');
            this.isListening = false;
            this.scheduleReconnect();

        } catch (error) {
            console.error('[EventBus] Error in OpenCode event loop:', error);
            this.isListening = false;
            this.scheduleReconnect();
        }
    }

    /**
     * Dispatch an event to the appropriate listeners based on session ID.
     */
    private dispatchEvent(event: any): void {
        try {
            const payload = event.payload;

            if (!payload) {
                return;
            }

            // Extract session ID - check multiple possible locations
            let sessionId = payload.properties?.sessionID;

            if (!sessionId && payload.properties?.part?.sessionID) {
                sessionId = payload.properties.part.sessionID;
            }
            if (!sessionId && payload.properties?.info?.sessionID) {
                sessionId = payload.properties.info.sessionID;
            }
            if (!sessionId && payload.properties?.message?.sessionID) {
                sessionId = payload.properties.message.sessionID;
            }

            if (sessionId) {
                const eventName = `${EVENT_TYPES.SESSION_EVENT}:${sessionId}`;
                if (this.listenerCount(eventName) > 0) {
                    this.emit(eventName, payload);
                }
            }
        } catch (err) {
            console.error('[EventBus] Error dispatching event:', err);
        }
    }

    /**
     * Subscribe to events for a specific session.
     */
    public subscribe(sessionId: string, callback: (payload: any) => void): () => void {
        this.start();

        const eventName = `${EVENT_TYPES.SESSION_EVENT}:${sessionId}`;
        this.on(eventName, callback);

        return () => {
            this.off(eventName, callback);
        };
    }

    /**
     * Schedule a reconnection attempt with exponential backoff.
     */
    private scheduleReconnect(): void {
        if (this.retryCount >= this.MAX_RETRIES) {
            console.error(`[EventBus] Max retries (${this.MAX_RETRIES}) reached. Giving up.`);
            this.emit(EVENT_TYPES.ERROR, new Error('Connection to OpenCode server lost permanently.'));
            this.isStarted = false;
            return;
        }

        this.retryCount++;
        const delay = this.RETRY_DELAY_MS * Math.pow(1.5, this.retryCount - 1);

        console.log(`[EventBus] Reconnecting in ${delay}ms (Attempt ${this.retryCount}/${this.MAX_RETRIES})...`);

        setTimeout(() => {
            void this.runEventLoop();
        }, delay);
    }
}

// Global singleton instance
let eventBus: OpenCodeEventBus | null = null;

export function getOpenCodeEventBus(): OpenCodeEventBus {
    if (!eventBus) {
        eventBus = new OpenCodeEventBus();
    }
    return eventBus;
}

export function initializeOpenCodeEventBus(): OpenCodeEventBus {
    const bus = getOpenCodeEventBus();
    bus.start();
    return bus;
}

export function resetOpenCodeEventBus(): void {
    if (eventBus) {
        eventBus.removeAllListeners();
    }
    eventBus = null;
}
