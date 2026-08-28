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
      <div className="max-w-6xl mx-auto px-2 sm:px-6 h-14 flex items-center gap-1 sm:gap-0 sm:justify-between overflow-x-auto">
        {CATEGORIES.map((category) => {
          const isActive = category === activeCategory;
          return (
            <Link
              key={category}
              href={`/feed?category=${encodeURIComponent(category)}`}
              aria-current={isActive ? "page" : undefined}
              prefetch
              className={`cursor-pointer shrink-0 select-none font-serif font-bold text-sm md:text-base whitespace-nowrap h-full min-w-[44px] flex items-center justify-center px-3 sm:px-4 border-b-2 transition-colors duration-150 ${
                isActive
                  ? "text-emerald-900 border-emerald-700"
                  : "group text-neutral-800 border-transparent hover:text-emerald-900"
              }`}
            >
              <span className={`inline-block transition-transform duration-200 ease-out will-change-transform ${isActive ? "" : "group-hover:scale-110 group-active:scale-95"}`}>
                {TAB_LABELS[category] ?? category}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
