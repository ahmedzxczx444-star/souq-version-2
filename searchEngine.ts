// Arabic-aware car search engine: normalization, synonym resolution, typo tolerance,
// structured filter extraction (price/city/transmission/fuel/body type), ranking,
// and graceful fallback when no exact match exists.

export interface SearchParsed {
  make?: string;
  model?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  transmission?: string;
  fuel?: string;
  bodyType?: string;
  year?: number;
  family?: boolean;
  color?: string;
}

export interface SearchOutcome {
  cars: any[];
  noExactMatch: boolean;
  emptyQuery: boolean;
  parsed: SearchParsed;
}

// ---------- Normalization ----------

const ARABIC_DIACRITICS = /[ً-ٰٟۖ-ۭ]/g;
const ARABIC_INDIC_DIGITS: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

export function normalizeText(input: string): string {
  if (!input) return "";
  let s = input.toString().trim().toLowerCase();
  s = s.replace(ARABIC_DIACRITICS, "");
  s = s.replace(/ـ/g, ""); // tatweel
  s = s.replace(/[إأآٱ]/g, "ا");
  s = s.replace(/ى/g, "ي");
  s = s.replace(/ة/g, "ه");
  s = s.replace(/ؤ/g, "و");
  s = s.replace(/ئ/g, "ي");
  s = s.replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d) => ARABIC_INDIC_DIGITS[d] || d);
  s = s.replace(/[-_\/]/g, " "); // hyphens/slashes become word separators, not glue
  s = s.replace(/[^\p{L}\p{N}\s.]/gu, " "); // strip remaining punctuation, keep letters/numbers/dot
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function tokenize(s: string): string[] {
  return normalizeText(s).split(" ").filter(Boolean);
}

// ---------- Levenshtein distance (typo tolerance) ----------

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const dp = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) dp[j] = j;
  for (let i = 1; i <= al; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= bl; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      prev = tmp;
    }
  }
  return dp[bl];
}

function fuzzyIncludes(haystack: string, needle: string): "exact" | "fuzzy" | "none" {
  if (!haystack || !needle) return "none";
  if (haystack.includes(needle) || needle.includes(haystack)) return "exact";
  const maxDist = needle.length <= 4 ? 1 : needle.length <= 7 ? 2 : 3;
  if (levenshtein(haystack, needle) <= maxDist) return "fuzzy";
  // sliding window fuzzy match against substrings of similar length (for multi-word haystacks)
  const words = haystack.split(" ");
  for (const w of words) {
    if (w.length < 2) continue;
    if (w.includes(needle) || needle.includes(w)) return "exact";
    if (levenshtein(w, needle) <= maxDist) return "fuzzy";
  }
  return "none";
}

// ---------- Stopwords (Arabic filler words that carry no search signal) ----------

const STOPWORDS = new Set([
  "عربيه", "سياره", "سيارات", "عايز", "عاوز", "اريد", "ابحث", "عن", "في", "على",
  "من", "فضلك", "محتاج", "اقدر", "لو", "سمحت", "ممكن", "اي", "أي", "موديل", "شكل",
  "the", "a", "an", "i", "want", "looking", "for", "car", "cars",
]);

// ---------- Make synonym dictionary (Arabic/alt spellings -> canonical make) ----------

const MAKE_SYNONYMS: Record<string, string[]> = {
  "BMW": ["بي ام دبليو", "بي إم دبليو", "بمو", "بيإمدبليو", "بى إم دبليو", "بيإم"],
  "Mercedes-Benz": ["مرسيدس", "مرسيدس بنز", "مرسيديس", "مرسيدز", "مرسيدس بنس", "بنز"],
  "Toyota": ["تويوتا", "توياتا"],
  "Kia": ["كيا"],
  "Hyundai": ["هيونداي", "هيوندای", "هيونداى", "هيوندا"],
  "Audi": ["اودي", "أودي", "اودى"],
  "Chevrolet": ["شيفروليه", "شيفروليت", "شيفرولية", "شيفي"],
  "MG": ["ام جي", "إم جي", "امجي"],
  "Rolls-Royce": ["رولز رويس", "رولس رويس"],
  "Bentley": ["بنتلي", "بنتلى"],
  "Nissan": ["نيسان"],
  "Honda": ["هوندا"],
  "Volkswagen": ["فولكس واجن", "فولكس فاجن", "فولكس"],
  "Ford": ["فورد"],
  "Peugeot": ["بيجو"],
  "Renault": ["رينو"],
  "Fiat": ["فيات"],
  "Skoda": ["سكودا"],
  "Mitsubishi": ["ميتسوبيشي"],
  "Suzuki": ["سوزوكي"],
  "Chery": ["شيري"],
  "Geely": ["جيلي"],
  "Porsche": ["بورش"],
  "Ferrari": ["فيراري"],
  "Lamborghini": ["لامبورغيني", "لامبورجيني"],
  "Jeep": ["جيب"],
  "Mazda": ["مازدا"],
  "Opel": ["اوبل", "أوبل"],
  "Seat": ["سيات"],
  "Maserati": ["مازيراتي"],
};

