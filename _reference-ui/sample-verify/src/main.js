/* ==========================================================================
   VerifyPH — main.js
   Mock data layer + SPA router with fade transitions + view renderers.
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. MOCK DATA
   Every real news item MUST carry status: "VERIFIED". Items with any other
   status (e.g. "PENDING") exist here only to prove the filter excludes them —
   they are never rendered in the news UI. Non-verified claim results belong
   to the future Claim Checker backend integration, not this news feed.

   NOTE ON PLACEHOLDERS: sourceUrl / providerName / featured are placeholder
   values only. Once the real backend/scraper is connected, these fields
   should be populated with the actual article URL, the actual publisher
   name, and an editorially-flagged "most relevant today" boolean.
   -------------------------------------------------------------------------- */
const CATEGORIES = [
  "NEWS & POLITICS",
  "ECONOMY",
  "HEALTH & SAFETY",
  "LIFESTYLE",
  "GENERAL",
];

/** Deterministic placeholder photo per article id (picsum.photos seeded service). */
function placeholderImage(id, width = 800, height = 600) {
  return `https://picsum.photos/seed/verifyph-${id}/${width}/${height}`;
}

/** Deterministic placeholder provider name per article id, until real source data exists. */
const PLACEHOLDER_PROVIDERS = [
  "PH Daily Tribune",
  "Manila Herald",
  "Luzon Times",
  "Visayas Report",
  "Mindanao Gazette",
  "National Wire PH",
];
function placeholderProviderName(id) {
  return PLACEHOLDER_PROVIDERS[id % PLACEHOLDER_PROVIDERS.length];
}

/** Deterministic placeholder outbound source link per article id, until real source data exists. */
function placeholderSourceUrl(id) {
  return `https://example-news-provider.ph/article/${id}`;
}

