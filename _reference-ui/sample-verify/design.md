Project Overview
Build a frontend prototype for VerifyPH using vanilla HTML, JavaScript, and Tailwind CSS. The interface must act as a Single Page Application (SPA), using JavaScript to smoothly fade between different views without full page reloads.

Design System

Primary Color: Deep Forest Green (#064e3b / emerald-900) for the top navigation bar.

Background: Warm cream/off-white (#f4f1ea) for the main body.

Sub-navigation: Light beige (#e3dfd7) for the category tabs.

Typography: Elegant serif (like Playfair Display or Newsreader) for all headlines and category titles. Clean sans-serif for body text and navigation links.

Animations & Interactions

Hover Effects: When hovering over any news article card on the homepage or category pages, it must gently zoom up (hover:scale-[1.03]) and gain a drop shadow (hover:shadow-lg) with a smooth transition (transition-transform duration-300 ease-in-out).

Screen Transitions: Clicking navigation links must trigger a smooth CSS fade-out/fade-in effect between the current screen and the new screen.

Mock Data & Logic

Create a JavaScript array containing mock news objects.

Every object in this array MUST have a status: "VERIFIED" key.

The JavaScript logic must strictly filter and only render data that holds this "VERIFIED" status.

Layout & Navigation Requirements

Reference the images in the src/wireframes/ directory for exact layout positioning.

Header: Must contain the VerifyPH logo/text, current date, a "Claim Checker" button, and a hamburger menu icon.

Navigation Logic:

Clicking "VerifyPH" logo -> Renders the Homepage grid.

Clicking sub-nav categories (NEWS & POLITICS, ECONOMY, etc.) -> Renders respective category pages.

Clicking a news card -> Renders the Article Detail view.

Clicking "Claim Checker" -> Renders the search input screen.

Clicking the Hamburger menu -> Opens a modal/drawer outlining the 5 news categories and placeholder social media icons.