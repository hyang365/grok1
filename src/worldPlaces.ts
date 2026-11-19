// Every country on the map gets an entry and its capital, plus well-known destinations, so students
// can rate the places they actually go. Facts only: no ratings, prices or student comments are invented.
// Countries on Yale's travel ban list get their capital only. Coordinates are the places themselves.

import type { Place } from "./types";
import { CONTINENT_BY_ISO } from "./morePlaces";

// [id, name, lat, lng, kind, tags, blurb]. kind: C = capital city, c = city, p = park / nature, l = landmark.
type Row = [string, string, number, number, "C" | "c" | "p" | "l", string, string?];
type NewCountry = { iso: string; name: string; continent: string; lat: number; lng: number; id?: string; label?: string; rows: Row[] };

const NEW_COUNTRIES: NewCountry[] = [
  // ---------- Europe ----------
  { iso: "VA", name: "Vatican City", continent: "Europe", lat: 41.903, lng: 12.453, id: "vatican", rows: [["vatican-city", "Vatican City", 41.9022, 12.4539, "C", "city", "St. Peter's Basilica, the Sistine Chapel and the Vatican Museums, inside Rome."]] },
  { iso: "SM", name: "San Marino", continent: "Europe", lat: 43.94, lng: 12.46, rows: [["san-marino-city", "City of San Marino", 43.9356, 12.4473, "C", "city"]] },
  { iso: "MC", name: "Monaco", continent: "Europe", lat: 43.738, lng: 7.424, rows: [["monaco-city", "Monaco", 43.7384, 7.4246, "C", "city", "Monte Carlo's casino, the harbor and the Grand Prix circuit."]] },
  { iso: "LI", name: "Liechtenstein", continent: "Europe", lat: 47.15, lng: 9.55, rows: [["vaduz", "Vaduz", 47.141, 9.5215, "C", "city"]] },
  { iso: "AD", name: "Andorra", continent: "Europe", lat: 42.55, lng: 1.58, rows: [["andorra-la-vella", "Andorra la Vella", 42.5063, 1.5218, "C", "city,mountain", "Ski resorts and duty-free shopping in the Pyrenees."]] },
  { iso: "MK", name: "North Macedonia", continent: "Europe", lat: 41.6, lng: 21.7, rows: [["skopje", "Skopje", 41.9981, 21.4254, "C", "city"], ["ohrid", "Ohrid", 41.1231, 20.8016, "c", "city", "A lakeside old town of churches on one of Europe's oldest lakes."]] },
  { iso: "MD", name: "Moldova", continent: "Europe", lat: 47.2, lng: 28.5, rows: [["chisinau", "Chișinău", 47.0105, 28.8638, "C", "city,food"]] },
  { iso: "XK", name: "Kosovo", continent: "Europe", lat: 42.6, lng: 20.9, rows: [["pristina", "Pristina", 42.6629, 21.1655, "C", "city"], ["prizren", "Prizren", 42.2139, 20.7397, "c", "city", "An Ottoman-era old town under a hilltop fortress."]] },
  { iso: "BA", name: "Bosnia and Herzegovina", continent: "Europe", lat: 44.2, lng: 17.8, rows: [["sarajevo", "Sarajevo", 43.8563, 18.4131, "C", "city,food"], ["mostar", "Mostar", 43.3438, 17.8078, "c", "city", "The Stari Most bridge over the Neretva."]] },
  { iso: "FO", name: "Faroe Islands", continent: "Europe", lat: 62.0, lng: -6.9, rows: [["torshavn", "Tórshavn", 62.0079, -6.7909, "C", "island,hike", "Tórshavn is the capital of the Faroe Islands. Cliffs, sheep and sea stacks between Iceland and Norway."]] },
  { iso: "GI", name: "Gibraltar", continent: "Europe", lat: 36.14, lng: -5.35, rows: [["gibraltar-rock", "Gibraltar", 36.1408, -5.3536, "C", "city,hike", "The Rock, its macaques and a view across to Africa."]] },
  { iso: "SJ", name: "Svalbard", continent: "Europe", lat: 78.2, lng: 15.6, rows: [["longyearbyen", "Longyearbyen", 78.2232, 15.6267, "C", "mountain", "The main town of Svalbard: polar bears, glaciers and the midnight sun."]] },
  { iso: "UA", name: "Ukraine", continent: "Europe", lat: 49.0, lng: 31.4, rows: [["kyiv", "Kyiv", 50.4501, 30.5234, "C", "city"]] },
  { iso: "BY", name: "Belarus", continent: "Europe", lat: 53.7, lng: 28.0, rows: [["minsk", "Minsk", 53.9006, 27.559, "C", "city"]] },
  { iso: "RU", name: "Russia", continent: "Europe", lat: 56.0, lng: 38.0, rows: [["moscow", "Moscow", 55.7558, 37.6173, "C", "city"]] },

  // ---------- Middle East and Asia ----------
  { iso: "IL", name: "Israel", continent: "Asia", lat: 31.4, lng: 34.9, rows: [["jerusalem", "Jerusalem", 31.7683, 35.2137, "C", "city", "The Old City is holy to Judaism, Christianity and Islam. Israel's seat of government; its status is disputed internationally."], ["tel-aviv", "Tel Aviv", 32.0853, 34.7818, "c", "city,beach,food", "Beaches, Bauhaus buildings and a late-night food scene."], ["masada-dead-sea", "Masada & the Dead Sea", 31.3156, 35.3536, "l", "desert", "A desert fortress above the lowest point on land."]] },
  { iso: "PS", name: "Palestinian Territories", continent: "Asia", lat: 31.9, lng: 35.2, id: "palestine", rows: [["ramallah", "Ramallah", 31.9038, 35.2034, "C", "city", "The administrative seat of the Palestinian Authority."], ["bethlehem", "Bethlehem", 31.7054, 35.2024, "c", "city", "The Church of the Nativity and Manger Square."]] },
  { iso: "SA", name: "Saudi Arabia", continent: "Asia", lat: 24.0, lng: 45.0, rows: [["riyadh", "Riyadh", 24.7136, 46.6753, "C", "city,desert"], ["jeddah", "Jeddah", 21.4858, 39.1925, "c", "city,beach", "Al-Balad's coral-stone old town on the Red Sea."], ["alula", "AlUla", 26.6084, 37.9235, "l", "desert", "Hegra's Nabataean tombs cut into desert sandstone."]] },
  { iso: "KW", name: "Kuwait", continent: "Asia", lat: 29.3, lng: 47.7, rows: [["kuwait-city", "Kuwait City", 29.3759, 47.9774, "C", "city"]] },
  { iso: "BH", name: "Bahrain", continent: "Asia", lat: 26.05, lng: 50.55, rows: [["manama", "Manama", 26.2285, 50.586, "C", "city"]] },
  { iso: "AZ", name: "Azerbaijan", continent: "Asia", lat: 40.3, lng: 47.7, rows: [["baku", "Baku", 40.4093, 49.8671, "C", "city", "A walled old city beside the Flame Towers on the Caspian."]] },
  { iso: "KG", name: "Kyrgyzstan", continent: "Asia", lat: 41.4, lng: 74.6, rows: [["bishkek", "Bishkek", 42.8746, 74.5698, "C", "city"], ["issyk-kul", "Issyk-Kul", 42.48, 77.2, "p", "mountain,hike", "An alpine lake ringed by the Tian Shan."]] },
  { iso: "TJ", name: "Tajikistan", continent: "Asia", lat: 38.9, lng: 71.0, rows: [["dushanbe", "Dushanbe", 38.5598, 68.787, "C", "city"]] },
  { iso: "TM", name: "Turkmenistan", continent: "Asia", lat: 39.0, lng: 59.6, rows: [["ashgabat", "Ashgabat", 37.9601, 58.3261, "C", "city"]] },
  { iso: "PK", name: "Pakistan", continent: "Asia", lat: 30.4, lng: 69.4, rows: [["islamabad", "Islamabad", 33.6844, 73.0479, "C", "city"], ["lahore", "Lahore", 31.5204, 74.3587, "c", "city,food", "The Badshahi Mosque, Lahore Fort and the walled city's food streets."], ["hunza", "Hunza Valley", 36.3167, 74.65, "p", "mountain,hike", "Karakoram peaks above apricot orchards on the Karakoram Highway."]] },
  { iso: "MV", name: "Maldives", continent: "Asia", lat: 3.2, lng: 73.2, rows: [["male", "Malé", 4.1755, 73.5093, "C", "city,island,beach", "Malé is the capital of the Maldives, the gateway to its overwater resorts and reefs."]] },
  { iso: "BN", name: "Brunei", continent: "Asia", lat: 4.5, lng: 114.7, rows: [["bandar-seri-begawan", "Bandar Seri Begawan", 4.9031, 114.9398, "C", "city"]] },
  { iso: "TL", name: "Timor-Leste", continent: "Asia", lat: -8.8, lng: 125.7, rows: [["dili", "Dili", -8.5569, 125.5603, "C", "city,beach"]] },
  { iso: "MO", name: "Macau", continent: "Asia", lat: 22.17, lng: 113.55, rows: [["macau-city", "Macau", 22.1987, 113.5439, "C", "city,food", "Portuguese squares, the Ruins of St. Paul's and the Cotai casinos."]] },
  { iso: "MM", name: "Myanmar", continent: "Asia", lat: 21.9, lng: 95.9, rows: [["naypyidaw", "Naypyidaw", 19.7633, 96.0785, "C", "city"]] },
  { iso: "AF", name: "Afghanistan", continent: "Asia", lat: 33.9, lng: 67.7, rows: [["kabul", "Kabul", 34.5553, 69.2075, "C", "city"]] },
  { iso: "IR", name: "Iran", continent: "Asia", lat: 32.4, lng: 53.7, rows: [["tehran", "Tehran", 35.6892, 51.389, "C", "city"]] },
  { iso: "IQ", name: "Iraq", continent: "Asia", lat: 33.2, lng: 43.7, rows: [["baghdad", "Baghdad", 33.3152, 44.3661, "C", "city"]] },
  { iso: "SY", name: "Syria", continent: "Asia", lat: 34.8, lng: 39.0, rows: [["damascus", "Damascus", 33.5138, 36.2765, "C", "city"]] },
  { iso: "LB", name: "Lebanon", continent: "Asia", lat: 33.85, lng: 35.86, rows: [["beirut", "Beirut", 33.8938, 35.5018, "C", "city"]] },
  { iso: "YE", name: "Yemen", continent: "Asia", lat: 15.6, lng: 48.5, rows: [["sanaa", "Sanaa", 15.3694, 44.191, "C", "city"]] },
  { iso: "KP", name: "North Korea", continent: "Asia", lat: 40.3, lng: 127.5, rows: [["pyongyang", "Pyongyang", 39.0392, 125.7625, "C", "city"]] },

  // ---------- Africa ----------
  { iso: "ZW", name: "Zimbabwe", continent: "Africa", lat: -19.0, lng: 29.2, rows: [["harare", "Harare", -17.8252, 31.0335, "C", "city"], ["victoria-falls", "Victoria Falls", -17.9243, 25.8572, "p", "hike", "One of the world's largest waterfalls, on the Zambezi."]] },
  { iso: "ZM", name: "Zambia", continent: "Africa", lat: -13.1, lng: 27.8, rows: [["lusaka", "Lusaka", -15.3875, 28.3228, "C", "city"], ["livingstone", "Livingstone", -17.8419, 25.8543, "c", "hike", "The Zambian side of Victoria Falls and Devil's Pool."]] },
  { iso: "MW", name: "Malawi", continent: "Africa", lat: -13.25, lng: 34.3, rows: [["lilongwe", "Lilongwe", -13.9626, 33.7741, "C", "city"], ["lake-malawi", "Lake Malawi", -14.0333, 34.8833, "p", "beach,island", "Beaches and cichlid-filled water along a lake the size of a sea."]] },
  { iso: "MZ", name: "Mozambique", continent: "Africa", lat: -18.7, lng: 35.5, rows: [["maputo", "Maputo", -25.9692, 32.5732, "C", "city,food"], ["tofo", "Tofo", -23.8517, 35.5454, "c", "beach", "A surf beach known for diving with whale sharks and manta rays."], ["bazaruto", "Bazaruto Archipelago", -21.65, 35.45, "p", "island,beach", "Dunes and reefs in a marine national park."]] },
  { iso: "MG", name: "Madagascar", continent: "Africa", lat: -18.8, lng: 46.9, rows: [["antananarivo", "Antananarivo", -18.8792, 47.5079, "C", "city"], ["nosy-be", "Nosy Be", -13.3333, 48.2667, "c", "island,beach", "The island beach base in the northwest."], ["avenue-of-the-baobabs", "Avenue of the Baobabs", -20.2508, 44.4183, "l", "desert", "A dirt road lined with giant baobabs near Morondava."]] },
  { iso: "AO", name: "Angola", continent: "Africa", lat: -11.2, lng: 17.9, rows: [["luanda", "Luanda", -8.839, 13.2894, "C", "city,beach"]] },
  { iso: "CM", name: "Cameroon", continent: "Africa", lat: 7.4, lng: 12.4, rows: [["yaounde", "Yaoundé", 3.848, 11.5021, "C", "city"]] },
  { iso: "CI", name: "Côte d'Ivoire", continent: "Africa", lat: 7.5, lng: -5.5, id: "ivory-coast", rows: [["yamoussoukro", "Yamoussoukro", 6.8276, -5.2893, "C", "city", "The official capital, home to the Basilica of Our Lady of Peace."], ["abidjan", "Abidjan", 5.36, -4.0083, "c", "city,food", "The country's largest city and its commercial capital."]] },
  { iso: "BJ", name: "Benin", continent: "Africa", lat: 9.3, lng: 2.3, rows: [["porto-novo", "Porto-Novo", 6.4969, 2.6289, "C", "city"], ["cotonou", "Cotonou", 6.3703, 2.3912, "c", "city", "The largest city and seat of government."], ["ouidah", "Ouidah", 6.3631, 2.0851, "l", "beach", "The Door of No Return, a memorial to the Atlantic slave trade."]] },
  { iso: "TG", name: "Togo", continent: "Africa", lat: 8.6, lng: 0.8, rows: [["lome", "Lomé", 6.1319, 1.2228, "C", "city,beach"]] },
  { iso: "SL", name: "Sierra Leone", continent: "Africa", lat: 8.5, lng: -11.8, rows: [["freetown", "Freetown", 8.4657, -13.2317, "C", "city,beach"]] },
  { iso: "LR", name: "Liberia", continent: "Africa", lat: 6.4, lng: -9.4, rows: [["monrovia", "Monrovia", 6.3156, -10.8074, "C", "city"]] },
  { iso: "GN", name: "Guinea", continent: "Africa", lat: 9.9, lng: -9.7, rows: [["conakry", "Conakry", 9.6412, -13.5784, "C", "city"]] },
  { iso: "GW", name: "Guinea-Bissau", continent: "Africa", lat: 11.8, lng: -15.2, rows: [["bissau", "Bissau", 11.8817, -15.6178, "C", "city"]] },
  { iso: "GM", name: "Gambia", continent: "Africa", lat: 13.45, lng: -15.4, label: "the Gambia", rows: [["banjul", "Banjul", 13.4549, -16.579, "C", "city,beach"]] },
  { iso: "CV", name: "Cape Verde", continent: "Africa", lat: 15.1, lng: -23.6, rows: [["praia", "Praia", 14.933, -23.5133, "C", "city,beach"], ["sal", "Sal", 16.75, -22.95, "c", "island,beach", "Santa Maria's long beach and steady trade winds for kitesurfing."]] },
  { iso: "MR", name: "Mauritania", continent: "Africa", lat: 21.0, lng: -10.9, rows: [["nouakchott", "Nouakchott", 18.0735, -15.9582, "C", "city,desert"]] },
  { iso: "GA", name: "Gabon", continent: "Africa", lat: -0.8, lng: 11.6, rows: [["libreville", "Libreville", 0.4162, 9.4673, "C", "city,beach"]] },
  { iso: "GQ", name: "Equatorial Guinea", continent: "Africa", lat: 1.65, lng: 10.3, rows: [["malabo", "Malabo", 3.75, 8.7833, "C", "city"]] },
  { iso: "CG", name: "Republic of the Congo", continent: "Africa", lat: -0.7, lng: 15.0, id: "congo-brazzaville", rows: [["brazzaville", "Brazzaville", -4.2634, 15.2429, "C", "city"]] },
  { iso: "ST", name: "São Tomé and Príncipe", continent: "Africa", lat: 0.3, lng: 6.6, rows: [["sao-tome", "São Tomé", 0.3365, 6.7273, "C", "city,island"]] },
  { iso: "SZ", name: "Eswatini", continent: "Africa", lat: -26.5, lng: 31.5, rows: [["mbabane", "Mbabane", -26.3054, 31.1367, "C", "city", "Mbabane is the administrative capital of Eswatini; Lobamba is the royal and legislative capital."]] },
  { iso: "LS", name: "Lesotho", continent: "Africa", lat: -29.6, lng: 28.2, rows: [["maseru", "Maseru", -29.31, 27.4786, "C", "city,mountain"]] },
  { iso: "SC", name: "Seychelles", continent: "Africa", lat: -4.65, lng: 55.45, rows: [["victoria-seychelles", "Victoria", -4.6191, 55.4513, "C", "city,island"], ["la-digue", "La Digue", -4.3591, 55.8406, "c", "island,beach", "Anse Source d'Argent's granite boulders and bicycles instead of cars."]] },
  { iso: "KM", name: "Comoros", continent: "Africa", lat: -11.9, lng: 43.9, rows: [["moroni", "Moroni", -11.7172, 43.2473, "C", "city,island"]] },
  { iso: "DJ", name: "Djibouti", continent: "Africa", lat: 11.8, lng: 42.6, rows: [["djibouti-city", "Djibouti City", 11.5721, 43.1456, "C", "city,desert"]] },
  { iso: "ER", name: "Eritrea", continent: "Africa", lat: 15.2, lng: 39.8, rows: [["asmara", "Asmara", 15.3229, 38.9251, "C", "city", "Modernist Italian-era architecture, a UNESCO World Heritage site."]] },
  { iso: "BI", name: "Burundi", continent: "Africa", lat: -3.4, lng: 29.9, rows: [["gitega", "Gitega", -3.4271, 29.9246, "C", "city", "Gitega became Burundi's political capital in 2019; Bujumbura is its largest city."]] },
  { iso: "UG", name: "Uganda", continent: "Africa", lat: 1.4, lng: 32.3, rows: [["kampala", "Kampala", 0.3476, 32.5825, "C", "city"]] },
  { iso: "TD", name: "Chad", continent: "Africa", lat: 15.5, lng: 18.7, rows: [["ndjamena", "N'Djamena", 12.1348, 15.0557, "C", "city"]] },
  { iso: "CF", name: "Central African Republic", continent: "Africa", lat: 6.6, lng: 20.9, rows: [["bangui", "Bangui", 4.3947, 18.5582, "C", "city"]] },
  { iso: "CD", name: "DR Congo", continent: "Africa", lat: -2.9, lng: 23.6, id: "congo-kinshasa", rows: [["kinshasa", "Kinshasa", -4.4419, 15.2663, "C", "city"]] },
  { iso: "SS", name: "South Sudan", continent: "Africa", lat: 7.9, lng: 30.0, rows: [["juba", "Juba", 4.8594, 31.5713, "C", "city"]] },
  { iso: "SD", name: "Sudan", continent: "Africa", lat: 15.6, lng: 30.2, rows: [["khartoum", "Khartoum", 15.5007, 32.5599, "C", "city"]] },
  { iso: "SO", name: "Somalia", continent: "Africa", lat: 5.2, lng: 46.2, rows: [["mogadishu", "Mogadishu", 2.0469, 45.3182, "C", "city"]] },
  { iso: "LY", name: "Libya", continent: "Africa", lat: 26.3, lng: 17.2, rows: [["tripoli", "Tripoli", 32.8872, 13.1913, "C", "city"]] },
  { iso: "ML", name: "Mali", continent: "Africa", lat: 17.6, lng: -4.0, rows: [["bamako", "Bamako", 12.6392, -8.0029, "C", "city"]] },
  { iso: "NE", name: "Niger", continent: "Africa", lat: 17.6, lng: 8.1, rows: [["niamey", "Niamey", 13.5116, 2.1254, "C", "city"]] },
  { iso: "BF", name: "Burkina Faso", continent: "Africa", lat: 12.2, lng: -1.6, rows: [["ouagadougou", "Ouagadougou", 12.3714, -1.5197, "C", "city"]] },
  { iso: "RE", name: "Réunion", continent: "Africa", lat: -21.11, lng: 55.53, rows: [["saint-denis-reunion", "Saint-Denis", -20.8823, 55.4504, "C", "city,island", "Saint-Denis is the capital of Réunion, a French island of volcanoes and cirques."], ["piton-de-la-fournaise", "Piton de la Fournaise", -21.2444, 55.7083, "p", "mountain,hike", "One of the world's most active volcanoes, with marked crater hikes."]] },

  // ---------- Caribbean ----------
  { iso: "CU", name: "Cuba", continent: "Caribbean", lat: 21.5, lng: -79.5, rows: [["havana", "Havana", 23.1136, -82.3666, "C", "city,food", "Old Havana's plazas, the Malecón and classic cars."], ["vinales", "Viñales", 22.6167, -83.7167, "p", "hike", "Tobacco farms and limestone mogotes in a green valley."], ["trinidad-cuba", "Trinidad", 21.8047, -79.9847, "c", "city", "A colonial town of cobblestones and pastel houses."]] },
  { iso: "HT", name: "Haiti", continent: "Caribbean", lat: 18.97, lng: -72.3, rows: [["port-au-prince", "Port-au-Prince", 18.5944, -72.3074, "C", "city"]] },
  { iso: "TT", name: "Trinidad and Tobago", continent: "Caribbean", lat: 10.7, lng: -61.2, rows: [["port-of-spain", "Port of Spain", 10.6549, -61.5019, "C", "city,food", "Home of Trinidad Carnival."], ["tobago", "Tobago", 11.25, -60.7, "c", "island,beach", "Quieter beaches, reefs and rainforest."]] },
  { iso: "AG", name: "Antigua and Barbuda", continent: "Caribbean", lat: 17.1, lng: -61.8, rows: [["st-johns-antigua", "St. John's", 17.1274, -61.8468, "C", "city,beach", "St. John's is the capital of Antigua and Barbuda, an island said to have a beach for every day of the year."]] },
  { iso: "LC", name: "Saint Lucia", continent: "Caribbean", lat: 13.9, lng: -60.98, rows: [["castries", "Castries", 14.0101, -60.9875, "C", "city"], ["pitons", "The Pitons", 13.8114, -61.0672, "p", "mountain,beach,hike", "Twin volcanic spires above Soufrière."]] },
  { iso: "GD", name: "Grenada", continent: "Caribbean", lat: 12.12, lng: -61.68, rows: [["st-georges-grenada", "St. George's", 12.0561, -61.7488, "C", "city,beach", "St. George's is the capital of Grenada. Grand Anse beach and nutmeg."]] },
  { iso: "VC", name: "Saint Vincent and the Grenadines", continent: "Caribbean", lat: 13.25, lng: -61.2, rows: [["kingstown", "Kingstown", 13.1587, -61.2248, "C", "city,island"]] },
  { iso: "KN", name: "Saint Kitts and Nevis", continent: "Caribbean", lat: 17.3, lng: -62.7, rows: [["basseterre", "Basseterre", 17.3026, -62.7177, "C", "city,beach"]] },
  { iso: "DM", name: "Dominica", continent: "Caribbean", lat: 15.42, lng: -61.35, rows: [["roseau", "Roseau", 15.3092, -61.3794, "C", "city,hike", "Roseau is the capital of Dominica, the rainforest and hot-springs island."]] },
  { iso: "AW", name: "Aruba", continent: "Caribbean", lat: 12.52, lng: -69.97, rows: [["oranjestad", "Oranjestad", 12.5186, -70.0358, "C", "city,beach"], ["eagle-beach", "Eagle Beach", 12.5545, -70.0573, "l", "beach", "White sand and the photographed fofoti trees."]] },
  { iso: "CW", name: "Curaçao", continent: "Caribbean", lat: 12.17, lng: -68.99, rows: [["willemstad", "Willemstad", 12.1084, -68.9335, "C", "city,beach,island", "Willemstad is the capital of Curaçao. Its waterfront row of colored houses is a UNESCO site."]] },
  { iso: "BQ", name: "Bonaire", continent: "Caribbean", lat: 12.18, lng: -68.26, rows: [["kralendijk", "Kralendijk", 12.1443, -68.2655, "C", "island,beach", "Kralendijk is the main town of Bonaire, a shore-diving island inside a marine park."]] },
  { iso: "SX", name: "Sint Maarten", continent: "Caribbean", lat: 18.03, lng: -63.06, rows: [["philipsburg", "Philipsburg", 18.026, -63.0458, "C", "city,beach"], ["maho-beach", "Maho Beach", 18.0397, -63.1197, "l", "beach", "Planes land just over the sand at the end of the runway."]] },
  { iso: "MF", name: "Saint Martin", continent: "Caribbean", lat: 18.08, lng: -63.06, rows: [["marigot", "Marigot", 18.0681, -63.0828, "C", "city,beach,food", "Marigot is the capital of the French side of the island. Grand Case is its restaurant strip."]] },
  { iso: "BL", name: "Saint Barthélemy", continent: "Caribbean", lat: 17.9, lng: -62.83, rows: [["gustavia", "Gustavia", 17.8962, -62.8498, "C", "beach,island"]] },
  { iso: "KY", name: "Cayman Islands", continent: "Caribbean", lat: 19.31, lng: -81.25, rows: [["george-town-cayman", "George Town", 19.2866, -81.3744, "C", "city,beach", "George Town is the capital of the Cayman Islands."], ["seven-mile-beach", "Seven Mile Beach", 19.3417, -81.3889, "l", "beach", "Grand Cayman's long west-facing beach."], ["stingray-city", "Stingray City", 19.38, -81.3, "l", "beach", "Sandbars where you stand in the water with southern stingrays."]] },
  { iso: "TC", name: "Turks and Caicos Islands", continent: "Caribbean", lat: 21.75, lng: -71.8, rows: [["cockburn-town", "Cockburn Town", 21.4612, -71.1419, "C", "island,beach", "Cockburn Town, on Grand Turk, is the territory's capital."], ["grace-bay", "Grace Bay", 21.7945, -72.1718, "l", "beach", "Providenciales' long, calm turquoise beach."]] },
  { iso: "VI", name: "U.S. Virgin Islands", continent: "Caribbean", lat: 18.34, lng: -64.85, rows: [["charlotte-amalie", "Charlotte Amalie", 18.3419, -64.9307, "C", "city,beach", "Charlotte Amalie, on St. Thomas, is the territory's capital. No passport needed from the U.S."], ["st-john-usvi", "St. John", 18.33, -64.74, "p", "beach,hike,island", "Mostly national park: Trunk Bay and Cinnamon Bay."]] },
  { iso: "VG", name: "British Virgin Islands", continent: "Caribbean", lat: 18.43, lng: -64.62, rows: [["road-town", "Road Town", 18.4286, -64.6185, "C", "island,beach"], ["the-baths", "The Baths", 18.4287, -64.4446, "l", "beach", "Giant granite boulders and tide pools on Virgin Gorda."]] },
  { iso: "GP", name: "Guadeloupe", continent: "Caribbean", lat: 16.2, lng: -61.55, rows: [["basse-terre", "Basse-Terre", 15.9985, -61.7255, "C", "island,hike", "Basse-Terre is the prefecture of Guadeloupe, a French island with a volcano and rainforest."]] },
  { iso: "MQ", name: "Martinique", continent: "Caribbean", lat: 14.65, lng: -61.02, rows: [["fort-de-france", "Fort-de-France", 14.6161, -61.0588, "C", "city,beach,food"]] },

  // ---------- North, Central and South America ----------
  { iso: "GL", name: "Greenland", continent: "North America", lat: 72.0, lng: -40.0, rows: [["nuuk", "Nuuk", 64.1814, -51.6941, "C", "city"], ["ilulissat", "Ilulissat", 69.2198, -51.0986, "p", "hike", "A UNESCO icefjord full of icebergs calved from Sermeq Kujalleq."]] },
  { iso: "BM", name: "Bermuda", continent: "North America", lat: 32.3, lng: -64.78, rows: [["hamilton-bermuda", "Hamilton", 32.2949, -64.7814, "C", "city,beach", "Hamilton is the capital of Bermuda: pink-sand beaches, a short flight from New York."]] },
  { iso: "SV", name: "El Salvador", continent: "Central America", lat: 13.8, lng: -88.9, rows: [["san-salvador", "San Salvador", 13.6929, -89.2182, "C", "city"], ["el-tunco", "El Tunco", 13.4932, -89.3826, "c", "beach", "A surf town on the Pacific with black-sand beaches."]] },
  { iso: "HN", name: "Honduras", continent: "Central America", lat: 14.8, lng: -86.6, rows: [["tegucigalpa", "Tegucigalpa", 14.0723, -87.1921, "C", "city"], ["roatan", "Roatán", 16.3298, -86.5299, "c", "island,beach", "Diving on the Mesoamerican Barrier Reef."], ["copan", "Copán Ruins", 14.8375, -89.1422, "l", "hike", "A Maya city known for its carved stelae."]] },
  { iso: "NI", name: "Nicaragua", continent: "Central America", lat: 12.9, lng: -85.2, rows: [["managua", "Managua", 12.1364, -86.2514, "C", "city"], ["granada-nicaragua", "Granada", 11.9344, -85.956, "c", "city", "A colonial city on Lake Nicaragua."], ["san-juan-del-sur", "San Juan del Sur", 11.2529, -85.8706, "c", "beach", "A Pacific surf and beach town."]] },
  { iso: "VE", name: "Venezuela", continent: "South America", lat: 7.1, lng: -66.2, rows: [["caracas", "Caracas", 10.4806, -66.9036, "C", "city"], ["angel-falls", "Angel Falls", 5.9701, -62.5362, "p", "hike", "The world's tallest uninterrupted waterfall, in Canaima National Park."]] },
  { iso: "GY", name: "Guyana", continent: "South America", lat: 4.9, lng: -58.9, rows: [["georgetown-guyana", "Georgetown", 6.8013, -58.1551, "C", "city"], ["kaieteur-falls", "Kaieteur Falls", 5.175, -59.4806, "p", "hike", "A single-drop waterfall in the rainforest, reached by small plane."]] },
  { iso: "SR", name: "Suriname", continent: "South America", lat: 4.0, lng: -56.0, rows: [["paramaribo", "Paramaribo", 5.852, -55.2038, "C", "city", "Paramaribo is the capital of Suriname. Its wooden colonial center is a UNESCO site."]] },
  { iso: "GF", name: "French Guiana", continent: "South America", lat: 4.0, lng: -53.0, rows: [["cayenne", "Cayenne", 4.9224, -52.3135, "C", "city"]] },

  // ---------- Oceania ----------
  { iso: "PF", name: "French Polynesia", continent: "Oceania", lat: -17.6, lng: -149.4, rows: [["papeete", "Papeete", -17.5516, -149.5585, "C", "city,island", "Papeete, on Tahiti, is the capital of French Polynesia."], ["bora-bora", "Bora Bora", -16.5004, -151.7415, "c", "island,beach", "A lagoon ringed by overwater bungalows under Mount Otemanu."], ["moorea", "Moorea", -17.5388, -149.8295, "c", "island,beach,hike", "Tahiti's sister island: jagged peaks and two bays, a short ferry away."]] },
  { iso: "PG", name: "Papua New Guinea", continent: "Oceania", lat: -6.3, lng: 143.9, rows: [["port-moresby", "Port Moresby", -9.4438, 147.1803, "C", "city"]] },
  { iso: "SB", name: "Solomon Islands", continent: "Oceania", lat: -9.6, lng: 160.2, rows: [["honiara", "Honiara", -9.4456, 159.9729, "C", "city,island"]] },
  { iso: "VU", name: "Vanuatu", continent: "Oceania", lat: -15.4, lng: 166.9, rows: [["port-vila", "Port Vila", -17.7334, 168.3273, "C", "city,island,beach"]] },
  { iso: "NC", name: "New Caledonia", continent: "Oceania", lat: -21.3, lng: 165.6, rows: [["noumea", "Nouméa", -22.2758, 166.458, "C", "city,beach", "Nouméa is the capital of New Caledonia, inside one of the world's largest lagoons."]] },
  { iso: "WS", name: "Samoa", continent: "Oceania", lat: -13.76, lng: -172.1, rows: [["apia", "Apia", -13.8506, -171.7513, "C", "city,beach,island"]] },
  { iso: "TO", name: "Tonga", continent: "Oceania", lat: -21.2, lng: -175.2, rows: [["nukualofa", "Nukuʻalofa", -21.1394, -175.2049, "C", "island"]] },
  { iso: "CK", name: "Cook Islands", continent: "Oceania", lat: -21.24, lng: -159.78, rows: [["avarua", "Avarua", -21.2075, -159.775, "C", "island,beach", "Avarua, on Rarotonga, is the capital of the Cook Islands. Aitutaki's lagoon is a short flight."]] },
  { iso: "TV", name: "Tuvalu", continent: "Oceania", lat: -8.52, lng: 179.2, rows: [["funafuti", "Funafuti", -8.5211, 179.1983, "C", "island"]] },
  { iso: "KI", name: "Kiribati", continent: "Oceania", lat: 1.4, lng: 173.0, rows: [["tarawa", "South Tarawa", 1.3291, 172.979, "C", "island"]] },
  { iso: "MH", name: "Marshall Islands", continent: "Oceania", lat: 7.1, lng: 171.2, rows: [["majuro", "Majuro", 7.0897, 171.3803, "C", "island"]] },
  { iso: "FM", name: "Micronesia", continent: "Oceania", lat: 6.9, lng: 158.2, rows: [["palikir", "Palikir", 6.9248, 158.1611, "C", "island"]] },
  { iso: "PW", name: "Palau", continent: "Oceania", lat: 7.5, lng: 134.58, rows: [["ngerulmud", "Ngerulmud", 7.5004, 134.6243, "C", "island"], ["rock-islands", "Rock Islands", 7.2, 134.38, "p", "island,beach", "Mushroom-shaped limestone islands and Jellyfish Lake."]] },
  { iso: "NR", name: "Nauru", continent: "Oceania", lat: -0.53, lng: 166.93, rows: [["yaren", "Yaren", -0.5477, 166.9209, "C", "island", "Nauru has no official capital; government offices are in Yaren."]] },
  { iso: "GU", name: "Guam", continent: "Oceania", lat: 13.44, lng: 144.79, rows: [["hagatna", "Hagåtña", 13.4757, 144.7489, "C", "island,beach", "Hagåtña is the capital of Guam. Tumon Bay is the beach."]] },
];