const NEWS_DATA = [
  {
    id: 1,
    category: "NEWS & POLITICS",
    title: "Senate Passes Amended Public Transport Modernization Bill",
    excerpt:
      "Lawmakers approved the amended bill on third reading, extending the transition period for jeepney operators nationwide.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    date: "August 23, 2026",
    status: "VERIFIED",
    featured: true,
  },
  {
    id: 2,
    category: "NEWS & POLITICS",
    title: "Local Officials Sign Anti-Red Tape Compliance Pledge",
    excerpt:
      "Mayors from 12 cities committed to faster permit processing under the revised anti-red tape guidelines.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    date: "August 23, 2026",
    status: "VERIFIED",
  },
  {
    id: 3,
    category: "NEWS & POLITICS",
    title: "Unverified Claim About Election Recount Circulates Online",
    excerpt:
      "A viral post alleging a secret recount is still being reviewed by fact-checkers.",
    body: "This claim is still under review and is not published in the verified feed.",
    date: "August 22, 2026",
    status: "PENDING",
  },
  {
    id: 16,
    category: "NEWS & POLITICS",
    title: "Congress Opens Public Hearing on Coastal Land Reclamation Projects",
    excerpt:
      "Environmental groups and local officials testified on the impact of ongoing reclamation.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 21, 2026",
    status: "VERIFIED",
  },
  {
    id: 17,
    category: "NEWS & POLITICS",
    title: "Barangay Elections Set for Early Next Year, Comelec Confirms",
    excerpt:
      "The poll body released the tentative calendar for the upcoming barangay elections.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 20, 2026",
    status: "VERIFIED",
  },
  {
    id: 18,
    category: "NEWS & POLITICS",
    title: "New Anti-Corruption Task Force Convenes First Session",
    excerpt:
      "The task force will review flagged government contracts from the past two years.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 19, 2026",
    status: "VERIFIED",
  },
  {
    id: 19,
    category: "NEWS & POLITICS",
    title: "Regional Governors Meet to Discuss Disaster Response Coordination",
    excerpt:
      "The summit focused on streamlining inter-agency response during typhoon season.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 18, 2026",
    status: "VERIFIED",
  },
  {
    id: 20,
    category: "NEWS & POLITICS",
    title: "Youth Council Pushes for Lower Voting Age in Local Polls",
    excerpt:
      "Advocates presented a proposal to allow 16-year-olds to vote in barangay elections.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 17, 2026",
    status: "VERIFIED",
  },
  {
    id: 21,
    category: "NEWS & POLITICS",
    title: "Metro Manila Traffic Enforcers Get Body Cameras Nationwide",
    excerpt:
      "The rollout aims to improve transparency in traffic violation apprehensions.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 16, 2026",
    status: "VERIFIED",
  },
  {
    id: 4,
    category: "ECONOMY",
    title: "Peso Strengthens Against Dollar Amid Steady Remittance Inflows",
    excerpt:
      "The peso closed stronger this week as overseas remittances remained resilient heading into the holiday season.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    date: "August 23, 2026",
    status: "VERIFIED",
    featured: true,
  },
  {
    id: 5,
    category: "ECONOMY",
    title: "Inflation Eases to 3.1% in July, Lowest in Two Years",
    excerpt:
      "The slowdown was driven mainly by cheaper rice and vegetable prices across major trading centers.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 22, 2026",
    status: "VERIFIED",
  },
  {
    id: 6,
    category: "ECONOMY",
    title: "Small Business Loan Program Expands to Five New Provinces",
    excerpt:
      "The expanded program targets micro-entrepreneurs with zero-interest starter loans.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 21, 2026",
    status: "VERIFIED",
  },
  {
    id: 22,
    category: "ECONOMY",
    title: "Manufacturing Sector Posts Fastest Growth in Three Years",
    excerpt:
      "Factory output rose on stronger domestic demand and lower input costs.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 20, 2026",
    status: "VERIFIED",
  },
  {
    id: 23,
    category: "ECONOMY",
    title: "Government Bonds Oversubscribed in Latest Treasury Auction",
    excerpt:
      "Investor demand exceeded the offering by nearly triple the target amount.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 19, 2026",
    status: "VERIFIED",
  },
  {
    id: 24,
    category: "ECONOMY",
    title: "Tourism Revenue Nears Pre-Pandemic Levels This Quarter",
    excerpt:
      "Arrivals from key markets rebounded, boosting hotel and travel bookings.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 18, 2026",
    status: "VERIFIED",
  },
  {
    id: 25,
    category: "ECONOMY",
    title: "Agriculture Department Rolls Out Subsidized Fertilizer Program",
    excerpt:
      "The program targets rice and corn farmers ahead of the next planting season.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 17, 2026",
    status: "VERIFIED",
  },
  {
    id: 26,
    category: "ECONOMY",
    title: "Freight Ports Report Record Container Volume for the Year",
    excerpt:
      "Efficiency upgrades helped ports handle the increased shipping demand.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 16, 2026",
    status: "VERIFIED",
  },
  {
    id: 7,
    category: "HEALTH & SAFETY",
    title: "DOH Rolls Out Free Booster Shots in Regional Health Centers",
    excerpt:
      "The Department of Health expanded free booster access ahead of the rainy season surge.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    date: "August 23, 2026",
    status: "VERIFIED",
    featured: true,
  },
  {
    id: 8,
    category: "HEALTH & SAFETY",
    title: "Coastal Cities Placed on Storm Watch as Tropical Depression Forms",
    excerpt:
      "PAGASA advises coastal residents to prepare as the depression is expected to intensify.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 23, 2026",
    status: "VERIFIED",
  },
  {
    id: 9,
    category: "HEALTH & SAFETY",
    title: "Miracle Cure Claim for Common Colds Debunked by Doctors",
    excerpt:
      "A viral home-remedy post is currently flagged and awaiting formal medical review.",
    body: "This claim is still under review and is not published in the verified feed.",
    date: "August 20, 2026",
    status: "PENDING",
  },
  {
    id: 27,
    category: "HEALTH & SAFETY",
    title: "New Regional Trauma Center Opens to the Public",
    excerpt:
      "The facility adds emergency capacity for the surrounding provinces.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 19, 2026",
    status: "VERIFIED",
  },
  {
    id: 28,
    category: "HEALTH & SAFETY",
    title: "Fire Department Launches Barangay-Level Safety Drills",
    excerpt:
      "The initiative aims to improve evacuation readiness ahead of the dry season.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 18, 2026",
    status: "VERIFIED",
  },
  {
    id: 29,
    category: "HEALTH & SAFETY",
    title: "Mental Health Hotline Expands Operating Hours Nationwide",
    excerpt:
      "The free hotline is now available around the clock in all major regions.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 17, 2026",
    status: "VERIFIED",
  },
  {
    id: 30,
    category: "HEALTH & SAFETY",
    title: "Road Safety Campaign Cuts Highway Accidents by 15 Percent",
    excerpt:
      "Stricter enforcement and new signage contributed to the improved figures.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 16, 2026",
    status: "VERIFIED",
  },
  {
    id: 31,
    category: "HEALTH & SAFETY",
    title: "Water Safety Advisory Issued for Popular Beach Destinations",
    excerpt:
      "Lifeguard patrols were increased following recent strong current reports.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 15, 2026",
    status: "VERIFIED",
  },
  {
    id: 32,
    category: "HEALTH & SAFETY",
    title: "Free Dental Mission Reaches Remote Mountain Communities",
    excerpt:
      "Volunteer dentists provided checkups and treatment for underserved residents.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 14, 2026",
    status: "VERIFIED",
  },
  {
    id: 10,
    category: "LIFESTYLE",
    title: "Local Coffee Farmers Gain Global Recognition at Trade Expo",
    excerpt:
      "Philippine-grown beans took top honors at this year's international coffee trade expo.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    date: "August 22, 2026",
    status: "VERIFIED",
    featured: true,
  },
  {
    id: 11,
    category: "LIFESTYLE",
    title: "Weekend Food Markets Return to Downtown Plaza",
    excerpt:
      "Dozens of local vendors are set to join the revived weekend night market.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 21, 2026",
    status: "VERIFIED",
  },
  {
    id: 12,
    category: "LIFESTYLE",
    title: "Independent Filmmakers Showcase Work at Regional Festival",
    excerpt:
      "This year's lineup features a record number of first-time directors from Mindanao.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 20, 2026",
    status: "VERIFIED",
  },
  {
    id: 33,
    category: "LIFESTYLE",
    title: "Heritage Homes in Old Town District Get Restoration Grants",
    excerpt:
      "The grants aim to preserve century-old houses threatened by urban development.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 19, 2026",
    status: "VERIFIED",
  },
  {
    id: 34,
    category: "LIFESTYLE",
    title: "Local Fashion Designers Feature Upcycled Textiles at Trade Show",
    excerpt:
      "The collection highlights sustainable practices using reclaimed fabric scraps.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 18, 2026",
    status: "VERIFIED",
  },
  {
    id: 35,
    category: "LIFESTYLE",
    title: "Community Garden Project Turns Vacant Lots Into Green Spaces",
    excerpt:
      "Residents transformed three idle lots into shared vegetable gardens.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 17, 2026",
    status: "VERIFIED",
  },
  {
    id: 36,
    category: "LIFESTYLE",
    title: "Popular Street Food Row Gets Official Tourism Recognition",
    excerpt:
      "The strip was named a must-visit food destination in the latest travel guide.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 16, 2026",
    status: "VERIFIED",
  },
  {
    id: 37,
    category: "LIFESTYLE",
    title: "Local Board Game Cafe Chain Expands to Three More Cities",
    excerpt:
      "The growing hobby scene continues to draw new cafes and community meetups.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 15, 2026",
    status: "VERIFIED",
  },
  {
    id: 13,
    category: "GENERAL",
    title: "Community Pantry Network Marks Third Year of Operation",
    excerpt:
      "Volunteer-run pantries continue expanding, now serving over 40 barangays nationwide.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    date: "August 23, 2026",
    status: "VERIFIED",
    featured: true,
  },
  {
    id: 14,
    category: "GENERAL",
    title: "Public Library System Adds Digital Lending for Rural Schools",
    excerpt:
      "The initiative aims to bring e-book access to schools without physical library branches.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 22, 2026",
    status: "VERIFIED",
  },
  {
    id: 15,
    category: "GENERAL",
    title: "Volunteer Group Completes Coastal Cleanup Milestone",
    excerpt:
      "Over 5,000 volunteers have joined the cleanup drive since it started this year.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 21, 2026",
    status: "VERIFIED",
  },
  {
    id: 38,
    category: "GENERAL",
    title: "Provincial Job Fair Draws Record Number of Applicants",
    excerpt:
      "Over 3,000 jobseekers attended the two-day fair hosted by the local government.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 20, 2026",
    status: "VERIFIED",
  },
  {
    id: 39,
    category: "GENERAL",
    title: "Stray Animal Shelter Reaches Full Capacity, Seeks Adopters",
    excerpt:
      "The shelter is calling for the public's help as intake numbers continue to rise.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 19, 2026",
    status: "VERIFIED",
  },
  {
    id: 40,
    category: "GENERAL",
    title: "Public School Renovation Program Completes Phase One",
    excerpt:
      "Twenty schools received new classrooms and upgraded facilities this year.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 18, 2026",
    status: "VERIFIED",
  },
  {
    id: 41,
    category: "GENERAL",
    title: "Local Weather Station Upgrades Improve Storm Forecasting",
    excerpt:
      "New equipment allows for more accurate early warnings during typhoon season.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 17, 2026",
    status: "VERIFIED",
  },
  {
    id: 42,
    category: "GENERAL",
    title: "Public Transport App Adds Real-Time Jeepney Tracking",
    excerpt:
      "Commuters can now check estimated arrival times on major routes.",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 16, 2026",
    status: "VERIFIED",
  },
];

