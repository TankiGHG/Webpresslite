import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',

  /**
   * Render metadata into the initial `<head>` for every request instead of
   * streaming it into the body for React to hoist later.
   *
   * Next only blocks streaming for user agents on a hardcoded bot list. Every
   * other crawler — and any preview or archiving tool — receives a document
   * whose head has no title or description. For a publishing platform that is
   * the wrong default. Metadata here comes from the same cached queries the
   * page itself uses, so blocking on it costs almost nothing.
   */
  htmlLimitedBots: /.*/,

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
