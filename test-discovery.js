const { SitemapDiscoveryService } = require('./lib/company-intelligence/services/sitemap-discovery');

async function test() {
  const service = new SitemapDiscoveryService('bigfluffy.ai');
  const result = await service.execute();
  console.log('Result:', result);
}

test().catch(console.error);
