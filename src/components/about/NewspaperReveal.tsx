"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";

/**
 * Closing set-piece for /about: a realistic folded newspaper the user taps
 * to open. Uses a Framer Motion shared layoutId so the small closed sheet
 * physically morphs into a full "front page" popup — no fake 3D hinge, just
 * one element growing smoothly from its closed size/position to a large
 * centered modal, which reads as far more tactile/realistic.
 *
 * Opens ONLY on tap (no auto-trigger on scroll). The popup carries both the
 * short VerifyPH message and the final "Start Verifying Claims" CTA, which
 * routes to "/" (HomeView) per this page's existing CTA convention.
 */
export default function NewspaperReveal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="relative max-w-3xl mx-auto px-6 py-8 text-center">
      <p className="font-sans text-xs uppercase tracking-[0.25em] text-emerald-400 mb-4">
        Breaking News!
      </p>

      <AnimatePresence>
        {!isOpen && (
          <motion.button
            type="button"
            layoutId="newspaper-sheet"
            onClick={() => setIsOpen(true)}
            aria-label="Open the final front page"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, rotate: [-1, 1, -1] }}
            exit={{ opacity: 0 }}
            whileHover={{ scale: 1.04, rotate: 0 }}
            whileTap={{ scale: 0.95 }}
            transition={{
              opacity: { duration: 0.4 },
              rotate: { duration: 5, repeat: Infinity, ease: "easeInOut" },
            }}
            className="relative mx-auto flex h-44 w-56 cursor-pointer flex-col overflow-hidden rounded-sm border border-black/20 bg-[#ece4d1] p-3 text-left shadow-[0_14px_30px_rgba(0,0,0,0.35)]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 3px)",
            }}
          >
            {/* Center fold crease */}
            <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-black/15" />
            <span className="pointer-events-none absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 bg-gradient-to-r from-black/10 via-transparent to-black/10" />

            <span className="font-serif text-[13px] font-black uppercase tracking-tight text-emerald-950">
              The Verify Gazette
            </span>
            <span className="mt-0.5 mb-1.5 h-[2px] w-full bg-emerald-950" />
            <span className="mb-2 h-px w-full bg-emerald-950/60" />

            <span className="font-serif text-[11px] font-bold leading-tight text-neutral-800">
              Special Edition: Tap to Read the Final Word
            </span>

            <span className="mt-2 flex flex-1 gap-2">
              <span className="flex-1 space-y-1">
                <span className="newspaper-rule-line block w-full" />
                <span className="newspaper-rule-line block w-4/5" />
                <span className="newspaper-rule-line block w-full" />
                <span className="newspaper-rule-line block w-3/5" />
              </span>
              <span className="flex-1 space-y-1">
                <span className="newspaper-rule-line block w-full" />
                <span className="newspaper-rule-line block w-full" />
                <span className="newspaper-rule-line block w-4/5" />
              </span>
            </span>

            <span className="mt-2 self-center rounded-full bg-emerald-950/90 px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-wide text-white">
              Tap to Unfold
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <p className="mt-4 font-serif text-sm text-white/60">
        {isOpen ? "" : "Unfold the truth today. Put an end to the cycle of lies."}
      </p>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/80 backdrop-blur-sm px-4"
          >
            <motion.div
              layoutId="newspaper-sheet"
              onClick={(e) => e.stopPropagation()}
              transition={{ type: "spring", stiffness: 240, damping: 26 }}
              className="relative w-full max-w-lg overflow-hidden rounded-sm border border-black/20 bg-[#ece4d1] p-8 text-left shadow-2xl"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(0,0,0,0.025) 0px, rgba(0,0,0,0.025) 1px, transparent 1px, transparent 3px)",
              }}
            >
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fold the paper back up"
                className="absolute right-4 top-4 cursor-pointer text-neutral-500 transition-colors hover:text-emerald-900"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Center fold crease, carried through from the closed state */}
              <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-black/10" />

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              >
                <div className="flex items-baseline justify-between border-b-4 border-emerald-950 pb-2">
                  <span className="font-serif text-2xl font-black uppercase tracking-tight text-emerald-950">
                    The Verify Gazette
                  </span>
                  <span className="font-sans text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
                    Special Edition
                  </span>
                </div>
                <div className="mt-1 mb-5 flex items-center justify-between border-b border-emerald-950/40 pb-2 font-sans text-[10px] uppercase tracking-wide text-neutral-500">
                  <span>Manila, Philippines</span>
                  <span>Est. 2026</span>
                  <span>Vol. I, No. 1</span>
                </div>

                <h3 className="font-serif font-black text-3xl md:text-4xl leading-[1.1] text-emerald-950 mb-4">
                  VerifyPH Has the Final Word.
                </h3>

                <div className="flex gap-6">
                  <p className="flex-1 font-serif text-[15px] leading-relaxed text-neutral-800 first-letter:float-left first-letter:pr-1 first-letter:font-black first-letter:text-5xl first-letter:leading-[0.8] first-letter:text-emerald-950">
                    Every claim, cross-checked against real sources. Every
                    verdict, transparent. No spin, no noise — just the
                    record, straight from the newsroom to you.
                  </p>
                  <div className="hidden w-24 flex-none space-y-1.5 border-l border-emerald-950/20 pl-3 sm:block">
                    <span className="newspaper-rule-line block w-full" />
                    <span className="newspaper-rule-line block w-full" />
                    <span className="newspaper-rule-line block w-4/5" />
                    <span className="newspaper-rule-line block w-full" />
                  </div>
                </div>

                <div className="mt-7 flex justify-center">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                    <Link
                      href="/claim-check"
                      className="group inline-flex items-center gap-2 rounded-full bg-emerald-950 px-7 py-3 font-sans text-sm font-bold text-white transition-colors hover:bg-emerald-800"
                    >
                      Start Verifying Claims
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-in-out group-hover:translate-x-1" />
                    </Link>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
