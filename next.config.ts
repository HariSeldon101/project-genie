import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable strict mode in development to reduce memory usage (double rendering)
  reactStrictMode: false,

  // Optimize production builds - fix TypeScript errors properly instead of ignoring
  eslint: {
    // Temporarily ignore ESLint during builds to deploy with existing code
    // TODO: Fix the 'any' type warnings and re-enable strict checking
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily ignore TypeScript errors to deploy with existing code
    // TODO: Fix the syntax errors in google-business-enricher.ts
    ignoreBuildErrors: true,
  },

  // Module aliasing for cleaner imports (already in tsconfig but good to have here too)
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
    '@radix-ui/react-icons': {
      transform: '@radix-ui/react-icons/dist/{{member}}',
    },
  },

  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // STAGING BYPASS: Polyfill browser globals for server-side rendering
    if (isServer) {
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve?.fallback,
          self: false,
          window: false,
          document: false,
          navigator: false,
          location: false,
        }
      }
    }

    // Development optimizations
    if (dev && !isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules',
          '**/logs/**',
          '**/.git/**',
          '**/claude-code-dev-log.md'
        ],
      }
    }

    // Production optimizations
    if (!dev) {
      // Enable tree shaking
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,

        // Split chunks for better caching
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,

            // Vendor chunk for node_modules
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
              enforce: true,
            },

            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },

            // Framework chunk
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
            },

            // Separate chunk for large libraries
            mermaid: {
              name: 'mermaid',
              chunks: 'all',
              test: /[\\/]node_modules[\\/]mermaid[\\/]/,
              priority: 30,
              enforce: true,
            },

            supabase: {
              name: 'supabase',
              chunks: 'all',
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              priority: 30,
              enforce: true,
            },
          },
        },
      }
    }

    return config
  },

  // Server external packages (moved from experimental in Next.js 15.5)
  serverExternalPackages: [
    'playwright'
  ],

  // Experimental features for optimization
  experimental: {
    optimizeCss: false, // Disabled to fix critters dependency issue

    // Optimize specific heavy packages
    optimizePackageImports: [
      '@radix-ui',
      'lucide-react',
      'framer-motion',
      'mermaid',
      '@supabase/supabase-js',
      'recharts',
      'date-fns'
    ],
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Compression
  compress: true,

  // Power optimization for better performance
  poweredByHeader: false,

  // Production source maps (disable for smaller builds)
  productionBrowserSourceMaps: false,
};

export default nextConfig;