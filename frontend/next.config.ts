import type { NextConfig } from "next";

// 从 API URL 中提取基础 URL（去掉 /api 后缀）
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
const API_BASE_URL = API_URL.replace(/\/api$/, '');

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
        hostname: 'localhost',
        port: '3209',
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
  // 代理 /uploads/* 请求到 Go 后端
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${API_BASE_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
