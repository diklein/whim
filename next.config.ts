import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* The dev tools badge sat on top of the sidebar footer. */
  devIndicators: false,
  /* The setup download reads hook/*.mjs at request time, so the deploy must carry them. */
  outputFileTracingIncludes: { "/api/setup/hook": ["./hook/**"] },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
