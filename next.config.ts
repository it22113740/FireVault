import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
    // Image uploads go through Server Actions (converted to WebP there).
    // Files are capped at 4 MB in lib/images.ts; this leaves room for
    // multipart overhead and stays under Vercel's 4.5 MB request limit.
    serverActions: {
      bodySizeLimit: "4.4mb",
    },
  },
  cacheComponents: true,
  images: {
    remotePatterns: [
      new URL(
        "storage/v1/object/public/public-images/**",
        process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/?$/, "/")
      ),
    ],
  },
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
