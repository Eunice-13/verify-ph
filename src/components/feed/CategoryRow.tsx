import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RealCategory } from "@/types";
import { fetchArticlesServer } from "@/lib/articles";
import ArticleCard from "@/components/feed/ArticleCard";
import EmptyCardSkeleton from "@/components/feed/EmptyCardSkeleton";

/**
 * Homepage preview strip — intentionally capped. Shows a fixed-size preview
 * (matching the wireframe) with a "View more" link out to the full
 * category page, which is NOT capped (see CategoryView) and grows
 * automatically as articles are added.
 */
export default async function CategoryRow({
  category,
  count = 4,
}: {
  category: RealCategory;
  count?: number;
}) {
  const articles = await fetchArticlesServer({ category, limit: count });

  return (
    <section className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-baseline justify-between border-b border-neutral-300 pb-2 mb-6">
        <h2 className="font-serif font-bold text-base md:text-lg text-neutral-900">
          {category}
        </h2>
        <Link
          href={`/feed?category=${encodeURIComponent(category)}`}
          className="group/link cursor-pointer inline-flex items-center gap-1 font-sans text-xs font-medium text-emerald-800 hover:text-emerald-600 transition-colors whitespace-nowrap"
        >
          View more
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/link:translate-x-0.5" strokeWidth={2} />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
        {Array.from({ length: count }, (_, i) =>
          articles[i] ? (
            <ArticleCard
              key={articles[i].id}
              article={articles[i]}
              imgHeightClass="h-44 md:h-48"
              titleSizeClass="text-sm md:text-base"
            />
          ) : (
            <EmptyCardSkeleton key={`empty-${i}`} heightClass="h-44 md:h-48" />
          )
        )}
      </div>
    </section>
  );
}
