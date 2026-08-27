import { REAL_CATEGORIES } from "@/types";
import { fetchArticlesServer } from "@/lib/articles";
import ArticleCard from "@/components/feed/ArticleCard";
import ArticleSideCard from "@/components/feed/ArticleSideCard";
import EmptyCardSkeleton from "@/components/feed/EmptyCardSkeleton";
import CategoryRow from "@/components/feed/CategoryRow";
import ClaimStats from "@/components/feed/ClaimStats";

/**
 * Homepage view — mixed-category hero (2 small left + 1 large center + 5
 * side right), followed by a stacked row per REAL category (News &
 * Politics, Economy, Health & Safety, Lifestyle) in REAL_CATEGORIES order.
 *
 * "GENERAL" is deliberately NOT one of these rows — it's the "For You"
 * home-embed slot (this exact page, embedded at /feed?category=GENERAL —
 * see ForYouView.tsx), so rendering it as a row here would just be a
 * "View More" link back to the page the user is already on. REAL_CATEGORIES
 * already reflects the requested "News & Politics moves to last" order —
 * see its derivation from CATEGORIES in src/types/index.ts.
 *
 * Fetches real articles from Supabase. Falls back gracefully to empty
 * skeleton slots if the DB is empty or unavailable.
 */
export default async function HomeView() {
  const allArticles = await fetchArticlesServer({ limit: 40 });

  // The first article becomes the hero/featured; rest fill columns.
  const featured = allArticles[0] ?? null;
  const pool = allArticles.slice(1);
  const leftArticles = pool.slice(0, 2);
  const rightArticles = pool.slice(2, 5);

  return (
    <>
      <section className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="font-serif font-bold text-3xl md:text-4xl text-neutral-900 mb-8 text-center">
          Today&rsquo;s Verified Stories from the Philippines
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1 grid grid-cols-1 gap-6">
            {Array.from({ length: 2 }, (_, i) =>
              leftArticles[i] ? (
                <ArticleCard
                  key={leftArticles[i].id}
                  article={leftArticles[i]}
                  imgHeightClass="h-40 md:h-44"
                  titleSizeClass="text-sm"
                />
              ) : (
                <EmptyCardSkeleton key={`left-empty-${i}`} heightClass="h-40 md:h-44" />
              )
            )}
          </div>
          <div className="md:col-span-2">
            {featured ? (
              <ArticleCard
                article={featured}
                imgHeightClass="h-72 md:h-[26rem]"
                titleSizeClass="text-xl md:text-2xl"
              />
            ) : (
              <EmptyCardSkeleton heightClass="h-72 md:h-[26rem]" />
            )}
          </div>
          <div className="md:col-span-1 flex flex-col gap-5">
            {rightArticles.map((article) => (
              <ArticleSideCard key={article.id} article={article} />
            ))}
          </div>
        </div>
      </section>

      {REAL_CATEGORIES.map((category) => (
        <CategoryRow key={category} category={category} count={4} />
      ))}

      <ClaimStats />
    </>
  );
}
