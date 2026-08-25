-- VerifyPH seed data
-- Sample articles for local testing of the Claim Checker pipeline.
-- Run this AFTER the schema migration, in the Supabase SQL editor
-- or via `supabase db execute --file supabase/seed.sql`.
--
-- These are illustrative/sample entries meant to exercise the pipeline
-- (search -> compare -> verdict). Replace with real ingested articles
-- once the RSS cron job is running.

insert into public.articles
  (title, summary, source_url, source_name, published_at, category, image_url)
values
  (
    'DOH confirms first mpox case of the year in Metro Manila',
    'The Department of Health confirmed a single laboratory-verified mpox (monkeypox) case in a Metro Manila hospital. Officials say the patient is in stable condition and undergoing contact tracing.',
    'https://www.doh.gov.ph/press-release/doh-confirms-mpox-case-2026',
    'Department of Health',
    '2026-01-15T09:00:00+08:00',
    'Health & Safety',
    null
  ),
  (
    'PSA: Philippine inflation eases to 3.1% in December',
    'The Philippine Statistics Authority reported headline inflation slowed to 3.1% year-on-year in December, down from 3.6% in November, driven by lower food and transport prices.',
    'https://psa.gov.ph/statistics/inflation/december-2025',
    'Philippine Statistics Authority',
    '2026-01-08T10:30:00+08:00',
    'Economy',
    null
  ),
  (
    'Comelec sets national and local elections for May 2028',
    'The Commission on Elections formally released the calendar for the next national and local elections, confirming the polling date and key filing deadlines for candidates.',
    'https://comelec.gov.ph/news/2028-election-calendar',
    'COMELEC',
    '2026-02-01T08:00:00+08:00',
    'News & Politics',
    null
  ),
  (
    'Senate approves bill expanding free tuition to technical-vocational courses',
    'The Senate passed on third reading a bill extending free tuition coverage under the Universal Access to Quality Tertiary Education Act to include TESDA-accredited technical-vocational programs.',
    'https://www.senate.gov.ph/press_release/2026/0212_prib1.asp',
    'Senate of the Philippines',
    '2026-02-12T14:00:00+08:00',
    'News & Politics',
    null
  ),
  (
    'PAGASA: La Niña conditions expected to persist until March',
    'PAGASA''s latest climate outlook indicates weak La Niña conditions will likely continue through the first quarter, raising the chance of above-normal rainfall in parts of Luzon and Visayas.',
    'https://www.pagasa.dost.gov.ph/climate/la-nina-outlook-2026',
    'PAGASA',
    '2026-01-20T07:00:00+08:00',
    'Health & Safety',
    null
  ),
  (
    'BSP keeps key policy rate steady at 6.0%',
    'The Bangko Sentral ng Pilipinas Monetary Board decided to keep the overnight reverse repurchase rate unchanged at 6.0%, citing balanced inflation risks and steady economic growth.',
    'https://www.bsp.gov.ph/SitePages/MediaAndResearch/media_disp.aspx?TabId=1&Id=6812',
    'Bangko Sentral ng Pilipinas',
    '2026-02-13T16:00:00+08:00',
    'Economy',
    null
  ),
  (
    'DSWD releases updated poverty threshold for 2025',
    'The Department of Social Welfare and Development, citing PSA data, released the updated monthly poverty threshold for a family of five, showing a modest increase from the prior year.',
    'https://www.dswd.gov.ph/press-releases/2025-poverty-threshold',
    'DSWD',
    '2025-12-18T11:00:00+08:00',
    'Economy',
    null
  ),
  (
    'MMDA implements revised number coding scheme starting March',
    'The Metropolitan Manila Development Authority announced a revised unified vehicular volume reduction program (number coding) window, effective the first week of March.',
    'https://mmda.gov.ph/2026/news/number-coding-revision',
    'MMDA',
    '2026-02-20T09:00:00+08:00',
    'News & Politics',
    null
  ),
  (
    'No truth to viral claim of new PhilHealth deduction on all hospital bills',
    'PhilHealth issued an advisory clarifying that a viral social media post claiming a new mandatory 5% deduction on all hospital bills is false. No such circular has been issued by the agency.',
    'https://www.philhealth.gov.ph/news/2026/advisory_viral_claim.html',
    'PhilHealth',
    '2026-02-05T13:00:00+08:00',
    'Health & Safety',
    null
  ),
  (
    'DOST-PAGASA: No official warning of a magnitude 9 "Big One" date',
    'PHIVOLCS reiterated that science cannot currently predict the exact date, time, or magnitude of a future earthquake, addressing circulating posts claiming an exact forecast for the West Valley Fault movement.',
    'https://www.phivolcs.dost.gov.ph/index.php/news/advisory-big-one-2026',
    'PHIVOLCS',
    '2026-01-30T10:00:00+08:00',
    'Health & Safety',
    null
  ),
  (
    'DA reports stable rice supply amid harvest season',
    'The Department of Agriculture said national rice inventory remains sufficient for the coming months, coinciding with the ongoing dry season harvest in Central Luzon.',
    'https://www.da.gov.ph/press-releases/rice-supply-outlook-feb-2026',
    'Department of Agriculture',
    '2026-02-10T09:30:00+08:00',
    'Economy',
    null
  ),
  (
    'LTO extends validity of expired driver''s licenses anew',
    'The Land Transportation Office issued a memorandum circular extending the validity of driver''s licenses that expired in the past year, allowing holders additional time to renew.',
    'https://lto.gov.ph/memo-circulars/2026/license-extension.html',
    'Land Transportation Office',
    '2026-01-25T15:00:00+08:00',
    'General',
    null
  ),
  (
    'CHED reminds public: no new mandatory board exam for all college graduates',
    'The Commission on Higher Education clarified that a circulating claim about a universal mandatory licensure exam for all bachelor''s degree holders is inaccurate; current board exam requirements remain program-specific.',
    'https://ched.gov.ph/advisories/2026/board-exam-clarification',
    'CHED',
    '2026-02-18T12:00:00+08:00',
    'News & Politics',
    null
  ),
  (
    'DOH: measles cases rise in Region VII, urges catch-up vaccination',
    'The Department of Health reported an increase in measles cases in Central Visayas and urged parents to bring children for catch-up vaccination amid gaps in routine immunization coverage.',
    'https://www.doh.gov.ph/press-release/measles-region7-2026',
    'Department of Health',
    '2026-02-08T09:00:00+08:00',
    'Health & Safety',
    null
  ),
  (
    'DOF: National government debt-to-GDP ratio improves slightly',
    'The Department of Finance reported the national government''s debt-to-GDP ratio declined marginally quarter-on-quarter, attributing this to nominal GDP growth outpacing new borrowing.',
    'https://www.dof.gov.ph/national-government-debt-q4-2025',
    'Department of Finance',
    '2026-01-29T10:00:00+08:00',
    'Economy',
    null
  )
on conflict (source_url) do nothing;
