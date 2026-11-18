export type Season = "spring" | "summer" | "fall" | "winter" | "weekend";

export type Scores = {
  overall: number;
  affordability: number;
  safety: number;
  beauty: number;
};

export type YearCount = { year: number; count: number };

export type History = Record<Season, YearCount[]>;

export type Cohort = {
  season: Season;
  start: string;
  end: string;
  count: number;
};

export type Stay = {
  name: string;
  area: string;
  nightly: number;
};

export type Place = {
  id: string;
  name: string;
  kind: "country" | "spot";
  iso: string;
  parentId?: string;
  lat: number;
  lng: number;
  region: string;
  blurb: string;
  guide: string;
  stays: Stay[];
  tags: string[];
  aliases: string[];
  atlas?: string;
};

export type PersonTrip = {
  placeId: string;
  season: Season;
  start: string;
  end: string;
  note?: string;
};

export type Person = {
  netid: string;
  name: string;
  college: string;
  year: string;
  trips: PersonTrip[];
};

export type Scope = "all" | "countries" | "us";
export type SortKey = "yalies" | "overall" | "affordability" | "safety" | "beauty";
export type ThemeName = "light" | "dark";
export type MapMode = "travel" | "abroad";
export type AbroadTerm = "Spring" | "Fall" | "Summer";
export type ViewName = "map" | "catalog" | "friends" | "itinerary" | "flights" | "abroad" | "transit" | "profile";

export type Filters = {
  overall: number;
  affordability: number;
  safety: number;
  beauty: number;
  minYalies: number;
  features: string[];
  continents: string[];
  query: string;
  scope: Scope;
};

export type FlightLeg = {
  flight: string; // e.g. "B6 1503"
  date: string; // YYYY-MM-DD
  time: string; // HH:MM local departure
  from: string; // airport code
  to: string;
};

/** The exact flights a group agreed on, kept on the shared trip so everyone books the same ones. */
export type GroupFlight = {
  outbound: FlightLeg;
  ret: FlightLeg | null;
  link: string; // Google Flights share link, if someone pasted one
  setBy: string; // netid
  booked: string[]; // netids who've confirmed they booked
  setAt: string;
};

export type Trip = {
  id: string;
  placeId: string;
  season: Season;
  start: string;
  end: string;
  note: string;
  friendNetids: string[];
  groupFlight?: GroupFlight;
};

export type BucketItem = {
  id: string;
  kind: "place" | "program";
  targetId: string;
  addedAt: string;
  done: boolean;
};

export type ProfileTab = "history" | "bucket" | "reviews" | "settings";