// Capitals still missing from countries already in the catalog, and destinations so every country
// has a few real places to rate. Keyed by the existing country's id.
const MORE: Record<string, Row[]> = {
  ch: [["bern", "Bern", 46.948, 7.4474, "C", "city", "Bern is the Swiss federal city: arcaded old town, bear park and the Aare."]],
  tr: [["fethiye", "Fethiye & Ölüdeniz", 36.5497, 29.1153, "c", "beach,hike", "The Blue Lagoon, paragliding and the Lycian Way."], ["ankara", "Ankara", 39.9334, 32.8597, "C", "city"], ["pamukkale", "Pamukkale", 37.9204, 29.1212, "l", "hike", "White travertine terraces beside the ruins of Hierapolis."], ["bodrum", "Bodrum", 37.0344, 27.4305, "c", "beach", "A whitewashed harbor town on the Aegean."]],
  ma: [["rabat", "Rabat", 34.0209, -6.8416, "C", "city"], ["agadir", "Agadir", 30.4278, -9.5981, "c", "beach", "A long Atlantic beach and the jumping-off point for the Anti-Atlas."]],
  jm: [["kingston", "Kingston", 17.9712, -76.7936, "C", "city,food", "Kingston is the capital of Jamaica. The Bob Marley Museum is here."]],
  cr: [["san-jose-cr", "San José", 9.9281, -84.0907, "C", "city"]],
  hr: [["zagreb", "Zagreb", 45.815, 15.9819, "C", "city"]],
  hk: [["hk-central", "Central & Victoria Peak", 22.2783, 114.1747, "c", "city,food,hike", "Skyscrapers, the Peak Tram and the harbor view."], ["kowloon", "Kowloon", 22.3193, 114.1694, "c", "city,food", "Tsim Sha Tsui's waterfront and Mong Kok's night markets."], ["lantau", "Lantau Island", 22.2559, 113.9046, "p", "island,hike", "The Big Buddha, Ngong Ping cable car and hiking trails."]],
  es: [["malaga", "Málaga", 36.7213, -4.4214, "c", "city,beach,food", "Picasso's hometown and the Costa del Sol."], ["valencia", "Valencia", 39.4699, -0.3763, "c", "city,beach,food", "The home of paella, the City of Arts and Sciences and city beaches."], ["san-sebastian", "San Sebastián", 43.3183, -1.9812, "c", "city,food,beach", "Pintxos bars in the old town and La Concha beach."], ["tenerife", "Tenerife", 28.2916, -16.6291, "c", "island,beach,hike", "The largest Canary Island, with Mount Teide at its center."]],
  fr: [["versailles", "Versailles", 48.8049, 2.1204, "l", "", "Louis XIV's palace and gardens, a train ride from Paris."], ["normandy-beaches", "Normandy D-Day Beaches", 49.3394, -0.8542, "l", "beach", "Omaha Beach and the American Cemetery."], ["corsica", "Corsica", 42.0396, 9.0129, "c", "island,beach,hike", "Mountains, the GR20 trail and Mediterranean beaches."], ["mont-saint-michel", "Mont-Saint-Michel", 48.6361, -1.5115, "l", "island", "A tidal island abbey off the Normandy coast."], ["loire-valley", "Loire Valley", 47.4167, 1.0, "l", "food", "Châteaux like Chambord and Chenonceau among vineyards."], ["marseille", "Marseille", 43.2965, 5.3698, "c", "city,beach,food", "The Old Port, bouillabaisse and the Calanques next door."], ["strasbourg", "Strasbourg", 48.5734, 7.7521, "c", "city,food", "Petite France's canals and a famous Christmas market."]],
  gb: [["scottish-highlands", "Loch Ness & the Highlands", 57.3229, -4.4244, "p", "mountain,hike", "Lochs, glens and castles north of Inverness."], ["giants-causeway", "Giant's Causeway", 55.2408, -6.5116, "l", "hike", "Basalt columns on the Northern Ireland coast."], ["snowdonia", "Eryri (Snowdonia)", 53.0685, -4.0763, "p", "mountain,hike", "Wales's highest mountain and slate villages."], ["cotswolds", "The Cotswolds", 51.8, -1.8, "l", "hike", "Honey-stone villages and rolling countryside."], ["stonehenge", "Stonehenge", 51.1789, -1.8262, "l", "", "The prehistoric stone circle on Salisbury Plain."], ["cambridge-uk", "Cambridge", 52.2053, 0.1218, "c", "city", "College lawns, punting on the Cam, and the other Oxford."], ["liverpool", "Liverpool", 53.4084, -2.9916, "c", "city", "The Beatles' city, docks and two football clubs."]],
  it: [["tuscany-siena", "Tuscany & Siena", 43.3188, 11.3308, "c", "city,food", "Siena's Piazza del Campo and Chianti wine country."], ["pisa", "Pisa", 43.7228, 10.4017, "l", "city", "The Leaning Tower and the Field of Miracles."], ["verona", "Verona", 45.4384, 10.9916, "c", "city", "A Roman arena and Juliet's balcony."], ["naples-pompeii", "Naples & Pompeii", 40.8518, 14.2681, "c", "city,food", "The home of pizza, and the buried Roman city a train ride away."], ["dolomites", "Dolomites", 46.4102, 11.844, "p", "mountain,hike", "Jagged peaks, via ferratas and ski slopes."], ["bologna", "Bologna", 44.4949, 11.3426, "c", "city,food", "Porticoes, towers and Italy's food capital."], ["sardinia", "Sardinia", 40.1209, 9.0129, "c", "island,beach", "Emerald-water beaches around a rugged island."], ["capri", "Capri", 40.5532, 14.2222, "c", "island,beach", "The Blue Grotto and cliffs above the Bay of Naples."]],
  de: [["rothenburg", "Rothenburg ob der Tauber", 49.3772, 10.1866, "c", "city", "A walled medieval town on the Romantic Road."], ["cologne", "Cologne", 50.9375, 6.9603, "c", "city", "The cathedral and the Rhine."], ["neuschwanstein", "Neuschwanstein", 47.5576, 10.7498, "l", "mountain", "The fairy-tale castle in the Bavarian foothills."], ["heidelberg", "Heidelberg", 49.3988, 8.6724, "c", "city", "A castle ruin above Germany's oldest university town."]],
  nl: [["the-hague", "The Hague", 52.0705, 4.3007, "c", "city,beach", "The seat of government, Vermeer's Girl with a Pearl Earring, and Scheveningen beach."]],
  pt: [["azores", "Azores", 37.7412, -25.6756, "c", "island,hike", "Crater lakes, hot springs and whale watching mid-Atlantic."]],
  gr: [["zakynthos", "Zakynthos", 37.787, 20.8999, "c", "island,beach", "Navagio's shipwreck beach."], ["milos", "Milos", 36.7213, 24.4264, "c", "island,beach", "Volcanic coves like Sarakiniko."], ["meteora", "Meteora", 39.7217, 21.6306, "l", "mountain,hike", "Monasteries on top of sandstone pillars."], ["corfu", "Corfu", 39.6243, 19.9217, "c", "island,beach", "Venetian old town and green Ionian coves."], ["rhodes", "Rhodes", 36.4349, 28.2176, "c", "island,beach", "A walled medieval old town and beaches."], ["thessaloniki", "Thessaloniki", 40.6401, 22.9444, "c", "city,food", "Byzantine churches, a long waterfront and a serious food scene."]],
  jp: [["fuji-five-lakes", "Mount Fuji & Fuji Five Lakes", 35.4983, 138.7685, "p", "mountain,hike", "Lake views of Fuji, and the summer climb."], ["okinawa", "Okinawa", 26.2124, 127.6809, "c", "island,beach", "Subtropical beaches, reefs and Ryukyu culture."], ["kanazawa", "Kanazawa", 36.5613, 136.6562, "c", "city,food", "Kenroku-en garden, geisha districts and seafood."]],
  th: [["koh-samui", "Koh Samui", 9.512, 100.0136, "c", "island,beach", "Palm-lined beaches in the Gulf of Thailand."], ["ayutthaya", "Ayutthaya", 14.3692, 100.5877, "l", "", "Temple ruins of the old Siamese capital, a day trip from Bangkok."], ["pai", "Pai", 19.3583, 98.4401, "c", "mountain,hike", "A backpacker valley town in the northern hills."]],
  vn: [["phu-quoc", "Phú Quốc", 10.2899, 103.984, "c", "island,beach", "Beaches and night markets in the Gulf of Thailand."], ["da-nang", "Da Nang", 16.0544, 108.2022, "c", "city,beach", "My Khe beach and the Marble Mountains, near Hội An."], ["sapa", "Sa Pa", 22.3364, 103.8438, "p", "mountain,hike", "Rice terraces and trekking near Fansipan."], ["hue", "Huế", 16.4637, 107.5909, "c", "city,food", "The Imperial City of the Nguyen emperors."]],
  id: [["nusa-penida", "Nusa Penida", -8.7275, 115.5444, "c", "island,beach", "Kelingking Beach's cliffs and manta rays, a boat from Bali."], ["raja-ampat", "Raja Ampat", -0.2346, 130.5079, "p", "island,beach", "Karst islands and some of the richest reefs on Earth."], ["lombok", "Lombok", -8.65, 116.3249, "c", "island,beach,hike", "Bali's quieter neighbor, with Mount Rinjani."]],
  au: [["uluru", "Uluru", -25.3444, 131.0369, "l", "desert", "The sandstone monolith at the heart of the Outback."], ["brisbane", "Brisbane", -27.4698, 153.0251, "c", "city", "A river city with a sunny climate and nearby islands."], ["perth", "Perth", -31.9505, 115.8605, "c", "city,beach", "Beaches, Rottnest Island's quokkas and long sunsets."], ["tasmania", "Tasmania", -42.8821, 147.3272, "c", "island,hike,food", "Hobart, MONA and wilderness hiking."], ["gold-coast", "Gold Coast", -28.0167, 153.4, "c", "beach", "Surf beaches and theme parks."]],
  ca: [["tofino", "Tofino", 49.153, -125.9066, "c", "beach,hike", "Surf beaches and rainforest on Vancouver Island."], ["whistler", "Whistler", 50.1163, -122.9574, "p", "mountain,hike", "North America's biggest ski resort, with mountain biking in summer."], ["victoria-bc", "Victoria", 48.4284, -123.3656, "c", "city", "British Columbia's capital on Vancouver Island."], ["jasper", "Jasper", 52.8734, -118.0814, "p", "mountain,hike", "Glaciers and lakes along the Icefields Parkway."]],
  mx: [["playa-del-carmen", "Playa del Carmen", 20.6296, -87.0739, "c", "beach", "Beach town between Cancún and Tulum, with ferries to Cozumel."], ["cabo-san-lucas", "Cabo San Lucas", 22.8905, -109.9167, "c", "beach", "El Arco and the meeting of the Pacific and the Sea of Cortez."], ["puerto-vallarta", "Puerto Vallarta", 20.6534, -105.2253, "c", "beach,food", "A malecón, cobbled old town and the Bay of Banderas."], ["merida", "Mérida", 20.9674, -89.5926, "c", "city,food", "The Yucatán's colonial capital, near cenotes and Maya sites."], ["chichen-itza", "Chichén Itzá", 20.6843, -88.5678, "l", "", "El Castillo pyramid, one of the New Seven Wonders."]],
  pe: [["arequipa", "Arequipa", -16.409, -71.5375, "c", "city,food", "The White City under El Misti, near Colca Canyon."], ["lake-titicaca", "Lake Titicaca", -15.8402, -70.0219, "p", "island", "Puno's floating Uros islands on the highest navigable lake."]],
  co: [["salento", "Salento & the Cocora Valley", 4.6377, -75.5703, "p", "mountain,hike", "Coffee farms and towering wax palms."], ["santa-marta", "Santa Marta", 11.2408, -74.199, "c", "beach", "A Caribbean city at the edge of Tayrona."]],
  eg: [["sharm-el-sheikh", "Sharm El Sheikh", 27.9158, 34.33, "c", "beach", "Red Sea diving and the base for Mount Sinai."], ["hurghada", "Hurghada", 27.2579, 33.8116, "c", "beach", "Red Sea reefs and resorts."]],
  no: [["geirangerfjord", "Geirangerfjord", 62.1049, 7.2059, "p", "mountain,hike", "A UNESCO fjord of waterfalls and cliffside farms."], ["bergen", "Bergen", 60.3913, 5.3221, "c", "city", "Bryggen's wooden wharf and the gateway to the fjords."], ["lofoten", "Lofoten Islands", 68.2093, 13.6114, "p", "island,mountain,hike", "Peaks rising straight out of the sea, red fishing cabins and the northern lights."], ["tromso", "Tromsø", 69.6492, 18.9553, "c", "city", "The northern-lights capital above the Arctic Circle."]],
  se: [["gothenburg", "Gothenburg", 57.7089, 11.9746, "c", "city,food", "Canals, seafood and an archipelago by tram and ferry."], ["abisko", "Abisko & Swedish Lapland", 68.3495, 18.8312, "p", "mountain,hike", "Northern lights and the Kungsleden trail, north of Kiruna and its Icehotel."]],
  dk: [["aarhus", "Aarhus", 56.1629, 10.2039, "c", "city", "Denmark's second city and its rooftop rainbow walkway."]],
  fi: [["rovaniemi", "Rovaniemi", 66.5039, 25.7294, "c", "", "Lapland on the Arctic Circle: northern lights and reindeer."]],
  be: [["bruges", "Bruges", 51.2093, 3.2247, "c", "city,food", "Medieval canals, a belfry and chocolate shops."], ["ghent", "Ghent", 51.0543, 3.7174, "c", "city", "Canals and the Ghent Altarpiece."], ["antwerp", "Antwerp", 51.2194, 4.4025, "c", "city", "Fashion, diamonds, Rubens and a grand train station."]],
  at: [["salzburg", "Salzburg", 47.8095, 13.055, "c", "city", "Mozart's birthplace and The Sound of Music."], ["hallstatt", "Hallstatt", 47.5622, 13.6493, "c", "mountain", "A lakeside village under the Dachstein."], ["innsbruck", "Innsbruck", 47.2692, 11.4041, "c", "city,mountain", "An Alpine city with ski slopes a cable car away."]],
  pl: [["gdansk", "Gdańsk", 54.352, 18.6466, "c", "city", "A rebuilt Hanseatic old town on the Baltic."]],
  hu: [["lake-balaton", "Lake Balaton", 46.83, 17.73, "p", "beach", "Central Europe's largest lake, Hungary's summer beach."]],
  si: [["lake-bled", "Lake Bled", 46.3683, 14.1146, "p", "mountain,hike", "A church on an island in an Alpine lake."], ["piran", "Piran", 45.5285, 13.5683, "c", "beach", "A Venetian-style town on Slovenia's short coast."]],
  sk: [["high-tatras", "High Tatras", 49.1667, 20.1333, "p", "mountain,hike", "The Carpathians' highest peaks, for hiking and skiing."]],
  ro: [["brasov", "Brașov", 45.6427, 25.5887, "c", "city,mountain", "A Saxon old town in Transylvania, near Bran Castle."]],
  bg: [["plovdiv", "Plovdiv", 42.1354, 24.7453, "c", "city", "A Roman theater and painted old town houses."]],
  rs: [["novi-sad", "Novi Sad", 45.2671, 19.8335, "c", "city", "Petrovaradin Fortress and the EXIT festival."]],
  al: [["ksamil", "Ksamil & the Albanian Riviera", 39.7667, 20.0, "c", "beach", "Clear Ionian water across from Corfu."], ["berat", "Berat", 40.7058, 19.9522, "c", "city", "The town of a thousand windows."]],
  me: [["kotor", "Kotor", 42.4247, 18.7712, "c", "city,hike", "A walled town at the end of a fjord-like bay."], ["budva", "Budva", 42.2864, 18.84, "c", "beach", "An old town and beaches on the Adriatic."]],
  mt: [["gozo", "Gozo", 36.0443, 14.2512, "c", "island,beach", "Malta's quieter sister island, for diving and walking."]],
  cy: [["paphos", "Paphos", 34.7754, 32.4245, "c", "beach", "Roman mosaics and Aphrodite's Rock."]],
  ge: [["kazbegi", "Kazbegi", 42.6567, 44.6436, "p", "mountain,hike", "Gergeti Trinity Church under Mount Kazbek."], ["batumi", "Batumi", 41.6168, 41.6367, "c", "beach,city", "A Black Sea resort city."]],
  sg: [["sentosa", "Sentosa", 1.2494, 103.8303, "c", "beach,island", "Beaches and attractions on Singapore's resort island."]],
  tw: [["taroko-gorge", "Taroko Gorge", 24.1586, 121.6219, "p", "mountain,hike", "A marble canyon on Taiwan's east coast."], ["tainan", "Tainan", 22.9997, 120.227, "c", "city,food", "Taiwan's oldest city and its street-food capital."]],
  my: [["penang", "Penang", 5.4141, 100.3288, "c", "city,food", "George Town's street art, shophouses and hawker food."], ["langkawi", "Langkawi", 6.35, 99.8, "c", "island,beach", "A duty-free island of beaches and rainforest."], ["kota-kinabalu", "Kota Kinabalu", 5.9804, 116.0735, "c", "city,mountain", "The base for Mount Kinabalu in Malaysian Borneo."]],
  in: [["udaipur", "Udaipur", 24.5854, 73.7125, "c", "city", "The City of Lakes and its lake palaces."], ["leh-ladakh", "Leh & Ladakh", 34.1526, 77.5771, "p", "mountain,hike", "High-altitude monasteries and mountain passes."], ["rishikesh", "Rishikesh", 30.0869, 78.2676, "c", "mountain", "Yoga ashrams and rafting on the Ganges."], ["agra", "Agra", 27.1767, 78.0081, "l", "", "The Taj Mahal."], ["jaipur", "Jaipur", 26.9124, 75.7873, "c", "city", "The Pink City: Amber Fort and Hawa Mahal."], ["goa", "Goa", 15.2993, 74.124, "c", "beach,food", "Beaches and Portuguese-era churches."], ["kerala", "Kerala Backwaters", 9.4981, 76.3388, "p", "food", "Houseboats on the lagoons around Alleppey."], ["varanasi", "Varanasi", 25.3176, 82.9739, "c", "city", "Ghats on the Ganges, one of the world's oldest living cities."]],
  np: [["pokhara", "Pokhara", 28.2096, 83.9856, "c", "mountain,hike", "Lakeside town and the start of the Annapurna treks."], ["everest-base-camp", "Everest Base Camp", 28.0026, 86.8528, "p", "mountain,hike", "The classic Khumbu trek from Lukla."]],
  lk: [["kandy", "Kandy", 7.2906, 80.6337, "c", "city", "The Temple of the Tooth in the hill country."], ["ella", "Ella", 6.8667, 81.0466, "c", "mountain,hike", "Tea hills and the Nine Arch Bridge."], ["sigiriya", "Sigiriya", 7.957, 80.7603, "l", "hike", "A fortress on top of a giant rock."], ["galle", "Galle", 6.0535, 80.221, "c", "beach", "A Dutch colonial fort town on the south coast."]],
  bt: [["paro", "Paro & Tiger's Nest", 27.4916, 89.3634, "l", "mountain,hike", "Paro Taktsang monastery on a cliff above the valley."]],
  mn: [["gobi", "Gobi Desert", 43.5, 104.0, "p", "desert", "Sand dunes, dinosaur fossils and nights in a ger."]],
  kz: [["almaty", "Almaty", 43.222, 76.8512, "c", "city,mountain", "Kazakhstan's largest city, under the Tian Shan."]],
  uz: [["samarkand", "Samarkand", 39.6542, 66.9597, "c", "city", "The Registan's tiled madrasas on the Silk Road."], ["bukhara", "Bukhara", 39.7681, 64.4556, "c", "city", "A Silk Road old town of mosques and trading domes."]],
  jo: [["petra", "Petra", 30.3285, 35.4444, "l", "hike,desert", "The Treasury and a rose-red city carved into rock."], ["wadi-rum", "Wadi Rum", 29.5328, 35.4206, "p", "desert", "Red desert valleys and Bedouin camps."], ["dead-sea-jordan", "Dead Sea", 31.7193, 35.5856, "p", "beach", "Float in water nearly ten times saltier than the ocean."]],
  om: [["nizwa", "Nizwa", 22.9333, 57.5333, "c", "desert", "A fort, a souq and the Hajar mountains."]],
  ar: [["ushuaia", "Ushuaia", -54.8019, -68.303, "c", "mountain,hike", "The southernmost city, and the departure point for Antarctica."], ["el-calafate", "El Calafate & Perito Moreno", -50.3379, -72.2648, "p", "mountain,hike", "Patagonia's Perito Moreno Glacier, calving into Lago Argentino."], ["iguazu-ar", "Iguazú Falls", -25.6953, -54.4367, "p", "hike", "Hundreds of waterfalls on the Argentina-Brazil border."], ["mendoza", "Mendoza", -32.8895, -68.8458, "c", "food,mountain", "Malbec country beneath Aconcagua."], ["bariloche", "Bariloche", -41.1335, -71.3103, "c", "mountain,hike", "Lakes, chocolate shops and skiing in northern Patagonia."]],
  cl: [["torres-del-paine", "Torres del Paine", -50.9423, -73.4068, "p", "mountain,hike", "Granite towers and the W Trek in Patagonia."], ["atacama", "San Pedro de Atacama", -22.9087, -68.1997, "p", "desert", "Salt flats, geysers and some of the clearest night skies on Earth."], ["valparaiso", "Valparaíso", -33.0472, -71.6127, "c", "city", "Colorful hillside houses and funiculars."], ["easter-island", "Easter Island", -27.1127, -109.3497, "l", "island", "The moai statues of Rapa Nui."]],
  br: [["lencois-maranhenses", "Lençóis Maranhenses", -2.4858, -43.1281, "p", "desert,beach", "White dunes with rainwater lagoons between them."], ["fernando-de-noronha", "Fernando de Noronha", -3.8549, -32.4241, "p", "island,beach", "A protected archipelago with some of Brazil's best beaches."], ["salvador-brazil", "Salvador", -12.9777, -38.5016, "c", "city,beach,food", "Pelourinho's colonial center and Afro-Brazilian culture."], ["florianopolis", "Florianópolis", -27.5954, -48.548, "c", "beach,island", "An island city with dozens of beaches."], ["amazon-manaus", "Manaus & the Amazon", -3.119, -60.0217, "p", "", "The gateway to Amazon rainforest lodges."]],
  uy: [["punta-del-este", "Punta del Este", -34.9667, -54.95, "c", "beach", "South America's summer beach resort."], ["colonia", "Colonia del Sacramento", -34.4626, -57.8398, "c", "city", "A Portuguese colonial old town, a ferry from Buenos Aires."]],
  pa: [["bocas-del-toro", "Bocas del Toro", 9.3403, -82.2419, "c", "island,beach", "A Caribbean archipelago of surf and stilt houses."], ["san-blas", "San Blas Islands", 9.5667, -78.8333, "p", "island,beach", "Guna Yala's tiny palm islands."]],
  ec: [["galapagos", "Galápagos Islands", -0.9538, -90.9656, "p", "island,beach", "Giant tortoises, marine iguanas and sea lions."], ["cuenca", "Cuenca", -2.9001, -79.0059, "c", "city", "A colonial city in the Andes."]],
  bz: [["ambergris-caye", "Ambergris Caye", 17.9214, -87.9611, "c", "island,beach", "San Pedro and the Belize Barrier Reef."], ["caye-caulker", "Caye Caulker", 17.7428, -88.0245, "c", "island,beach", "A car-free island; Go Slow."]],
  nz: [["queenstown", "Queenstown", -45.0312, 168.6626, "c", "mountain,hike", "The adventure capital on Lake Wakatipu."], ["milford-sound", "Milford Sound", -44.6414, 167.8974, "p", "mountain,hike", "Fiordland's waterfalls and sheer cliffs."], ["rotorua", "Rotorua", -38.1368, 176.2497, "c", "", "Geysers, hot pools and Māori culture."]],
  fj: [["nadi", "Nadi & the Mamanucas", -17.7765, 177.4356, "c", "island,beach", "The arrival town and the resort islands offshore."]],
  gh: [["cape-coast", "Cape Coast", 5.1053, -1.2466, "l", "beach", "Cape Coast Castle, a memorial to the Atlantic slave trade."]],
  rw: [["volcanoes-np", "Volcanoes National Park", -1.4833, 29.5333, "p", "mountain,hike", "Mountain gorilla treks in the Virunga volcanoes."]],
  bw: [["okavango", "Okavango Delta", -19.2833, 22.9, "p", "", "Safaris by mokoro canoe in an inland delta."], ["chobe", "Chobe National Park", -18.65, 24.5, "p", "", "Huge elephant herds along the Chobe River."]],
  na: [["sossusvlei", "Sossusvlei", -24.7275, 15.3412, "p", "desert", "Towering red dunes and Deadvlei's dead trees."], ["etosha", "Etosha National Park", -18.8556, 16.3293, "p", "desert", "Wildlife around waterholes on a vast salt pan."], ["swakopmund", "Swakopmund", -22.6784, 14.5266, "c", "beach,desert", "Where the desert meets the Atlantic."]],
  za: [["stellenbosch", "Stellenbosch & the Winelands", -33.9321, 18.8602, "c", "food", "Wine estates an hour from Cape Town."], ["kruger", "Kruger National Park", -23.9884, 31.5547, "p", "", "Big Five safaris."], ["garden-route", "Garden Route", -34.0363, 23.0471, "p", "beach,hike", "Coastal drives from Mossel Bay to Plettenberg Bay."]],
  sn: [["goree", "Gorée Island", 14.6672, -17.3983, "l", "island", "The House of Slaves, a memorial off Dakar."], ["saint-louis-senegal", "Saint-Louis", 16.0179, -16.4896, "c", "city", "A colonial island town at the mouth of the Senegal River."]],
  tn: [["sidi-bou-said", "Sidi Bou Said", 36.8687, 10.3416, "c", "beach", "Blue-and-white cliffside village outside Tunis."], ["djerba", "Djerba", 33.8076, 10.8451, "c", "island,beach", "A Mediterranean island of beaches and whitewashed mosques."]],
  mu: [["le-morne", "Le Morne", -20.4561, 57.3089, "p", "beach,hike", "A mountain and lagoon on Mauritius's southwest tip."]],
  tz: [["zanzibar", "Zanzibar", -6.1659, 39.2026, "c", "island,beach,food", "Stone Town's alleys and white-sand east-coast beaches."], ["serengeti", "Serengeti", -2.3333, 34.8333, "p", "", "The Great Migration."], ["kilimanjaro", "Mount Kilimanjaro", -3.0674, 37.3556, "p", "mountain,hike", "Africa's highest peak, climbable without ropes."]],
  ke: [["maasai-mara", "Maasai Mara", -1.4061, 35.0, "p", "", "Big cats and the wildebeest river crossings."], ["diani", "Diani Beach", -4.3167, 39.5667, "c", "beach", "White sand on the Indian Ocean south of Mombasa."], ["lamu", "Lamu", -2.2717, 40.902, "c", "island", "A Swahili stone town with donkeys instead of cars."]],
  ph: [["el-nido", "El Nido", 11.1784, 119.3913, "c", "island,beach", "Limestone lagoons in Palawan's Bacuit Bay."], ["boracay", "Boracay", 11.9674, 121.9248, "c", "island,beach", "White Beach and sunset sailing."], ["siargao", "Siargao", 9.8482, 126.0458, "c", "island,beach", "Cloud 9 surf and island hopping."], ["cebu", "Cebu", 10.3157, 123.8854, "c", "city,island,beach", "Diving, waterfalls and whale sharks in the Visayas."]],
  kh: [["siem-reap", "Siem Reap & Angkor Wat", 13.4125, 103.867, "l", "", "Angkor Wat at sunrise and the temples of Angkor."]],
  laos: [["luang-prabang", "Luang Prabang", 19.8834, 102.1347, "c", "city", "Temples, the morning alms walk and Kuang Si Falls."]],
  bd: [["coxs-bazar", "Cox's Bazar", 21.4272, 92.0058, "c", "beach", "One of the world's longest natural sea beaches."]],
  bo: [["uyuni", "Salar de Uyuni", -20.1338, -67.4891, "p", "desert", "The world's largest salt flat, a mirror in the rainy season."]],
  gt: [["antigua-guatemala", "Antigua Guatemala", 14.5586, -90.7295, "c", "city", "Colonial ruins under three volcanoes."], ["lake-atitlan", "Lake Atitlán", 14.6907, -91.2025, "p", "hike", "A volcano-ringed lake with Maya villages."], ["tikal", "Tikal", 17.2221, -89.6237, "l", "hike", "Maya temples rising above the jungle canopy."]],
  et: [["lalibela", "Lalibela", 12.0316, 39.0475, "l", "", "Churches carved down into solid rock."]],
  us: [["phoenix-scottsdale", "Phoenix & Scottsdale", 33.4942, -111.9261, "c", "city,desert", "Desert resorts, golf and Camelback Mountain."], ["dallas", "Dallas", 32.7767, -96.797, "c", "city,food", "Arts District, Deep Ellum and Tex-Mex."], ["maui", "Maui", 20.7984, -156.3319, "c", "island,beach,hike", "The Road to Hana, Haleakalā sunrise and Kaanapali beach."], ["kauai", "Kauaʻi", 22.0964, -159.5261, "c", "island,beach,hike", "The Nā Pali Coast and Waimea Canyon."], ["aspen", "Aspen", 39.1911, -106.8175, "c", "mountain,hike", "Skiing in winter and the Maroon Bells in summer."], ["park-city", "Park City", 40.6461, -111.498, "c", "mountain", "Ski resorts and the Sundance Film Festival."], ["palm-springs", "Palm Springs", 33.8303, -116.5453, "c", "desert", "Mid-century modern pools, Coachella valley and Joshua Tree nearby."], ["santa-barbara", "Santa Barbara", 34.4208, -119.6982, "c", "beach,food", "Spanish-style downtown, beaches and wine country."], ["nantucket", "Nantucket", 41.2835, -70.0995, "c", "island,beach", "Cobblestones, cedar-shingle houses and beaches, by ferry from Hyannis."], ["st-augustine", "St. Augustine", 29.9012, -81.3124, "c", "city,beach", "The oldest continuously inhabited European-founded city in the U.S."], ["hilton-head", "Hilton Head", 32.2163, -80.7526, "c", "beach", "Beaches, bike paths and golf on South Carolina's coast."], ["tampa-st-pete", "Tampa & St. Petersburg", 27.7676, -82.6403, "c", "city,beach", "Gulf beaches, the Dalí Museum and Ybor City."]],
};

