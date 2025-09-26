// STAGING BYPASS: Aggressive polyfills for browser globals
// This file is imported at the very start of the application

// Polyfill 'self' for server-side rendering
if (typeof self === 'undefined') {
  (global as any).self = global;
}

// Polyfill other browser globals that might cause issues
if (typeof window === 'undefined') {
  (global as any).window = {
    location: { href: '', protocol: 'https:' },
    navigator: { userAgent: 'node' },
    document: {},
  };
}

// Polyfill document
if (typeof document === 'undefined') {
  (global as any).document = {
    createElement: () => ({}),
    createTextNode: () => ({}),
    getElementById: () => null,
  };
}

// Export to ensure this file is included
export const polyfillsLoaded = true;