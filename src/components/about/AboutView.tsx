"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import TiltCard from "@/components/about/TiltCard";
import CountUpStat from "@/components/about/CountUpStat";
import PillarFan, { type PillarData } from "@/components/about/PillarFan";
import NewspaperReveal from "@/components/about/NewspaperReveal";

// ---------------------------------------------------------------------------
// Data — every stat/source below links to a real, checkable URL. See
// docs/verifyph-awareness-page-kiro-prompt.md for the original source list
// and citation notes. Copy is deliberately keyword-first, not full sentences —
// the citation notes/nuance still live in this file's comments for reference.
// ---------------------------------------------------------------------------

type BentoSize = "hero" | "medium" | "compact";

interface StatCardData {
  number: string;
  keyword: string;
  source: string;
  url: string;
  size: BentoSize;
  /** Explicit desktop grid placement — see the 4x3 layout diagram above STATS. */
  placementClass: string;
}

/**
 * Desktop layout is a fixed 4-column x 3-row bento (12 cells total), placed
 * explicitly rather than left to grid auto-flow, specifically so exactly 2
 * cells are reserved as intentional gaps for the dramatic filler tiles
 * (STAT_FILLERS below) instead of ending up as dead whitespace.
 *
 *   [ 86% HERO      ][ 6x        ]
 *   [ (2x2)         ][ 58% ][70% ]
 *   [ 67% ][ 60%    ][FILL ][FILL]
 */
const STATS: StatCardData[] = [
  {
    number: "86%",
    // Full context: Filipino adults calling "fake news" a serious problem
    // in politics coverage (Pulse Asia, Sept 2022, n=1,200).
    keyword: "Call Fake News a National Crisis",
    source: "Pulse Asia",
    url: "https://www.cnnphilippines.com/news/2022/10/11/pulse-asia-survey-fake-news.html",
    size: "hero",
    placementClass: "md:col-start-1 md:row-start-1 md:col-span-2 md:row-span-2",
  },
  {
    number: "6×",
    // Full context: false news reaches its first 1,500 people 6x faster
    // than true news (MIT Sloan / Science, 2018).
    keyword: "Faster Than the Truth",
    source: "MIT",
    url: "https://mitsloan.mit.edu/ideas-made-to-matter/study-false-news-spreads-faster-truth",
    size: "medium",
    placementClass: "md:col-start-3 md:row-start-1 md:col-span-2 md:row-span-1",
  },
  {
    number: "58%",
    // Full context: name influencers/bloggers/vloggers as the top peddlers
    // of political disinformation.
    keyword: "Blame Influencers & Vloggers",
    source: "Pulse Asia",
    url: "https://www.cnnphilippines.com/news/2022/10/11/pulse-asia-survey-fake-news.html",
    size: "compact",
    placementClass: "md:col-start-3 md:row-start-2 md:col-span-1 md:row-span-1",
  },
  {
    number: "70%",
    // Full context: falsehoods are 70% more likely to be reshared than
    // true stories, driven by humans, not bots.
    keyword: "More Likely to Go Viral",
    source: "MIT",
    url: "https://mitsloan.mit.edu/ideas-made-to-matter/study-false-news-spreads-faster-truth",
    size: "compact",
    placementClass: "md:col-start-4 md:row-start-2 md:col-span-1 md:row-span-1",
  },
  {
    number: "67%",
    // Full context: Filipinos concerned about real vs. fake news online —
    // a record high, 9pts above the 2026 global average (Reuters, 2025).
    keyword: "Can't Tell What's Real",
    source: "Reuters Institute",
    url: "https://www.rappler.com/philippines/reuters-institute-digital-news-report-2025-results/",
    size: "compact",
    placementClass: "md:col-start-1 md:row-start-3 md:col-span-1 md:row-span-1",
  },
  {
    number: "60%",
    // Full context: up to 60% of pandemic posts / 51% of vaccine posts
    // analyzed contained health misinformation (WHO systematic review).
    keyword: "Of Health Posts Were False",
    source: "WHO",
    url: "https://www.who.int/europe/news/item/01-09-2022-infodemics-and-misinformation-negatively-affect-people-s-health-behaviours--new-who-review-finds",
    size: "compact",
    placementClass: "md:col-start-2 md:row-start-3 md:col-span-1 md:row-span-1",
  },
];

