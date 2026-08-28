"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";

/**
 * Global keyword search bar — sits beside the hamburger menu in the header
 * on every page. Submitting navigates to /feed with a `search` query param;
 * the active category (if any) is preserved, otherwise it searches across
 * all categories.
 */
export default function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");

  // Keep the input in sync with the URL when already on a search results page.
  useEffect(() => {
    setQuery(pathname === "/feed" ? searchParams.get("search") ?? "" : "");
  }, [pathname, searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    const params = new URLSearchParams();
    const currentCategory = pathname === "/feed" ? searchParams.get("category") : null;
    if (currentCategory) params.set("category", currentCategory);
    params.set("search", trimmed);

    router.push(`/feed?${params.toString()}`);
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