const US_STATE: Record<string, string> = {
  "phoenix-scottsdale": "Arizona", dallas: "Texas", maui: "Hawaii", kauai: "Hawaii", aspen: "Colorado", "park-city": "Utah",
  "palm-springs": "California", "santa-barbara": "California", nantucket: "Massachusetts", "st-augustine": "Florida",
  "hilton-head": "South Carolina", "tampa-st-pete": "Florida",
};

function label(country: NewCountry | { name: string; label?: string }): string {
  if (country.label) return country.label;
  const the = ["Philippines", "Netherlands", "Bahamas", "Maldives", "Seychelles", "Comoros", "Solomon Islands", "Marshall Islands", "Cayman Islands", "Turks and Caicos Islands", "U.S. Virgin Islands", "British Virgin Islands", "Faroe Islands", "Cook Islands", "Palestinian Territories", "Republic of the Congo", "Central African Republic", "United Arab Emirates", "United Kingdom", "United States", "Czech Republic"];
  return the.includes(country.name) ? `the ${country.name}` : country.name;
}

const CAT: Record<Row[4], NonNullable<Place["cat"]>> = { C: "city", c: "city", p: "park", l: "landmark" };

function spot(row: Row, iso: string, parentId: string, region: string, countryLabel: string): Place {
  const [id, name, lat, lng, kind, tags, blurb] = row;
  return {
    id,
    name,
    kind: "spot",
    iso,
    parentId,
    lat,
    lng,
    region,
    blurb: blurb ?? (kind === "C" ? `${name} is the capital of ${countryLabel}.` : ""),
    guide: "",
    stays: [],
    tags: tags ? tags.split(",") : [],
    aliases: [name.toLowerCase()],
    cat: CAT[kind],
  };
}

