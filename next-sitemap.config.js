/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://project-genie.vercel.app',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 5000,
  exclude: [
    '/api/*',
    '/server-sitemap.xml',
    '/_next/*',
    '/404',
    '/500'
  ],
  // Custom priority and changefreq for specific pages
  transform: async (config, path) => {
    // Homepage - highest priority
    if (path === '/') {
      return {
        loc: path,
        changefreq: 'daily',
        priority: 1.0,
        lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      }
    }
    
    // Main sections - high priority
    if (['/projects', '/projects/new', '/company-intelligence'].includes(path)) {
      return {
        loc: path,
        changefreq: 'weekly',
        priority: 0.9,
        lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      }
    }
    
    // Dynamic project pages - medium priority
    if (path.startsWith('/projects/') && path !== '/projects/new') {
      return {
        loc: path,
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      }
    }
    
    // Documentation pages - lower priority
    if (path.startsWith('/docs/')) {
      return {
        loc: path,
        changefreq: 'monthly',
        priority: 0.5,
        lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      }
    }
    
    // Default for all other pages
    return {
      loc: path,
      changefreq: config.changefreq,
      priority: config.priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
    }
  },
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/', '/404', '/500']
      }
    ],
    additionalSitemaps: []
  }
}
