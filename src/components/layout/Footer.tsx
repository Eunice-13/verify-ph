"use client";

import { useEffect, useState } from "react";

/** Footer that stays hidden until the user scrolls to the very bottom of the page. */
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

  return (
    <footer
      id="site-footer"
      className={`bg-emerald-950 text-white ${isVisible ? "footer-visible" : "footer-hidden"}`}
    >
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h2 className="font-serif font-bold text-lg mb-2">Our Verified News Sources</h2>
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
