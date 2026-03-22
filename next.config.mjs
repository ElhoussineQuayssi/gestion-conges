/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force rebuild with timestamp
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  onDemandEntries: {
    maxInactiveAge: 0,
    pagesBufferLength: 0,
  },
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-cache, no-store, must-revalidate',
        },
      ],
    },
  ],
}

export default nextConfig