/**
 * Strictly returns only VERIFIED articles, optionally narrowed to a category.
 * This is the single source of truth every news view must read through —
 * no view is permitted to read NEWS_DATA directly.
 */
function getVerifiedArticles(category) {
  return NEWS_DATA.filter((item) => {
    if (item.status !== "VERIFIED") return false;
    if (category && item.category !== category) return false;
    return true;
  });
}

/** The single most relevant verified story today (used for the homepage hero). */
function getFeaturedArticle() {
  const verified = getVerifiedArticles(null);
  return verified.find((item) => item.featured) ?? verified[0] ?? null;
}

/* --------------------------------------------------------------------------
   2. APP STATE + ROUTER
   -------------------------------------------------------------------------- */
const state = {
  view: "home", // "home" | "category" | "claim-checker"
  category: null,
};

const FADE_DURATION = 400; // ms — 0.4 second fade/mix transition between views

let isTransitioning = false;

function navigateTo(view, params = {}) {
  if (isTransitioning) return;
  state.view = view;
  state.category = params.category ?? null;
  closeDropdown();
  transitionTo(render);
}

/** Fades #app out, swaps content via the provided render callback, fades back in. */
function transitionTo(renderCallback) {
  const app = document.getElementById("app");
  if (!app) return;

  isTransitioning = true;

  app.style.transition = `opacity ${FADE_DURATION}ms ease-in-out`;
  app.style.opacity = "0";

  const onFadeOutEnd = (event) => {
    if (event.propertyName !== "opacity") return;
    app.removeEventListener("transitionend", onFadeOutEnd);

    renderCallback();
    window.scrollTo({ top: 0, behavior: "auto" });

    void app.offsetHeight;

    const onFadeInEnd = (event2) => {
      if (event2.propertyName !== "opacity") return;
      app.removeEventListener("transitionend", onFadeInEnd);
      isTransitioning = false;
    };
    app.addEventListener("transitionend", onFadeInEnd);
    app.style.opacity = "1";
  };

  app.addEventListener("transitionend", onFadeOutEnd);
}

