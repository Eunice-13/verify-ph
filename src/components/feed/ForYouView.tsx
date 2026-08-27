import HomeView from "@/components/feed/HomeView";

/**
 * The "For You" home-embed slot — what the "GENERAL" tab/category now
 * points to (see FOR_YOU_CATEGORY in src/types/index.ts).
 *
 * Deliberately a distinct component (not just CategoryView called with
 * category="GENERAL", and not a bare re-export of HomeView) so it's
 * structurally obvious in the codebase that this route is NOT a
 * category-filtered feed — nothing here queries the DB for a category,
 * "General" or otherwise. It simply renders the full homepage inline,
 * exactly as HomeView renders it at "/".
 *
 * If HomeView's mixed-category hero + per-category rows content is ever
 * meaningfully redesigned into an actual personalized "for you" feed
 * (e.g. based on read history), that logic should live here, replacing
 * the HomeView delegation below — this component is the intended
 * extension point for that, kept separate from HomeView specifically so
 * that future work doesn't have to untangle it from the real homepage.
 */
export default function ForYouView() {
  return <HomeView />;
}
