"use client";

import { FormEvent, KeyboardEvent, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { useAutoResizeTextarea } from "@/lib/useAutoResizeTextarea";
import ClaimResult from "@/components/claim/ClaimResult";
import ClaimProgress from "@/components/claim/ClaimProgress";
import { submitClaim } from "@/lib/claimChecker";
import type { Claim } from "@/types";

/**
 * The Claim Checker page's own input form + inline verdict result.
 * Connected to the real /api/claim-checker endpoint.
 */
export default function ClaimCheckerForm() {
  const [value, setValue] = useState("");
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { ref: textareaRef, resize } = useAutoResizeTextarea();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = value.trim();
    if (!text || loading) return;

    setLoading(true);
    setError(null);
    setClaim(null);
    setValue("");
    requestAnimationFrame(resize);

    const result = await submitClaim(text);

    setLoading(false);

    if (result.success && result.claim) {
      setClaim(result.claim);
    } else {
      setError(result.error ?? "Something went wrong.");
    }
  };

  return (
    <>
      <div className="w-full">
        {error && (
          <p className="text-center text-sm text-red-600 font-sans mb-6">{error}</p>
        )}
        {claim && (
          <div className="mt-10">
            <ClaimResult claim={claim} />
          </div>
        )}
      </div>

      {loading && <ClaimProgress />}

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3 bg-white rounded-3xl border-2 border-transparent shadow-sm px-6 py-4 max-w-2xl w-full mx-auto claim-input-wrap transition-all duration-200"
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            resize();
          }}
          onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Paste a claim, headline, or link to fact-check…"
          className="flex-1 bg-transparent outline-none font-sans text-neutral-700 placeholder:text-neutral-400 resize-none max-h-60 overflow-y-auto leading-relaxed self-center"
          disabled={loading}
        />
        <button
          type="submit"
          aria-label="Submit claim"
          disabled={loading}
          className="cursor-pointer shrink-0 w-9 h-9 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors self-center disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </>
  );
}
