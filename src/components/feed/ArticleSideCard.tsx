import { Article } from "@/types";
import { placeholderProviderName, placeholderSourceUrl } from "@/lib/mockNews";
import ArticleImage from "@/components/feed/ArticleImage";

/** Small side-list card used in the homepage hero's right-hand column (image + text side-by-side). */
export default function ArticleSideCard({ article }: { article: Article }) {
  const url = article.sourceUrl ?? placeholderSourceUrl(article.id);
  const provider = article.providerName ?? placeholderProviderName(article.id);

  return (
    // Fixed h-20 on the whole card (matching the thumbnail's own h-20) so
    // every item in the sidebar list is EXACTLY the same total height
    // regardless of headline length. Combined with a consistent flex gap
    // between siblings (see HomeView.tsx), this is what makes the vertical
    // rhythm down the column genuinely even rather than visually uneven
    // (previously, a 1-line vs. 3-line headline made items taller/shorter
    // than each other, which read as inconsistent spacing even though the
    // CSS gap value itself was constant).
    <div className="news-card group flex gap-3 h-20">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Read ${article.title}`}
        className="relative block w-24 h-20 shrink-0 rounded-xl overflow-hidden shadow-[0_6px_16px_rgba(0,0,0,0.12)]"
      >
        <ArticleImage imageUrl={article.imageUrl} title={article.title} />
        <div
          className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end rounded-xl bg-gradient-to-t from-black/90 via-black/50 to-black/10 p-1.5
                 opacity-0 scale-[0.98] transition-all duration-[400ms] ease-in-out group-hover:opacity-100 group-hover:scale-100"
        >
          <span className="inline-flex items-center gap-1 self-start rounded-full bg-emerald-600 px-1.5 py-0.5 text-[8px] font-sans font-semibold uppercase tracking-wide text-white">
            Verified
          </span>
        </div>
      </a>
      {/* Vertically centered within the fixed h-20, clamped to a fixed
          number of lines each, so text length never changes the item's
          overall height or pushes it out of alignment with its thumbnail. */}
      <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-serif font-bold text-neutral-900 text-sm leading-snug hover:text-emerald-800 transition-colors line-clamp-2"
        >
          {article.title}
        </a>
        <p className="text-xs font-sans text-neutral-500 line-clamp-1">
          Sourced from:{" "}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-800 hover:underline transition-colors"
          >
            {provider}
          </a>
        </p>
      </div>
    </div>
  );
}
