import type { Place } from "./types";

/** Continent for countries added after the original catalog. Not a travel-ban list. */
export const CONTINENT_BY_ISO: Record<string, string> = {};

type City = { id: string; name: string; lat: number; lng: number; capital?: boolean; note?: string };
type Country = { iso: string; name: string; continent: string; lat: number; lng: number; cities: City[]; id?: string };

// Capitals and cities in countries that are not on the State Department Level 4 list
// Yale uses as its undergraduate travel ban (November 2026). Coordinates are the cities themselves.
const COUNTRIES: Country[] = [
  { iso: "NO", name: "Norway", continent: "Europe", lat: 61.0, lng: 8.5, cities: [{ id: "oslo", name: "Oslo", lat: 59.91, lng: 10.75, capital: true }] },
  { iso: "SE", name: "Sweden", continent: "Europe", lat: 62.0, lng: 15.0, cities: [{ id: "stockholm", name: "Stockholm", lat: 59.33, lng: 18.07, capital: true }] },
  { iso: "DK", name: "Denmark", continent: "Europe", lat: 56.0, lng: 10.0, cities: [{ id: "copenhagen", name: "Copenhagen", lat: 55.68, lng: 12.57, capital: true }] },
  { iso: "FI", name: "Finland", continent: "Europe", lat: 64.0, lng: 26.0, cities: [{ id: "helsinki", name: "Helsinki", lat: 60.17, lng: 24.94, capital: true }] },
  { iso: "BE", name: "Belgium", continent: "Europe", lat: 50.5, lng: 4.5, cities: [{ id: "brussels", name: "Brussels", lat: 50.85, lng: 4.35, capital: true }] },
  { iso: "AT", name: "Austria", continent: "Europe", lat: 47.6, lng: 14.1, cities: [{ id: "vienna", name: "Vienna", lat: 48.21, lng: 16.37, capital: true }] },
  { iso: "PL", name: "Poland", continent: "Europe", lat: 52.0, lng: 19.4, cities: [{ id: "warsaw", name: "Warsaw", lat: 52.23, lng: 21.01, capital: true }, { id: "krakow", name: "Krakow", lat: 50.06, lng: 19.94 }] },
  { iso: "HU", name: "Hungary", continent: "Europe", lat: 47.2, lng: 19.5, cities: [{ id: "budapest", name: "Budapest", lat: 47.5, lng: 19.04, capital: true }] },
  { iso: "EE", name: "Estonia", continent: "Europe", lat: 58.6, lng: 25.0, cities: [{ id: "tallinn", name: "Tallinn", lat: 59.44, lng: 24.75, capital: true }] },
  { iso: "LV", name: "Latvia", continent: "Europe", lat: 56.9, lng: 24.6, cities: [{ id: "riga", name: "Riga", lat: 56.95, lng: 24.11, capital: true }] },
  { iso: "LT", name: "Lithuania", continent: "Europe", lat: 55.2, lng: 24.0, cities: [{ id: "vilnius", name: "Vilnius", lat: 54.69, lng: 25.28, capital: true }] },
  { iso: "SI", name: "Slovenia", continent: "Europe", lat: 46.1, lng: 14.8, cities: [{ id: "ljubljana", name: "Ljubljana", lat: 46.05, lng: 14.51, capital: true }] },
  { iso: "SK", name: "Slovakia", continent: "Europe", lat: 48.7, lng: 19.5, cities: [{ id: "bratislava", name: "Bratislava", lat: 48.15, lng: 17.11, capital: true }] },
  { iso: "RO", name: "Romania", continent: "Europe", lat: 45.9, lng: 24.9, cities: [{ id: "bucharest", name: "Bucharest", lat: 44.43, lng: 26.1, capital: true }] },
  { iso: "BG", name: "Bulgaria", continent: "Europe", lat: 42.7, lng: 25.5, cities: [{ id: "sofia", name: "Sofia", lat: 42.7, lng: 23.32, capital: true }] },
  { iso: "RS", name: "Serbia", continent: "Europe", lat: 44.0, lng: 21.0, cities: [{ id: "belgrade", name: "Belgrade", lat: 44.79, lng: 20.45, capital: true }] },
  { iso: "AL", name: "Albania", continent: "Europe", lat: 41.1, lng: 20.2, cities: [{ id: "tirana", name: "Tirana", lat: 41.33, lng: 19.82, capital: true }] },
  { iso: "ME", name: "Montenegro", continent: "Europe", lat: 42.7, lng: 19.4, cities: [{ id: "podgorica", name: "Podgorica", lat: 42.44, lng: 19.26, capital: true }] },
  { iso: "LU", name: "Luxembourg", continent: "Europe", lat: 49.75, lng: 6.13, cities: [{ id: "luxembourg-city", name: "Luxembourg City", lat: 49.61, lng: 6.13, capital: true }] },
  { iso: "MT", name: "Malta", continent: "Europe", lat: 35.9, lng: 14.4, cities: [{ id: "valletta", name: "Valletta", lat: 35.9, lng: 14.51, capital: true }] },
  { iso: "CY", name: "Cyprus", continent: "Europe", lat: 35.1, lng: 33.4, cities: [{ id: "nicosia", name: "Nicosia", lat: 35.17, lng: 33.36, capital: true }] },
  { iso: "GE", name: "Georgia", continent: "Asia", lat: 42.2, lng: 43.4, cities: [{ id: "tbilisi", name: "Tbilisi", lat: 41.69, lng: 44.8, capital: true }] },
  { iso: "AM", name: "Armenia", continent: "Asia", lat: 40.1, lng: 45.0, cities: [{ id: "yerevan", name: "Yerevan", lat: 40.18, lng: 44.51, capital: true }] },
  { iso: "SG", name: "Singapore", continent: "Asia", lat: 1.35, lng: 103.82, cities: [{ id: "singapore", name: "Singapore", lat: 1.35, lng: 103.82, capital: true }] },
  { iso: "TW", name: "Taiwan", continent: "Asia", lat: 23.7, lng: 121.0, cities: [{ id: "taipei", name: "Taipei", lat: 25.03, lng: 121.57, capital: true }] },
  { iso: "MY", name: "Malaysia", continent: "Asia", lat: 4.2, lng: 102.0, cities: [{ id: "kuala-lumpur", name: "Kuala Lumpur", lat: 3.14, lng: 101.69, capital: true }] },
  { iso: "IN", name: "India", continent: "Asia", lat: 22.0, lng: 79.0, cities: [{ id: "new-delhi", name: "New Delhi", lat: 28.61, lng: 77.21, capital: true }, { id: "mumbai", name: "Mumbai", lat: 19.08, lng: 72.88 }] },
  { iso: "NP", name: "Nepal", continent: "Asia", lat: 28.4, lng: 84.1, cities: [{ id: "kathmandu", name: "Kathmandu", lat: 27.72, lng: 85.32, capital: true }] },
  { iso: "LK", name: "Sri Lanka", continent: "Asia", lat: 7.9, lng: 80.7, cities: [{ id: "kotte", name: "Sri Jayawardenepura Kotte", lat: 6.89, lng: 79.92, capital: true }, { id: "colombo", name: "Colombo", lat: 6.93, lng: 79.85, note: "Colombo is Sri Lanka's commercial capital." }] },
  { iso: "BT", name: "Bhutan", continent: "Asia", lat: 27.5, lng: 90.4, cities: [{ id: "thimphu", name: "Thimphu", lat: 27.47, lng: 89.64, capital: true }] },
  { iso: "MN", name: "Mongolia", continent: "Asia", lat: 46.8, lng: 103.8, cities: [{ id: "ulaanbaatar", name: "Ulaanbaatar", lat: 47.92, lng: 106.92, capital: true }] },
  { iso: "KZ", name: "Kazakhstan", continent: "Asia", lat: 48.0, lng: 68.0, cities: [{ id: "astana", name: "Astana", lat: 51.16, lng: 71.47, capital: true }] },
  { iso: "UZ", name: "Uzbekistan", continent: "Asia", lat: 41.4, lng: 64.6, cities: [{ id: "tashkent", name: "Tashkent", lat: 41.3, lng: 69.24, capital: true }] },
  { iso: "JO", name: "Jordan", continent: "Asia", lat: 31.2, lng: 36.5, cities: [{ id: "amman", name: "Amman", lat: 31.95, lng: 35.93, capital: true }] },
  { iso: "AE", name: "United Arab Emirates", continent: "Asia", lat: 24.0, lng: 54.0, cities: [{ id: "abu-dhabi", name: "Abu Dhabi", lat: 24.45, lng: 54.38, capital: true }, { id: "dubai", name: "Dubai", lat: 25.2, lng: 55.27 }] },
  { iso: "QA", name: "Qatar", continent: "Asia", lat: 25.3, lng: 51.2, cities: [{ id: "doha", name: "Doha", lat: 25.29, lng: 51.53, capital: true }] },
  { iso: "OM", name: "Oman", continent: "Asia", lat: 21.0, lng: 57.0, cities: [{ id: "muscat", name: "Muscat", lat: 23.59, lng: 58.38, capital: true }] },
  { iso: "AR", name: "Argentina", continent: "South America", lat: -34.0, lng: -64.0, cities: [{ id: "buenos-aires", name: "Buenos Aires", lat: -34.6, lng: -58.38, capital: true }] },
  { iso: "CL", name: "Chile", continent: "South America", lat: -35.0, lng: -71.0, cities: [{ id: "santiago", name: "Santiago", lat: -33.45, lng: -70.67, capital: true }] },
  { iso: "BR", name: "Brazil", continent: "South America", lat: -10.0, lng: -52.0, cities: [{ id: "brasilia", name: "Brasília", lat: -15.79, lng: -47.88, capital: true }, { id: "rio", name: "Rio de Janeiro", lat: -22.91, lng: -43.17 }, { id: "sao-paulo", name: "São Paulo", lat: -23.55, lng: -46.63 }] },
  { iso: "UY", name: "Uruguay", continent: "South America", lat: -33.0, lng: -56.0, cities: [{ id: "montevideo", name: "Montevideo", lat: -34.9, lng: -56.16, capital: true }] },
  { iso: "PA", name: "Panama", continent: "Central America", lat: 8.5, lng: -80.0, cities: [{ id: "panama-city", name: "Panama City", lat: 8.98, lng: -79.52, capital: true }] },
  { iso: "EC", name: "Ecuador", continent: "South America", lat: -1.5, lng: -78.0, cities: [{ id: "quito", name: "Quito", lat: -0.18, lng: -78.47, capital: true }] },
  { iso: "PY", name: "Paraguay", continent: "South America", lat: -23.4, lng: -58.4, cities: [{ id: "asuncion", name: "Asunción", lat: -25.26, lng: -57.58, capital: true }] },
  { iso: "BZ", name: "Belize", continent: "Central America", lat: 17.2, lng: -88.7, cities: [{ id: "belmopan", name: "Belmopan", lat: 17.25, lng: -88.77, capital: true }] },
  { iso: "BB", name: "Barbados", continent: "Caribbean", lat: 13.19, lng: -59.54, cities: [{ id: "bridgetown", name: "Bridgetown", lat: 13.1, lng: -59.62, capital: true }] },
  { iso: "NZ", name: "New Zealand", continent: "Oceania", lat: -41.0, lng: 174.0, cities: [{ id: "wellington", name: "Wellington", lat: -41.29, lng: 174.78, capital: true }, { id: "auckland", name: "Auckland", lat: -36.85, lng: 174.76 }] },
  { iso: "FJ", name: "Fiji", continent: "Oceania", lat: -17.8, lng: 178.0, cities: [{ id: "suva", name: "Suva", lat: -18.14, lng: 178.44, capital: true }] },
  { iso: "GH", name: "Ghana", continent: "Africa", lat: 7.9, lng: -1.0, cities: [{ id: "accra", name: "Accra", lat: 5.6, lng: -0.19, capital: true }] },
  { iso: "RW", name: "Rwanda", continent: "Africa", lat: -1.9, lng: 29.9, cities: [{ id: "kigali", name: "Kigali", lat: -1.94, lng: 30.06, capital: true }] },
  { iso: "BW", name: "Botswana", continent: "Africa", lat: -22.3, lng: 24.7, cities: [{ id: "gaborone", name: "Gaborone", lat: -24.65, lng: 25.91, capital: true }] },
  { iso: "NA", name: "Namibia", continent: "Africa", lat: -22.0, lng: 17.0, cities: [{ id: "windhoek", name: "Windhoek", lat: -22.56, lng: 17.08, capital: true }] },
  { iso: "ZA", name: "South Africa", continent: "Africa", lat: -29.0, lng: 25.0, cities: [{ id: "pretoria", name: "Pretoria", lat: -25.75, lng: 28.19, capital: true }, { id: "cape-town", name: "Cape Town", lat: -33.92, lng: 18.42 }, { id: "johannesburg", name: "Johannesburg", lat: -26.2, lng: 28.05 }] },
  { iso: "SN", name: "Senegal", continent: "Africa", lat: 14.5, lng: -14.5, cities: [{ id: "dakar", name: "Dakar", lat: 14.72, lng: -17.47, capital: true }] },
  { iso: "TN", name: "Tunisia", continent: "Africa", lat: 34.0, lng: 9.5, cities: [{ id: "tunis", name: "Tunis", lat: 36.81, lng: 10.18, capital: true }] },
  { iso: "MU", name: "Mauritius", continent: "Africa", lat: -20.2, lng: 57.5, cities: [{ id: "port-louis", name: "Port Louis", lat: -20.16, lng: 57.5, capital: true }] },
  { iso: "TZ", name: "Tanzania", continent: "Africa", lat: -6.4, lng: 34.9, cities: [{ id: "dodoma", name: "Dodoma", lat: -6.16, lng: 35.75, capital: true }, { id: "dar-es-salaam", name: "Dar es Salaam", lat: -6.79, lng: 39.21 }] },
  { iso: "KE", name: "Kenya", continent: "Africa", lat: 0.2, lng: 37.9, cities: [{ id: "nairobi", name: "Nairobi", lat: -1.29, lng: 36.82, capital: true }] },
  { iso: "PH", name: "Philippines", continent: "Asia", lat: 12.9, lng: 122.0, cities: [{ id: "manila", name: "Manila", lat: 14.6, lng: 120.98, capital: true }] },
  { iso: "KH", name: "Cambodia", continent: "Asia", lat: 12.6, lng: 105.0, cities: [{ id: "phnom-penh", name: "Phnom Penh", lat: 11.56, lng: 104.93, capital: true }] },
  { iso: "LA", name: "Laos", continent: "Asia", lat: 18.2, lng: 103.8, id: "laos", cities: [{ id: "vientiane", name: "Vientiane", lat: 17.98, lng: 102.63, capital: true }] },
  { iso: "BD", name: "Bangladesh", continent: "Asia", lat: 23.7, lng: 90.3, cities: [{ id: "dhaka", name: "Dhaka", lat: 23.81, lng: 90.41, capital: true }] },
  { iso: "BO", name: "Bolivia", continent: "South America", lat: -16.3, lng: -63.6, cities: [{ id: "sucre", name: "Sucre", lat: -19.05, lng: -65.26, capital: true }, { id: "la-paz", name: "La Paz", lat: -16.5, lng: -68.15 }] },
  { iso: "GT", name: "Guatemala", continent: "Central America", lat: 15.8, lng: -90.2, cities: [{ id: "guatemala-city", name: "Guatemala City", lat: 14.63, lng: -90.51, capital: true }] },
  { iso: "ET", name: "Ethiopia", continent: "Africa", lat: 9.1, lng: 40.5, cities: [{ id: "addis-ababa", name: "Addis Ababa", lat: 9.03, lng: 38.74, capital: true }] },
  { iso: "NG", name: "Nigeria", continent: "Africa", lat: 9.1, lng: 8.7, cities: [{ id: "abuja", name: "Abuja", lat: 9.08, lng: 7.4, capital: true }, { id: "lagos", name: "Lagos", lat: 6.52, lng: 3.38 }] },
  { iso: "DZ", name: "Algeria", continent: "Africa", lat: 28.0, lng: 2.6, cities: [{ id: "algiers", name: "Algiers", lat: 36.75, lng: 3.06, capital: true }] },
];

