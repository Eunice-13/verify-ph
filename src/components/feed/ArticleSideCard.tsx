import Image from "next/image";
import { Article } from "@/types";
import { placeholderImage, placeholderProviderName, placeholderSourceUrl } from "@/lib/mockNews";

/** Small side-list card used in the homepage hero's right-hand column (image + text side-by-side). */
export default function ArticleSideCard({ article }: { article: Article }) {
  const url = article.sourceUrl ?? placeholderSourceUrl(article.id);
  const provider = article.providerName ?? placeholderProviderName(article.id);

  return (
    <div className="news-card group flex gap-3">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block w-24 h-20 shrink-0 rounded-xl overflow-hidden shadow-[0_6px_16px_rgba(0,0,0,0.12)]"
      >
        <Image
          src={placeholderImage(article.id)}
          alt={article.title}
          fill
          loading="lazy"
          unoptimized
          className="object-cover transition-transform duration-[400ms] ease-in-out group-hover:scale-105"
        />
        <div
          className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end rounded-xl bg-gradient-to-t from-black/90 via-black/50 to-black/10 p-1.5
                 opacity-0 scale-[0.98] transition-all duration-[400ms] ease-in-out group-hover:opacity-100 group-hover:scale-100"
        >
          <span className="inline-flex items-center gap-1 self-start rounded-full bg-emerald-600 px-1.5 py-0.5 text-[8px] font-sans font-semibold uppercase tracking-wide text-white">
            Verified
          </span>
        </div>
      </a>
      <div className="min-w-0">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-serif font-bold text-neutral-900 text-sm leading-snug hover:text-emerald-800 transition-colors"
        >
          {article.title}
        </a>
        <p className="mt-1 text-xs font-sans text-neutral-500">
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
