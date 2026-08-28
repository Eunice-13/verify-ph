"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CATEGORIES, FOR_YOU_CATEGORY } from "@/types";

// "GENERAL" is the "For You" home-embed slot, not a real category — see
// FOR_YOU_CATEGORY in src/types/index.ts. Displayed as "FOR YOU" here so
// the tab doesn't imply it's just another content category.
const TAB_LABELS: Record<string, string> = {
  [FOR_YOU_CATEGORY]: "GENERAL",
};

/** Sub-navigation pinned directly under the header — the 5 category tabs. */
export default function SubNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // On "/" there's no ?category param, but the homepage *is* the "For You"
  // content (GENERAL's home-embed) — treat it as GENERAL for tab highlighting.
  const activeCategory =
    pathname === "/" ? FOR_YOU_CATEGORY : searchParams.get("category");

  return (
    <nav className="sticky top-16 z-30 bg-[#e3dfd7]">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6 sm:gap-0 sm:justify-between overflow-x-auto">
        {CATEGORIES.map((category) => {
          const isActive = category === activeCategory;
          return (
            <Link
              key={category}
              href={`/feed?category=${encodeURIComponent(category)}`}
              aria-current={isActive ? "page" : undefined}
              className={`cursor-pointer shrink-0 font-serif font-bold text-sm md:text-base whitespace-nowrap hover:text-emerald-900 h-full flex items-center border-b-2 transition-colors ${
                isActive
                  ? "text-emerald-900 border-emerald-700"
                  : "text-neutral-800 border-transparent"
              }`}
            >
              {TAB_LABELS[category] ?? category}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
