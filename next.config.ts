import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Existing placeholder news-card images (src/lib/mockNews.ts).
      { protocol: "https", hostname: "picsum.photos" },
      // Pillar background photos on the /about awareness page.
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
