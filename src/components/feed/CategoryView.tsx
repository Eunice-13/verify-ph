"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Home } from "lucide-react";
import { Article, RealCategory } from "@/types";
import { fetchArticlesClient } from "@/lib/articles";
import ArticleCard from "@/components/feed/ArticleCard";
import EmptyCardSkeleton from "@/components/feed/EmptyCardSkeleton";

/**
 * Category page view. Fetches real articles from Supabase via /api/articles.
 * The first 2 articles render as large cards and the rest in a 4-across grid.
 *
 * When `search` is provided (from the global search bar), results are
 * filtered by keyword; if `category` is omitted, the search spans all
 * categories.
 */
export default function CategoryView({
  category,
  search,
}: {
  category?: RealCategory;
  search?: string;
}) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadArticles = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchArticlesClient({ category, search, limit: 40 });
        if (!cancelled) {
          setArticles(data);
        }
      } catch (error) {
        if (!cancelled) {
          setArticles([]);
          setError(
            error instanceof Error ? error.message : "Unable to load articles. Please try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadArticles();

    return () => {
      cancelled = true;
    };
  }, [category, search]);

  const large = articles.slice(0, 2);
  const rest = articles.slice(2);

  const minLargeSlots = 2;
  const minRestSlots = 4;
  // Skeletons belong only to the in-flight state. Once a request finishes,
  // render the actual number of articles (including zero) rather than
  // leaving permanent fake loading cards on a no-results search.
  const largeSlotCount = loading ? minLargeSlots : large.length;
  const restSlotCount = loading ? minRestSlots : rest.length;

  const heading = search
    ? `Search Results for “${search}”${category ? ` — ${category}` : ""}`
    : `Today\u2019s Verified Stories from the Philippines${category ? ` \u2014 ${category}` : ""}`;

  return (
    <>
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-baseline justify-between border-b-2 border-neutral-800 pb-2 mb-8">
          <h1 className="font-serif font-bold text-2xl md:text-3xl text-neutral-900">
            {heading}
          </h1>
          <Link
            href="/"
            aria-label="Back to home"
            className="cursor-pointer shrink-0 w-9 h-9 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 hover:text-emerald-800 transition-colors"
          >
            <Home className="w-4 h-4" strokeWidth={2} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {Array.from({ length: largeSlotCount }, (_, i) =>
            large[i] ? (
              <ArticleCard
                key={large[i].id}
                article={large[i]}
                imgHeightClass="h-64 md:h-80"
                titleSizeClass="text-lg md:text-xl"
              />
            ) : (
              <EmptyCardSkeleton key={`large-empty-${i}`} heightClass="h-64 md:h-80" />
            )
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
          {Array.from({ length: restSlotCount }, (_, i) =>
            rest[i] ? (
              <ArticleCard
                key={rest[i].id}
                article={rest[i]}
                imgHeightClass="h-40 md:h-44"
                titleSizeClass="text-sm md:text-base"
              />
            ) : (
              <EmptyCardSkeleton key={`rest-empty-${i}`} heightClass="h-40 md:h-44" />
            )
          )}
        </div>
        {error && (
          <p className="col-span-full text-center text-red-600 mt-6">
            {error}
          </p>
        )}
        {!loading && !error && articles.length === 0 && (
          <p className="col-span-full text-center text-neutral-500 mt-6">
            {search
              ? "No verified stories match your search."
              : "No verified stories available in this category yet."}
          </p>
        )}
      </section>
    </>
  );
}
