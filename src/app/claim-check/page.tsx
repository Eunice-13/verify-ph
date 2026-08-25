"use client";

import { useState } from "react";
import type { Claim } from "@/types";

const VERDICT_STYLES: Record<string, string> = {
  "Officially Confirmed": "bg-green-100 text-green-800 border-green-300",
  Corroborated: "bg-blue-100 text-blue-800 border-blue-300",
  Developing: "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Insufficient Evidence": "bg-gray-100 text-gray-800 border-gray-300",
  Contradicted: "bg-red-100 text-red-800 border-red-300",
};

export default function ClaimCheckPage() {
  const [claimText, setClaimText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Claim | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!claimText.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/claim-checker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim: claimText.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Something went wrong.");
      }

      setResult(data.claim as Claim);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-12 sm:py-20">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Claim Checker</h1>
        <p className="text-gray-600 mb-8">
          Paste a claim, post, or link (Facebook, TikTok, X, Messenger) and
          VerifyPH will search our verified news database, compare the
          evidence, and return a transparent verdict with sources.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <textarea
            value={claimText}
            onChange={(e) => setClaimText(e.target.value)}
            placeholder="e.g. &quot;PhilHealth is now deducting 5% from all hospital bills starting this month&quot;"
            rows={5}
            maxLength={5000}
            className="w-full resize-none rounded-md border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {claimText.length}/5000
            </span>
            <button
              type="submit"
              disabled={loading || !claimText.trim()}
              className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Checking..." : "Check Claim"}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-6 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-8 rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <span
                className={`inline-block rounded-full border px-3 py-1 text-sm font-medium ${
                  VERDICT_STYLES[result.verdict ?? ""] ??
                  "bg-gray-100 text-gray-800 border-gray-300"
                }`}
              >
                {result.verdict ?? "No verdict"}
              </span>
              {result.confidence !== null && (
                <span className="text-xs text-gray-500">
                  Confidence: {Math.round(result.confidence * 100)}%
                </span>
              )}
            </div>

            <p className="text-sm text-gray-500 mb-2">Original claim:</p>
            <p className="mb-4 text-gray-900">{result.user_text}</p>

            <p className="text-sm text-gray-500 mb-2">AI explanation:</p>
            <p className="mb-4 text-gray-900 whitespace-pre-wrap">
              {result.ai_explanation ?? "No explanation available."}
            </p>

            <p className="text-sm text-gray-500 mb-2">Sources used:</p>
            {result.sources_used.length === 0 ? (
              <p className="text-sm text-gray-400 italic">
                No matching sources were found in the database.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {result.sources_used.map((source, i) => (
                  <li
                    key={`${source.article_id}-${i}`}
                    className="rounded-md border border-gray-200 p-3"
                  >
                    <a
                      href={source.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {source.title}
                    </a>
                    <p className="text-xs text-gray-500 mt-1">
                      {source.source_name} &middot;{" "}
                      {new Date(source.published_at).toLocaleDateString("en-PH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    {source.relevance && (
                      <p className="text-sm text-gray-700 mt-1">
                        {source.relevance}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
