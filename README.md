# Demo Video

https://github.com/user-attachments/assets/dbe7f935-b0db-4791-8db4-5b6a8971673f

# Run

https://hyang365.github.io/grok1/

# TripTable

**Yale travel, the way CourseTable treats classes.** See where Yalies go, plan with friends, and find the best way to get there from campus.

## Features

- **Map:** where Yalies travel each break, counted live from students' saved trips (names never shown). Click a place for ratings, stays and reviews.
- **Catalog and filters:** sort and filter by affordability, safety, beauty, continent and type of trip.
- **Friends:** add a friend by Yale email or NetID; they accept, and you see each other's saved trips. Everyone else is just a count.
- **Yale travel rules:** flags countries Yale won't sponsor (State Dept Level 4) and blocks flights there.
- **Flights** (Itinerary → Flights): plan the trip from Old Campus, then search and book on Google Flights. There's no in-app flight data.
  - Every airport (Tweed, Bradley, JFK, LGA, Newark, Logan) with the ride from campus, split Uber cost, and when to leave, plus a one-click Google Flights search for that route and your dates.
  - Trains and buses for nearby trips, with transit directions from Old Campus.
  - **Lock the group flight:** enter the flight numbers someone picked on Google Flights. They're saved on the trip with a copyable group-chat message, an exact-flight search link, flight status, and a "who's booked" checklist.
  - **Boycott Avelo** with one switch (hides Tweed, and reminds you to untick Avelo on Google Flights).
- **Itinerary:** three tabs. Trips (upcoming plans), Flights, and Buses & trains. The top bar is just Map, Catalog, Study Abroad, Friends and Itinerary; dark mode and settings live in the profile menu.
- **Study Abroad:** every program in Yale's study abroad database: 134 semester and full-year programs, 94 non-Yale summer programs, plus Yale Summer Session Abroad and Yale in London, each with the grants you can apply for (Summer Experience Grant, Light, Gilman, Boren and more) and student reviews. The map has a **Travel / Study abroad** switch; in study abroad mode the top menu picks Fall semester, Spring semester or Summer and the map shows only programs offered then.
- **Buses & trains** (Itinerary → Buses & trains): live CTtransit buses near campus (arrival boards and a live map), plus Metro-North and Amtrak departures from New Haven. Next trains also show on the Flights page.
- **Profile** (top right): trip history with "log a past trip", a bucket list of places and programs (☆ on any place or program), your reviews, settings, data export, and report-a-bug / suggest-a-feature links that open a prefilled GitHub issue.
- **Real reviews:** places and programs are rated only by real student reviews. There are no seeded reviews. Posting requires an @yale.edu email.

## Database (Supabase)

The site is connected to the Supabase project `triptable` (`yzldywaosqijduvtqvnb`). Its URL and public anon key are built into `src/reviews/backend.ts`; they're meant to be public, and row-level security in `supabase/schema.sql` protects the data.

- **Live transit relay:** deployed as the `transit` edge function (`supabase/functions/transit`). Each deploy logs a check of every feed in the "Publish GitHub Pages" run.
- **Reviews:** tables and row-level security from `supabase/schema.sql` are applied. Anyone can read; only signed-in @yale.edu accounts can post, edit or delete their own reviews; reports go to `review_reports` for you to moderate in the dashboard.
- **Sign-in links:** Site URL is `https://hyang365.github.io/grok1/` and `https://hyang365.github.io/grok1/**` is an allowed redirect ([URL Configuration](https://supabase.com/dashboard/project/yzldywaosqijduvtqvnb/auth/url-configuration)). If the site moves to a new domain, add it there.
- Supabase's built-in email sender is limited to a few sign-in emails an hour. For real use, add your own SMTP under Authentication → Emails.

## Live transit

The site calls each transit provider directly first, then falls back to the `transit` relay. Bus stop names, routes and destinations come from the official CTtransit and Metro-North schedules, which the Pages workflow downloads on every deploy (`scripts/build-transit.mjs`). Amtrak data comes from the community [Amtraker](https://amtraker.com) API.

Reported reviews land in the `review_reports` table for you to moderate in the Supabase dashboard.

## Live plan counts

Every count on the map, catalog and place panels ("12 planning", overlap with your dates, history by year) comes from trips Yale students save while signed in. Trips sync to the `trips` table, which only its owner can read; the public sees only anonymous totals through `plan_counts()` and `overlap_count()`. Nothing is seeded.

## Accounts and friends

New visitors are guests: no trips, no friends, nothing shared, everything kept in the browser. Signing in with a Yale Google account (or an email link) creates a TripTable account automatically: a database trigger adds a row to `profiles` for every new sign-in. From there:

- **Profile:** name, college and class year, editable under Profile → Settings.
- **Friends:** a request goes into `friendships` as pending, and the other person accepts it. Only accepted friends can read each other's `trips` (row-level security). `find_student()` looks people up by exact Yale email or NetID, so nobody can browse the student list.
- **Trips** sync to your account, so they follow you across devices.

## Still estimates or on-device

- Ground-transport times and costs in `src/flights/engine.ts` are rough planning estimates.
- Bucket list and preferences are saved on your device.
- The group flight and booked checklist are saved on your device. Friends see them via the copied message until accounts are shared.
- Stays: hotel names and rough prices, with no ratings.

# Grok Proof

<img width="2298" height="1862" alt="Screenshot 2026-11-17 at 6 12 31 PM" src="https://github.com/user-attachments/assets/4e63dda2-74c5-42bc-bff3-20586f07d9cc" />
