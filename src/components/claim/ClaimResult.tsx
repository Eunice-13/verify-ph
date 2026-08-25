import { Check, X, TriangleAlert } from "lucide-react";
import type { Claim, VerdictCategory, ClaimSource } from "@/types";

type IconComponent = typeof Check;

const VERDICT_STYLES: Record<
  VerdictCategory,
  { badgeClass: string; label: string; Icon: IconComponent }
> = {
  Verified: {
    badgeClass: "bg-emerald-700 border-emerald-800",
    label: "VERIFIED",
    Icon: Check,
  },
  "Insufficient Evidence": {
    badgeClass: "bg-neutral-500 border-neutral-600",
    label: "INSUFFICIENT EVIDENCE",
    Icon: TriangleAlert,
  },
  Contradicted: {
    badgeClass: "bg-red-700 border-red-800",
    label: "CONTRADICTED",
    Icon: X,
  },
};

function SourceCard({ source }: { source: ClaimSource }) {
  return (
    <a
      href={source.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border border-neutral-200 p-3 hover:border-emerald-600 hover:shadow-sm transition-all"
    >
      <p className="font-sans text-sm font-medium text-neutral-900 leading-snug">
        {source.title}
      </p>
      <p className="mt-1 text-xs text-neutral-500">
        {source.source_name} &middot;{" "}
        {new Date(source.published_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
      {source.relevance && (
        <p className="mt-1 text-xs text-emerald-800 italic">{source.relevance}</p>
      )}
    </a>
  );
}

/**
 * Renders a claim verdict badge, AI explanation, and linked sources.
 * Accepts either a full Claim object (from the real API) or a legacy
 * ClaimVerdictStatus string (for backwards compat during transition).
 */
export default function ClaimResult({ claim }: { claim: Claim }) {
  const verdict = claim.verdict as VerdictCategory | undefined;
  const style = verdict
    ? VERDICT_STYLES[verdict] ?? VERDICT_STYLES["Insufficient Evidence"]
    : VERDICT_STYLES["Insufficient Evidence"];
  const Icon = style.Icon;

  const sources = (claim.sources_used ?? []) as ClaimSource[];

  return (
    <div className="mt-10 flex flex-col items-center">
      {/* Verdict badge */}
      <div
        className={`inline-flex items-center gap-3 rounded-full ${style.badgeClass} border-2 text-white font-sans font-bold text-sm md:text-base px-6 py-3 shadow-[0_6px_16px_rgba(0,0,0,0.18)]`}
      >
        <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" strokeWidth={2.5} />
        </span>
        {style.label}
      </div>

      {/* AI explanation */}
      {claim.ai_explanation && (
        <div className="mt-8 max-w-2xl w-full bg-white rounded-2xl shadow-[0_6px_18px_rgba(0,0,0,0.12)] p-6">
          <p className="font-sans text-neutral-700 leading-relaxed whitespace-pre-line">
            {claim.ai_explanation}
          </p>
        </div>
      )}

      {/* Source cards */}
      {sources.length > 0 && (
        <div className="mt-6 max-w-2xl w-full">
          <h3 className="font-sans text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-3">
            Sources Used ({sources.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sources.map((source, i) => (
              <SourceCard key={source.article_id ?? i} source={source} />
            ))}
          </div>
        </div>
      )}

      {/* Confidence */}
      {claim.confidence != null && (
        <p className="mt-4 text-xs text-neutral-400 font-sans">
          Confidence: {Math.round(claim.confidence * 100)}%
        </p>
      )}
    </div>
  );
}
