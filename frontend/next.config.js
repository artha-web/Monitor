/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  images: {
    domains: ['localhost'],
  },
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/monitors',
        permanent: false,
      },
      {
        source: '/dashboard/monitors',
        destination: '/monitors',
        permanent: false,
      },
      {
        source: '/dashboard/monitors/:id',
        destination: '/monitors/:id',
        permanent: false,
      },
      {
        source: '/dashboard/settings',
        destination: '/settings',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
