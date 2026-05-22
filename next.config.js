/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/devbench-tech',
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  images: { unoptimized: true },
};
module.exports = nextConfig;
