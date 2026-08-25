"use client";

import Link from "next/link";
import { CATEGORIES } from "@/types";

/** Sub-navigation pinned directly under the header — the 5 category tabs. */
export default function SubNav() {
  return (
    <nav className="sticky top-16 z-30 bg-[#e3dfd7]">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between overflow-x-auto">
        {CATEGORIES.map((category) => (
          <Link
            key={category}
            href={`/feed?category=${encodeURIComponent(category)}`}
            className="cursor-pointer font-serif font-bold text-sm md:text-base text-neutral-800 whitespace-nowrap hover:text-emerald-900"
          >
            {category}
          </Link>
        ))}
      </div>
    </nav>
  );
}