/* --------------------------------------------------------------------------
   3. RENDER DISPATCHER
   -------------------------------------------------------------------------- */
function render() {
  const app = document.getElementById("app");
  if (!app) return;

  switch (state.view) {
    case "home":
      app.innerHTML = renderHomeView();
      break;
    case "category":
      app.innerHTML = renderCategoryView(state.category);
      break;
    case "claim-checker":
      app.innerHTML = renderClaimCheckerView();
      break;
    default:
      app.innerHTML = renderHomeView();
  }

  renderFooter();
  attachViewEventListeners();
  setupClaimBarBehavior();
  setupFooterReveal();
}

/* --------------------------------------------------------------------------
   4. CARD COMPONENT
   Every card links straight out to the original news provider. VerifyPH is
   only the middleman — clicking the image, headline, or provider name opens
   the real source in a new tab. No internal article route exists.
   -------------------------------------------------------------------------- */

/**
 * @param {object} article
 * @param {string} imgHeightClass - Tailwind height class for the image area.
 * @param {string} titleSizeClass - Tailwind text-size class for the headline.
 */
function articleCardTemplate(article, imgHeightClass, titleSizeClass) {
  const url = article.sourceUrl ?? placeholderSourceUrl(article.id);
  const provider = article.providerName ?? placeholderProviderName(article.id);

  return `
    <div class="news-card group relative">
      <a
        href="${url}"
        target="_blank"
        rel="noopener noreferrer"
        class="block rounded-xl overflow-hidden shadow-[0_6px_16px_rgba(0,0,0,0.12)] ${imgHeightClass} relative"
      >
        <img
          src="${placeholderImage(article.id)}"
          alt="${article.title}"
          loading="lazy"
          class="absolute inset-0 w-full h-full object-cover transition-transform duration-[400ms] ease-in-out group-hover:scale-105"
        />
      </a>

      <div class="pt-2.5">
        <a
          href="${url}"
          target="_blank"
          rel="noopener noreferrer"
          class="font-serif font-bold text-neutral-900 ${titleSizeClass} leading-snug hover:text-emerald-800 transition-colors"
        >
          ${article.title}
        </a>
        <p class="mt-1 text-xs font-sans text-neutral-500">
          Sourced from:
          <a href="${url}" target="_blank" rel="noopener noreferrer" class="hover:text-emerald-800 hover:underline transition-colors">
            ${provider}
          </a>
        </p>
      </div>

      <!-- Hover popup: verified status + full headline + provider -->
      <div
        class="pointer-events-none absolute inset-x-0 top-0 ${imgHeightClass} z-20 flex flex-col justify-end
               rounded-xl bg-gradient-to-t from-black/90 via-black/50 to-black/10 p-4 opacity-0 scale-[0.98]
               transition-all duration-[400ms] ease-in-out group-hover:opacity-100 group-hover:scale-100"
      >
        <span class="inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-sans font-semibold uppercase tracking-wide text-white mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-3 h-3">
            <path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Verified
        </span>
        <h4 class="font-serif font-bold text-white text-sm md:text-base leading-snug mb-1">
          ${article.title}
        </h4>
        <p class="text-[11px] font-sans text-white/80">${provider}</p>
      </div>
    </div>
  `;
}

