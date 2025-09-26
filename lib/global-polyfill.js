// Nuclear polyfill for build issues
if (typeof global !== 'undefined') {
  global.self = global;
  global.window = global;
  global.document = {};
  global.navigator = { userAgent: 'node' };
  global.location = { href: 'http://localhost:3000' };
}

if (typeof globalThis !== 'undefined') {
  globalThis.self = globalThis;
  globalThis.window = globalThis;
}

// Export empty object for webpack
module.exports = {};