import Link from "next/link";
import { Category } from "@/types";
import { getVerifiedArticles } from "@/lib/mockNews";
import ArticleCard from "@/components/feed/ArticleCard";
import EmptyCardSkeleton from "@/components/feed/EmptyCardSkeleton";

/**
 * Homepage preview strip — intentionally capped. Shows a fixed-size preview
 * (matching the wireframe) with a "View More Here ->" link out to the full
 * category page, which is NOT capped (see CategoryView) and grows
 * automatically as articles are added.
 */
export default function CategoryRow({ category, count = 4 }: { category: Category; count?: number }) {
  const articles = getVerifiedArticles(category).slice(0, count);

  return (
    <section className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-baseline justify-between border-b-2 border-neutral-800 pb-2 mb-6">
        <h2 className="font-sans font-semibold text-xs md:text-sm tracking-wide uppercase text-neutral-800">
          {category}
        </h2>
        <Link
          href={`/feed?category=${encodeURIComponent(category)}`}
          className="cursor-pointer font-sans text-xs md:text-sm text-neutral-600 hover:text-emerald-800 transition-colors whitespace-nowrap"
        >
          View More Here -&gt;
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
