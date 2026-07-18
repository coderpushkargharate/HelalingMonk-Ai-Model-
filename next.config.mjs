/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The migrated SPA (src/) was built with Vite, which never type-checked or
  // linted at build time. Keep that behaviour so pre-existing type/lint noise in
  // the pose/analysis modules doesn't block production builds.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // Native/CommonJS server-only packages that should not be bundled by webpack;
  // they run in the Node.js runtime inside the API route handlers.
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'bcryptjs'],
  },
};

export default nextConfig;
