/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mindverseglobal-cos-cdn.mindverse.com',
        pathname: '/front-img/**',
      },
      {
        protocol: 'https',
        hostname: '**.mindverse.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
