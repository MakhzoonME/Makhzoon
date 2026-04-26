/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/favicon.ico',
        destination: '/icon.svg?v=2',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
