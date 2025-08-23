import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingRoot: '/Users/stuartholmes/Desktop/Udemy & Other Courses/The Complete AI Coding Course - August 2025/project-genie',
};

export default nextConfig;
