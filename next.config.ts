import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A new id for every build. Next.js adds it to every script and stylesheet address (?dpl=...), so the CDN in
  // front of the hosting can never hand a browser a file from an older build. Without it, GoDaddy's CDN kept
  // serving an old order-form script under a reused file name for a year-long cache, and the page lost its
  // address field even though the server sent the new page.
  deploymentId: process.env.NEXT_DEPLOYMENT_ID ?? `b${Date.now().toString(36)}`,
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
