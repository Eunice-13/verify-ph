"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const NEWS_SOURCES = [
  { name: "GMA News", domain: "gmanetwork.com" },
  { name: "Philippine Daily Inquirer", domain: "inquirer.net" },
  { name: "Philstar", domain: "philstar.com" },
  { name: "Rappler", domain: "rappler.com" },
  { name: "Manila Bulletin", domain: "mb.com.ph" },
  { name: "BusinessWorld", domain: "bworldonline.com" },
  { name: "VERA Files Fact Check", domain: "verafiles.org" },
];

/** Favicon-based source icon, fetched live from each outlet's own domain. */
function logoUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

/**
 * Footer with infinite seamless sliding news source logos. Stays hidden
 * until the user scrolls to the very bottom of the page.
 */
export default function Footer() {
  const [isVisible, setIsVisible] = useState(false);
  const [year] = useState(() => new Date().getFullYear());

  useEffect(() => {
    const checkBottom = () => {
      const atBottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
      setIsVisible(atBottom);
    };

    checkBottom();
    window.addEventListener("scroll", checkBottom, { passive: true });
    window.addEventListener("resize", checkBottom);
    return () => {
      window.removeEventListener("scroll", checkBottom);
      window.removeEventListener("resize", checkBottom);
    };
  }, []);

  // Duplicate the list to create a mathematically exact seamless loop —
  // each item uses a fixed-width slot so translateX(-50%) always lands
  // exactly on the start of the second (identical) set.
  const duplicatedSources = [...NEWS_SOURCES, ...NEWS_SOURCES];

  return (
    <footer
      id="site-footer"
      className={`bg-emerald-950 text-white ${isVisible ? "footer-visible" : "footer-hidden"}`}
    >
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <h2 className="font-serif font-bold text-lg whitespace-nowrap">
            Our Verified News Sources:
          </h2>
          <div className="relative overflow-hidden flex-1">
            {/* Fade edges for seamless appearance */}
            <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-emerald-950 to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-emerald-950 to-transparent z-10 pointer-events-none" />
            {/* Infinite sliding track — fixed-width slots guarantee an exact
                50% loop point, so the animation never visibly resets. */}
            <div className="source-logos-track flex items-center">
              {duplicatedSources.map((source, i) => (
                <span
                  key={`${source.name}-${i}`}
                  className="source-logo-item shrink-0 w-28 flex items-center justify-center"
                  title={source.name}
                >
                  <Image
                    src={logoUrl(source.domain)}
                    alt={source.name}
                    width={32}
                    height={32}
                    className="w-8 h-8 object-contain"
                    unoptimized
                  />
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="font-sans text-sm text-white/70 max-w-2xl">
          VerifyPH aggregates and fact-checks stories from trusted Philippine news providers. We
          never host original reporting — every card links back to its original publisher.
        </p>
        <p className="font-sans text-xs text-white/50 mt-6">
          &copy; {year} VerifyPH. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