/** Small side-list card used in the homepage hero's right-hand column (image + text side-by-side). */
function articleSideCardTemplate(article) {
  const url = article.sourceUrl ?? placeholderSourceUrl(article.id);
  const provider = article.providerName ?? placeholderProviderName(article.id);

  return `
    <div class="news-card group flex gap-3">
      <a
        href="${url}"
        target="_blank"
        rel="noopener noreferrer"
        class="relative block w-24 h-20 shrink-0 rounded-xl overflow-hidden shadow-[0_6px_16px_rgba(0,0,0,0.12)]"
      >
        <img
          src="${placeholderImage(article.id)}"
          alt="${article.title}"
          loading="lazy"
          class="absolute inset-0 w-full h-full object-cover transition-transform duration-[400ms] ease-in-out group-hover:scale-105"
        />
        <div
          class="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end rounded-xl bg-gradient-to-t from-black/90 via-black/50 to-black/10 p-1.5
                 opacity-0 scale-[0.98] transition-all duration-[400ms] ease-in-out group-hover:opacity-100 group-hover:scale-100"
        >
          <span class="inline-flex items-center gap-1 self-start rounded-full bg-emerald-600 px-1.5 py-0.5 text-[8px] font-sans font-semibold uppercase tracking-wide text-white">
            Verified
          </span>
        </div>
      </a>
      <div class="min-w-0">
        <a
          href="${url}"
          target="_blank"
          rel="noopener noreferrer"
          class="font-serif font-bold text-neutral-900 text-sm leading-snug hover:text-emerald-800 transition-colors"
        >
          ${article.title}
        </a>
        <p class="mt-1 text-xs font-sans text-neutral-500">
          Sourced from:
          <a href="${url}" target="_blank" rel="noopener noreferrer" class="hover:text-emerald-800 hover:underline transition-colors">
            ${provider}
          </a>
        </p>
      </div>
    </div>
  `;
}

/** Empty skeleton slot so grids never collapse when a category has too few verified articles. */
function emptyCardSkeleton(heightClass) {
  return `<div class="${heightClass} rounded-xl border border-dashed border-neutral-300 bg-neutral-200/40"></div>`;
}

/* --------------------------------------------------------------------------
   5. CATEGORY ROW (homepage preview strip — intentionally capped)
   Shows a fixed-size preview (matching the wireframe) with a "View More
   Here ->" link out to the full category page, which is NOT capped (see
   renderCategoryView below) and grows automatically as articles are added.
   -------------------------------------------------------------------------- */
function categoryRowTemplate(category, count = 4) {
  const articles = getVerifiedArticles(category).slice(0, count);
  const cardsHtml = Array.from({ length: count }, (_, i) =>
    articles[i]
      ? articleCardTemplate(articles[i], "h-44 md:h-48", "text-sm md:text-base")
      : emptyCardSkeleton("h-44 md:h-48")
  ).join("");

  return `
    <section class="max-w-6xl mx-auto px-6 py-8">
      <div class="flex items-baseline justify-between border-b-2 border-neutral-800 pb-2 mb-6">
        <h2 class="font-sans font-semibold text-xs md:text-sm tracking-wide uppercase text-neutral-800">${category}</h2>
        <button
          type="button"
          data-nav="category"
          data-category="${category}"
          class="cursor-pointer font-sans text-xs md:text-sm text-neutral-600 hover:text-emerald-800 transition-colors whitespace-nowrap"
        >
          View More Here -&gt;
        </button>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
        ${cardsHtml}
      </div>
    </section>
  `;
}

/* --------------------------------------------------------------------------
   6. HOMEPAGE VIEW
   Mixed-category hero (2 small left + 1 large center + 3 side right),
   followed by a stacked row per category in CATEGORIES order.
   -------------------------------------------------------------------------- */
function renderHomeView() {
  const featured = getFeaturedArticle();
  const verified = getVerifiedArticles(null);

  // Build a pool that excludes the hero article, then take 2 for the left
  // column and 3 for the right column — mixed across categories.
  const pool = verified.filter((a) => a.id !== featured?.id);
  const leftArticles = pool.slice(0, 2);
  const rightArticles = pool.slice(2, 5);

  const leftHtml = Array.from({ length: 2 }, (_, i) =>
    leftArticles[i]
      ? articleCardTemplate(leftArticles[i], "h-40 md:h-44", "text-sm")
      : emptyCardSkeleton("h-40 md:h-44")
  ).join("");

  const rightHtml = Array.from({ length: 3 }, (_, i) =>
    rightArticles[i] ? articleSideCardTemplate(rightArticles[i]) : ""
  ).join("");

  const heroHtml = featured
    ? articleCardTemplate(featured, "h-72 md:h-[26rem]", "text-xl md:text-2xl")
    : emptyCardSkeleton("h-72 md:h-[26rem]");

  const categoryRowsHtml = CATEGORIES.map((category) => categoryRowTemplate(category, 4)).join("");

  return `
    <section class="max-w-6xl mx-auto px-6 py-10">
      <h1 class="font-serif font-bold text-3xl md:text-4xl text-neutral-900 mb-8 text-center">
        Today&rsquo;s Verified Stories from the Philippines
      </h1>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="md:col-span-1 grid grid-cols-1 gap-6">
          ${leftHtml}
        </div>
        <div class="md:col-span-2">
          ${heroHtml}
        </div>
        <div class="md:col-span-1 flex flex-col gap-5">
          ${rightHtml}
        </div>
      </div>
    </section>
    ${categoryRowsHtml}
    ${claimStatsTemplate()}
    <div id="claim-bar-spacer" class="h-28"></div>
  `;
}

/* --------------------------------------------------------------------------
   6b. STAT CARDS (Claims Reported / Claims Verified) — homepage only
   Placeholder counts only, until the real backend tracks submitted vs.
   verified claim totals.
   -------------------------------------------------------------------------- */
