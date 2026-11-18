# Demo Video

https://github.com/user-attachments/assets/dbe7f935-b0db-4791-8db4-5b6a8971673f

# Run

https://hyang365.github.io/grok1/

# TripTable

**Yale travel, the way CourseTable treats classes.** See where Yalies go, plan with friends, and find the best way to get there from campus.

## Features

- **Map:** where Yalies travel each break, anonymized. Click a place for ratings, stays and reviews.
- **Catalog and filters:** sort and filter by affordability, safety, beauty, continent and type of trip.
- **Friends:** add by NetID to see their plans and overlapping dates. Everyone else is just a count.
- **Yale travel rules:** flags countries Yale won't sponsor (State Dept Level 4) and blocks flights there.
- **Flights:** plan the trip from Old Campus, then search and book on Google Flights. There's no in-app flight data.
  - Every airport (Tweed, Bradley, JFK, LGA, Newark, Logan) with the ride from campus, split Uber cost, and when to leave, plus a one-click Google Flights search for that route and your dates.
  - Trains and buses for nearby trips, with transit directions from Old Campus.
  - **Lock the group flight:** enter the flight numbers someone picked on Google Flights. They're saved on the trip with a copyable group-chat message, an exact-flight search link, flight status, and a "who's booked" checklist.
  - **Boycott Avelo** with one switch (hides Tweed, and reminds you to untick Avelo on Google Flights).
- **Itinerary:** your trips, flights and friends in one place.
- **Study Abroad:** every program in Yale's study abroad database: 134 semester and full-year programs, 94 non-Yale summer programs, plus Yale Summer Session Abroad and Yale in London, each with the grants you can apply for (Summer Experience Grant, Light, Gilman, Boren and more) and student reviews. The map has a **Travel / Study abroad** switch; in study abroad mode the top menu picks Fall semester, Spring semester or Summer and the map shows only programs offered then.
- **Transit:** live CTtransit buses near campus (arrival boards and a live map), plus Metro-North and Amtrak departures from New Haven. Next trains also show on the Flights page.
- **Profile** (top right): trip history with "log a past trip", a bucket list of places and programs (☆ on any place or program), your reviews, settings, data export, and report-a-bug / suggest-a-feature links that open a prefilled GitHub issue.
- **Real reviews:** places and programs are rated only by real student reviews. There are no seeded reviews. Posting requires an @yale.edu email.

## Database (Supabase)

The site is connected to the Supabase project `triptable` (`yzldywaosqijduvtqvnb`). Its URL and public anon key are built into `src/reviews/backend.ts`; they're meant to be public, and row-level security in `supabase/schema.sql` protects the data.

- **Live transit relay:** deployed as the `transit` edge function (`supabase/functions/transit`). Each deploy logs a check of every feed in the "Publish GitHub Pages" run.
- **Reviews:** tables and row-level security from `supabase/schema.sql` are applied. Anyone can read; only signed-in @yale.edu accounts can post, edit or delete their own reviews; reports go to `review_reports` for you to moderate in the dashboard.
- **Sign-in links:** in [Authentication → URL Configuration](https://supabase.com/dashboard/project/yzldywaosqijduvtqvnb/auth/url-configuration), set Site URL to `https://hyang365.github.io/grok1/` and add it under Redirect URLs, or sign-in links will point at localhost.
- Supabase's built-in email sender is limited to a few sign-in emails an hour. For real use, add your own SMTP under Authentication → Emails.

## Live transit

The site calls each transit provider directly first, then falls back to the `transit` relay. Bus stop names, routes and destinations come from the official CTtransit and Metro-North schedules, which the Pages workflow downloads on every deploy (`scripts/build-transit.mjs`). Amtrak data comes from the community [Amtraker](https://amtraker.com) API.

Reported reviews land in the `review_reports` table for you to moderate in the Supabase dashboard.

## Still sample data

- Yalie counts, cohorts and history on the map and catalog (labeled "sample counts").
- The friends directory and their trips (the NetIDs in Friends are fictional).
- Ground-transport times and costs in `src/flights/engine.ts` are rough planning estimates.
- Trip history, bucket list and settings are saved on your device until accounts are shared.
- The group flight and booked checklist are saved on your device. Friends see them via the copied message until accounts are shared.
- Stays: hotel names and rough prices, with no ratings.

# Grok Proof

<img width="2298" height="1862" alt="Screenshot 2026-11-17 at 6 12 31 PM" src="https://github.com/user-attachments/assets/4e63dda2-74c5-42bc-bff3-20586f07d9cc" />
