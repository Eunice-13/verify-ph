"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { CATEGORIES } from "@/types";
import SearchBar from "@/components/layout/SearchBar";

const CATEGORY_LABELS: Record<string, string> = {
  "NEWS & POLITICS": "News & Politics",
  ECONOMY: "Economy",
  "HEALTH & SAFETY": "Health & Safety",
  LIFESTYLE: "Lifestyle",
  // "GENERAL" is the "For You" home-embed slot, not a real category — see
  // FOR_YOU_CATEGORY in src/types/index.ts. Labeled distinctly here so the
  // nav doesn't imply it's just another content category.
  GENERAL: "For You",
};

/** Sticky top header — logo/home link, live date, and hamburger dropdown menu. */
export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimatingOpen, setIsAnimatingOpen] = useState(false);
  const [dateText, setDateText] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = pathname === "/feed" ? searchParams.get("category") : null;

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setDateText(
        new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const openDropdown = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setIsOpen(true);
    requestAnimationFrame(() => setIsAnimatingOpen(true));
  };

  const closeDropdown = () => {
    setIsAnimatingOpen(false);
    closeTimeoutRef.current = setTimeout(() => setIsOpen(false), 400);
  };

  const toggleDropdown = () => {
    if (isAnimatingOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!isOpen) return;
      const target = e.target as Node;
      if (dropdownRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      closeDropdown();
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-emerald-900 text-white">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="cursor-pointer flex items-center gap-3">
          <span className="w-7 h-7 shrink-0 flex items-center justify-center">
            <Image src="/verify-ph-logo.svg" alt="VerifyPH logo" width={28} height={28} className="w-full h-full object-contain" priority />
          </span>
          <span className="font-serif font-bold text-xl">VerifyPH</span>
          <span className="hidden sm:inline text-white/40">|</span>
          <span className="hidden sm:inline font-sans text-sm text-white/90">{dateText}</span>
        </Link>

        <div className="flex items-center gap-4">
          <SearchBar />
          <div className="relative">
            <button
              ref={buttonRef}
              type="button"
              aria-label="Open menu"
              className="cursor-pointer p-1"
              onClick={(e) => {
                e.stopPropagation();
                toggleDropdown();
              }}
            >
              <Menu className="w-6 h-6" strokeWidth={2} />
            </button>

            {isOpen && (
              <div
                ref={dropdownRef}
                className={`absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-neutral-200 text-neutral-800 py-2 z-50 dropdown-anim ${
                  isAnimatingOpen ? "dropdown-open" : ""
                }`}
              >
                <Link
                  href="/claim-check"
                  onClick={closeDropdown}
                  className="cursor-pointer block w-full text-left px-4 py-2 font-serif font-bold text-sm hover:bg-neutral-100"
                >
                  Claim Checker
                </Link>
                {CATEGORIES.map((category) => {
                  const isActive = category === activeCategory;
                  return (
                    <Link
                      key={category}
                      href={`/feed?category=${encodeURIComponent(category)}`}
                      onClick={closeDropdown}
                      aria-current={isActive ? "page" : undefined}
                      className={`cursor-pointer block w-full text-left px-4 py-2 font-serif font-bold text-sm hover:bg-neutral-100 border-b-2 ${
                        isActive
                          ? "text-emerald-900 border-emerald-700"
                          : "border-transparent"
                      }`}
                    >
                      {CATEGORY_LABELS[category]}
                    </Link>
                  );
                })}
                <div className="mt-2 pt-2 border-t border-neutral-200 px-4 flex items-center gap-3 text-neutral-500">
                  <a
                    href="#"
                    aria-label="Facebook"
                    className="cursor-pointer w-7 h-7 rounded-full border border-neutral-300 flex items-center justify-center hover:bg-neutral-100 hover:text-emerald-900 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M22 12.06C22 6.51 17.52 2 12 2S2 6.51 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.8c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.58v1.9h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z"/>
                    </svg>
                  </a>
                  <a
                    href="#"
                    aria-label="X (Twitter)"
                    className="cursor-pointer w-7 h-7 rounded-full border border-neutral-300 flex items-center justify-center hover:bg-neutral-100 hover:text-emerald-900 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M18.9 2h3.3l-7.2 8.2L23.5 22h-6.8l-5.3-6.9L5 22H1.7l7.7-8.8L1 2h6.9l4.8 6.3L18.9 2Zm-2.4 18h1.8L8.6 4H6.7l9.8 16Z"/>
                    </svg>
                  </a>
                  <a
                    href="#"
                    aria-label="Instagram"
                    className="cursor-pointer w-7 h-7 rounded-full border border-neutral-300 flex items-center justify-center hover:bg-neutral-100 hover:text-emerald-900 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5">
                      <rect x="3" y="3" width="18" height="18" rx="5"/>
                      <circle cx="12" cy="12" r="4"/>
                      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none"/>
                    </svg>
                  </a>
                  <a
                    href="#"
                    aria-label="TikTok"
                    className="cursor-pointer w-7 h-7 rounded-full border border-neutral-300 flex items-center justify-center hover:bg-neutral-100 hover:text-emerald-900 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M16.6 2h-3.2v13.2a2.9 2.9 0 1 1-2.4-2.86V9.06a6.1 6.1 0 1 0 5.6 6.08V8.4a7.3 7.3 0 0 0 4.4 1.5V6.7a4.3 4.3 0 0 1-4.4-4.7Z"/>
                    </svg>
                  </a>
                  <span className="text-xs font-sans text-neutral-500 whitespace-nowrap">
                    — Support VerifyPH
                  </span>
                </div>
                <Link
                  href="/about"
                  onClick={closeDropdown}
                  aria-current={pathname === "/about" ? "page" : undefined}
                  className="cursor-pointer mt-2 -mb-2 block w-full text-center px-4 py-3 font-serif font-bold text-sm bg-emerald-900 text-white hover:bg-emerald-800 transition-colors rounded-b-xl"
                >
                  Why Verification Matters
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
