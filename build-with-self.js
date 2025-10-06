#!/usr/bin/env node

// ULTRA-NUCLEAR: Define self globally before anything else
global.self = global;
global.window = global;
global.document = {
  createElement: () => ({}),
  getElementById: () => null,
  addEventListener: () => {},
  removeEventListener: () => {}
};
global.navigator = {
  userAgent: 'node',
  platform: 'server',
  language: 'en'
};
global.location = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000'
};

// Now run the Next.js build
require('next/dist/cli/next-build');