function statCardTemplate({ borderClass, iconBgClass, iconPath, count, label }) {
  return `
    <div class="flex-1 max-w-xs mx-auto rounded-2xl border-2 ${borderClass} bg-white px-8 py-8 text-center">
      <span class="inline-flex items-center justify-center w-12 h-12 rounded-full ${iconBgClass} text-white mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="w-6 h-6">
          ${iconPath}
        </svg>
      </span>
      <p class="font-serif font-bold text-3xl md:text-4xl text-neutral-900">${count}</p>
      <p class="font-serif font-bold text-lg text-neutral-900 mt-2">${label}</p>
      <p class="font-sans text-xs text-neutral-500 mt-1">Since August 2026</p>
    </div>
  `;
}

function claimStatsTemplate() {
  const reportedCard = statCardTemplate({
    borderClass: "border-red-700",
    iconBgClass: "bg-red-600",
    iconPath: `<path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>`,
    count: 67,
    label: "Claims Reported",
  });

  const verifiedCard = statCardTemplate({
    borderClass: "border-emerald-800",
    iconBgClass: "bg-emerald-600",
    iconPath: `<path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>`,
    count: 67,
    label: "Claims Verified",
  });

  return `
    <section class="max-w-6xl mx-auto px-6 py-10">
      <hr class="border-t-2 border-neutral-800 mb-10" />
      <div class="flex flex-col sm:flex-row gap-6 justify-center">
        ${reportedCard}
        ${verifiedCard}
      </div>
    </section>
  `;
}

/* --------------------------------------------------------------------------
   7. CATEGORY PAGE VIEW
   The first 2 verified articles render as large cards, and EVERY remaining
   verified article in the category renders in the 4-across grid below —
   this list is never capped, so it automatically expands as new articles
   are added to NEWS_DATA. "Back ->" returns to the homepage.
   -------------------------------------------------------------------------- */
function renderCategoryView(category) {
  const articles = getVerifiedArticles(category);
  const large = articles.slice(0, 2);
  const rest = articles.slice(2);

  const minLargeSlots = 2;
  const largeHtml = Array.from({ length: Math.max(large.length, minLargeSlots) }, (_, i) =>
    large[i]
      ? articleCardTemplate(large[i], "h-64 md:h-80", "text-lg md:text-xl")
      : emptyCardSkeleton("h-64 md:h-80")
  ).join("");

  const minRestSlots = 4;
  const restHtml = Array.from({ length: Math.max(rest.length, minRestSlots) }, (_, i) =>
    rest[i]
      ? articleCardTemplate(rest[i], "h-40 md:h-44", "text-sm md:text-base")
      : emptyCardSkeleton("h-40 md:h-44")
  ).join("");

  const emptyNotice = articles.length
    ? ""
    : `<p class="col-span-full text-center text-neutral-500 mt-6">No verified stories available in this category yet.</p>`;

  return `
    <section class="max-w-6xl mx-auto px-6 py-10">
      <div class="flex items-baseline justify-between border-b-2 border-neutral-800 pb-2 mb-8">
        <h1 class="font-serif font-bold text-2xl md:text-3xl text-neutral-900">
          Today&rsquo;s Verified Stories from the Philippines &mdash; ${category}
        </h1>
        <button
          type="button"
          data-nav="home"
          class="cursor-pointer font-sans text-xs md:text-sm text-neutral-600 hover:text-emerald-800 transition-colors whitespace-nowrap"
        >
          Back -&gt;
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        ${largeHtml}
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
        ${restHtml}
      </div>
      ${emptyNotice}
    </section>
    <div id="claim-bar-spacer" class="h-28"></div>
  `;
}

/* --------------------------------------------------------------------------
   8. CLAIM CHECKER VIEW + RESULT STATES
   Placeholder-only: the real fact-check backend is not connected yet, so
   submitting a claim below cycles through the three possible presentational
   outcomes (VERIFIED / CONTRADICTED / INSUFFICIENT) using mock content.
   -------------------------------------------------------------------------- */