/** New countries with their capitals and destinations, plus destinations for countries already listed. */
export function worldCatalog(existing: Place[]): Place[] {
  const have = new Set(existing.map((p) => p.id));
  const haveIso = new Set(existing.filter((p) => p.kind === "country").map((p) => p.iso));
  const out: Place[] = [];
  const add = (p: Place) => {
    if (have.has(p.id)) return;
    have.add(p.id);
    out.push(p);
  };
  for (const c of NEW_COUNTRIES) {
    if (haveIso.has(c.iso)) continue;
    CONTINENT_BY_ISO[c.iso] = c.continent;
    const id = c.id ?? c.iso.toLowerCase();
    add({ id, name: c.name, kind: "country", iso: c.iso, lat: c.lat, lng: c.lng, region: c.continent, blurb: "", guide: "", stays: [], tags: [], aliases: [c.name.toLowerCase()] });
    for (const row of c.rows) add(spot(row, c.iso, id, c.name, label(c)));
  }
  const byId = new Map(existing.map((p) => [p.id, p]));
  for (const [parentId, rows] of Object.entries(MORE)) {
    const parent = byId.get(parentId);
    if (!parent || parent.kind !== "country") continue;
    for (const row of rows) add(spot(row, parent.iso, parentId, parentId === "us" ? (US_STATE[row[0]] ?? "United States") : parent.name, label(parent)));
  }
  return out;
}
