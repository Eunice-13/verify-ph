# Kiro Build Prompt — VerifyPH "Awareness & Impact" Page

> Copy everything below into Kiro. It merges the content blueprint with the technical/UX spec, adds two extra verified stats you asked for, and swaps every placeholder for a real, checkable source URL as of August 2026. A note on colors is at the bottom — I couldn't pull hex values from your live site's compiled CSS, so I've included an instruction for Kiro to inspect and match it directly instead of guessing.

---

## ROLE

Act as a Principal Frontend Engineer and UI/UX Designer specializing in React, Tailwind CSS, and Framer Motion.

## OBJECTIVE

Build a single-page React component for an **"Awareness & Impact"** page — a dedicated tab reachable from the top-right hamburger menu of my live verification platform, **https://verify-ph.vercel.app/**. This is a fact-checking / civic news aggregator (tagline: "Civic News & AI Claim Checker") that links out to original Philippine publishers (Rappler, Manila Bulletin, BusinessWorld, Inquirer, GMA News, etc.) rather than hosting its own reporting. This page exists to explain *why verification matters* before a user starts reading.

**Build ONLY this page's content and layout** — do not touch the existing feed, header nav, or routing logic beyond adding this as a new tab/route.

---

## 1. VISUAL THEME — match the existing site, don't guess

Before writing any styles, inspect the live site's actual design tokens (`https://verify-ph.vercel.app/`) — computed background/text colors, font stack, card radius, and spacing — and reuse them exactly, rather than inventing a new palette. From what's visible in the site's structure: it's a card-based news feed with category tabs (News & Politics, Economy, Health & Safety, Lifestyle, General), a "Verified" badge pattern on each story card, and a live counter footer ("Claims Reported" / "Claims Verified" since August 2026). This new page should feel like a natural extension of that — same card language, same "Verified" badge visual grammar, same trust-forward tone — just applied to awareness content instead of news cards.

If Kiro has direct access to the repo, extract the Tailwind config / CSS variables directly. If not, default to a **teal/blue trust palette** (matching typical fact-checking-platform conventions: deep navy or slate background, a teal or cyan accent for "verified" states, amber/red reserved only for warning states) and clearly comment the token names so they're easy to swap once the real values are confirmed.

---

## 2. Page Header & Back Action

- Subtle top bar with a "← Back to Verification" button, smooth slide-out transition on click, returning to the main feed.
- Title: **"The Information Crisis: Why Verification Matters"** with a gradient text effect consistent with the site's accent color.

## 3. Dynamic Hero Section

- Headline: **"In a World Swamped by Fake News, Truth is Our First Line of Defense."**
- Sub-headline: "Misinformation isn't just a nuisance online — it sways elections, destroys livelihoods, and endangers lives. Here's why verification matters."
- A pulsing "LIVE DATA & RESEARCH SOURCES" indicator with a glowing aura (reuse whatever "Verified" badge animation/style already exists on the feed cards, if any).
- CTA row: `[Verify Content Now]` (routes back to the feed) | `[Explore the Data ↓]` (anchor-scrolls to the stats grid).

## 4. Interactive Stats Grid (6 cards, hover + click-through)

Each card is a full `<a target="_blank" rel="noopener noreferrer">` wrapping a clickable card — number, one-line context, source badge, and an external-link icon (`↗`) that fades in on hover. On hover: card elevates (`y: -8px`) with a soft accent-colored glow. On tap/click: opens the real source in a new tab.

| # | Metric | Context | Source | URL (real, verifiable) |
|---|--------|---------|--------|--------------------------|
| 1 | **86%** | of Filipino adults consider "fake news" a serious problem in government/politics coverage (Pulse Asia, Sept 2022 nationwide survey, n=1,200) | Pulse Asia | `https://www.cnnphilippines.com/news/2022/10/11/pulse-asia-survey-fake-news.html` |
| 2 | **58%** | of the same respondents name social media influencers, bloggers, and vloggers as the top peddlers of political disinformation | Pulse Asia | `https://www.cnnphilippines.com/news/2022/10/11/pulse-asia-survey-fake-news.html` |
| 3 | **6× Faster** | false news reaches its first 1,500 people six times faster than true news (MIT Media Lab / MIT Sloan, *Science*, 2018 — largest longitudinal study of its kind) | MIT | `https://mitsloan.mit.edu/ideas-made-to-matter/study-false-news-spreads-faster-truth` |
| 4 | **70%** | falsehoods are 70% more likely to be retweeted/reshared than true stories, and the effect is driven by humans, not bots | MIT | `https://mitsloan.mit.edu/ideas-made-to-matter/study-false-news-spreads-faster-truth` |
| 5 | **67%** | of Filipinos say they're concerned about what's real vs. fake in online news — a record high, 9 points above the 2026 global average of 58% (Reuters Institute Digital News Report 2025) | Reuters Institute | `https://www.rappler.com/philippines/reuters-institute-digital-news-report-2025-results/` |
| 6 | **Up to 60%** | of pandemic-related social posts and up to 51% of vaccine-related posts analyzed in a WHO systematic review contained health misinformation | WHO | `https://www.who.int/europe/news/item/01-09-2022-infodemics-and-misinformation-negatively-affect-people-s-health-behaviours--new-who-review-finds` |

> These 6 replace the original 4 — you asked for more stats, and #4 and #6 are the additions, both drawn from the same primary studies already anchoring the page so the narrative stays coherent (MIT's virality data, WHO's health-harm data).

