// AI category suggestion for a single product.
//
// Assigning a category is part of enrichment, not a prerequisite the supplier
// has to satisfy first. This module produces the proposal the user reviews:
// a category, a confidence, and the evidence behind it.
//
// Matching is deterministic — the same description always yields the same
// suggestion and score — so a demo runs identically every time.

export interface CategorySuggestion {
  name: string
  brickCode: string
  /** 0-100. Below LOW_CONFIDENCE_THRESHOLD the suggestion needs a closer look. */
  confidence: number
  reasoning: string
}

/** Below this, the suggestion is shown flagged rather than ready to confirm. */
export const LOW_CONFIDENCE_THRESHOLD = 70

interface MatchRule {
  brickCode: string
  name: string
  /** Specific garment/article nouns — a hit here is strong evidence. */
  strong: string[]
  /** Generic packaging or styling words — a hit here is a weak guess only. */
  weak?: string[]
}

// Ordered: the first strong match wins, so specific rules precede generic ones.
const RULES: MatchRule[] = [
  // ── Sleepwear ──────────────────────────────────────────────────────────────
  {
    brickCode: "10001338",
    name: "Dressing Gowns",
    strong: ["dressing gown", "bathrobe", "housecoat", "kimono", "robe"],
    weak: ["wrap", "bed jacket"],
  },
  {
    brickCode: "10001341",
    name: "Sleep Trousers/Shorts",
    strong: ["sleep pant", "sleep short", "pajama pant", "pyjama pant", "pajama bottom", "lounge pant", "jogger", "trouser"],
    weak: ["bottoms", "short"],
  },
  {
    brickCode: "10001339",
    name: "Night Dresses/Shirts",
    strong: ["nightgown", "night gown", "nightdress", "night dress", "nightshirt", "night shirt", "sleep shirt", "sleep dress", "chemise", "negligee", "pajama top", "pyjama top", "sleep top"],
    weak: ["camisole", "slip"],
  },
  {
    brickCode: "10001358",
    name: "Sleepwear Variety Packs",
    strong: ["variety pack", "pajama set", "pyjama set", "pj set", "sleep set", "three-piece", "two-pack", "separates"],
    weak: ["set", "pack", "bundle", "gift"],
  },

  // ── Footwear ───────────────────────────────────────────────────────────────
  {
    brickCode: "10001070",
    name: "Athletic Footwear - General Purpose",
    strong: ["running shoe", "trainer", "athletic", "sneaker", "hiking shoe", "cross-train"],
    weak: ["mesh upper", "performance"],
  },
  {
    brickCode: "10001076",
    name: "Boots - General Purpose",
    strong: ["boot", "bootie", "chelsea", "combat"],
    weak: ["ankle"],
  },
  {
    brickCode: "10001077",
    name: "Shoes - General Purpose",
    strong: ["oxford", "loafer", "moccasin", "sandal", "espadrille", "clog", "mule", "flat", "pump", "heel", "shoe"],
    weak: ["slip-on", "lace-up"],
  },

  // ── Jewellery & Watches ────────────────────────────────────────────────────
  {
    brickCode: "10001105",
    name: "Watches",
    strong: ["watch", "chronograph", "timepiece"],
  },
  {
    brickCode: "10001084",
    name: "Bracelets",
    strong: ["bracelet", "bangle", "cuff"],
    weak: ["charm"],
  },
  {
    brickCode: "10001090",
    name: "Necklaces/Necklets",
    strong: ["necklace", "necklet", "pendant", "choker"],
    weak: ["chain"],
  },
  {
    brickCode: "10001087",
    name: "Earrings/Body Jewellery",
    strong: ["earring", "stud", "hoop"],
  },
  {
    brickCode: "10001092",
    name: "Rings",
    strong: ["ring"],
  },
]

/** Stable pseudo-random offset so scores don't shift between renders. */
function hash(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0
  return h
}

/**
 * Propose a category for a product description.
 *
 * Returns null when nothing matches — AI genuinely could not classify it, and
 * the caller should fall back to letting the supplier pick.
 */
export function suggestCategory(description: string, allowedBrickCodes?: string[]): CategorySuggestion | null {
  const desc = description.toLowerCase()
  const allowed = allowedBrickCodes?.length ? new Set(allowedBrickCodes) : null
  const rules = allowed ? RULES.filter((r) => allowed.has(r.brickCode)) : RULES

  const offset = hash(description) % 5

  // A specific garment noun is strong evidence.
  for (const rule of rules) {
    const hit = rule.strong.find((k) => desc.includes(k))
    if (hit) {
      return {
        name: rule.name,
        brickCode: rule.brickCode,
        confidence: 90 + offset,
        reasoning: `"${hit}" found in the product description`,
      }
    }
  }

  // A generic word is a guess worth showing, but not one to auto-confirm.
  for (const rule of rules) {
    const hit = rule.weak?.find((k) => desc.includes(k))
    if (hit) {
      return {
        name: rule.name,
        brickCode: rule.brickCode,
        confidence: 54 + offset,
        reasoning: `Only "${hit}" matched — too generic to be sure`,
      }
    }
  }

  return null
}
