import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Existing placeholder news-card images (src/lib/mockNews.ts).
      { protocol: "https", hostname: "picsum.photos" },
      // Pillar background photos on the /about awareness page.
      { protocol: "https", hostname: "images.unsplash.com" },
      // Footer source logos, fetched live via Google's favicon service.
      {
        protocol: "https",
        hostname: "www.google.com",
        pathname: "/s2/favicons",
      },
    ],
  },
};

export default nextConfig;