/** Dark, no-source filler tiles — pure dramatic copy, filling the 2 reserved gap cells. */
const STAT_FILLERS: { words: string; placementClass: string }[] = [
  { words: "TRUST NOTHING BLINDLY.", placementClass: "md:col-start-3 md:row-start-3" },
  { words: "VERIFY OR REGRET.", placementClass: "md:col-start-4 md:row-start-3" },
];

/**
 * PLACEHOLDER IMAGES: seeded via picsum.photos, matching the pattern already
 * used for placeholder art elsewhere in the app (src/lib/mockNews.ts
 * placeholderImage()). Swap for real, licensed photography before shipping.
 */
const PILLARS: PillarData[] = [
  {
    emoji: "🏛️",
    title: "Democracy on the Ballot",
    hook: "Elections",
    body: "Micro-targeted smear campaigns and troll networks manipulate voters at scale.",
    sourceLabel: "Tsek.ph",
    url: "https://www.tsek.ph/",
    imageSeed: "verifyph-about-pillar-democracy",
  },
  {
    emoji: "🏥",
    title: "Infodemics Kill",
    hook: "Public Health",
    body: "Health misinformation delays care and fuels vaccine hesitancy nationwide.",
    sourceLabel: "WHO Review",
    url: "https://www.who.int/europe/news/item/01-09-2022-infodemics-and-misinformation-negatively-affect-people-s-health-behaviours--new-who-review-finds",
    imageSeed: "verifyph-about-pillar-health",
  },
  {
    emoji: "💼",
    title: "Scammed in Seconds",
    hook: "10,004 Cases",
    body: "AI deepfakes and fake shops cost Filipinos ₱198M in a single record year.",
    sourceLabel: "CICC 2024",
    url: "https://newsinfo.inquirer.net/2159231/cyber-crimes-online-scams-go-down-in-2025-cicc-official-says",
    imageSeed: "verifyph-about-pillar-citizens",
  },
];

const KEYWORD_TICKER = [
  "MISINFORMATION",
  "DEEPFAKES",
  "TROLL FARMS",
  "FAKE SCREENSHOTS",
  "CLICKBAIT",
  "DOCTORED PHOTOS",
  "FABRICATED QUOTES",
  "BOT NETWORKS",
  "VIRAL LIES",
  "MANIPULATED CLIPS",
];

interface PipelineStep {
  title: string;
  summary: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    title: "Fabricate",
    summary: "A false claim, image, or video is invented — or stripped of context.",
  },
  {
    title: "Provoke",
    summary: "It's framed to trigger outrage, fear, or shock — the emotions that spread fastest.",
  },
  {
    title: "Amplify",
    summary: "Real people reshare it 6× faster than the truth (MIT, 2018) — no bots required.",
  },
  {
    title: "Erode",
    summary: "Trust in institutions and each other cracks. Then the cycle repeats.",
  },
];

interface SourceLegendItem {
  label: string;
  url: string;
}

const SOURCE_LEGEND: SourceLegendItem[] = [
  { label: "Pulse Asia", url: "https://www.cnnphilippines.com/news/2022/10/11/pulse-asia-survey-fake-news.html" },
  { label: "Reuters Institute", url: "https://www.rappler.com/philippines/reuters-institute-digital-news-report-2025-results/" },
  { label: "MIT", url: "https://mitsloan.mit.edu/ideas-made-to-matter/study-false-news-spreads-faster-truth" },
  { label: "WHO", url: "https://www.who.int/europe/news/item/01-09-2022-infodemics-and-misinformation-negatively-affect-people-s-health-behaviours--new-who-review-finds" },
  { label: "Tsek.ph", url: "https://www.tsek.ph/" },
  { label: "CICC", url: "https://newsinfo.inquirer.net/2159231/cyber-crimes-online-scams-go-down-in-2025-cicc-official-says" },
];

// ---------------------------------------------------------------------------
// Motion variants
// ---------------------------------------------------------------------------

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * "Why Verification Matters" awareness/impact page (route: /about).
 * Framer Motion is scoped to this page only — no other route depends on it.
 */
