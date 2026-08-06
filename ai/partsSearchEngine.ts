import { normalizeText, levenshtein } from "../searchEngine";

// Deterministic, Arabic-aware search over the parts inventory - the parts-domain
// counterpart to searchEngine.ts's searchCars/searchCarsByFilters. Read-only imports
// normalizeText/levenshtein from searchEngine.ts rather than forking them, so car
// search's normalization behavior can never be affected by parts-search changes.
export interface PartSearchParsed {
  query?: string;
  partNumber?: string;
  chassisCode?: string;
  make?: string;
  model?: string;
  category?: string;
  partSubtype?: string;
  condition?: string;
  section?: "front" | "rear";
}

export interface PartSearchOutcome {
  parts: any[];
  noExactMatch: boolean;
}

// Half-cut / scrapyard Arabic phrasing (Egyptian and broader Levantine/Gulf usage),
// mapped to the 'half_cut' part_subtype value.
const HALF_CUT_TERMS = [
  "نص قطاعه", "قطاعه", "هاف كت", "half cut", "halfcut", "تشليح", "سكراب", "خرده",
];
const FRONT_TERMS = ["امامي", "قدام", "front"];
const REAR_TERMS = ["خلفي", "ورا", "وراني", "rear", "back"];

// Body-part / component Arabic phrasing, mapped to a normalized category keyword the
// scorer below matches against category/name. Deliberately broad (not just body
// panels) since parts search covers mechanical/electrical categories too.
const BODY_PART_TERMS: Record<string, string[]> = {
  door: ["باب", "door"],
  hood: ["كبوت", "hood", "bonnet"],
  bumper: ["دعامه", "بمبر", "bumper"],
  fender: ["رفرف", "fender"],
  trunk: ["شنطه", "صندوق", "trunk", "boot"],
  mirror: ["مرايه", "مراية", "mirror"],
  headlight: ["كشاف", "فانوس امامي", "headlight"],
  taillight: ["فانوس خلفي", "taillight"],
  windshield: ["زجاج امامي", "زجاج", "windshield", "windscreen"],
  roof: ["سقف", "roof"],
  engine: ["ماكينه", "محرك", "engine"],
  gearbox: ["فتيس", "جير", "gearbox", "transmission"],
  axle: ["كردان", "axle"],
  chassis: ["شاسيه", "chassis"],
};

