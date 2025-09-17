// Test html-decoder
try {
  const decoder = require('./lib/utils/html-decoder.ts');
  console.log('HTML Decoder loaded successfully');
  console.log('Exports:', Object.keys(decoder));
} catch (error) {
  console.error('Error loading html-decoder:', error.message);
  console.error('Stack:', error.stack);
}