## 5. The 3 Victim Pillars (expandable/focus cards)

Hovering one pillar dims the other two to `opacity: 0.6` to drive focus; active hover shows a subtle animated mesh-gradient/shimmer background. Clicking each card opens its linked case study in a new tab.

#### 🏛️ Pillar 1 — Democracy & Public Trust
**The reality:** Disinformation campaigns use micro-targeting, coordinated troll networks, and fabricated smear content to manipulate voter perception, disproportionately targeting political candidates and opposition voices.
**Linked source:** Tsek.ph, the UP-CMC-led multi-newsroom fact-checking coalition that has tracked coordinated disinformation around Philippine elections since 2019 → `https://www.tsek.ph/`

#### 🏥 Pillar 2 — Public Health & Human Safety
**The reality:** "Infodemics" — WHO's term for the overwhelming flood of accurate and false health information — measurably increase vaccine hesitancy and delay care-seeking behavior.
**Linked source:** WHO systematic review, *"Infodemics and health misinformation negatively affect people's health behaviours"* → `https://www.who.int/europe/news/item/01-09-2022-infodemics-and-misinformation-negatively-affect-people-s-health-behaviours--new-who-review-finds`

#### 💼 Pillar 3 — Everyday Citizens & Small Businesses
**The reality:** Beyond politics, misinformation fuels identity theft, fake online shops, and AI-generated voice/video deepfakes used in investment and romance scams. The Philippines' Cybercrime Investigation and Coordinating Center (CICC) logged a record 10,004 cybercrime complaints in 2024 alone, with ₱198 million lost to victims; a 2025 industry analysis separately found the Philippines has one of the highest suspected digital-fraud rates in the world.
**Linked source (CICC 2024 record year):** `https://newsinfo.inquirer.net/2159231/cyber-crimes-online-scams-go-down-in-2025-cicc-official-says`
**Linked source (deepfake-enabled fraud):** `https://www.pwc.com/ph/en/publications/pwc-publications/2025/defending-filipinos-against-phishing-deepfakes-and-digital-threats-in-2025.html`

## 6. Animated Virality Pipeline (interactive flow diagram)

Horizontal flow: **Fabricated Content → Emotional/Surprising Trigger → Rapid Organic Amplification → Erosion of Public Trust**, looping back visually to step 1 to suggest a cycle.
- Animated directional particles or glowing pulses moving left-to-right along the connector lines.
- Tapping a step opens a micro-tooltip/modal with a one-line summary (tie step 3 back to the "6× faster" MIT stat above for narrative continuity).

## 7. External Source Legend & Closing CTA

- Bottom banner with source badges: **Pulse Asia · Reuters Institute · MIT · WHO · Tsek.ph · CICC**. Hovering a badge shows a pill tooltip: "Verify Source →".
- Final CTA: **"Start Verifying Claims"** → routes back to the main feed, with `group-hover:translate-x-1` arrow-slide animation.

---

## TECHNICAL REQUIREMENTS

- **Stack:** React, Tailwind CSS, Framer Motion for all state-driven transitions.
- **Outbound links:** every stat card, pillar card, and source badge is a real anchor tag with `target="_blank" rel="noopener noreferrer"` pointing to the URLs above — no dead placeholders.
- **Interaction states:** all interactive elements get accessible focus rings, `whileHover={{ scale: 1.02 }}`, and `whileTap={{ scale: 0.98 }}`.
- **Responsiveness:** fully responsive across mobile, tablet, desktop — stats grid should collapse from 3-across → 2-across → 1-across, pillars stack vertically on mobile.
- **Component structure:** self-contained, single default-exported component; no required props (or sensible defaults) so it can be dropped straight into the hamburger-menu tab routing.
- **Integration note to Kiro:** after generating the component, include short instructions for wiring it into the existing nav/drawer as a new tab, and note anywhere you had to assume a route name or prop shape so I can confirm it matches my actual router setup.

---

## Source list (for your own reference / fact-checking)

- Pulse Asia fake-news survey (Sept 2022, n=1,200): https://www.cnnphilippines.com/news/2022/10/11/pulse-asia-survey-fake-news.html
- MIT Sloan / Vosoughi, Roy, Aral, *Science* (2018): https://mitsloan.mit.edu/ideas-made-to-matter/study-false-news-spreads-faster-truth
- Reuters Institute Digital News Report 2025 — Philippines coverage: https://www.rappler.com/philippines/reuters-institute-digital-news-report-2025-results/
- Reuters Institute Digital News Report — official Philippines country page: https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/philippines
- WHO systematic review on infodemics and health misinformation (2022): https://www.who.int/europe/news/item/01-09-2022-infodemics-and-misinformation-negatively-affect-people-s-health-behaviours--new-who-review-finds
- CICC 2024 cybercrime record / 2025 update: https://newsinfo.inquirer.net/2159231/cyber-crimes-online-scams-go-down-in-2025-cicc-official-says
- PwC PH on deepfake-enabled fraud (2025): https://www.pwc.com/ph/en/publications/pwc-publications/2025/defending-filipinos-against-phishing-deepfakes-and-digital-threats-in-2025.html
- Tsek.ph fact-checking coalition: https://www.tsek.ph/

**Note:** the Pulse Asia and MIT figures are from 2018/2022 studies — they're the standard, most-cited numbers on this topic and still accurate as reported, but they aren't brand-new. The Reuters Institute and CICC figures are current as of their 2025 reports. Double-check tsek.ph's homepage content before shipping, since I described its role rather than quoting a specific current statistic from it.
