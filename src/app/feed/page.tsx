import ViewTransition from "@/components/layout/ViewTransition";
import CategoryView from "@/components/feed/CategoryView";
import ForYouView from "@/components/feed/ForYouView";
import { CATEGORIES, Category, isForYouCategory, isRealCategory } from "@/types";

function isCategory(value: string | string[] | undefined): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

function firstString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * /feed?category=<value>&search=<value>
 *
 * "GENERAL" is the "For You" home-embed slot, not a real, DB-filterable
 * category (see FOR_YOU_CATEGORY in src/types/index.ts) — this route keeps
 * `?category=GENERAL` working as a URL (so existing links/bookmarks don't
 * break) but renders ForYouView (the full homepage, embedded) instead of
 * CategoryView for it, rather than ever querying the DB for
 * category="General" articles.
 *
 * A server component (not client) specifically so ForYouView can render
 * HomeView — an async server component that does its own server-side
 * Supabase fetch — directly; client components cannot instantiate server
 * components themselves.
 */
export default async function FeedPage(props: PageProps<"/feed">) {
  const resolvedSearchParams = await props.searchParams;
  const categoryParam = firstString(resolvedSearchParams.category);
  const searchParam = firstString(resolvedSearchParams.search);

  const category: Category | undefined = isCategory(categoryParam)
    ? categoryParam
    : searchParam
      ? undefined
      : CATEGORIES[0];

  if (category && isForYouCategory(category) && !searchParam) {
    return (
      <ViewTransition transitionKey="for-you">
        <ForYouView />
      </ViewTransition>
    );
  }

  // A search spans all real categories regardless of which tab it was
  // triggered from, so it always renders CategoryView (never ForYouView),
  // even if `category` happens to be "GENERAL".
  const realCategory = isRealCategory(category) ? category : undefined;

  return (
    <ViewTransition transitionKey={`${realCategory ?? "all"}-${searchParam ?? ""}`}>
      <CategoryView category={realCategory} search={searchParam} />
    </ViewTransition>
  );
}
