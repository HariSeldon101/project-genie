import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Exclude logs directory from file watching to prevent recompilation loops
  webpack: (config, { dev, isServer }) => {
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

    // Handle Node.js modules on client-side
    if (!isServer) {
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve?.fallback,
          fs: false,
          path: false,
          crypto: false,
          stream: false,
          os: false,
          util: false,
          buffer: false,
          process: false,
        }
      }
    }

    return config
  },
};

export default nextConfig;