const EXTRA_CITIES: { parentId: string; iso: string; region: string; cities: City[] }[] = [
  { parentId: "ca", iso: "CA", region: "Canada", cities: [{ id: "ottawa", name: "Ottawa", lat: 45.42, lng: -75.7, capital: true }, { id: "toronto", name: "Toronto", lat: 43.65, lng: -79.38 }, { id: "vancouver", name: "Vancouver", lat: 49.28, lng: -123.12 }] },
  { parentId: "au", iso: "AU", region: "Australia", cities: [{ id: "canberra", name: "Canberra", lat: -35.28, lng: 149.13, capital: true }, { id: "melbourne", name: "Melbourne", lat: -37.81, lng: 144.96 }, { id: "sydney", name: "Sydney", lat: -33.87, lng: 151.21 }] },
  { parentId: "id", iso: "ID", region: "Indonesia", cities: [{ id: "jakarta", name: "Jakarta", lat: -6.21, lng: 106.85, capital: true }] },
];

function countryLabel(country: string): string {
  if (country === "Philippines" || country === "United Arab Emirates" || country === "Netherlands" || country === "Bahamas") return `the ${country}`;
  return country;
}

function cityBlurb(city: City, country: string): string {
  const label = countryLabel(country);
  if (city.capital) return `${city.name} is the capital of ${label}.`;
  if (city.note) return city.note;
  return `${city.name}, ${label}.`;
}

