// Test script to verify fetch-sitemap fix
async function testFetchSitemap() {
  try {
    const response = await fetch('http://localhost:3000/api/company-intelligence/fetch-sitemap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add a test cookie to simulate authentication
        'Cookie': document.cookie // Will include auth cookies from browser
      },
      body: JSON.stringify({
        domain: 'bigfluffy.ai' // Test with existing domain
      })
    });

    console.log('Status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error('Error:', error);
    } else {
      const data = await response.json();
      console.log('Success:', data);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Note: This script should be run in the browser console
// while logged in to the app at http://localhost:3000
console.log('Copy and run this in browser console:');
console.log('await testFetchSitemap()');
console.log('');
console.log('Or directly test with curl (requires auth token):');
console.log('curl -X POST http://localhost:3000/api/company-intelligence/fetch-sitemap -H "Content-Type: application/json" -d \'{"domain":"bigfluffy.ai"}\' -v');