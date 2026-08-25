Database context for the Claim Checker:

**Table to search:** `public.articles`

**Available fields:**

id  
title  
summary  
source\_url  
source\_name  
published\_at  
category  
image\_url  
created\_at

**Allowed categories:**

News & Politics  
Economy  
Health & Safety  
Lifestyle  
General

**Your route:** `POST /api/claims/check`

Flow:

Receive user claim  
→ search \`articles\` using title \+ summary  
→ get the most relevant articles  
→ send only those articles to Gemini as evidence  
→ Gemini returns a fixed verdict \+ article IDs used  
→ return verdict and real source URLs to the frontend

**Fixed verdicts only:**

Officially Confirmed  
Corroborated  
Developing  
Insufficient Evidence  
Contradicted

Important: Gemini must only use the articles retrieved from Supabase. If no relevant article is found, return `Insufficient Evidence`.

For local server testing, I will privately send you the Supabase URL and service-role key to place in your own `.env.local`. Do not commit or expose those values in frontend code/GitHub.

