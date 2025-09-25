/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // This allows for static export
  trailingSlash: true, // This ensures URLs end with a slash
  images: {
    unoptimized: true // Since we're exporting statically
  },
  // Since we're using Vercel, we can specify this
  experimental: {
    appDir: false, // Using pages router
  }
}

module.exports = nextConfig