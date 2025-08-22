/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
      {
        protocol: 'https',
        hostname: 'clerk.cuttingasmr.org',
      },
      {
        protocol: 'https',
        hostname: 'pub-59ae9a96b6614a9db89af40b2970d3ab.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'pub-c6cdf19c1dc84237813b1f66cf8afeff.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}
module.exports = nextConfig


