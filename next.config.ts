import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
    // Only the /apply screenshot and top-up order receipts (max 4 MB,
    // lib/images.ts; receipts are shrunk in the browser first) are sent in
    // an action body; this leaves room for multipart overhead under Vercel's
    // 4.5 MB request limit. Staff images (up to 30 MB) are staged in Storage.
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
