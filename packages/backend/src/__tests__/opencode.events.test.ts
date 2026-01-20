import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenCodeEventBus, getOpenCodeEventBus, resetOpenCodeEventBus, EVENT_TYPES } from '../services/opencode.events.js';

// Mock createOpencodeClient
vi.mock('@opencode-ai/sdk/v2/client', () => ({
    createOpencodeClient: () => mockClient
}));

const mockClient = {
    global: {
        event: vi.fn()
    }
};

describe('OpenCodeEventBus', () => {
    beforeEach(() => {
        resetOpenCodeEventBus();
        vi.clearAllMocks();

        // Default mock: return an empty async generator
        mockClient.global.event.mockResolvedValue({
            stream: (async function* () { })()
        });
    });

    it('should be a singleton', () => {
        const bus1 = getOpenCodeEventBus();
        const bus2 = getOpenCodeEventBus();
        expect(bus1).toBe(bus2);
    });

    it('should call global.event only once when start() is called multiple times', async () => {
        const bus = getOpenCodeEventBus();

        bus.start();
        bus.start();
        bus.start();

        // Give the async function time to execute
        await new Promise(r => setTimeout(r, 10));

        expect(mockClient.global.event).toHaveBeenCalledTimes(1);
    });

    it('should dispatch events to correct session subscribers', async () => {
        const bus = getOpenCodeEventBus();

        // Create a controllable stream
        let controller: any;
        const stream = new ReadableStream({
            start(c) { controller = c; }
        });

        // Mock client to return our stream
        mockClient.global.event.mockResolvedValue({
            stream: (async function* () {
                const reader = stream.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    yield value;
                }
            })()
        });

        // Start listening
        bus.start();

        // Subscribe to session-1
        const session1Fn = vi.fn();
        bus.subscribe('session-1', session1Fn);

        // Subscribe to session-2
        const session2Fn = vi.fn();
        bus.subscribe('session-2', session2Fn);

        // Push events
        controller.enqueue({ payload: { type: 'e1', properties: { sessionID: 'session-1' } } });
        controller.enqueue({ payload: { type: 'e2', properties: { sessionID: 'session-2' } } });
        controller.enqueue({ payload: { type: 'e3', properties: { sessionID: 'session-1' } } });

        // Wait a bit for async processing
        await new Promise(r => setTimeout(r, 20));

        expect(session1Fn).toHaveBeenCalledTimes(2);
        expect(session2Fn).toHaveBeenCalledTimes(1);

        expect(session1Fn).toHaveBeenCalledWith(expect.objectContaining({ type: 'e1' }));
        expect(session1Fn).toHaveBeenCalledWith(expect.objectContaining({ type: 'e3' }));
        expect(session2Fn).toHaveBeenCalledWith(expect.objectContaining({ type: 'e2' }));

        controller.close();
    });

    it('should unsubscribe correctly', async () => {
        const bus = getOpenCodeEventBus();
        const fn = vi.fn();
        const unsubscribe = bus.subscribe('session-1', fn);

        unsubscribe();

        // Emit event (manually triggering the internal emit to bypass async loop complexity for this simple check)
        bus.emit(`${EVENT_TYPES.SESSION_EVENT}:session-1`, { type: 'test' });

        expect(fn).not.toHaveBeenCalled();
    });

    it('should emit CONNECTED event when connection is established', async () => {
        const bus = getOpenCodeEventBus();
        const connectedFn = vi.fn();
        bus.on(EVENT_TYPES.CONNECTED, connectedFn);

        bus.start();

        // Wait for async connection
        await new Promise(r => setTimeout(r, 10));

        expect(connectedFn).toHaveBeenCalledTimes(1);
    });
});
