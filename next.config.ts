import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Every page here depends on who is logged in, so nothing is pre-rendered or cached.
  cacheComponents: false,
  partialPrefetching: false,
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
