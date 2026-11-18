// Major cities and popular destinations inside each country, so students can
// review a specific place instead of a whole country. Rows are turned into
// Place records in data.ts (iso and region come from the parent country).

export type SpotRow = {
  id: string;
  name: string;
  parent: string;
  lat: number;
  lng: number;
  tags: string[];
  blurb: string;
  guide: string;
  aliases?: string[];
};

const s = (id: string, name: string, parent: string, lat: number, lng: number, tags: string[], blurb: string, guide: string, aliases: string[] = []): SpotRow => ({
  id,
  name,
  parent,
  lat,
  lng,
  tags,
  blurb,
  guide,
  aliases,
});

export const SPOT_ROWS: SpotRow[] = [
  // Puerto Rico
  s("sanjuan", "San Juan", "pr", 18.466, -66.106, ["city", "beach", "food"], "Old San Juan's forts by day, Condado's beach after.", "Old San Juan is walkable and best before the cruise crowds; Condado and Ocean Park are where most groups stay for the beach.", ["old san juan", "condado"]),
  s("fajardo", "Fajardo & the bio bay", "pr", 18.33, -65.65, ["beach", "coast", "nature"], "Kayak a bioluminescent bay at night.", "Book a new-moon night if you can; the glow is much brighter. Ferries to Culebra and Vieques leave nearby from Ceiba.", ["fajardo", "bio bay", "laguna grande"]),
  s("culebra", "Culebra", "pr", 18.31, -65.3, ["beach", "island"], "Flamenco Beach and almost nothing else, on purpose.", "A day trip or one night. Ferry seats sell out on weekends; small planes from San Juan are the backup.", ["flamenco beach"]),
  s("rincon", "Rincón", "pr", 18.34, -67.25, ["beach", "coast"], "The west-coast surf town with the sunsets.", "About 2.5 hours from San Juan by car. Winter brings big surf and whale season.", []),
  s("elyunque", "El Yunque", "pr", 18.3, -65.78, ["hike", "nature", "mountain"], "The only tropical rainforest in the U.S. forest system.", "Some areas need a timed-entry reservation from recreation.gov. Go early and bring a rain layer.", ["yunque"]),

  // Mexico
  s("tulum", "Tulum", "mx", 20.21, -87.47, ["beach", "coast", "culture"], "Ruins on a cliff over Caribbean water, plus cenotes.", "Pricier than it looks online. Rent bikes, see the ruins at opening, and spend afternoons in cenotes.", ["tulum"]),
  s("cancun", "Cancún", "mx", 21.16, -86.85, ["beach", "nightlife"], "The easy nonstop beach week.", "The Hotel Zone is resort-style; Isla Mujeres is a cheap ferry away for a calmer day.", ["cancun", "isla mujeres"]),
  s("puertoescondido", "Puerto Escondido", "mx", 15.86, -97.07, ["beach", "coast"], "Oaxaca's surf coast, slower and cheaper than Quintana Roo.", "Zicatela is for experienced surfers; Carrizalillo and Playa Manzanillo are the swimming beaches.", ["puerto escondido"]),
  s("guadalajara", "Guadalajara", "mx", 20.67, -103.35, ["city", "food"], "Mariachi, tequila country and a big-city food scene.", "Day-trip to the town of Tequila by train or bus. Tlaquepaque is the crafts neighborhood.", ["guadalajara", "tequila"]),
  s("sanmiguel", "San Miguel de Allende", "mx", 20.91, -100.74, ["city", "culture", "food"], "A colonial hill town of pink stone and rooftop bars.", "Fly into León or Querétaro. Cobblestones and hills, so pack real shoes.", ["san miguel"]),

  // Italy
  s("venice", "Venice", "it", 45.44, 12.32, ["city", "culture"], "Canals and no cars. Stay a night so you see it empty.", "Day-trippers pay an access fee on peak days, so check before you go. Mornings and evenings are the quiet part.", ["venezia"]),
  s("cinqueterre", "Cinque Terre", "it", 44.13, 9.71, ["coast", "hike", "beach"], "Five cliff villages linked by trail and train.", "The Cinque Terre card covers trains and trails. Some trail sections close after storms, so check before you hike.", ["cinque terre", "manarola", "vernazza"]),
  s("milan", "Milan", "it", 45.46, 9.19, ["city", "food"], "Fashion, the Duomo roof, and a fast train to the lakes.", "Book The Last Supper weeks ahead. Lake Como is an hour by train.", ["milano"]),
  s("sicily", "Sicily", "it", 38.12, 13.36, ["coast", "food", "beach"], "Street food in Palermo, Greek temples and Etna.", "Big island, so pick one coast. A car helps outside Palermo and Catania.", ["palermo", "catania", "taormina"]),
  s("lakecomo", "Lake Como", "it", 46.0, 9.26, ["mountain", "coast"], "Villas, ferries and mountains on the water.", "Base in Varenna or Como town and use the ferries. Bellagio is pricier.", ["como", "bellagio", "varenna"]),

  // Japan
  s("osaka", "Osaka", "jp", 34.69, 135.5, ["city", "food"], "Japan's street-food city, 15 minutes from Kyoto by Shinkansen.", "Dotonbori at night, Kuromon market in the morning. A good base for Nara and Kyoto day trips.", ["osaka", "dotonbori"]),
  s("hiroshima", "Hiroshima & Miyajima", "jp", 34.39, 132.46, ["city", "culture", "island"], "The Peace Memorial, then the floating torii.", "Spend a morning at the museum and an afternoon on Miyajima by ferry. The torii looks best at high tide.", ["miyajima", "itsukushima"]),
  s("nara", "Nara", "jp", 34.69, 135.8, ["temple", "culture"], "Todai-ji's giant Buddha and the bowing deer.", "An easy half-day from Kyoto or Osaka. Buy deer crackers only from the official stands.", []),
  s("hakone", "Hakone", "jp", 35.23, 139.11, ["mountain", "nature"], "Hot springs and Mount Fuji views, 90 minutes from Tokyo.", "The Hakone Free Pass covers the loop of train, cable car and boat. Book a ryokan with an onsen for one night.", ["fuji", "onsen"]),
  s("sapporo", "Sapporo & Hokkaido", "jp", 43.06, 141.35, ["mountain", "ski", "food"], "Powder snow in winter, flower fields in summer.", "Niseko is the ski town; Sapporo has the snow festival in early February.", ["hokkaido", "niseko"]),

  // Spain
  s("madrid", "Madrid", "es", 40.42, -3.7, ["city", "food", "culture"], "The Prado, late dinners and Retiro Park.", "Dinner starts at 9 or later. Museums have free evening hours, so check the times.", []),
  s("seville", "Seville", "es", 37.39, -5.98, ["city", "culture", "food"], "Flamenco, orange trees and the Alcázar.", "Avoid July and August heat. Book Alcázar tickets ahead; spring has Semana Santa and the Feria.", ["sevilla"]),
  s("granada", "Granada", "es", 37.18, -3.6, ["city", "culture", "mountain"], "The Alhambra and free tapas with every drink.", "Alhambra tickets sell out weeks ahead, so book on the official site. Albaicín has the viewpoints.", ["alhambra"]),
  s("mallorca", "Mallorca", "es", 39.57, 2.65, ["beach", "island", "coast"], "Coves, mountain roads and Palma's old town.", "Rent a car for the coves. Shoulder season (May, September) is calmer and cheaper.", ["palma", "majorca"]),
  s("ibiza", "Ibiza", "es", 38.91, 1.43, ["beach", "island", "nightlife"], "Clubs, but also quiet beaches in the north.", "Clubs are expensive; the north coast and Formentera day trips are the calm side.", ["formentera"]),

  // France
  s("nice", "Nice & the Riviera", "fr", 43.7, 7.27, ["beach", "coast", "city"], "Pebble beaches, the Promenade, and trains to Monaco.", "Cheap regional trains reach Monaco, Èze and Antibes. The old town market is the morning.", ["riviera", "cote d'azur", "monaco"]),
  s("lyon", "Lyon", "fr", 45.76, 4.84, ["city", "food"], "France's food capital, without Paris prices.", "Eat at a bouchon, wander the traboules in Vieux Lyon. Two hours from Paris by TGV.", []),
  s("provence", "Provence", "fr", 43.95, 4.81, ["culture", "food"], "Lavender in July, markets and Roman ruins.", "Base in Avignon or Aix. Lavender peaks late June to July; a car helps with the villages.", ["avignon", "aix", "lavender"]),
  s("chamonix", "Chamonix", "fr", 45.92, 6.87, ["mountain", "ski", "hike"], "Under Mont Blanc. Skiing in winter, hiking in summer.", "The Aiguille du Midi cable car is the view; go on a clear morning. Geneva is the nearest airport.", ["mont blanc"]),
  s("bordeaux", "Bordeaux", "fr", 44.84, -0.58, ["city", "food"], "Wine country with a grand riverside city.", "La Cité du Vin is the museum; Saint-Émilion is the easy vineyard day trip.", []),

  // United Kingdom
  s("skye", "Isle of Skye", "gb", 57.27, -6.21, ["island", "hike", "nature"], "The Old Man of Storr, fairy pools and wild weather.", "Rooms are scarce in summer, so book early. A car is almost essential.", ["skye", "highlands"]),
  s("oxford", "Oxford", "gb", 51.75, -1.26, ["city", "culture"], "The other place. Colleges, libraries and punting.", "An hour from London. Some colleges charge entry; the Bodleian has tours.", []),
  s("lakedistrict", "Lake District", "gb", 54.46, -3.09, ["hike", "mountain", "nature"], "England's best walking country.", "Windermere and Keswick are the bases. Trains reach Windermere; buses do the rest.", ["windermere", "keswick"]),
  s("bath", "Bath", "gb", 51.38, -2.36, ["city", "culture"], "Roman baths and honey-colored Georgian streets.", "90 minutes from London by train. Thermae Bath Spa is the modern soak.", []),

  // Iceland
  s("goldencircle", "Golden Circle", "is", 64.26, -21.13, ["nature", "hike"], "Þingvellir, Geysir and Gullfoss in one loop.", "Doable as a day trip from Reykjavik. Add the Secret Lagoon for a cheaper soak.", ["thingvellir", "geysir", "gullfoss"]),
  s("vik", "Vík & the South Coast", "is", 63.42, -19.01, ["coast", "nature"], "Black-sand beaches and waterfalls you can walk behind.", "Stay out of the waves at Reynisfjara; sneaker waves are deadly. Seljalandsfoss and Skógafoss are on the way.", ["reynisfjara", "skogafoss", "seljalandsfoss"]),
  s("bluelagoon", "Blue Lagoon", "is", 63.88, -22.45, ["nature"], "The famous milky geothermal spa near the airport.", "Book a time slot ahead. It works best right after landing or before your flight out.", []),
  s("jokulsarlon", "Jökulsárlón", "is", 64.05, -16.18, ["nature", "coast"], "A glacier lagoon full of icebergs, next to Diamond Beach.", "About five hours from Reykjavik, so plan an overnight on the south coast.", ["glacier lagoon", "diamond beach"]),

  // Portugal
  s("porto", "Porto", "pt", 41.15, -8.61, ["city", "food"], "Port cellars, tiled churches and the Douro.", "Cross the bridge to the Gaia cellars. A Douro Valley day trip is the classic add-on.", ["oporto", "douro"]),
  s("algarve", "Algarve", "pt", 37.1, -8.67, ["beach", "coast"], "Golden cliffs and sea caves.", "Lagos is the base students like. Book a boat or kayak to the Benagil cave.", ["lagos", "benagil", "faro"]),
  s("sintra", "Sintra", "pt", 38.8, -9.38, ["culture", "hike"], "Fairy-tale palaces 40 minutes from Lisbon.", "Go on a weekday and start at Pena Palace at opening. Trains leave from Lisbon's Rossio station.", ["pena palace"]),
  s("madeira", "Madeira", "pt", 32.65, -16.91, ["island", "hike", "nature"], "Levada trails along cliffs over the Atlantic.", "Funchal is the base. Some trails need a small fee or booking now.", ["funchal"]),

  // South Korea
  s("busan", "Busan", "kr", 35.18, 129.08, ["city", "beach", "food"], "Beaches, fish markets and hillside villages.", "Under three hours from Seoul by KTX. Haeundae is the beach; Gamcheon is the painted village.", ["haeundae"]),
  s("jeju", "Jeju Island", "kr", 33.49, 126.53, ["island", "hike", "beach"], "Volcanic hikes and tangerine farms.", "A short flight from Seoul. Hike Seongsan Ilchulbong at sunrise; a car helps.", ["jeju"]),
  s("gyeongju", "Gyeongju", "kr", 35.86, 129.22, ["culture", "temple"], "The ancient Silla capital, a museum without walls.", "Bulguksa temple and the royal tombs. An easy stop between Seoul and Busan.", []),

  // Morocco
  s("fes", "Fes", "ma", 34.03, -5.0, ["city", "culture"], "The world's largest car-free medina.", "Hire a licensed guide for the first visit; the medina is a maze. The tanneries are the famous view.", ["fez"]),
  s("merzouga", "Sahara (Merzouga)", "ma", 31.1, -4.01, ["desert"], "Camel trek into the Erg Chebbi dunes and a night in camp.", "A long drive from Marrakech or Fes, so most people take a 3-day tour. Nights are cold in winter.", ["sahara", "erg chebbi"]),
  s("essaouira", "Essaouira", "ma", 31.51, -9.77, ["coast", "beach", "culture"], "A windy, relaxed port town on the Atlantic.", "About three hours from Marrakech by bus. Kitesurfing, fresh fish at the port, and a calmer medina.", []),

  // Costa Rica
  s("monteverde", "Monteverde", "cr", 10.3, -84.82, ["nature", "hike", "mountain"], "Cloud forest, hanging bridges and ziplines.", "Bring layers; it's cool and misty. Night tours are the best bet for wildlife.", []),
  s("manuelantonio", "Manuel Antonio", "cr", 9.39, -84.14, ["beach", "nature"], "A national park where the beach is full of monkeys.", "The park is closed Tuesdays and has a daily cap, so buy tickets online.", ["quepos"]),
  s("tamarindo", "Tamarindo", "cr", 10.3, -85.84, ["beach", "coast"], "Guanacaste's surf town, close to Liberia airport.", "Dry season (December to April) is the sunny window. Good for beginner surf.", ["guanacaste"]),
  s("puertoviejo", "Puerto Viejo", "cr", 9.66, -82.75, ["beach", "coast"], "Caribbean side: reggae, reef and rice and beans.", "Rent bikes to reach Cahuita and Punta Uva. It has a different weather pattern from the Pacific side.", ["cahuita"]),

  // Greece
  s("santorini", "Santorini", "gr", 36.39, 25.46, ["island", "beach", "coast"], "Whitewashed cliffs over a flooded caldera.", "Oia sunset is packed; Imerovigli is quieter. Prices drop a lot outside July and August.", ["oia", "fira"]),
  s("mykonos", "Mykonos", "gr", 37.45, 25.33, ["island", "beach", "nightlife"], "Windmills, beach clubs and late nights.", "Expensive in peak summer. Delos ruins are a short boat ride away.", []),
  s("crete", "Crete", "gr", 35.51, 24.02, ["island", "beach", "hike"], "Big island, real food, the Samaria Gorge.", "Base in Chania. Balos and Elafonisi are the beaches; rent a car.", ["chania", "heraklion"]),
  s("naxos", "Naxos", "gr", 37.1, 25.38, ["island", "beach", "food"], "The calmer, cheaper Cycladic island.", "Long sandy beaches and mountain villages. Ferries run from Athens and Santorini.", []),

  // Switzerland
  s("zurich", "Zurich", "ch", 47.38, 8.54, ["city"], "A lake city where you can swim in the river.", "Expensive, so eat from supermarkets. Trains reach almost anywhere in Switzerland quickly.", []),
  s("interlaken", "Interlaken", "ch", 46.69, 7.86, ["mountain", "hike", "ski"], "Between two lakes, at the foot of the Jungfrau.", "Lauterbrunnen valley and Grindelwald are the hikes. Look at the Swiss Travel Pass or Half Fare Card.", ["jungfrau", "lauterbrunnen", "grindelwald"]),
  s("lucerne", "Lucerne", "ch", 47.05, 8.31, ["city", "mountain"], "The covered bridge, and Mount Pilatus above it.", "The Pilatus round trip by boat, cogwheel and cable car is the classic day.", ["luzern", "pilatus"]),
  s("geneva", "Geneva", "ch", 46.2, 6.14, ["city"], "Lakefront, the UN and a jumping-off point for the Alps.", "Hotels give a free transit card. Chamonix is an hour away.", []),

  // Thailand
  s("bangkok", "Bangkok", "th", 13.76, 100.5, ["city", "food", "temple"], "Temples, night markets and the best street food anywhere.", "Cover shoulders and knees at the Grand Palace. Use the BTS and river boats instead of traffic.", []),
  s("chiangmai", "Chiang Mai", "th", 18.79, 98.99, ["city", "temple", "mountain"], "The old walled city in the northern hills.", "Choose an elephant sanctuary that doesn't allow riding. The Sunday night market is the big one.", []),
  s("phuket", "Phuket", "th", 7.88, 98.39, ["beach", "island"], "The big Andaman island, a base for boat trips.", "Patong is the party; Kata and Karon are calmer. Phang Nga Bay tours leave from here.", ["patong"]),
  s("krabi", "Krabi & Railay", "th", 8.09, 98.91, ["beach", "coast"], "Limestone cliffs, climbing and island hopping.", "Railay is reachable only by longtail boat. Book Phi Phi trips from Ao Nang.", ["railay", "phi phi", "ao nang"]),
  s("kohphangan", "Koh Phangan", "th", 9.73, 100.01, ["island", "beach", "nightlife"], "Full Moon Party island, with quiet beaches too.", "The north coast is calm. Ferries connect via Koh Samui.", ["full moon party", "koh samui"]),

  // Canada
  s("toronto", "Toronto", "ca", 43.65, -79.38, ["city", "food"], "Canada's biggest city, with Niagara Falls next door.", "A short flight or a long train from New Haven. Niagara is about 90 minutes by GO train or bus.", ["niagara"]),
  s("quebeccity", "Québec City", "ca", 46.81, -71.21, ["city", "culture"], "A walled French city that feels like Europe.", "The Winter Carnival is in February. Old Québec is very walkable.", ["quebec"]),
  s("vancouver", "Vancouver", "ca", 49.28, -123.12, ["city", "mountain", "coast"], "Mountains, ocean and Stanley Park in one city.", "Whistler is two hours up the Sea-to-Sky highway. Rain is likely outside summer.", ["whistler"]),
  s("banff", "Banff", "ca", 51.18, -115.57, ["mountain", "hike", "ski"], "Turquoise lakes in the Rockies.", "Fly into Calgary. Moraine Lake needs a shuttle (no private cars), so book ahead.", ["lake louise", "moraine lake"]),

  // Dominican Republic
  s("puntacana", "Punta Cana", "do", 18.58, -68.4, ["beach"], "The all-inclusive coast with direct flights.", "Mostly resorts. Saona Island is the day trip.", ["saona"]),
  s("santodomingo", "Santo Domingo", "do", 18.49, -69.93, ["city", "culture"], "The oldest European city in the Americas.", "The Zona Colonial is walkable. Use Uber at night.", ["zona colonial"]),
  s("samana", "Samaná", "do", 19.21, -69.34, ["beach", "nature"], "Whale watching and wild beaches.", "Humpback whales visit from mid-January to March. Las Terrenas is the beach town.", ["las terrenas"]),

  // Bahamas
  s("nassau", "Nassau", "bs", 25.05, -77.36, ["beach", "city"], "The capital, a quick hop from New York.", "Cable Beach is resort-style; the Fish Fry at Arawak Cay is the cheap dinner.", ["paradise island"]),
  s("exuma", "Exuma", "bs", 23.62, -75.97, ["beach", "island"], "Swimming pigs and impossibly clear water.", "Most visitors take a boat tour from Great Exuma. Bring cash; costs add up.", ["swimming pigs"]),
  s("eleuthera", "Eleuthera & Harbour Island", "bs", 25.14, -76.15, ["beach", "island"], "Pink-sand beaches and a quiet, skinny island.", "Harbour Island is the pink-sand beach, a short water taxi away. Rent a car on Eleuthera.", ["harbour island", "pink sand"]),

  // Jamaica
  s("montegobay", "Montego Bay", "jm", 18.47, -77.92, ["beach"], "The airport town, with resorts and Doctor's Cave Beach.", "Use licensed taxis or resort transfers. Most groups move on to Negril.", ["mobay"]),
  s("negril", "Negril", "jm", 18.27, -78.35, ["beach", "coast"], "Seven Mile Beach and cliff-jumping at sunset.", "Rick's Café is the famous cliff spot. About 90 minutes from Montego Bay.", ["seven mile beach"]),
  s("ochorios", "Ocho Rios", "jm", 18.41, -77.1, ["beach", "nature"], "Dunn's River Falls and the north-coast resorts.", "Climb the falls early, before the cruise ships arrive. Water shoes help.", ["dunns river"]),

  // Netherlands
  s("amsterdam", "Amsterdam", "nl", 52.37, 4.9, ["city", "culture"], "Canals, bikes and the Rijksmuseum.", "Book the Anne Frank House the moment tickets open. Watch the bike lanes.", []),
  s("rotterdam", "Rotterdam", "nl", 51.92, 4.48, ["city"], "Modern architecture and the Markthal.", "Forty minutes from Amsterdam by train. The Kinderdijk windmills are nearby.", ["kinderdijk"]),
  s("utrecht", "Utrecht", "nl", 52.09, 5.12, ["city"], "Canal wharves, a cathedral tower and student life.", "Calmer and cheaper than Amsterdam, and a 30-minute train away.", []),

  // Germany
  s("berlin", "Berlin", "de", 52.52, 13.4, ["city", "culture", "nightlife"], "History on every corner and the best nightlife in Europe.", "Do the Reichstag dome (free, but book ahead) and the Wall memorial. Public transit runs all night on weekends.", []),
  s("munich", "Munich", "de", 48.14, 11.58, ["city", "food"], "Beer gardens, the English Garden and the Alps nearby.", "Oktoberfest starts in late September; book a year out. Neuschwanstein is a day trip.", ["oktoberfest", "neuschwanstein"]),
  s("hamburg", "Hamburg", "de", 53.55, 9.99, ["city"], "A harbor city with a stunning concert hall.", "The Elbphilharmonie viewing plaza is free. The Speicherstadt warehouses are best at night.", []),
  s("bavarianalps", "Bavarian Alps", "de", 47.49, 11.1, ["mountain", "hike", "ski"], "Germany's highest peak and alpine lakes.", "Garmisch-Partenkirchen is the base; ride up the Zugspitze on a clear day.", ["garmisch", "zugspitze"]),

  // Ireland
  s("dublin", "Dublin", "ie", 53.35, -6.26, ["city", "culture"], "Pubs, Trinity College and the Book of Kells.", "Temple Bar is touristy and pricey; pubs a few blocks away are better. Howth is a coastal day trip by DART.", ["howth"]),
  s("galway", "Galway", "ie", 53.27, -9.05, ["city", "coast"], "A student town on the west coast with trad music.", "The base for the Cliffs of Moher, Connemara and the Aran Islands.", ["aran islands", "connemara"]),
  s("cliffsofmoher", "Cliffs of Moher", "ie", 52.97, -9.43, ["coast", "hike", "nature"], "Sheer Atlantic cliffs, 700 feet high.", "Walk the coastal trail from Doolin for fewer crowds. Weather changes fast.", ["doolin"]),
  s("kerry", "Ring of Kerry", "ie", 52.06, -9.51, ["nature", "hike", "coast"], "Ireland's classic scenic loop.", "Base in Killarney. Tour buses run the loop counterclockwise, so drive it clockwise.", ["killarney", "dingle"]),

  // Croatia
  s("dubrovnik", "Dubrovnik", "hr", 42.65, 18.09, ["city", "coast", "beach"], "Walk the old city walls above the Adriatic.", "Walk the walls at opening to beat the heat and cruise crowds. Lokrum island is a short ferry.", []),
  s("split", "Split", "hr", 43.51, 16.44, ["city", "coast", "beach"], "A Roman palace you can live inside.", "The ferry hub for Hvar, Brač and Vis. Diocletian's Palace is the old town.", []),
  s("hvar", "Hvar", "hr", 43.17, 16.44, ["island", "beach", "nightlife"], "Lavender, coves and summer nightlife.", "Take a water taxi to the Pakleni islands for quieter swims.", []),
  s("plitvice", "Plitvice Lakes", "hr", 44.88, 15.62, ["nature", "hike"], "Turquoise lakes linked by waterfalls on boardwalks.", "Buy timed tickets online and arrive early. Swimming isn't allowed.", []),

  // Czechia
  s("prague", "Prague", "cz", 50.08, 14.44, ["city", "culture"], "Castle, bridges and cheap great beer.", "Charles Bridge at dawn before the crowds. Exchange money only at reputable places.", ["praha"]),
  s("ceskykrumlov", "Český Krumlov", "cz", 48.81, 14.32, ["city", "culture"], "A storybook castle town on a river bend.", "Three hours from Prague by bus. Rafting the river is the summer move.", ["cesky krumlov"]),
  s("brno", "Brno", "cz", 49.2, 16.61, ["city"], "A student city with cafés and an underground ossuary.", "Cheaper than Prague, with a good bar and coffee scene.", []),

  // Turkey
  s("istanbul", "Istanbul", "tr", 41.01, 28.98, ["city", "food", "culture"], "Two continents, the Hagia Sophia and the Grand Bazaar.", "Take a Bosphorus ferry; it's the cheapest tour. Get an Istanbulkart for transit.", ["constantinople"]),
  s("cappadocia", "Cappadocia", "tr", 38.64, 34.83, ["desert", "hike", "culture"], "Fairy chimneys, cave hotels and balloon sunrise.", "Balloon flights depend on wind, so leave a spare morning. Göreme is the base.", ["goreme", "hot air balloon"]),
  s("antalya", "Antalya", "tr", 36.9, 30.71, ["beach", "coast", "culture"], "The Turquoise Coast, with Roman ruins.", "Kaleiçi is the old town. Kaş and the Lycian Way coast are a few hours west.", ["kas", "lycian way"]),
  s("ephesus", "Ephesus", "tr", 37.94, 27.37, ["culture"], "Some of the best-preserved Roman ruins anywhere.", "Base in Selçuk. Go at opening; there's little shade.", ["selcuk"]),

  // Vietnam
  s("hanoi", "Hanoi", "vn", 21.03, 105.85, ["city", "food"], "Old Quarter street food and lakeside mornings.", "Cross the street slowly and steadily. Ha Long Bay and Ninh Binh are the add-ons.", ["ninh binh"]),
  s("hochiminh", "Ho Chi Minh City", "vn", 10.82, 106.63, ["city", "food"], "Saigon's motorbike energy and rooftop bars.", "The War Remnants Museum is heavy and worth it. The Mekong Delta is a day trip.", ["saigon", "mekong"]),
  s("hoian", "Hội An", "vn", 15.88, 108.33, ["city", "culture", "beach"], "A lantern-lit old town with tailors and beaches.", "Fly into Da Nang. Get clothes made early in the trip so there's time for fittings.", ["hoi an", "da nang"]),
  s("halongbay", "Hạ Long Bay", "vn", 20.91, 107.18, ["coast", "island", "nature"], "Thousands of limestone islands, best seen overnight on a boat.", "Choose a reputable cruise; Lan Ha Bay is quieter. About three hours from Hanoi.", ["ha long", "lan ha"]),

  // Indonesia
  s("ubud", "Ubud, Bali", "id", -8.51, 115.26, ["culture", "nature", "temple"], "Rice terraces, temples and yoga.", "Go to the Tegallalang terraces early. Respect temple dress codes; sarongs are often provided.", ["bali", "ubud"]),
  s("canggu", "Canggu & Uluwatu, Bali", "id", -8.65, 115.13, ["beach", "coast", "nightlife"], "Bali's surf beaches and cliff temples.", "Traffic is slow, so stay where you want to spend time. Uluwatu has the cliff temple and the kecak dance.", ["uluwatu", "seminyak"]),
  s("gili", "Gili Islands", "id", -8.35, 116.04, ["island", "beach"], "Three tiny car-free islands with sea turtles.", "Fast boats run from Bali; check operator safety reviews. Gili Air and Meno are calmer than Trawangan.", ["gili trawangan", "gili air"]),
  s("yogyakarta", "Yogyakarta", "id", -7.8, 110.36, ["culture", "temple", "city"], "Borobudur and Prambanan, Java's great temples.", "Borobudur climbing access is limited and ticketed, so book ahead. Batik and student culture fill the city.", ["borobudur", "prambanan", "jogja"]),
  s("komodo", "Komodo & Labuan Bajo", "id", -8.5, 119.88, ["island", "nature", "beach"], "Komodo dragons, pink beaches and manta rays.", "Most people take a 2–3 day boat trip from Labuan Bajo. Rangers guide all dragon walks.", ["labuan bajo"]),

  // Colombia
  s("cartagena", "Cartagena", "co", 10.39, -75.48, ["city", "beach", "culture"], "A colorful walled city on the Caribbean.", "Hot and humid, so plan mornings and evenings. The Rosario Islands are the boat day.", ["rosario islands"]),
  s("medellin", "Medellín", "co", 6.24, -75.58, ["city", "food"], "The city of eternal spring, reborn.", "Ride the metrocable. Comuna 13 graffiti tours are best with a local guide. Guatapé is a day trip.", ["guatape", "comuna 13"]),
  s("bogota", "Bogotá", "co", 4.71, -74.07, ["city", "culture"], "A high-altitude capital with great museums.", "Altitude is 8,600 ft, so take it slow on day one. The Gold Museum and Monserrate are musts.", ["monserrate"]),
  s("tayrona", "Tayrona", "co", 11.31, -74.08, ["beach", "hike", "nature"], "Jungle trails to beaches beneath the Sierra Nevada.", "The park closes for set periods each year, so check dates. Base in Santa Marta or Palomino.", ["santa marta", "palomino"]),

  // Peru
  s("cusco", "Cusco", "pe", -13.53, -71.97, ["city", "culture", "mountain"], "The Inca capital, at 11,000 feet.", "Acclimatize a day or two before hiking. Rainbow Mountain is a very early day trip.", ["rainbow mountain"]),
  s("machupicchu", "Machu Picchu", "pe", -13.16, -72.55, ["hike", "culture", "mountain"], "The Inca citadel in the clouds.", "Entry tickets and Inca Trail permits sell out months ahead, so book circuits early. Trains run from Ollantaytambo.", ["inca trail", "aguas calientes"]),
  s("lima", "Lima", "pe", -12.05, -77.04, ["city", "food"], "One of the world's great food cities.", "Stay in Miraflores or Barranco. Ceviche is a lunch dish, and the best spots close by late afternoon.", ["miraflores", "barranco"]),
  s("sacredvalley", "Sacred Valley", "pe", -13.31, -72.12, ["culture", "hike", "mountain"], "Inca terraces, salt pans and markets.", "Slightly lower than Cusco, so it's a gentler place to acclimatize. Visit Moray, Maras and Pisac.", ["ollantaytambo", "pisac", "urubamba"]),

  // Egypt (Sinai is restricted by Yale, so no Sinai spots are listed)
  s("cairo", "Cairo & Giza", "eg", 29.98, 31.13, ["city", "culture", "desert"], "The Pyramids, the Sphinx and the Grand Egyptian Museum.", "Go to Giza at opening. The Grand Egyptian Museum needs half a day. Agree on prices before rides.", ["giza", "pyramids", "grand egyptian museum"]),
  s("luxor", "Luxor", "eg", 25.69, 32.64, ["culture", "desert"], "Karnak, the Valley of the Kings and balloon sunrises.", "The West Bank tombs are best early. A Nile cruise to Aswan is the classic route.", ["valley of the kings", "karnak"]),
  s("aswan", "Aswan", "eg", 24.09, 32.9, ["culture"], "Felucca sails, Nubian villages and Philae temple.", "The base for Abu Simbel, a very early day trip. Very hot from May to September.", ["abu simbel", "philae"]),
  s("alexandria", "Alexandria", "eg", 31.2, 29.92, ["city", "coast"], "A Mediterranean city with a modern library on the site of the ancient one.", "About three hours from Cairo by train. Seafood on the Corniche.", []),

  // Australia
  s("sydney", "Sydney", "au", -33.87, 151.21, ["city", "beach"], "The Opera House, the Harbour Bridge and Bondi.", "Take the Manly ferry for the harbor view. The Bondi to Coogee coastal walk is the morning.", ["bondi"]),
  s("melbourne", "Melbourne", "au", -37.81, 144.96, ["city", "food"], "Laneway coffee, street art and the Great Ocean Road.", "The free tram zone covers the CBD. The Great Ocean Road works best as an overnight.", ["great ocean road"]),
  s("greatbarrierreef", "Great Barrier Reef", "au", -16.92, 145.77, ["beach", "island", "nature"], "The world's largest reef system.", "Cairns and Port Douglas run the reef trips; outer-reef boats see healthier coral. June to October is stinger-free.", ["cairns", "port douglas"]),
  s("byronbay", "Byron Bay", "au", -28.64, 153.61, ["beach", "coast"], "A laid-back surf town at Australia's eastern tip.", "Walk to the lighthouse for sunrise. Fly into Ballina or Gold Coast.", []),
];
