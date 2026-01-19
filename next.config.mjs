/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Optimize output for production
  output: 'standalone',
  // Reduce build memory usage
  experimental: {
    // Optimize package imports for better performance
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig
