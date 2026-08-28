"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";

/**
 * Global keyword search bar — sits beside the hamburger menu in the header
 * on every page. Submitting navigates to /feed with a `search` query param;
 * all categories. Search must not inherit the currently open category tab:
 * a real Economy story should still be found when the visitor starts from
 * the Lifestyle tab.
 */
export default function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const lastUrlSearchRef = useRef<string | null>(null);

  // Keep the input in sync with the URL's `search` param, but only when it
  // actually changes from a navigation (e.g. clicking a link that carries a
  // search param, or landing directly on a search results URL). This lets
  // the typed keyword persist in the box after submitting, and remain
  // editable (including backspacing it down to start a new search) without
  // being reset out from under the user on every render.
  useEffect(() => {
    const urlSearch = pathname === "/feed" ? searchParams.get("search") ?? "" : "";
    if (urlSearch !== lastUrlSearchRef.current) {
      lastUrlSearchRef.current = urlSearch;
      setQuery(urlSearch);
    }
  }, [pathname, searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    router.push(`/feed?search=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="flex items-center gap-2 h-10 px-4 rounded-full bg-[#f4f1ea] w-28 sm:w-56 md:w-72 transition-[width] focus-within:w-40 sm:focus-within:w-72 md:focus-within:w-96 min-w-0"
    >
      <Search className="w-4 h-4 text-neutral-900 shrink-0" strokeWidth={2} aria-hidden="true" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search articles..."
        aria-label="Search articles"
        className="w-full bg-transparent outline-none border-none text-sm text-neutral-900 placeholder:text-neutral-500"
      />
    </form>
  );
}
