import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8080',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'wagmi.ac',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '*.wagmi.ac',
        pathname: '/uploads/**',
      },
    ],
    // 禁用图片优化，直接使用原始图片 URL
    unoptimized: true,
  },
};

export default nextConfig;