// ---------- Model synonym dictionary (Arabic transliterations -> canonical model text) ----------

const MODEL_SYNONYMS: Record<string, string[]> = {
  "sportage": ["سبورتاج", "سبورتيج"],
  "corolla": ["كورولا", "كرولا"],
  "elantra": ["إلنترا", "النترا", "الانترا", "الينترا"],
  "camry": ["كامري", "كامرى"],
  "accent": ["اكسنت", "أكسنت"],
  "tucson": ["توسان", "توسون"],
  "optra": ["أوبترا", "اوبترا"],
  "continental gt": ["كونتيننتال", "كونتننتال"],
  "ghost": ["غوست"],
  "320i": ["320"],
  "a6": ["ايه سكس", "أيه سكس"],
  "c200": ["سي 200", "سي200"],
  "zs": ["زد اس", "زد إس"],
};

// ---------- City dictionary ----------

const CITY_SYNONYMS: Record<string, string[]> = {
  "القاهره": ["القاهرة", "cairo", "مدينه نصر", "التجمع الخامس", "القاهره الجديده", "new cairo", "المعادي", "الدقي", "المهندسين", "مصر الجديدة"],
  "الجيزه": ["الجيزة", "giza", "الشيخ زايد", "السادس من اكتوبر", "٦ اكتوبر", "اكتوبر"],
  "الاسكندريه": ["الإسكندرية", "اسكندرية", "alexandria", "سموحه"],
};

// ---------- Body type classification ----------

const SUV_MODEL_HINTS = [
  "sportage", "tucson", "santa fe", "creta", "zs", "hr-v", "cr-v", "rav4", "x1", "x3", "x5", "x6",
  "q3", "q5", "q7", "q8", "glc", "gle", "gls", "captur", "duster", "kicks", "seltos", "sonet",
  "corolla cross", "territory", "everest", "fortuner", "pajero", "montero", "3008", "5008",
  "cx-5", "cx-3", "tiguan", "touareg", "macan", "cayenne", "suv",
];

const SUV_KEYWORDS = ["suv", "دفع رباعي", "دفع رباعى", "جيب"];
const FAMILY_MODEL_HINTS = [
  "elantra", "corolla", "optra", "accent", "sunny", "lancer", "cerato", "k3", "octavia",
  "tucson", "sportage", "creta", "sonet", "megane", "logan", "sandero",
];
const FAMILY_KEYWORDS = ["عائليه", "عائلية", "للعائله", "عيله", "family"];

function classifyBodyType(make: string, model: string): "suv" | "family" | null {
  const m = normalizeText(model);
  if (SUV_MODEL_HINTS.some((hint) => m.includes(normalizeText(hint)))) return "suv";
  if (FAMILY_MODEL_HINTS.some((hint) => m.includes(normalizeText(hint)))) return "family";
  return null;
}

// ---------- Transmission / Fuel keyword maps ----------

const TRANSMISSION_KEYWORDS: Record<string, string[]> = {
  "Automatic": ["اوتوماتيك", "أوتوماتيك", "اتوماتيك", "automatic"],
  "Manual": ["مانيوال", "يدوي", "عادي", "manual"],
};

const FUEL_KEYWORDS: Record<string, string[]> = {
  "بنزين": ["بنزين", "petrol", "gasoline"],
  "سولار": ["ديزل", "دیزل", "سولار", "diesel"],
  "كهرباء": ["كهرباء", "كهربائي", "electric", "ev"],
  "هايبرد": ["هايبرد", "هجين", "hybrid"],
};

