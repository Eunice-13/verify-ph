"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CATEGORIES } from "@/types";

/** Sub-navigation pinned directly under the header — the 5 category tabs. */
export default function SubNav() {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");

  return (
    <nav className="sticky top-16 z-30 bg-[#e3dfd7]">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between overflow-x-auto">
        {CATEGORIES.map((category) => {
          const isActive = category === activeCategory;
          return (
            <Link
              key={category}
              href={`/feed?category=${encodeURIComponent(category)}`}
              aria-current={isActive ? "page" : undefined}
              className={`cursor-pointer font-serif font-bold text-sm md:text-base whitespace-nowrap hover:text-emerald-900 h-full flex items-center border-b-2 transition-colors ${
                isActive
                  ? "text-emerald-900 border-emerald-700"
                  : "text-neutral-800 border-transparent"
              }`}
            >
              {category}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
