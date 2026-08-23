<<<<<<< HEAD
# VerifyPH 🇵🇭

**VerifyPH** is an open-source, evidence-based news aggregation and claim-verification platform designed to combat misinformation in the Philippines.

By aggregating real-time updates from trusted Philippine media organizations and providing a transparent, evidence-first claim checking tool, VerifyPH helps users navigate online information without relying on opaque or biased automated judgment.

---

## 🌟 Key Features

* **📰 Curated News Feed:** Automatically aggregates, normalizes, and dedupes real-time articles from verified Philippine news outlets into a single, clean interface.
* **🔍 Evidence-Based Claim Checker:** Allows users to paste claims from social media (Facebook, TikTok, X, Messenger) and cross-reference them against verified news database entries.
* **🎯 Objective Verdict System:** Organizes evidence into 5 fixed categories without acting as an arbitrary "truth authority":
  * `Officially Confirmed`
  * `Corroborated`
  * `Developing`
  * `Insufficient Evidence`
  * `Contradicted`
* **🔗 Direct Source Attribution:** Every claim result and feed item links directly back to original publisher sources ("Read Original").

---

## 🛠️ Tech Stack

* **Frontend / Framework:** [Next.js](https://nextjs.org/) (App Router) & [Tailwind CSS](https://tailwindcss.com/)
* **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL & Vector Search)
* **AI Engine:** [Google Gemini API](https://ai.google.dev/) (Semantic understanding, evidence extraction & comparison)
* **Automation:** [cron-job.org](https://cron-job.org/) (Scheduled background RSS fetchers)
* **Deployment:** [Vercel](https://vercel.com/)

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── cron/
│   │   │   └── fetch-news/route.ts   # Scheduled RSS ingestion endpoint
│   │   └── claim-checker/route.ts    # Claim verification endpoint
│   ├── feed/page.tsx                 # News feed page
│   ├── claim-check/page.tsx          # Claim checker page
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Home page
├── components/
│   ├── ui/                           # Shared UI primitives
│   ├── feed/                         # Feed-specific components
│   └── claim/                        # Claim-checker-specific components
├── lib/
│   ├── supabase.ts                   # Supabase client setup
│   ├── gemini.ts                     # Gemini API client/helpers
│   └── utils.ts                      # Shared utilities
└── types/
    └── index.ts                      # Shared TypeScript types
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed locally:
* **Node.js** (v18.0.0 or higher)
* **npm**, **pnpm**, or **yarn**
* A **Supabase** project instance
* A **Google Gemini API Key**

---

### Installation & Local Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/your-username/verify-ph.git
   cd verify-ph
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.local.example` to `.env.local` and fill in the values:
   ```bash
   cp .env.local.example .env.local
   ```
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   GEMINI_API_KEY=your_gemini_api_key
   CRON_SECRET=your_custom_cron_secret_token
   ```

4. **Database Setup:**
   Run the SQL migrations provided in `/supabase/migrations` inside your Supabase SQL Editor to set up tables for `articles`, `sources`, `claims`, and `verdicts`.

5. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## ⏰ Background News Ingestion (Cron Setup)

The news feed updates automatically by triggering the `/api/cron/fetch-news` endpoint.

* **In Production:** Set up a cron monitor on [cron-job.org](https://cron-job.org/) pointing to `https://your-domain.vercel.app/api/cron/fetch-news`.
* **Authorization Header:** Include `Authorization: Bearer YOUR_CRON_SECRET` in your cron request to secure the endpoint.

---

## 🛡️ Principles & Ethics

VerifyPH adheres strictly to **transparent evidence presentation**:
1. **No Unilateral Truth Claims:** The AI does not declare statements as simply "Real" or "Fake". It categorizes evidence retrieved directly from verified sources.
2. **Provenance First:** Every assertion made by the system must be backed by a verifiable link to a trusted Philippine news publisher.
3. **Non-Partisan Aggregation:** RSS sources are selected based on established journalistic standards.

---

## 🤝 Contributing

Contributions are welcome. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on submitting issues and pull requests.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
=======
# verify-ph
>>>>>>> adb46e9cf8b0025a1a29cd4b5b4e1c3847c3bbbd