const COLOR_WORDS: Record<string, string[]> = {
  "ابيض": ["ابيض", "بيضاء", "white"],
  "اسود": ["اسود", "سوداء", "black"],
  "احمر": ["احمر", "حمراء", "red"],
  "ازرق": ["ازرق", "زرقاء", "blue"],
  "فضي": ["فضي", "فضيه", "silver"],
  "رمادي": ["رمادي", "رصاصي", "gray", "grey"],
};

// ---------- Price phrase parsing ----------

function parseAmount(raw: string, unit?: string): number {
  let n = parseFloat(raw.replace(/,/g, ""));
  if (isNaN(n)) return NaN;
  if (unit) {
    if (unit.includes("مليون")) n *= 1_000_000;
    else if (unit.includes("الف") || unit.toLowerCase() === "k") n *= 1_000;
  }
  return n;
}

function extractPrice(normalized: string): { minPrice?: number; maxPrice?: number } {
  const result: { minPrice?: number; maxPrice?: number } = {};

  const maxPatterns = [
    /(?:اقل من|تحت|حتي|حتى|ماكس|مش اكتر من|بحد اقصى|بحد اقصي|اقصاه|ميزانيه|بميزانيه|معايا|معي)\s*([\d.,]+)\s*(مليون|الف)?/,
  ];
  const minPatterns = [
    /(?:اكتر من|اكثر من|فوق|اعلى من|اعلي من|ابتداء من)\s*([\d.,]+)\s*(مليون|الف)?/,
  ];

  for (const p of maxPatterns) {
    const match = normalized.match(p);
    if (match) {
      const v = parseAmount(match[1], match[2]);
      if (!isNaN(v)) result.maxPrice = v;
    }
  }
  for (const p of minPatterns) {
    const match = normalized.match(p);
    if (match) {
      const v = parseAmount(match[1], match[2]);
      if (!isNaN(v)) result.minPrice = v;
    }
  }

  // "بين X و Y"
  const between = normalized.match(/بين\s*([\d.,]+)\s*(مليون|الف)?\s*(?:و|الي|إلى)\s*([\d.,]+)\s*(مليون|الف)?/);
  if (between) {
    const a = parseAmount(between[1], between[2]);
    const b = parseAmount(between[3], between[4]);
    if (!isNaN(a) && !isNaN(b)) {
      result.minPrice = Math.min(a, b);
      result.maxPrice = Math.max(a, b);
    }
  }

  return result;
}

// ---------- Query parsing ----------

function makeCandidates(make: string): string[] {
  // "Mercedes-Benz" -> ["mercedes benz", "mercedes", "benz"]; matches whichever word(s) the user typed
  const words = normalizeText(make).split(" ").filter(Boolean);
  const candidates = [words.join(" "), ...words.filter((w) => w.length >= 4)];
  return [...new Set(candidates)];
}

function findMake(normalized: string, tokens: string[]): { make?: string; consumed: Set<string> } {
  const consumed = new Set<string>();
  // direct/literal match against canonical make names typed in Latin script (whole phrase or any distinctive word)
  const knownMakes = Object.keys(MAKE_SYNONYMS);
  for (const make of knownMakes) {
    for (const candidate of makeCandidates(make)) {
      if (normalized.includes(candidate)) {
        consumed.add(candidate);
        return { make, consumed };
      }
    }
  }
  // synonym dictionary match
  for (const [canonical, synonyms] of Object.entries(MAKE_SYNONYMS)) {
    for (const syn of synonyms) {
      const nsyn = normalizeText(syn);
      if (normalized.includes(nsyn)) {
        consumed.add(nsyn);
        return { make: canonical, consumed };
      }
    }
  }
  return { consumed };
}

function findModelHint(normalized: string): { modelHint?: string } {
  for (const [canonical, synonyms] of Object.entries(MODEL_SYNONYMS)) {
    for (const syn of synonyms) {
      if (normalized.includes(normalizeText(syn))) {
        return { modelHint: canonical };
      }
    }
  }
  return {};
}

