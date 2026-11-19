// Harvard: a landmark on the map with a permanent −5.0. A joke, labeled as one wherever the score shows.

import type { Place } from "../types";

export const HARVARD_ID = "harvard";

/** Scores TripTable sets by hand. They never mix with student ratings or roll up into a country. */
export const FIXED_SCORES: Record<string, number> = { [HARVARD_ID]: -5 };

export const HARVARD: Place = {
  id: HARVARD_ID,
  name: "Harvard",
  kind: "spot",
  iso: "US",
  parentId: "us",
  lat: 42.3744,
  lng: -71.1169,
  region: "Cambridge, Massachusetts",
  blurb: "shithole.",
  guide: [
    "The most interesting thing that ever happened here was in 1636, and it has been downhill since. The statue of John Harvard in the Yard is known as the Statue of Three Lies: it isn't John Harvard, he wasn't the founder, and the date on it is wrong. Fitting.",
    "What to do: stand in the Yard, feel nothing, take the train home. What to eat: whatever you packed in New Haven. Locals call it pizza. They are mistaken.",
    "Best time to visit: the Saturday Yale wins The Game. Yale leads the all-time series 71–61–8 (through the 2024 season). We checked.",
  ].join("\n\n"),
  stays: [
    { name: "Your car, engine running", area: "Any Cambridge curb", nightly: 0 },
    { name: "A bench facing south, toward New Haven", area: "Harvard Yard", nightly: 0 },
    { name: "The next train home", area: "South Station", nightly: 0 },
  ],
  tags: ["landmark", "rival", "regret"],
  aliases: ["harvard", "harvard university", "cambridge", "the crimson", "safety school"],
  cat: "landmark",
};

export const HARVARD_FACTS = [
  "Rated −5.0 on everything, permanently.",
  "Reviews are closed. There's nothing left to say.",
  "Not on Yale's real travel ban list. It just feels like it.",
];