/** Real capitals and cities. No sample ratings, prices, or invented student comments. */
export function extraCatalog(): Place[] {
  const places: Place[] = [];
  for (const country of COUNTRIES) {
    CONTINENT_BY_ISO[country.iso] = country.continent;
    const id = country.id ?? country.iso.toLowerCase();
    places.push({
      id,
      name: country.name,
      kind: "country",
      iso: country.iso,
      lat: country.lat,
      lng: country.lng,
      region: country.continent,
      blurb: "",
      guide: "",
      stays: [],
      tags: [],
      aliases: [country.name.toLowerCase()],
    });
    for (const city of country.cities) {
      places.push({
        id: city.id,
        name: city.name,
        kind: "spot",
        iso: country.iso,
        parentId: id,
        lat: city.lat,
        lng: city.lng,
        region: country.name,
        blurb: cityBlurb(city, country.name),
        guide: "",
        stays: [],
        tags: ["city"],
        aliases: [city.name.toLowerCase()],
        cat: "city",
      });
    }
  }
  for (const group of EXTRA_CITIES) {
    for (const city of group.cities) {
      places.push({
        id: city.id,
        name: city.name,
        kind: "spot",
        iso: group.iso,
        parentId: group.parentId,
        lat: city.lat,
        lng: city.lng,
        region: group.region,
        blurb: cityBlurb(city, group.region),
        guide: "",
        stays: [],
        tags: ["city"],
        aliases: [city.name.toLowerCase()],
        cat: "city",
      });
    }
  }
  return places;
}