function normalizePartNumber(input: string): string {
  return (input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Chassis/generation codes (BMW F30, Mercedes W204, Honda FB...) are short
// letter+digit tokens, distinct from long numeric OEM part numbers.
const CHASSIS_CODE_PATTERN = /\b([A-Z]{1,2}[0-9]{2,3})\b/;

export function parsePartQuery(rawQuery: string): PartSearchParsed {
  const query = (rawQuery || "").trim();
  const normalized = normalizeText(query);
  const parsed: PartSearchParsed = { query };

  const pnCandidate = normalizePartNumber(query);
  if (pnCandidate.length >= 6 && /\d/.test(pnCandidate)) {
    parsed.partNumber = pnCandidate;
  }

  const chassisMatch = CHASSIS_CODE_PATTERN.exec(query.toUpperCase());
  if (chassisMatch) parsed.chassisCode = chassisMatch[1];

  if (HALF_CUT_TERMS.some((term) => normalized.includes(normalizeText(term)))) {
    parsed.partSubtype = "half_cut";
  }

  if (FRONT_TERMS.some((term) => normalized.includes(normalizeText(term)))) parsed.section = "front";
  else if (REAR_TERMS.some((term) => normalized.includes(normalizeText(term)))) parsed.section = "rear";

  for (const [key, terms] of Object.entries(BODY_PART_TERMS)) {
    if (terms.some((term) => normalized.includes(normalizeText(term)))) {
      parsed.category = key;
      break;
    }
  }

  if (normalized.includes(normalizeText("جديد")) || normalized.includes("new")) parsed.condition = "new";
  if (normalized.includes(normalizeText("مستعمل")) || normalized.includes("used")) parsed.condition = "used";

  return parsed;
}

function scorePart(part: any, parsed: PartSearchParsed, rawQueryNormalized: string): number {
  let score = 0;

  const partNumberNormalized = normalizePartNumber(part.part_number || "");
  if (parsed.partNumber) {
    if (partNumberNormalized === parsed.partNumber) score += 100;
    else if (partNumberNormalized && partNumberNormalized.includes(parsed.partNumber)) score += 60;
    else if (partNumberNormalized) {
      const dist = levenshtein(partNumberNormalized, parsed.partNumber);
      if (dist <= 2) score += 40 - dist * 10;
    }
  }

  const nameNormalized = normalizeText(part.name || "");
  const manufacturerNormalized = normalizeText(part.manufacturer || "");
  const categoryNormalized = normalizeText(part.category || "");
  const subtypeNormalized = normalizeText(part.part_subtype || "");

  if (rawQueryNormalized) {
    // Whole-string containment catches exact/near-exact queries.
    if (nameNormalized.includes(rawQueryNormalized)) score += 50;
    if (manufacturerNormalized.includes(rawQueryNormalized)) score += 20;
    if (categoryNormalized.includes(rawQueryNormalized) || rawQueryNormalized.includes(categoryNormalized)) score += 15;

    // Token-based partial matching: a real-world query mixes a part name with a car
    // model ("طرمبة مياه إلنترا 2019") where only some words appear in any single
    // field - whole-string containment alone would never match that. Score each
    // query token against every field independently instead.
    const queryTokens = rawQueryNormalized.split(/\s+/).filter((tok) => tok.length >= 2);
    for (const token of queryTokens) {
      if (nameNormalized.includes(token)) score += 12;
      if (manufacturerNormalized.includes(token)) score += 6;
      if (categoryNormalized.includes(token)) score += 6;
    }
  }

  // parsed.category is a normalized English key (e.g. "door", "hood"); dealers type
  // free-text categories/names in Arabic, so match against the term dictionary itself
  // (in both the part's name and category fields) rather than comparing the key
  // literally against Arabic text, which would never match.
  if (parsed.category) {
    const categoryTerms = (BODY_PART_TERMS[parsed.category] || []).map(normalizeText);
    if (categoryTerms.some((term) => nameNormalized.includes(term) || categoryNormalized.includes(term))) {
      score += 25;
    }
  }
  if (parsed.partSubtype && subtypeNormalized === normalizeText(parsed.partSubtype)) score += 30;
  if (parsed.condition && normalizeText(part.condition_status || "") === normalizeText(parsed.condition)) score += 10;
  if (parsed.section) {
    const sectionTerms = (parsed.section === "front" ? FRONT_TERMS : REAR_TERMS).map(normalizeText);
    if (sectionTerms.some((term) => nameNormalized.includes(term))) score += 15;
  }
  if (parsed.chassisCode) {
    const chassisNormalized = parsed.chassisCode.toLowerCase();
    if (nameNormalized.includes(chassisNormalized) || categoryNormalized.includes(chassisNormalized)) score += 20;
  }

  const compatibility: any[] = Array.isArray(part.compatibility) ? part.compatibility : [];
  for (const c of compatibility) {
    const compatMake = normalizeText(c.make || "");
    const compatModel = normalizeText(c.model || "");
    if (parsed.chassisCode && compatModel === parsed.chassisCode.toLowerCase()) score += 40;
    if (compatMake && rawQueryNormalized.includes(compatMake)) score += 20;
    if (compatModel && rawQueryNormalized.includes(compatModel)) score += 30;
  }

  if (part.status !== "available") score -= 5;

  return score;
}

export function searchParts(parts: any[], rawQuery: string): PartSearchOutcome {
  const parsed = parsePartQuery(rawQuery);
  return searchPartsByFilters(parts, parsed);
}

export function searchPartsByFilters(parts: any[], parsed: PartSearchParsed): PartSearchOutcome {
  const rawQueryNormalized = normalizeText(parsed.query || "");
  const scored = parts
    .map((p) => ({ part: p, score: scorePart(p, parsed, rawQueryNormalized) }))
    .filter((s) => s.score > 0 || !parsed.query)
    .sort((a, b) => b.score - a.score);

  return {
    parts: scored.map((s) => s.part),
    noExactMatch: scored.length === 0 || scored[0].score < 20,
  };
}
