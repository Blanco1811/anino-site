/** @type {import('next').NextConfig} */

const BUILD_ID = Date.now().toString();

const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  compress: false,
  images: {
    domains: ['cdn.pixabay.com'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  webpack: (config) => {
    config.optimization = {
      ...config.optimization,
      minimize: false,
      splitChunks: {
        ...config.optimization.splitChunks,
        maxInitialRequests: 25,
        minSize: 20000,
      },
    };
    return config;
  },
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
};

module.exports = nextConfig;
