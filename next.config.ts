import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  reactStrictMode: true,
  images: {
    // YouTube thumbnails for the playlist chapter.
    remotePatterns: [
      new URL("https://i.ytimg.com/vi/**"),
      new URL("https://res.cloudinary.com/dhlsvwpny/image/upload/**"),
    ],
  },
};

export default nextConfig;
