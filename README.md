# TripTable

**Yale travel, the way CourseTable treats classes.** See where Yale students travel and study abroad, read anonymous student ratings, plan trips with friends, and find the best way to get there from campus.

**Live site:** https://hyang365.github.io/grok1/

https://github.com/user-attachments/assets/dbe7f935-b0db-4791-8db4-5b6a8971673f

> Made by Yale students. Not affiliated with or endorsed by Yale University.

## Features

- **Map.** Countries are shaded by their overall student rating, which combines ratings of the country and all of its cities. Major destinations show as dots. Open a country to see its cities, national parks and landmarks, each with its own ratings.
- **Catalog.** Every country and city, plus U.S. parks and landmarks, sortable and filterable by rating, plans, features and continent.
- **Ratings and reviews.** Fully anonymous. Students can leave scores only or add a written review. Sign-in requires a Yale Google account.
- **Trip finder.** Enter a budget, number of nights, travelers and interests to get ranked destinations with a rough cost breakdown.
- **Study abroad.** About 250 Yale-approved semester and summer programs on their own map (shaded by program ratings), with the grants each one qualifies for.
- **Friends.** Add friends by Yale email. Accepted friends see each other's saved trips. Everyone else only sees anonymous totals.
- **Itinerary.** Upcoming trips, flight planning from campus (Google Flights links, plus a "lock the group flight" checklist), and live CTtransit, Metro-North and Amtrak times.
- **Yale travel rules.** Flags places Yale won't sponsor and shows State Department cautions.
- **Moderation and feedback.** In-app feedback form. Moderators get a page for reported reviews and incoming feedback.

## Tech

| Part | Tools |
| --- | --- |
| Front end | React 19, TypeScript, Vite |
| Maps | amCharts 5 (world and U.S.), Leaflet with OpenStreetMap (bus map) |
| Back end | Supabase: Postgres with row-level security, Google sign-in, and one edge function |
| Hosting | GitHub Pages, deployed by GitHub Actions on every push to `main` |

## Project layout

```
src/
  App.tsx, ui.tsx, MapView.tsx   app shell, panels, map
  data.ts, spots.ts              countries, cities, parks and landmarks
  logic.ts, budget.ts            filters, ratings, travel rules, cost estimates
  account/                       profiles and friends
  reviews/                       ratings, reviews, sign-in
  abroad/                        study abroad programs and grants
  flights/, transit/             getting there, live bus and train times
  profile/, admin/               profile menu, feedback, moderation
public/                          about, privacy and terms pages, logo
supabase/                        database schema, security rules, transit edge function
scripts/build-transit.mjs        builds the bus and train schedule lookup during deploy
```

## Run locally

```bash
npm ci
npm run dev      # http://127.0.0.1:5173
npm run build    # type-check and build into site/
```

The site connects to the production Supabase project by default. To use a different project, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Deploy

Every push to `main` runs `.github/workflows/pages.yml`, which type-checks, builds and publishes the site to GitHub Pages. Asset paths are relative, so the same build works at `hyang365.github.io/grok1/` or at the root of a custom domain.

## Security and privacy

- **Row-level security on every table.**
  - `trips` can only be read by its owner and accepted friends.
  - `profiles` can only be read by the owner and people they have a friend request with.
  - `feedback` can only be read by moderators.
- **Anonymous reviews.** The public can't read who wrote a review (`user_id` isn't exposed). Saving and deleting go through server functions that only act on your own reviews.
- **Yale-only accounts.** The database rejects any sign-up that isn't an `@yale.edu` address.
- **Rate limits per person.** Reviews, reports, friend requests, trip saves and feedback are rate-limited, and trips are capped per account.
- **No browsing the student list.** Friend lookup only answers an exact Yale email or NetID.
- **Content Security Policy.** The site loads scripts only from itself and only talks to Supabase and the transit providers.
- **Public key only.** The Supabase key in `src/reviews/backend.ts` is the public anon key. Service keys and OAuth secrets never go in this repo.

The full database rules are in `supabase/schema.sql` and `supabase/security.sql`.

### Moderators

Moderators see a **Moderation** item in the profile menu. To add one, run this in the Supabase SQL editor:

```sql
insert into private.admins (email) values ('netid@yale.edu');
```

## Custom domain

1. Buy the domain, then in its DNS settings add:
   - `A` records for `@` pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`
   - a `CNAME` record for `www` pointing to `hyang365.github.io`
2. In **GitHub → Settings → Pages**, enter the domain under **Custom domain**, wait for the DNS check, and tick **Enforce HTTPS**.
3. In **Supabase → Authentication → URL Configuration**, set the Site URL to `https://yourdomain` and add `https://yourdomain/**` to the redirect URLs.
4. In **Google Cloud → Google Auth Platform**:
   - add the domain under **Branding → Authorized domains**
   - add `https://yourdomain` to the OAuth client's **Authorized JavaScript origins**
   - update the home, privacy and terms links

No code changes are needed.

## Data sources

Study abroad programs come from Yale's study abroad database, and grant details from Yale's funding sites. Travel guidance follows Yale's travel policy and State Department advisories. Live transit comes from CTtransit, MTA Metro-North and the Amtraker API. Cost estimates and travel notes are for planning only, so check official sources before you book.
