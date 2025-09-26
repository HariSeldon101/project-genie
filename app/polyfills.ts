// STAGING BYPASS: ULTIMATE polyfills for all possible browser globals
// This file is imported at the very start of the application

// Core polyfill for 'self' and globalThis
if (typeof globalThis === 'undefined') {
  (global as any).globalThis = global;
}

if (typeof self === 'undefined') {
  (global as any).self = global;
  (globalThis as any).self = global;
}

// Comprehensive window polyfill
if (typeof window === 'undefined') {
  const mockWindow = {
    location: {
      href: 'https://localhost:3000',
      protocol: 'https:',
      host: 'localhost:3000',
      hostname: 'localhost',
      pathname: '/',
      search: '',
      hash: '',
      reload: () => {},
      replace: () => {},
      assign: () => {}
    },
    navigator: {
      userAgent: 'Mozilla/5.0 (compatible; Node.js)',
      language: 'en-US',
      languages: ['en-US'],
      platform: 'nodejs',
      cookieEnabled: false,
      onLine: true,
      vendor: 'Node.js'
    },
    document: {
      createElement: (tag: string) => ({
        tagName: tag,
        style: {},
        setAttribute: () => {},
        getAttribute: () => null,
        appendChild: () => {},
        removeChild: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        classList: {
          add: () => {},
          remove: () => {},
          contains: () => false
        }
      }),
      createTextNode: (text: string) => ({ nodeValue: text }),
      createDocumentFragment: () => ({}),
      getElementById: () => null,
      getElementsByClassName: () => [],
      getElementsByTagName: () => [],
      querySelector: () => null,
      querySelectorAll: () => [],
      body: {
        appendChild: () => {},
        style: {}
      },
      head: {
        appendChild: () => {},
        style: {}
      },
      documentElement: {
        style: {}
      }
    },
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0
    },
    sessionStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0
    },
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    requestAnimationFrame: (cb: any) => setTimeout(cb, 16),
    cancelAnimationFrame: clearTimeout,
    getComputedStyle: () => ({}),
    matchMedia: () => ({
      matches: false,
      addListener: () => {},
      removeListener: () => {}
    }),
    self: global,
    top: global,
    parent: global,
    frames: [],
    length: 0,
    closed: false,
    opener: null,
    innerWidth: 1920,
    innerHeight: 1080,
    outerWidth: 1920,
    outerHeight: 1080,
    pageXOffset: 0,
    pageYOffset: 0,
    screenX: 0,
    screenY: 0,
    screen: {
      width: 1920,
      height: 1080,
      availWidth: 1920,
      availHeight: 1080
    },
    performance: {
      now: () => Date.now()
    },
    crypto: {
      getRandomValues: (arr: any) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      }
    }
  };

  (global as any).window = mockWindow;
  (globalThis as any).window = mockWindow;
}

// Individual global polyfills
if (typeof document === 'undefined') {
  (global as any).document = (global as any).window.document;
  (globalThis as any).document = (global as any).window.document;
}

if (typeof navigator === 'undefined') {
  (global as any).navigator = (global as any).window.navigator;
  (globalThis as any).navigator = (global as any).window.navigator;
}

if (typeof location === 'undefined') {
  (global as any).location = (global as any).window.location;
  (globalThis as any).location = (global as any).window.location;
}

// Process polyfill (in case it's needed)
if (typeof process === 'undefined') {
  (global as any).process = {
    env: {},
    versions: { node: '18.0.0' },
    platform: 'linux',
    arch: 'x64'
  };
}

// Additional browser APIs that might be referenced
if (typeof HTMLElement === 'undefined') {
  (global as any).HTMLElement = class HTMLElement {
    style = {};
    classList = {
      add: () => {},
      remove: () => {},
      contains: () => false
    };
  };
}

if (typeof Event === 'undefined') {
  (global as any).Event = class Event {
    constructor(public type: string) {}
    preventDefault() {}
    stopPropagation() {}
  };
}

if (typeof CustomEvent === 'undefined') {
  (global as any).CustomEvent = (global as any).Event;
}

// Export to ensure this file is included
export const polyfillsLoaded = true;