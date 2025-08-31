import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingRoot: '/Users/stuartholmes/Desktop/Udemy & Other Courses/The Complete AI Coding Course - August 2025/project-genie',
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
    return config
  },
};

export default nextConfig;