function findCity(normalized: string): { city?: string } {
  for (const [canonical, synonyms] of Object.entries(CITY_SYNONYMS)) {
    for (const syn of [canonical, ...synonyms]) {
      if (normalized.includes(normalizeText(syn))) {
        return { city: canonical };
      }
    }
  }
  return {};
}

function findFromMap(normalized: string, map: Record<string, string[]>): string | undefined {
  for (const [canonical, keywords] of Object.entries(map)) {
    for (const kw of keywords) {
      if (normalized.includes(normalizeText(kw))) return canonical;
    }
  }
  return undefined;
}

export function parseQuery(rawQuery: string): SearchParsed {
  const normalized = normalizeText(rawQuery);
  const parsed: SearchParsed = {};

  const { make } = findMake(normalized, tokenize(normalized));
  if (make) parsed.make = make;

  const { modelHint } = findModelHint(normalized);
  if (modelHint) parsed.model = modelHint;

  const { city } = findCity(normalized);
  if (city) parsed.city = city;

  const transmission = findFromMap(normalized, TRANSMISSION_KEYWORDS);
  if (transmission) parsed.transmission = transmission;

  const fuel = findFromMap(normalized, FUEL_KEYWORDS);
  if (fuel) parsed.fuel = fuel;

  const color = findFromMap(normalized, COLOR_WORDS as any);
  if (color) parsed.color = color;

  if (SUV_KEYWORDS.some((kw) => normalized.includes(normalizeText(kw)))) {
    parsed.bodyType = "suv";
  }
  if (FAMILY_KEYWORDS.some((kw) => normalized.includes(normalizeText(kw)))) {
    parsed.family = true;
  }

  const { minPrice, maxPrice } = extractPrice(normalized);
  if (minPrice !== undefined) parsed.minPrice = minPrice;
  if (maxPrice !== undefined) parsed.maxPrice = maxPrice;

  const yearMatch = normalized.match(/(19[5-9]\d|20[0-4]\d)/);
  if (yearMatch) parsed.year = parseInt(yearMatch[1], 10);

  return parsed;
}

// ---------- Scoring ----------

function carMatchesHardFilters(car: any, parsed: SearchParsed, opts: { relaxed: Set<string> }): boolean {
  const make = normalizeText(car.make || "");
  const model = normalizeText(car.model || "");
  const location = normalizeText(`${car.location || ""} ${car.dealer_location || ""}`);
  const fuel = normalizeText(car.fuel_type || "");
  const transmission = normalizeText(car.transmission || "");
  const price = Number(car.price) || 0;
  const bodyType = classifyBodyType(car.make || "", car.model || "");

  if (parsed.make && !opts.relaxed.has("make")) {
    const nm = normalizeText(parsed.make);
    if (fuzzyIncludes(make, nm) === "none") return false;
  }
  if (parsed.model && !opts.relaxed.has("model")) {
    if (fuzzyIncludes(model, parsed.model) === "none") return false;
  }
  if (parsed.city && !opts.relaxed.has("city")) {
    if (!location.includes(parsed.city)) return false;
  }
  if (parsed.minPrice !== undefined && !opts.relaxed.has("price")) {
    if (price < parsed.minPrice) return false;
  }
  if (parsed.maxPrice !== undefined && !opts.relaxed.has("price")) {
    if (price > parsed.maxPrice) return false;
  }
  if (parsed.transmission && !opts.relaxed.has("transmission")) {
    if (!normalizeText(parsed.transmission).includes(transmission) && !transmission.includes(normalizeText(parsed.transmission))) return false;
  }
  if (parsed.fuel && !opts.relaxed.has("fuel")) {
    // handle legacy english fuel values stored pre-migration
    const fuelMatches = fuel.includes(parsed.fuel) ||
      (parsed.fuel === "بنزين" && (fuel.includes("petrol") || fuel.includes("gasoline"))) ||
      (parsed.fuel === "سولار" && fuel.includes("diesel")) ||
      (parsed.fuel === "كهرباء" && fuel.includes("electric"));
    if (!fuelMatches) return false;
  }
  if (parsed.bodyType === "suv" && !opts.relaxed.has("bodyType")) {
    if (bodyType !== "suv") return false;
  }

  return true;
}

