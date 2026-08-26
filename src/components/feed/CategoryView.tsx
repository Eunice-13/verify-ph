"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Home } from "lucide-react";
import { Article, Category } from "@/types";
import { fetchArticlesClient } from "@/lib/articles";
import ArticleCard from "@/components/feed/ArticleCard";
import EmptyCardSkeleton from "@/components/feed/EmptyCardSkeleton";

/**
 * Category page view. Fetches real articles from Supabase via /api/articles.
 * The first 2 articles render as large cards and the rest in a 4-across grid.
 */
export default function CategoryView({ category }: { category: Category }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchArticlesClient({ category, limit: 40 }).then((data) => {
      if (!cancelled) {
        setArticles(data);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [category]);

  const large = articles.slice(0, 2);
  const rest = articles.slice(2);

  const minLargeSlots = 2;
  const minRestSlots = 4;
  const largeSlotCount = loading ? minLargeSlots : Math.max(large.length, minLargeSlots);
  const restSlotCount = loading ? minRestSlots : Math.max(rest.length, minRestSlots);

  return (
    <>
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-baseline justify-between border-b-2 border-neutral-800 pb-2 mb-8">
          <h1 className="font-serif font-bold text-2xl md:text-3xl text-neutral-900">
            Today&rsquo;s Verified Stories from the Philippines &mdash; {category}
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
        {!loading && articles.length === 0 && (
          <p className="col-span-full text-center text-neutral-500 mt-6">
            No verified stories available in this category yet.
          </p>
        )}
      </section>
    </>
  );
}
