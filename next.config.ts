import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Existing placeholder news-card images (src/lib/mockNews.ts).
      { protocol: "https", hostname: "picsum.photos" },
      // Pillar background photos on the /about awareness page.
      { protocol: "https", hostname: "images.unsplash.com" },
      // Openverse-sourced fallback photos for articles with no image of
      // their own (see src/lib/imageSearch.ts) — thumbnails are served
      // from api.openverse.org, full-size fallbacks may come from
      // Openverse's underlying providers (Flickr, Wikimedia), which is
      // why ArticleCard/ArticleSideCard load these with `unoptimized`
      // rather than relying solely on this allow-list.
      { protocol: "https", hostname: "api.openverse.org" },
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
