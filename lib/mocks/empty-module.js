/**
 * Mock module to replace @supabase/realtime-js during SSR
 * This prevents "self is not defined" errors during Next.js build
 *
 * The realtime features will still work on the client side,
 * this mock is only used during server-side rendering.
 */

// Provide minimal mock implementation to satisfy imports
const mockChannel = {
  on: () => mockChannel,
  subscribe: () => Promise.resolve({ status: 'SUBSCRIBED' }),
  unsubscribe: () => Promise.resolve(),
  send: () => Promise.resolve(),
  updateJWT: () => {},
};

const mockClient = {
  connect: () => Promise.resolve(),
  disconnect: () => Promise.resolve(),
  channel: () => mockChannel,
  removeChannel: () => Promise.resolve(),
  removeAllChannels: () => Promise.resolve(),
  getChannels: () => [],
  isConnected: () => false,
  setAuth: () => {},
  _headers: {},
  _heartbeatTimer: null,
};

// Export mocks for all possible imports
module.exports = {
  // Default export
  default: {
    RealtimeClient: class RealtimeClient {
      constructor() { return mockClient; }
    },
    RealtimeChannel: class RealtimeChannel {
      constructor() { return mockChannel; }
    },
    RealtimePresence: class RealtimePresence {
      constructor() {}
      track() { return Promise.resolve(); }
      untrack() { return Promise.resolve(); }
    },
  },
  // Named exports
  RealtimeClient: class RealtimeClient {
    constructor() { return mockClient; }
  },
  RealtimeChannel: class RealtimeChannel {
    constructor() { return mockChannel; }
  },
  RealtimePresence: class RealtimePresence {
    constructor() {}
    track() { return Promise.resolve(); }
    untrack() { return Promise.resolve(); }
  },
  // Additional exports that might be used
  REALTIME_LISTEN_TYPES: {
    BROADCAST: 'broadcast',
    PRESENCE: 'presence',
    POSTGRES_CHANGES: 'postgres_changes',
  },
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT: {
    ALL: '*',
    INSERT: 'INSERT',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
  },
  REALTIME_SUBSCRIBE_STATES: {
    SUBSCRIBED: 'SUBSCRIBED',
    SUBSCRIBING: 'SUBSCRIBING',
    UNSUBSCRIBED: 'UNSUBSCRIBED',
    UNSUBSCRIBING: 'UNSUBSCRIBING',
  },
};