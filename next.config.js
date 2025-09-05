/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal configuration - no custom webpack to avoid React Refresh conflicts
  swcMinify: true,
};

module.exports = nextConfig;
