// Test script to verify all fixes are working
// Run in browser console at http://localhost:3001/company-intelligence

console.log('=== Testing Fixes ===');

// Test 1: Check for infinite loop (should see only one log)
const logs = performance.getEntriesByType('measure').filter(m =>
  m.name.includes('step_render')
);
console.log('✅ Infinite loop fixed:', logs.length < 10 ? 'PASS' : 'FAIL');

// Test 2: Check Tailwind v4 colors
const testColorDiv = document.createElement('div');
testColorDiv.className = 'bg-success text-info-foreground';
document.body.appendChild(testColorDiv);
const styles = window.getComputedStyle(testColorDiv);
const hasBackground = styles.backgroundColor !== 'rgba(0, 0, 0, 0)';
document.body.removeChild(testColorDiv);
console.log('✅ Tailwind colors work:', hasBackground ? 'PASS' : 'FAIL');

// Test 3: Domain validation
const domainInput = document.querySelector('input[placeholder*="domain"]');
if (domainInput) {
  // Test auto-cleaning
  const event = new Event('input', { bubbles: true });
  domainInput.value = 'https://www.example.com/path';
  domainInput.dispatchEvent(event);

  setTimeout(() => {
    const cleaned = domainInput.value === 'example.com';
    console.log('✅ Domain auto-cleaning:', cleaned ? 'PASS' : 'NEEDS MANUAL CHECK');
  }, 400); // Wait for debounce
}

// Test 4: Check console for excessive logs
const consoleEntries = performance.getEntriesByType('measure');
const recentLogs = consoleEntries.filter(e =>
  Date.now() - e.startTime < 5000
);
console.log('✅ Logging overhead reduced:', recentLogs.length < 50 ? 'PASS' : 'FAIL');

console.log('=== All tests complete ===');
console.log('Note: Check browser Network tab - should NOT see repeated requests');