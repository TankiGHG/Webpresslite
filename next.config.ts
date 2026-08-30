import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Media is served from the S3/MinIO endpoint configured via ENV.
    remotePatterns: process.env.NEXT_PUBLIC_MEDIA_URL
      ? [new URL(`${process.env.NEXT_PUBLIC_MEDIA_URL}/**`)]
      : [],
  },
};

export default nextConfig;