export default function AboutView() {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  return (
    <>
      {/* ---- Back bar ---- */}
      <div className="border-b border-neutral-300/60">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
          <Link
            href="/"
            className="group cursor-pointer inline-flex items-center gap-2 font-sans text-sm font-semibold text-emerald-900 hover:text-emerald-700 transition-colors"
          >
            <motion.span whileHover={{ x: -4 }} transition={{ duration: 0.2 }}>
              <ArrowLeft className="w-4 h-4" />
            </motion.span>
            Back to Verification
          </Link>
        </div>
      </div>

      {/* ---- Title ---- */}
      <div className="max-w-4xl mx-auto px-6 pt-10">
        <h1 className="font-serif font-bold text-3xl md:text-5xl text-center leading-tight bg-gradient-to-r from-emerald-800 via-emerald-600 to-emerald-900 bg-clip-text text-transparent">
          The Information Crisis: Why Verification Matters
        </h1>
      </div>

      {/* ---- Hero (floating blobs scoped to this section only) ---- */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <motion.span
            className="absolute -top-16 left-[8%] w-72 h-72 rounded-full bg-emerald-300/25 blur-3xl"
            animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="absolute top-24 right-[10%] w-56 h-56 rounded-full bg-emerald-500/15 blur-3xl"
            animate={{ x: [0, -24, 0], y: [0, -18, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="absolute bottom-0 left-[35%] w-40 h-40 rounded-full bg-emerald-700/10 blur-2xl"
            animate={{ x: [0, 18, 0], y: [0, -14, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="max-w-3xl mx-auto px-6 pt-6 pb-10 text-center relative">
          <motion.div
            className="inline-flex items-center gap-2 rounded-full border border-emerald-700/40 bg-emerald-50 px-4 py-1.5 mb-6"
            animate={{
              boxShadow: [
                "0 0 0px rgba(6,95,70,0.0)",
                "0 0 18px rgba(6,95,70,0.35)",
                "0 0 0px rgba(6,95,70,0.0)",
              ],
            }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
            </span>
            <span className="font-sans text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Live Data &amp; Research Sources
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="font-serif font-bold text-2xl md:text-4xl text-neutral-900 leading-snug mb-3"
          >
            Truth Is Losing the Race.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-sans text-neutral-600 text-base md:text-lg max-w-xl mx-auto mb-7"
          >
            Elections swayed. Livelihoods destroyed. Lives endangered — one
            unverified post at a time.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/"
                className="cursor-pointer block rounded-full bg-emerald-900 text-white font-sans font-semibold text-sm px-7 py-3 hover:bg-emerald-800 transition-colors shadow-[0_6px_16px_rgba(0,0,0,0.15)]"
              >
                Verify Content Now
              </Link>
            </motion.div>
            <motion.a
              href="#stats-grid"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              className="cursor-pointer group inline-flex items-center gap-1.5 font-sans font-semibold text-sm text-emerald-900 px-7 py-3 hover:text-emerald-700 transition-colors"
            >
              Explore the Data
              <motion.span animate={{ y: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
                <ChevronDown className="w-4 h-4" />
              </motion.span>
            </motion.a>
          </motion.div>
        </div>

        {/* ---- Keyword ticker: ambient motion in tight vertical space ---- */}
        <div className="relative border-y border-emerald-900/15 bg-emerald-950 py-2.5 overflow-hidden">
          <div className="keyword-ticker-track">
            {[...KEYWORD_TICKER, ...KEYWORD_TICKER].map((word, i) => (
              <span
                key={`${word}-${i}`}
                className="mx-4 inline-flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-widest text-white/60 whitespace-nowrap"
              >
                <Sparkles className="h-3 w-3 text-emerald-500" />
                {word}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Stats bento grid ---- */}
      <motion.section
        id="stats-grid"
        className="max-w-6xl mx-auto px-6 py-14"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
      >
        <motion.p
          variants={fadeUpItem}
          className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 text-center mb-2"
        >
          By the Numbers
        </motion.p>
        <motion.h3
          variants={fadeUpItem}
          className="font-serif font-bold text-2xl md:text-3xl text-neutral-900 text-center mb-9"
        >
          The Damage, Verified.
        </motion.h3>

        <div className="grid grid-cols-1 md:grid-cols-4 md:auto-rows-[minmax(150px,1fr)] gap-4">
          {STATS.map((stat) => (
            <motion.div key={stat.number + stat.source} variants={fadeUpItem} className={stat.placementClass}>
              <TiltCard href={stat.url} className="h-full p-5">
                <ExternalLink className="absolute top-4 right-4 w-4 h-4 text-emerald-700 opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100" />
                <p
                  className={`font-serif font-bold text-emerald-900 mb-2 leading-none ${
                    stat.size === "hero"
                      ? "text-5xl md:text-7xl"
                      : stat.size === "medium"
                        ? "text-3xl md:text-4xl"
                        : "text-2xl md:text-3xl"
                  }`}
                >
                  <CountUpStat value={stat.number} />
                </p>
                <p
                  className={`font-serif font-bold text-neutral-800 mt-auto ${
                    stat.size === "hero" ? "text-lg md:text-xl" : "text-sm"
                  }`}
                >
                  {stat.keyword}
                </p>
                <span className="mt-3 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-sans font-semibold uppercase tracking-wide text-emerald-800">
                  {stat.source}
                </span>
              </TiltCard>
            </motion.div>
          ))}

          {/* Dramatic filler tiles — fill the grid's 2 remaining gap cells on desktop only (hidden on mobile, where the grid collapses to 1 column and no gaps exist). */}
          {STAT_FILLERS.map((filler) => (
            <motion.div
              key={filler.words}
              variants={fadeUpItem}
              className={`hidden md:flex ${filler.placementClass} items-center justify-center rounded-2xl bg-emerald-950 px-4 py-5 text-center`}
            >
              <p className="font-serif font-black text-base leading-tight text-white uppercase tracking-tight">
                {filler.words}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ---- Victim pillars — fanned card hand ---- */}
      <section className="bg-emerald-950/[0.03] py-24">
        <motion.div
          className="max-w-6xl mx-auto px-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.p
            variants={fadeUpItem}
            className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 text-center mb-2"
          >
            Who Pays
          </motion.p>
          <motion.h3
            variants={fadeUpItem}
            className="font-serif font-bold text-3xl md:text-5xl text-neutral-900 text-center mb-14"
          >
            Three Ways Lies Draw Blood.
          </motion.h3>

          <PillarFan pillars={PILLARS} />
        </motion.div>
      </section>

      {/* ---- Virality pipeline — wide bento banner ---- */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border-2 border-neutral-200 bg-white/70 backdrop-blur-md shadow-[0_10px_24px_rgba(0,0,0,0.06)] px-6 md:px-10 py-11"
        >
          <p className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 text-center mb-2">
            The Anatomy of a Lie
          </p>
          <h3 className="font-serif font-bold text-2xl md:text-3xl text-neutral-900 text-center mb-10">
            How Fast Can a Rumor Kill Trust?
          </h3>

          <div className="relative flex flex-col md:flex-row items-stretch justify-between gap-10 md:gap-4">
            <div className="hidden md:block absolute top-8 left-8 right-8 h-0.5 bg-emerald-200 overflow-hidden">
              <span className="flow-particle" />
            </div>

            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.title} className="relative flex-1">
                <motion.button
                  type="button"
                  onClick={() => setActiveStep(activeStep === i ? null : i)}
                  aria-expanded={activeStep === i}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  className="relative z-10 w-full cursor-pointer flex flex-col items-center text-center"
                >
                  <motion.span
                    animate={
                      activeStep === i
                        ? { scale: [1, 1.15, 1], boxShadow: "0 0 22px rgba(6,95,70,0.5)" }
                        : { scale: 1, boxShadow: "0 6px 16px rgba(6,95,70,0.35)" }
                    }
                    transition={{ duration: 0.5 }}
                    className="w-14 h-14 rounded-full bg-emerald-900 text-white font-serif font-bold text-base flex items-center justify-center mb-2.5"
                  >
                    {i + 1}
                  </motion.span>
                  <p className="font-serif font-bold text-sm text-neutral-900">{step.title}</p>
                </motion.button>

                {activeStep === i && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-56 rounded-lg bg-emerald-950 text-white text-xs font-sans leading-relaxed p-3 shadow-xl z-20"
                  >
                    {step.summary}
                  </motion.div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 mt-9 text-neutral-500">
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="font-sans text-xs">The cycle repeats.</span>
          </div>
        </motion.div>
      </section>

      {/* ---- Source legend ---- */}
      <section className="bg-emerald-950 text-white">
        <div className="max-w-6xl mx-auto px-6 py-10 text-center">
          <p className="font-sans text-xs uppercase tracking-wide text-white/50 mb-5">
            The Receipts
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {SOURCE_LEGEND.map((src) => (
              <a
                key={src.label}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative cursor-pointer inline-flex items-center rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-sans font-semibold text-white/80 hover:text-white hover:border-white/40 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {src.label}
                <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white text-emerald-900 text-[10px] font-semibold px-2.5 py-1 opacity-0 scale-95 transition-all duration-200 ease-in-out group-hover:opacity-100 group-hover:scale-100">
                  Verify Source →
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* ---- Newspaper-unfold finale + popup CTA (routes to "/") ---- */}
        <NewspaperReveal />
      </section>
    </>
  );
}