function scoreCar(car: any, parsed: SearchParsed, freeTokens: string[]): { score: number; signal: boolean } {
  let score = 0;
  let signal = false;
  const make = normalizeText(car.make || "");
  const model = normalizeText(car.model || "");
  const description = normalizeText(car.description || "");
  const bodyType = classifyBodyType(car.make || "", car.model || "");

  if (parsed.make) {
    const r = fuzzyIncludes(make, normalizeText(parsed.make));
    if (r === "exact") { score += 40; signal = true; }
    else if (r === "fuzzy") { score += 22; signal = true; }
  }
  if (parsed.model) {
    const r = fuzzyIncludes(model, parsed.model);
    if (r === "exact") { score += 40; signal = true; }
    else if (r === "fuzzy") { score += 20; signal = true; }
  }
  if (parsed.city) { score += 18; signal = true; }
  if (parsed.year && Number(car.year) === parsed.year) { score += 15; signal = true; }
  if (parsed.transmission) { score += 8; signal = true; }
  if (parsed.fuel) { score += 6; signal = true; }
  if (parsed.bodyType === "suv" && bodyType === "suv") { score += 20; signal = true; }
  if (parsed.family && bodyType === "family") { score += 12; signal = true; }
  if (parsed.color && description.includes(parsed.color)) { score += 10; signal = true; }

  // free-text leftover tokens matched against make+model+description.
  // Exact substring only here (not fuzzy) - typo tolerance is already handled by the
  // dedicated make/model comparisons above; loosely fuzzy-matching arbitrary prose
  // words against each other produces false positives on unrelated/nonsense queries.
  const haystack = `${make} ${model} ${description}`;
  for (const tok of freeTokens) {
    if (STOPWORDS.has(tok) || tok.length < 3) continue;
    if (haystack.includes(tok)) { score += 8; signal = true; }
  }

  // stable tie-breakers (never enough on their own to count as a real relevance signal)
  if (car.featured) score += 2;
  if (car.isPromoted || car.is_promoted) score += 1;
  score += Math.min(Number(car.views) || 0, 100) / 100;
  // mild affordability nudge so generic/broad queries don't default-rank the priciest cars first
  score -= (Number(car.price) || 0) / 100_000_000;

  return { score, signal };
}

// ---------- Main entry point ----------

export function searchCars(cars: any[], rawQuery: string): SearchOutcome {
  const trimmed = (rawQuery || "").trim();

  if (!trimmed) {
    const latest = [...cars]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 20);
    return { cars: latest, noExactMatch: false, emptyQuery: true, parsed: {} };
  }

  const parsed = parseQuery(trimmed);
  const freeTokens = tokenize(trimmed).filter((t) => !STOPWORDS.has(t));
  const hasStructuredFilter = Object.keys(parsed).length > 0;

  const relaxationOrder = ["price", "city", "bodyType", "transmission", "fuel", "model", "make"];
  const relaxed = new Set<string>();

  let filtered = cars.filter((c) => carMatchesHardFilters(c, parsed, { relaxed }));
  let noExactMatch = false;

  if (filtered.length === 0 && hasStructuredFilter) {
    for (const field of relaxationOrder) {
      relaxed.add(field);
      filtered = cars.filter((c) => carMatchesHardFilters(c, parsed, { relaxed }));
      if (filtered.length > 0) {
        noExactMatch = true;
        break;
      }
    }
  }

  // No recognized structured intent (make/model/city/price/...): trust only genuine
  // free-text relevance signal, never silently return the whole catalog as "matches".
  if (!hasStructuredFilter) {
    const scored = filtered
      .map((c) => ({ c, ...scoreCar(c, parsed, freeTokens) }))
      .filter((x) => x.signal)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.c);

    if (scored.length > 0) {
      return { cars: scored, noExactMatch: false, emptyQuery: false, parsed };
    }

    // Nothing relevant at all: surface a small set of popular picks as suggestions.
    const suggestions = [...cars]
      .map((c) => ({ c, ...scoreCar(c, {}, []) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.c);
    return { cars: suggestions, noExactMatch: true, emptyQuery: false, parsed };
  }

  const scored = filtered
    .map((c) => ({ c, ...scoreCar(c, parsed, freeTokens) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.c);

  return { cars: scored, noExactMatch, emptyQuery: false, parsed };
}
