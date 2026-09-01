import type { NextConfig } from 'next';

const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? '';

const nextConfig: NextConfig = {
  output: 'export',
  assetPrefix,
  images: { unoptimized: true },
};

export default nextConfig;
