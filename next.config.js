/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['nbuvtscbuzdggfgieltu.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
}

module.exports = nextConfig
