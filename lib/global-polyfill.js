// ULTRA-NUCLEAR polyfill for all environments
const globalRef = typeof globalThis !== 'undefined' ? globalThis :
                  typeof global !== 'undefined' ? global :
                  typeof window !== 'undefined' ? window :
                  typeof self !== 'undefined' ? self : {};

// Force define self in all contexts
if (!globalRef.self) {
  globalRef.self = globalRef;
}
if (!globalRef.window && typeof window === 'undefined') {
  globalRef.window = globalRef;
}
if (!globalRef.global && typeof global === 'undefined') {
  globalRef.global = globalRef;
}

// Ensure globalThis exists for older environments
if (typeof globalThis === 'undefined') {
  Object.defineProperty(Object.prototype, '__magic__', {
    get: function() { return this; },
    configurable: true
  });
  var __globalThis = __magic__;
  delete Object.prototype.__magic__;
  if (typeof global !== 'undefined') {
    global.globalThis = __globalThis;
  }
}

// Additional browser API mocks for SSR
if (!globalRef.document && typeof document === 'undefined') {
  globalRef.document = {
    createElement: () => ({}),
    getElementById: () => null,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

if (!globalRef.navigator && typeof navigator === 'undefined') {
  globalRef.navigator = {
    userAgent: 'node',
    platform: 'server',
    language: 'en'
  };
}

if (!globalRef.location && typeof location === 'undefined') {
  globalRef.location = {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000'
  };
}

// Export for webpack
module.exports = {};