import Image from "next/image";
import { Check } from "lucide-react";
import { Article } from "@/types";
import { placeholderImage, placeholderProviderName, placeholderSourceUrl } from "@/lib/mockNews";

/**
 * Standard news card. Every card links straight out to the original news
 * provider — VerifyPH is only the middleman. Clicking the image, headline,
 * or provider name opens the real source in a new tab; no internal article
 * route exists.
 */
export default function ArticleCard({
  article,
  imgHeightClass,
  titleSizeClass,
}: {
  article: Article;
  imgHeightClass: string;
  titleSizeClass: string;
}) {
  const url = article.sourceUrl ?? placeholderSourceUrl(article.id);
  const provider = article.providerName ?? placeholderProviderName(article.id);

  return (
    <div className="news-card group relative">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`block rounded-xl overflow-hidden shadow-[0_6px_16px_rgba(0,0,0,0.12)] ${imgHeightClass} relative`}
      >
        <Image
          src={article.imageUrl ?? placeholderImage(article.id)}
          alt={article.title}
          fill
          loading="lazy"
          unoptimized
          className="object-cover transition-transform duration-[400ms] ease-in-out group-hover:scale-105"
        />
      </a>

      <div className="pt-2.5">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`block font-serif font-bold text-neutral-900 ${titleSizeClass} leading-snug hover:text-emerald-800 transition-colors line-clamp-2`}
        >
          {article.title}
        </a>
        <p className="mt-1 text-xs font-sans text-neutral-500 line-clamp-1">
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

      {/* Hover overlay: verified icon + Read Article, bottom-right */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 ${imgHeightClass} z-20 flex flex-col items-end justify-end
               rounded-xl bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 opacity-0 scale-[0.98]
               transition-all duration-[400ms] ease-in-out group-hover:opacity-100 group-hover:scale-100`}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-sans font-semibold uppercase tracking-wide text-white mb-2">
          <Check className="w-3 h-3" strokeWidth={2.5} />
          Verified
        </span>
        <span className="font-sans font-semibold text-white text-sm tracking-wide">
          Read Article
        </span>
      </div>
    </div>
  );
}
