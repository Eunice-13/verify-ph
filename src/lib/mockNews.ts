// Mock news data layer.
//
// Every real news item MUST carry status: "VERIFIED". Items with any other
// status (e.g. "PENDING") exist here only to prove the filter excludes them —
// they are never rendered in the news UI. Non-verified claim results belong
// to the future Claim Checker backend integration, not this news feed.
//
// NOTE ON PLACEHOLDERS: sourceUrl / providerName / featured are placeholder
// values only. Once the real backend/scraper is connected, these fields
// should be populated with the actual article URL, the actual publisher
// name, and an editorially-flagged "most relevant today" boolean.

import { Article, Category } from "@/types";

/** Deterministic placeholder photo per article id (picsum.photos seeded service). */
export function placeholderImage(id: number, width = 800, height = 600): string {
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

export function placeholderProviderName(id: number): string {
  return PLACEHOLDER_PROVIDERS[id % PLACEHOLDER_PROVIDERS.length];
}

/** Deterministic placeholder outbound source link per article id, until real source data exists. */
export function placeholderSourceUrl(id: number): string {
  return `https://example-news-provider.ph/article/${id}`;
}

export const NEWS_DATA: Article[] = [
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
    excerpt: "A viral post alleging a secret recount is still being reviewed by fact-checkers.",
    body: "This claim is still under review and is not published in the verified feed.",
    date: "August 22, 2026",
    status: "PENDING",
  },
  {
    id: 16,
    category: "NEWS & POLITICS",
    title: "Congress Opens Public Hearing on Coastal Land Reclamation Projects",
    excerpt: "Environmental groups and local officials testified on the impact of ongoing reclamation.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 21, 2026",
    status: "VERIFIED",
  },
  {
    id: 17,
    category: "NEWS & POLITICS",
    title: "Barangay Elections Set for Early Next Year, Comelec Confirms",
    excerpt: "The poll body released the tentative calendar for the upcoming barangay elections.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 20, 2026",
    status: "VERIFIED",
  },
  {
    id: 18,
    category: "NEWS & POLITICS",
    title: "New Anti-Corruption Task Force Convenes First Session",
    excerpt: "The task force will review flagged government contracts from the past two years.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 19, 2026",
    status: "VERIFIED",
  },
  {
    id: 19,
    category: "NEWS & POLITICS",
    title: "Regional Governors Meet to Discuss Disaster Response Coordination",
    excerpt: "The summit focused on streamlining inter-agency response during typhoon season.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 18, 2026",
    status: "VERIFIED",
  },
  {
    id: 20,
    category: "NEWS & POLITICS",
    title: "Youth Council Pushes for Lower Voting Age in Local Polls",
    excerpt: "Advocates presented a proposal to allow 16-year-olds to vote in barangay elections.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 17, 2026",
    status: "VERIFIED",
  },
  {
    id: 21,
    category: "NEWS & POLITICS",
    title: "Metro Manila Traffic Enforcers Get Body Cameras Nationwide",
    excerpt: "The rollout aims to improve transparency in traffic violation apprehensions.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
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
    excerpt: "The slowdown was driven mainly by cheaper rice and vegetable prices across major trading centers.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 22, 2026",
    status: "VERIFIED",
  },
  {
    id: 6,
    category: "ECONOMY",
    title: "Small Business Loan Program Expands to Five New Provinces",
    excerpt: "The expanded program targets micro-entrepreneurs with zero-interest starter loans.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 21, 2026",
    status: "VERIFIED",
  },
  {
    id: 22,
    category: "ECONOMY",
    title: "Manufacturing Sector Posts Fastest Growth in Three Years",
    excerpt: "Factory output rose on stronger domestic demand and lower input costs.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 20, 2026",
    status: "VERIFIED",
  },
  {
    id: 23,
    category: "ECONOMY",
    title: "Government Bonds Oversubscribed in Latest Treasury Auction",
    excerpt: "Investor demand exceeded the offering by nearly triple the target amount.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 19, 2026",
    status: "VERIFIED",
  },
  {
    id: 24,
    category: "ECONOMY",
    title: "Tourism Revenue Nears Pre-Pandemic Levels This Quarter",
    excerpt: "Arrivals from key markets rebounded, boosting hotel and travel bookings.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 18, 2026",
    status: "VERIFIED",
  },
  {
    id: 25,
    category: "ECONOMY",
    title: "Agriculture Department Rolls Out Subsidized Fertilizer Program",
    excerpt: "The program targets rice and corn farmers ahead of the next planting season.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 17, 2026",
    status: "VERIFIED",
  },
  {
    id: 26,
    category: "ECONOMY",
    title: "Freight Ports Report Record Container Volume for the Year",
    excerpt: "Efficiency upgrades helped ports handle the increased shipping demand.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 16, 2026",
    status: "VERIFIED",
  },
  {
    id: 7,
    category: "HEALTH & SAFETY",
    title: "DOH Rolls Out Free Booster Shots in Regional Health Centers",
    excerpt: "The Department of Health expanded free booster access ahead of the rainy season surge.",
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
    excerpt: "PAGASA advises coastal residents to prepare as the depression is expected to intensify.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 23, 2026",
    status: "VERIFIED",
  },
  {
    id: 9,
    category: "HEALTH & SAFETY",
    title: "Miracle Cure Claim for Common Colds Debunked by Doctors",
    excerpt: "A viral home-remedy post is currently flagged and awaiting formal medical review.",
    body: "This claim is still under review and is not published in the verified feed.",
    date: "August 20, 2026",
    status: "PENDING",
  },
  {
    id: 27,
    category: "HEALTH & SAFETY",
    title: "New Regional Trauma Center Opens to the Public",
    excerpt: "The facility adds emergency capacity for the surrounding provinces.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 19, 2026",
    status: "VERIFIED",
  },
  {
    id: 28,
    category: "HEALTH & SAFETY",
    title: "Fire Department Launches Barangay-Level Safety Drills",
    excerpt: "The initiative aims to improve evacuation readiness ahead of the dry season.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 18, 2026",
    status: "VERIFIED",
  },
  {
    id: 29,
    category: "HEALTH & SAFETY",
    title: "Mental Health Hotline Expands Operating Hours Nationwide",
    excerpt: "The free hotline is now available around the clock in all major regions.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 17, 2026",
    status: "VERIFIED",
  },
  {
    id: 30,
    category: "HEALTH & SAFETY",
    title: "Road Safety Campaign Cuts Highway Accidents by 15 Percent",
    excerpt: "Stricter enforcement and new signage contributed to the improved figures.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 16, 2026",
    status: "VERIFIED",
  },
  {
    id: 31,
    category: "HEALTH & SAFETY",
    title: "Water Safety Advisory Issued for Popular Beach Destinations",
    excerpt: "Lifeguard patrols were increased following recent strong current reports.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 15, 2026",
    status: "VERIFIED",
  },
  {
    id: 32,
    category: "HEALTH & SAFETY",
    title: "Free Dental Mission Reaches Remote Mountain Communities",
    excerpt: "Volunteer dentists provided checkups and treatment for underserved residents.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 14, 2026",
    status: "VERIFIED",
  },
  {
    id: 10,
    category: "LIFESTYLE",
    title: "Local Coffee Farmers Gain Global Recognition at Trade Expo",
    excerpt: "Philippine-grown beans took top honors at this year's international coffee trade expo.",
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
    excerpt: "Dozens of local vendors are set to join the revived weekend night market.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 21, 2026",
    status: "VERIFIED",
  },
  {
    id: 12,
    category: "LIFESTYLE",
    title: "Independent Filmmakers Showcase Work at Regional Festival",
    excerpt: "This year's lineup features a record number of first-time directors from Mindanao.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 20, 2026",
    status: "VERIFIED",
  },
  {
    id: 33,
    category: "LIFESTYLE",
    title: "Heritage Homes in Old Town District Get Restoration Grants",
    excerpt: "The grants aim to preserve century-old houses threatened by urban development.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 19, 2026",
    status: "VERIFIED",
  },
  {
    id: 34,
    category: "LIFESTYLE",
    title: "Local Fashion Designers Feature Upcycled Textiles at Trade Show",
    excerpt: "The collection highlights sustainable practices using reclaimed fabric scraps.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 18, 2026",
    status: "VERIFIED",
  },
  {
    id: 35,
    category: "LIFESTYLE",
    title: "Community Garden Project Turns Vacant Lots Into Green Spaces",
    excerpt: "Residents transformed three idle lots into shared vegetable gardens.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 17, 2026",
    status: "VERIFIED",
  },
  {
    id: 36,
    category: "LIFESTYLE",
    title: "Popular Street Food Row Gets Official Tourism Recognition",
    excerpt: "The strip was named a must-visit food destination in the latest travel guide.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 16, 2026",
    status: "VERIFIED",
  },
  {
    id: 37,
    category: "LIFESTYLE",
    title: "Local Board Game Cafe Chain Expands to Three More Cities",
    excerpt: "The growing hobby scene continues to draw new cafes and community meetups.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 15, 2026",
    status: "VERIFIED",
  },
  {
    id: 13,
    category: "GENERAL",
    title: "Community Pantry Network Marks Third Year of Operation",
    excerpt: "Volunteer-run pantries continue expanding, now serving over 40 barangays nationwide.",
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
    excerpt: "The initiative aims to bring e-book access to schools without physical library branches.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 22, 2026",
    status: "VERIFIED",
  },
  {
    id: 15,
    category: "GENERAL",
    title: "Volunteer Group Completes Coastal Cleanup Milestone",
    excerpt: "Over 5,000 volunteers have joined the cleanup drive since it started this year.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 21, 2026",
    status: "VERIFIED",
  },
  {
    id: 38,
    category: "GENERAL",
    title: "Provincial Job Fair Draws Record Number of Applicants",
    excerpt: "Over 3,000 jobseekers attended the two-day fair hosted by the local government.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 20, 2026",
    status: "VERIFIED",
  },
  {
    id: 39,
    category: "GENERAL",
    title: "Stray Animal Shelter Reaches Full Capacity, Seeks Adopters",
    excerpt: "The shelter is calling for the public's help as intake numbers continue to rise.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 19, 2026",
    status: "VERIFIED",
  },
  {
    id: 40,
    category: "GENERAL",
    title: "Public School Renovation Program Completes Phase One",
    excerpt: "Twenty schools received new classrooms and upgraded facilities this year.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 18, 2026",
    status: "VERIFIED",
  },
  {
    id: 41,
    category: "GENERAL",
    title: "Local Weather Station Upgrades Improve Storm Forecasting",
    excerpt: "New equipment allows for more accurate early warnings during typhoon season.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 17, 2026",
    status: "VERIFIED",
  },
  {
    id: 42,
    category: "GENERAL",
    title: "Public Transport App Adds Real-Time Jeepney Tracking",
    excerpt: "Commuters can now check estimated arrival times on major routes.",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "August 16, 2026",
    status: "VERIFIED",
  },
];

/**
 * Strictly returns only VERIFIED articles, optionally narrowed to a category.
 * This is the single source of truth every news view must read through —
 * no view is permitted to read NEWS_DATA directly.
 */
export function getVerifiedArticles(category?: Category | null): Article[] {
  return NEWS_DATA.filter((item) => {
    if (item.status !== "VERIFIED") return false;
    if (category && item.category !== category) return false;
    return true;
  });
}

/** The single most relevant verified story today (used for the homepage hero). */
export function getFeaturedArticle(): Article | null {
  const verified = getVerifiedArticles(null);
  return verified.find((item) => item.featured) ?? verified[0] ?? null;
}
