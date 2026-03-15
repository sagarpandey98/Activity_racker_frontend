/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from backend if needed later
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  reactCompiler: true,
};

export default nextConfig;