const CLAIM_RESULT_STATES = {
  VERIFIED: {
    badgeClass: "bg-emerald-700 border-emerald-800",
    label: "TRUE / CORRECT — THIS INFORMATION IS VERIFIED",
    icon: `<path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  CONTRADICTED: {
    badgeClass: "bg-red-700 border-red-800",
    label: "FALSE / CONTRADICTED — THIS INFORMATION IS INACCURATE",
    icon: `<path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  INSUFFICIENT: {
    badgeClass: "bg-neutral-500 border-neutral-600",
    label: "INSUFFICIENT EVIDENCE — UNABLE TO VERIFY THIS CLAIM",
    icon: `<path d="M12 9v4m0 4h.01M12 3l9 16H3l9-16Z" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
};

function claimResultTemplate(status) {
  const state = CLAIM_RESULT_STATES[status] ?? CLAIM_RESULT_STATES.INSUFFICIENT;
  return `
    <div class="mt-10 flex flex-col items-center">
      <div class="inline-flex items-center gap-3 rounded-full ${state.badgeClass} border-2 text-white font-sans font-bold text-sm md:text-base px-6 py-3 shadow-[0_6px_16px_rgba(0,0,0,0.18)]">
        <span class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-4 h-4">
            ${state.icon}
          </svg>
        </span>
        ${state.label}
      </div>
      <div class="mt-8 max-w-2xl bg-white rounded-2xl shadow-[0_6px_18px_rgba(0,0,0,0.12)] p-6">
        <p class="font-sans text-neutral-700 leading-relaxed">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
        </p>
      </div>
    </div>
  `;
}

function renderClaimCheckerView() {
  return `
    <section class="min-h-[80vh] flex flex-col items-center justify-center max-w-4xl mx-auto px-6 py-20 md:py-32 text-center">
      <h1 class="font-serif font-bold text-4xl md:text-6xl text-emerald-950 leading-tight mb-14">
        What should we verify today?
      </h1>
      <form id="claim-checker-form" class="flex items-center gap-3 bg-white rounded-3xl border-2 border-transparent shadow-sm px-6 py-4 max-w-2xl w-full mx-auto claim-input-wrap transition-all duration-200">
        <textarea
          id="claim-checker-input"
          rows="1"
          placeholder="Paste a claim, headline, or link to fact-check…"
          class="flex-1 bg-transparent outline-none font-sans text-neutral-700 placeholder:text-neutral-400 resize-none max-h-60 overflow-y-auto leading-relaxed self-center"
        ></textarea>
        <button
          type="submit"
          aria-label="Submit claim"
          class="cursor-pointer shrink-0 w-9 h-9 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors self-center"
        >
          +
        </button>
      </form>
      <div id="claim-result-slot" class="w-full"></div>
    </section>
  `;
}

/* --------------------------------------------------------------------------
   9. FLOATING / STICKY CLAIM INPUT BAR (home + category pages only)
   Follows the viewport while scrolling, then locks in place once the user
   scrolls past a defined document position, matching the wireframe.
   -------------------------------------------------------------------------- */
function setupClaimBarBehavior() {
  const bar = document.getElementById("floating-claim-bar");
  if (!bar) return;

  if (state.view === "claim-checker") {
    bar.classList.add("hidden");
    return;
  }
  bar.classList.remove("hidden");

  // Clear any previous verdict so it doesn't linger after navigating away,
  // and restore normal floating behavior (undoing the "drop into flow"
  // state applied by handleClaimSubmit when a verdict was shown).
  const resultSlot = document.getElementById("floating-claim-result-slot");
  if (resultSlot) resultSlot.innerHTML = "";
  const input = document.getElementById("floating-claim-input");
  if (input) input.value = "";
  bar.classList.remove("claim-bar-result");

  const lockThreshold = () => document.documentElement.scrollHeight - window.innerHeight - 160;

  const updatePosition = () => {
    // While a verdict is showing, the bar stays in normal document flow —
    // don't fight that with scroll-driven fixed/locked toggling.
    if (bar.classList.contains("claim-bar-result")) return;
    const shouldLock = window.scrollY >= lockThreshold();
    bar.classList.toggle("claim-bar-locked", shouldLock);
    bar.classList.toggle("claim-bar-fixed", !shouldLock);
  };

  updatePosition();
  window.addEventListener("scroll", updatePosition, { passive: true });
  window.addEventListener("resize", updatePosition);
}

/* --------------------------------------------------------------------------
   10. FOOTER — only revealed once the user scrolls to the very bottom
   -------------------------------------------------------------------------- */
function renderFooter() {
  let footer = document.getElementById("site-footer");
  if (footer) return;

  footer = document.createElement("footer");
  footer.id = "site-footer";
  footer.className = "footer-hidden bg-emerald-950 text-white";
  footer.innerHTML = `
    <div class="max-w-6xl mx-auto px-6 py-10">
      <h2 class="font-serif font-bold text-lg mb-2">Our Verified News Sources</h2>
      <p class="font-sans text-sm text-white/70 max-w-2xl">
        VerifyPH aggregates and fact-checks stories from trusted Philippine news providers.
        We never host original reporting — every card links back to its original publisher.
      </p>
      <p class="font-sans text-xs text-white/50 mt-6">&copy; ${new Date().getFullYear()} VerifyPH. All rights reserved.</p>
    </div>
  `;
  document.body.appendChild(footer);
}

function setupFooterReveal() {
  const footer = document.getElementById("site-footer");
  if (!footer) return;

  const checkBottom = () => {
    const atBottom =
      window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    footer.classList.toggle("footer-hidden", !atBottom);
    footer.classList.toggle("footer-visible", atBottom);
  };

  checkBottom();
  window.addEventListener("scroll", checkBottom, { passive: true });
  window.addEventListener("resize", checkBottom);
}

/* --------------------------------------------------------------------------
   11. HAMBURGER DROPDOWN (small popup below the hamburger icon)
   -------------------------------------------------------------------------- */
function openDropdown() {
  const dropdown = document.getElementById("nav-dropdown");
  if (!dropdown) return;
  dropdown.classList.remove("hidden");
  requestAnimationFrame(() => {
    dropdown.classList.add("dropdown-open");
  });
}

function closeDropdown() {
  const dropdown = document.getElementById("nav-dropdown");
  if (!dropdown) return;
  dropdown.classList.remove("dropdown-open");
  window.setTimeout(() => {
    dropdown.classList.add("hidden");
  }, 400);
}

function isDropdownOpen() {
  const dropdown = document.getElementById("nav-dropdown");
  return !!dropdown && dropdown.classList.contains("dropdown-open");
}

/* --------------------------------------------------------------------------
   12. EVENT WIRING
   -------------------------------------------------------------------------- */

/**
 * Shared claim-submission handler used by BOTH the claim-checker page's own
 * form and the floating bar's form on every other page, so they behave
 * identically. Placeholder only: real submission is wired once the backend
 * exists — for now it randomly cycles through the three mock result states.
 *
 * @param {HTMLElement|null} inputEl
 * @param {HTMLElement|null} resultSlotEl
 * @param {HTMLElement|null} barEl - Only passed for the floating bar. When a
 *   result is shown, the bar drops out of fixed/locked positioning into
 *   normal document flow so the verdict behaves exactly like the inline one
 *   on the Claim Checker page (pushes the page instead of overlapping it).
 */
function handleClaimSubmit(inputEl, resultSlotEl, barEl) {
  if (resultSlotEl) {
    const states = ["VERIFIED", "CONTRADICTED", "INSUFFICIENT"];
    const next = states[Math.floor(Math.random() * states.length)];
    resultSlotEl.innerHTML = claimResultTemplate(next);
  }
  if (inputEl) {
    inputEl.value = "";
    if ("style" in inputEl) inputEl.style.height = "auto";
  }
  if (barEl) {
    barEl.classList.add("claim-bar-result");
    barEl.classList.remove("claim-bar-fixed", "claim-bar-locked");
  }
}

function attachViewEventListeners() {
  document.querySelectorAll("#claim-checker-input, #floating-claim-input").forEach((claimInput) => {
    const autoResize = () => {
      claimInput.style.height = "auto";
      claimInput.style.height = `${claimInput.scrollHeight}px`;
    };
    claimInput.addEventListener("input", autoResize);
    // On the very first render (homepage, since it's the default view), the
    // static #floating-claim-input textarea has just been parsed and hasn't
    // completed its initial layout pass yet, so scrollHeight reads back 0
    // and the textarea collapses to 0px height — making it unclickable and
    // untypeable. Deferring to the next animation frame (after layout has
    // flushed) fixes this without affecting later navigations, where the
    // element has already been laid out at least once.
    requestAnimationFrame(autoResize);
  });
}

function attachGlobalEventListeners() {
  // Event delegation: #app's innerHTML is fully replaced on every render(),
  // so any [data-nav] buttons inside it (View More Here ->, Back ->, category
  // tabs, etc.) would lose their listeners if bound directly. Binding once on
  // document and matching at click-time means every current AND future
  // [data-nav] element works, regardless of when it was inserted into the DOM.
  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-nav]");
    if (!target) return;
    const view = target.getAttribute("data-nav");
    const category = target.getAttribute("data-category");
    if (view === "category") {
      navigateTo("category", { category });
    } else {
      navigateTo(view);
    }
  });

  // Same reasoning applies to the claim-checker forms: the on-page one is
  // re-created inside #app on every render, and the floating one is static
  // but must behave identically. Delegating the submit handler on document
  // means both work regardless of when/how often they're re-rendered.
  document.addEventListener("submit", (e) => {
    if (e.target.id === "claim-checker-form") {
      e.preventDefault();
      handleClaimSubmit(
        document.getElementById("claim-checker-input"),
        document.getElementById("claim-result-slot")
      );
    } else if (e.target.id === "floating-claim-form") {
      e.preventDefault();
      handleClaimSubmit(
        document.getElementById("floating-claim-input"),
        document.getElementById("floating-claim-result-slot"),
        document.getElementById("floating-claim-bar")
      );
    }
  });

  const hamburgerBtn = document.getElementById("hamburger-btn");
  if (hamburgerBtn) {
    hamburgerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isDropdownOpen()) {
        closeDropdown();
      } else {
        openDropdown();
      }
    });
  }

  // Close the dropdown when clicking anywhere outside of it.
  document.addEventListener("click", (e) => {
    const dropdown = document.getElementById("nav-dropdown");
    const hamburgerBtn = document.getElementById("hamburger-btn");
    if (!dropdown || dropdown.classList.contains("hidden")) return;
    if (dropdown.contains(e.target) || (hamburgerBtn && hamburgerBtn.contains(e.target))) return;
    closeDropdown();
  });
}

/* --------------------------------------------------------------------------
   13. INIT
   -------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  attachGlobalEventListeners();
  render();
});
