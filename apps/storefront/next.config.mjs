/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Les packages du workspace sont livrés en TS brut : Next les compile.
  transpilePackages: ['@velora/design-system'],
};

export default nextConfig;
