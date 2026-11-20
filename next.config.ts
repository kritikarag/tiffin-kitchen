import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  typescript: {
    // GoDaddy's build machine runs out of memory in the "Running TypeScript" step (the label translations
    // make the type check heavy), and the build stops with "Failed to type check". The check is not lost:
    // `npm run typecheck` runs it, and it is run before every push. Next.js recommends this for that case:
    // node_modules/next/dist/docs/01-app/02-guides/memory-usage.md
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
