// Selection Code 002 (Sleepwear) catalog.
//
// Selection Code 001 keeps the original footwear flow; 002 demos the newer
// product-level flow and needs its own categories, attributes and sample
// products end to end. This module is the single source of truth for the
// three 002-specific screens (sleepwear brick confirmation, sleepwear brick
// GTIN list, sleepwear enrichment review) so they can't drift apart.
//
// Brick codes are the ones already used elsewhere in the app for sleepwear —
// see screen-category-coverage.tsx and screen-individual-assignment.tsx.

export const SLEEPWEAR_SELECTION_CODE = "002"

// ── Categories ────────────────────────────────────────────────────────────────

export interface SleepwearBrick {
  id: string
  name: string
  brickCode: string
  confidence: number
  /** Share of the in-scope products that fall into this category. */
  weight: number
}

// High-confidence groups AI proposes for sleepwear.
export const SLEEPWEAR_BRICKS: SleepwearBrick[] = [
  { id: "1", name: "Night Dresses/Shirts",  brickCode: "10001339", confidence: 95, weight: 0.30 },
  { id: "2", name: "Dressing Gowns",        brickCode: "10001338", confidence: 92, weight: 0.22 },
  { id: "3", name: "Sleep Trousers/Shorts", brickCode: "10001341", confidence: 94, weight: 0.20 },
]

// The "help us confirm the product type" tier. lc4 is the unclassifiable
// remainder and must keep confidence 0 / the "Could not classify" name — the
// confirmation screen keys its red card off both.
export const SLEEPWEAR_LOW_CONFIDENCE_BRICKS: SleepwearBrick[] = [
  { id: "lc1", name: "Sleepwear Variety Packs", brickCode: "10001358", confidence: 54, weight: 0.10 },
  { id: "lc2", name: "Night Dresses/Shirts",    brickCode: "10001339", confidence: 48, weight: 0.08 },
  { id: "lc3", name: "Dressing Gowns",          brickCode: "10001338", confidence: 45, weight: 0.06 },
  { id: "lc4", name: "Could not classify",      brickCode: "",         confidence: 0,  weight: 0.04 },
]

// Category picker for individual assignment within the sleepwear flow.
export const SLEEPWEAR_CATEGORY_OPTIONS = [
  {
    parent: "Sleepwear",
    children: [
      { name: "Night Dresses/Shirts",    brickCode: "10001339" },
      { name: "Dressing Gowns",          brickCode: "10001338" },
      { name: "Sleep Trousers/Shorts",   brickCode: "10001341" },
      { name: "Sleepwear Variety Packs", brickCode: "10001358" },
    ],
  },
]

/**
 * Split `total` products across `weights` using largest-remainder, so the
 * parts always sum back to exactly `total`. Category counts on the
 * confirmation screen are derived from the scope rather than hardcoded, so a
 * one-product scope shows one product rather than a fixed 285.
 */
export function distributeProducts(total: number, weights: number[]): number[] {
  if (total <= 0 || weights.length === 0) return weights.map(() => 0)
  const weightSum = weights.reduce((s, w) => s + w, 0)
  if (weightSum <= 0) return weights.map(() => 0)

  const exact = weights.map((w) => (total * w) / weightSum)
  const floors = exact.map(Math.floor)
  let remainder = total - floors.reduce((s, n) => s + n, 0)

  // Hand the leftover units to the largest fractional parts first.
  const order = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac)

  const counts = [...floors]
  for (let i = 0; remainder > 0 && i < order.length; i++, remainder--) {
    counts[order[i].index] += 1
  }
  return counts
}

/** GTINs per product, matching the ~2.3 ratio used elsewhere in the app. */
export function estimateGtins(productCount: number): number {
  return productCount > 0 ? Math.max(productCount, Math.round(productCount * 2.3)) : 0
}

// ── Attributes ────────────────────────────────────────────────────────────────

export interface SleepwearAttributeDef {
  name: string
  suggestions: string[]
  /** Drives the confidence bar and the "Needs review" badge (rule c). */
  avgConfidence: number
  /** Lowest individual product value confidence — rule (b); null means the
   *  attribute has no suggested value at all — rule (a). */
  minProductConfidence: number | null
  /** How many products in this attribute get a sub-70 confidence score.
   *  0 means the attribute is fully auto-validated. */
  lowConfidenceSlots?: number
}

// 14 attributes, keeping the same spread of badge states as the footwear set so
// the demo still exercises every rule:
//   9 green · 2 flagged by avg confidence · 2 flagged by value confidence · 1 with no value
export const SLEEPWEAR_ATTRIBUTES: SleepwearAttributeDef[] = [
  // ── Green (avg ≥90%, all product values ≥90%) ──────────────────────────────
  { name: "Brand Name",              suggestions: ["Nautica", "Calvin Klein", "Hanes", "Eberjey", "Lunya"],                                  avgConfidence: 0.96, minProductConfidence: 0.97 },
  { name: "Care Instructions",       suggestions: ["Machine Wash Cold", "Hand Wash", "Tumble Dry Low", "Dry Clean Only"],                    avgConfidence: 0.94, minProductConfidence: 0.92 },
  { name: "Country of Origin",       suggestions: ["China", "Vietnam", "India", "Bangladesh", "Turkey"],                                     avgConfidence: 0.93, minProductConfidence: 0.91 },
  { name: "Gender",                  suggestions: ["Women", "Men", "Unisex", "Girls", "Boys"],                                               avgConfidence: 0.97, minProductConfidence: 0.96 },
  { name: "Sleeve Length",           suggestions: ["Long Sleeve", "Short Sleeve", "Three-Quarter Sleeve", "Sleeveless", "Cap Sleeve"],       avgConfidence: 0.95, minProductConfidence: 0.93 },
  { name: "Garment Length",          suggestions: ["Full Length", "Ankle Length", "Knee Length", "Midi", "Mini"],                            avgConfidence: 0.92, minProductConfidence: 0.90 },
  { name: "Pattern",                 suggestions: ["Solid", "Striped", "Floral", "Plaid", "Polka Dot", "Printed"],                           avgConfidence: 0.95, minProductConfidence: 0.93 },
  { name: "Set Contents",            suggestions: ["Top and Bottom", "Single Piece", "Three Piece", "Robe and Belt"],                        avgConfidence: 0.91, minProductConfidence: 0.90 },
  { name: "Lining Material",         suggestions: ["Unlined", "Cotton", "Satin", "Mesh"],                                                    avgConfidence: 0.92, minProductConfidence: 0.91 },
  // ── Needs review: avg confidence orange/red — rule (c) ─────────────────────
  { name: "Fit",                     suggestions: ["Relaxed", "Regular", "Slim", "Oversized"],                                               avgConfidence: 0.84, minProductConfidence: 0.91 },
  { name: "Trim/Embellishment",      suggestions: ["Lace Trim", "Piping", "Embroidery", "Ruffle", "None"],                                   avgConfidence: 0.67, minProductConfidence: 0.90 },
  // ── Needs review: a product VALUE is orange/red — rule (b) ─────────────────
  { name: "Closure",                 suggestions: ["Button Front", "Drawstring", "Tie Front", "Wrap", "Snap Front"],                         avgConfidence: 0.91, minProductConfidence: 0.79, lowConfidenceSlots: 4 },
  { name: "Fabric or Material Code", suggestions: ["Cotton", "Modal", "Silk", "Satin", "Flannel", "Jersey", "Fleece"],                       avgConfidence: 0.90, minProductConfidence: 0.83, lowConfidenceSlots: 3 },
  // ── Needs review: attribute has no value — rule (a) ────────────────────────
  { name: "Neckline",                suggestions: ["V-Neck", "Round Neck", "Henley", "Notch Collar", "Scoop Neck", "Shawl Collar"],          avgConfidence: 0.91, minProductConfidence: null, lowConfidenceSlots: 3 },
]

// Why AI picked a value — shown under each suggestion.
export const SLEEPWEAR_REASONING: Record<string, (desc: string) => string> = {
  "Brand Name":              () => "Extracted from product title",
  "Care Instructions":       (desc) => desc.toLowerCase().includes("silk") ? "Delicate fabric detected — hand wash inferred" : "Matched to standard care label codes",
  "Closure":                 (desc) => desc.toLowerCase().includes("drawstring") ? '"drawstring" found in description' : "Common closure for this garment type",
  "Country of Origin":       () => "Sourced from product data",
  "Fabric or Material Code": (desc) => {
    const match = ["cotton", "modal", "silk", "satin", "flannel", "jersey", "fleece", "waffle"].find((f) => desc.toLowerCase().includes(f))
    return match ? `"${match}" detected in title` : "Inferred from product image analysis"
  },
  "Fit":                     () => "Estimated from size curve and product images",
  "Garment Length":          (desc) => desc.toLowerCase().includes("short") ? '"short" found in description' : "Inferred from category norms",
  "Gender":                  () => "Inferred from product title and category",
  "Lining Material":         () => "Inferred from category norms",
  "Neckline":                (desc) => desc.toLowerCase().includes("henley") ? '"henley" found in description' : "Derived from product image analysis",
  "Pattern":                 () => "Detected from primary product image",
  "Set Contents":            (desc) => desc.toLowerCase().includes("set") || desc.toLowerCase().includes("pack") ? '"set" found in description' : "Single item inferred from title",
  "Sleeve Length":           (desc) => desc.toLowerCase().includes("long sleeve") ? '"long sleeve" found in description' : "Derived from product category",
  "Trim/Embellishment":      (desc) => desc.toLowerCase().includes("lace") ? '"lace" found in description' : "No trim detected in product images",
}

// ── GS1 code list values ──────────────────────────────────────────────────────
// Attributes without an entry here accept free text only.

// Apparel-general closure list — the same GS1 values the footwear flow uses.
const CLOSURE_VALUES = [
  { label: "Adjustable/Pull",           code: "GM03CLOSAP" },
  { label: "Back",                      code: "GM03CLOSBC" },
  { label: "Back Button/Zip",           code: "GM03CLOSBB" },
  { label: "Back Hook/Zip",             code: "GM03CLOSBH" },
  { label: "Box Tab Insert",            code: "GM03CLOSBT" },
  { label: "Buckle",                    code: "GM03CLOSBU" },
  { label: "Button",                    code: "GM03CLOSBN" },
  { label: "Button Back",               code: "GM03CLOSBK" },
  { label: "Button Front",              code: "GM03CLOSBF" },
  { label: "Button Front Partial",      code: "GM03CLOSBP" },
  { label: "Button Shoulder",           code: "GM03CLOSBS" },
  { label: "Drawstring",                code: "GM03CLOSDS" },
  { label: "Drawstring Front",          code: "GM03CLOSDF" },
  { label: "Drawstring Elastic",        code: "GM03CLOSDE" },
  { label: "Flap",                      code: "GM03CLOSFP" },
  { label: "Foldover",                  code: "GM03CLOSFO" },
  { label: "Frog/Button Loop",          code: "GM03CLOSFA" },
  { label: "Front Button/Zip",          code: "GM03CLOSFZ" },
  { label: "Front Hook/Zip",            code: "GM03CLOSFH" },
  { label: "Hidden Button Front",       code: "GM03CLOSHB" },
  { label: "Hidden Snap Front",         code: "GM03CLOSHS" },
  { label: "Hidden Zip Front",          code: "GM03CLOSHZ" },
  { label: "Hook",                      code: "GM03CLOSHO" },
  { label: "Lace-up Front",             code: "GM03CLOSLF" },
  { label: "Side Button/Zip",           code: "GM03CLOSSB" },
  { label: "Side Hook/Zip",             code: "GM03CLOSSZ" },
  { label: "Slip-on",                   code: "GM03CLOSSL" },
  { label: "Snap",                      code: "GM03CLOSN"  },
  { label: "Snap Back",                 code: "GM03CLOSSM" },
  { label: "Snap Front",                code: "GM03CLOSSF" },
  { label: "Snap Front Partial",        code: "GM03CLOSS2" },
  { label: "Snap Legs",                 code: "GM03CLOSSE" },
  { label: "Snap Shoulder",             code: "GM03CLOSSS" },
  { label: "String",                    code: "GM03CLOSSR" },
  { label: "Tab",                       code: "GM03CLOSTB" },
  { label: "Tie",                       code: "GM03CLOSTI" },
  { label: "Tie Back/Halter",           code: "GM03CLOSTH" },
  { label: "Tie Front",                 code: "GM03CLOSTF" },
  { label: "Tie Side",                  code: "GM03CLOSTS" },
  { label: "Toggle",                    code: "GM03CLOSTO" },
  { label: "Toggle Front",              code: "GM03CLOSTN" },
  { label: "Tunnel Side Tie",           code: "GM03CLOSTQ" },
  { label: "Velcro",                    code: "GM03CLOSVC" },
  { label: "Wrap",                      code: "GM03CLOSWR" },
  { label: "Zip",                       code: "GM03CLOSZI" },
  { label: "Zipper Back",               code: "GM03CLOSZB" },
  { label: "Zipper Back Partial",       code: "GM03CLOSZP" },
]

export const SLEEPWEAR_CODE_LIST_VALUES: Record<string, { label: string; code: string }[]> = {
  Closure: CLOSURE_VALUES,
  "Fabric or Material Code": [
    { label: "Cotton",      code: "GM03FABCO" },
    { label: "Flannel",     code: "GM03FABFL" },
    { label: "Fleece",      code: "GM03FABFC" },
    { label: "Jersey",      code: "GM03FABJE" },
    { label: "Modal",       code: "GM03FABMO" },
    { label: "Satin",       code: "GM03FABSA" },
    { label: "Silk",        code: "GM03FABSI" },
    { label: "Synthetic",   code: "GM03FABSY" },
    { label: "Textile",     code: "GM03FABTE" },
    { label: "Waffle Knit", code: "GM03FABWK" },
  ],
  "Sleeve Length": [
    { label: "Cap Sleeve",           code: "GM03SLVCP" },
    { label: "Long Sleeve",          code: "GM03SLVLG" },
    { label: "Short Sleeve",         code: "GM03SLVSH" },
    { label: "Sleeveless",           code: "GM03SLVNO" },
    { label: "Three-Quarter Sleeve", code: "GM03SLVTQ" },
  ],
  Neckline: [
    { label: "Boat Neck",     code: "GM03NECBT" },
    { label: "Henley",        code: "GM03NECHE" },
    { label: "Notch Collar",  code: "GM03NECNC" },
    { label: "Round Neck",    code: "GM03NECRD" },
    { label: "Scoop Neck",    code: "GM03NECSC" },
    { label: "Shawl Collar",  code: "GM03NECSH" },
    { label: "V-Neck",        code: "GM03NECVN" },
  ],
  Fit: [
    { label: "Oversized", code: "GM03FITOV" },
    { label: "Regular",   code: "GM03FITRG" },
    { label: "Relaxed",   code: "GM03FITRX" },
    { label: "Slim",      code: "GM03FITSL" },
  ],
  Pattern: [
    { label: "Floral",     code: "GM03PATFL" },
    { label: "Plaid",      code: "GM03PATPL" },
    { label: "Polka Dot",  code: "GM03PATPD" },
    { label: "Printed",    code: "GM03PATPR" },
    { label: "Solid",      code: "GM03PATSO" },
    { label: "Striped",    code: "GM03PATST" },
  ],
}

// ── Sample products for the category drill-down ───────────────────────────────

export interface SleepwearChildGtin {
  gtin: string
  colorCode: string
  sizeCode: string
}

export interface SleepwearProductRecord {
  product: string
  gtins: number
  selCode: string
  confidence: number
  category: string
  childGtins: SleepwearChildGtin[]
  declined: boolean
}

const NIGHT_DRESSES: SleepwearProductRecord[] = [
  { product: "Cotton pajama set, long sleeve", gtins: 6, selCode: "002", confidence: 0.97, category: "Night Dresses/Shirts", childGtins: [
    { gtin: "0888546415101", colorCode: "105 - Blush", sizeCode: "10040 - S" },
    { gtin: "0888546415102", colorCode: "106 - Navy",  sizeCode: "10050 - M" },
    { gtin: "0888546415103", colorCode: "505 - Ivory", sizeCode: "10060 - L" },
  ], declined: false },
  { product: "Modal sleep shirt", gtins: 5, selCode: "002", confidence: 0.95, category: "Night Dresses/Shirts", childGtins: [
    { gtin: "0888546415110", colorCode: "004 - Grey",  sizeCode: "10040 - S" },
    { gtin: "0888546415111", colorCode: "001 - Black", sizeCode: "10050 - M" },
  ], declined: false },
  { product: "Lace-trim chemise", gtins: 5, selCode: "002", confidence: 0.93, category: "Night Dresses/Shirts", childGtins: [
    { gtin: "0888546415120", colorCode: "011 - Pink",  sizeCode: "10040 - S" },
    { gtin: "0888546415121", colorCode: "001 - Black", sizeCode: "10050 - M" },
  ], declined: false },
  { product: "Brushed cotton nightshirt", gtins: 4, selCode: "002", confidence: 0.96, category: "Night Dresses/Shirts", childGtins: [
    { gtin: "0888546415130", colorCode: "010 - White", sizeCode: "10050 - M" },
    { gtin: "0888546415131", colorCode: "003 - Navy",  sizeCode: "10060 - L" },
  ], declined: false },
  { product: "Striped pajama set, short sleeve", gtins: 6, selCode: "002", confidence: 0.94, category: "Night Dresses/Shirts", childGtins: [
    { gtin: "0888546415140", colorCode: "003 - Navy",  sizeCode: "10040 - S" },
    { gtin: "0888546415141", colorCode: "005 - Red",   sizeCode: "10060 - L" },
  ], declined: false },
]

const DRESSING_GOWNS: SleepwearProductRecord[] = [
  { product: "Plush fleece robe", gtins: 4, selCode: "002", confidence: 0.96, category: "Dressing Gowns", childGtins: [
    { gtin: "0888546415201", colorCode: "004 - Grey",  sizeCode: "10040 - S" },
    { gtin: "0888546415202", colorCode: "011 - Pink",  sizeCode: "10050 - M" },
  ], declined: false },
  { product: "Kimono wrap robe", gtins: 4, selCode: "002", confidence: 0.93, category: "Dressing Gowns", childGtins: [
    { gtin: "0888546415210", colorCode: "001 - Black", sizeCode: "10050 - M" },
    { gtin: "0888546415211", colorCode: "505 - Ivory", sizeCode: "10060 - L" },
  ], declined: false },
  { product: "Hooded terry robe", gtins: 4, selCode: "002", confidence: 0.94, category: "Dressing Gowns", childGtins: [
    { gtin: "0888546415220", colorCode: "010 - White", sizeCode: "10050 - M" },
    { gtin: "0888546415221", colorCode: "004 - Grey",  sizeCode: "10060 - L" },
  ], declined: false },
  { product: "Waffle-knit robe", gtins: 3, selCode: "002", confidence: 0.91, category: "Dressing Gowns", childGtins: [
    { gtin: "0888546415230", colorCode: "008 - Beige", sizeCode: "10050 - M" },
  ], declined: false },
]

const SLEEP_TROUSERS: SleepwearProductRecord[] = [
  { product: "Drawstring sleep pants", gtins: 6, selCode: "002", confidence: 0.96, category: "Sleep Trousers/Shorts", childGtins: [
    { gtin: "0888546415301", colorCode: "003 - Navy",  sizeCode: "10050 - M" },
    { gtin: "0888546415302", colorCode: "004 - Grey",  sizeCode: "10060 - L" },
  ], declined: false },
  { product: "Knit sleep shorts, two-pack", gtins: 3, selCode: "002", confidence: 0.93, category: "Sleep Trousers/Shorts", childGtins: [
    { gtin: "0888546415310", colorCode: "001 - Black", sizeCode: "10040 - S" },
  ], declined: false },
  { product: "Jogger-style lounge pants", gtins: 5, selCode: "002", confidence: 0.95, category: "Sleep Trousers/Shorts", childGtins: [
    { gtin: "0888546415320", colorCode: "004 - Grey",  sizeCode: "10050 - M" },
    { gtin: "0888546415321", colorCode: "001 - Black", sizeCode: "10060 - L" },
  ], declined: false },
  { product: "Plaid flannel sleep pants", gtins: 4, selCode: "002", confidence: 0.94, category: "Sleep Trousers/Shorts", childGtins: [
    { gtin: "0888546415330", colorCode: "005 - Red",   sizeCode: "10050 - M" },
  ], declined: false },
]

// Low-confidence groups — the products AI is unsure about.
const LOW_CONFIDENCE_VARIETY_PACKS: SleepwearProductRecord[] = [
  { product: "Three-piece sleep set, gift box", gtins: 3, selCode: "002", confidence: 0.56, category: "Sleepwear Variety Packs", childGtins: [{ gtin: "0888546415401", colorCode: "014 - Multi", sizeCode: "10050 - M" }], declined: false },
  { product: "Pajama and robe bundle",          gtins: 2, selCode: "002", confidence: 0.52, category: "Sleepwear Variety Packs", childGtins: [{ gtin: "0888546415402", colorCode: "011 - Pink",  sizeCode: "10040 - S" }], declined: false },
  { product: "Mix-and-match sleep separates",   gtins: 4, selCode: "002", confidence: 0.54, category: "Sleepwear Variety Packs", childGtins: [{ gtin: "0888546415403", colorCode: "014 - Multi", sizeCode: "10060 - L" }], declined: false },
  { product: "Holiday pajama gift set",         gtins: 2, selCode: "002", confidence: 0.50, category: "Sleepwear Variety Packs", childGtins: [{ gtin: "0888546415404", colorCode: "005 - Red",   sizeCode: "10050 - M" }], declined: false },
]

const LOW_CONFIDENCE_NIGHT_DRESSES: SleepwearProductRecord[] = [
  { product: "Silk nightgown collection",    gtins: 2, selCode: "002", confidence: 0.46, category: "Night Dresses/Shirts", childGtins: [{ gtin: "0888546415501", colorCode: "011 - Pink",  sizeCode: "10040 - S" }], declined: false },
  { product: "Flannel pajama top",           gtins: 4, selCode: "002", confidence: 0.48, category: "Night Dresses/Shirts", childGtins: [{ gtin: "0888546415502", colorCode: "005 - Red",   sizeCode: "10060 - L" }], declined: false },
  { product: "Satin camisole set",           gtins: 2, selCode: "002", confidence: 0.45, category: "Night Dresses/Shirts", childGtins: [{ gtin: "0888546415503", colorCode: "010 - White", sizeCode: "10040 - S" }], declined: false },
  { product: "Jersey sleep dress",           gtins: 3, selCode: "002", confidence: 0.47, category: "Night Dresses/Shirts", childGtins: [{ gtin: "0888546415504", colorCode: "004 - Grey",  sizeCode: "10050 - M" }], declined: false },
  { product: "Thermal henley nightshirt",    gtins: 2, selCode: "002", confidence: 0.43, category: "Night Dresses/Shirts", childGtins: [{ gtin: "0888546415505", colorCode: "001 - Black", sizeCode: "10060 - L" }], declined: false },
]

const LOW_CONFIDENCE_DRESSING_GOWNS: SleepwearProductRecord[] = [
  { product: "Lightweight summer wrap",  gtins: 2, selCode: "002", confidence: 0.44, category: "Dressing Gowns", childGtins: [{ gtin: "0888546415601", colorCode: "505 - Ivory", sizeCode: "10050 - M" }], declined: false },
  { product: "Spa wrap with belt",       gtins: 3, selCode: "002", confidence: 0.46, category: "Dressing Gowns", childGtins: [{ gtin: "0888546415602", colorCode: "010 - White", sizeCode: "10040 - S" }], declined: false },
  { product: "Quilted bed jacket",       gtins: 2, selCode: "002", confidence: 0.42, category: "Dressing Gowns", childGtins: [{ gtin: "0888546415603", colorCode: "008 - Beige", sizeCode: "10060 - L" }], declined: false },
]

// Keyed by the category card id the user drilled in from.
export const SLEEPWEAR_PRODUCTS_BY_CATEGORY: Record<string, SleepwearProductRecord[]> = {
  "1": NIGHT_DRESSES,
  "2": DRESSING_GOWNS,
  "3": SLEEP_TROUSERS,
  lc1: LOW_CONFIDENCE_VARIETY_PACKS,
  lc2: LOW_CONFIDENCE_NIGHT_DRESSES,
  lc3: LOW_CONFIDENCE_DRESSING_GOWNS,
}

// Products AI could not classify at all — the "Assign Individually" path.
export const SLEEPWEAR_UNCLASSIFIED_PRODUCTS = [
  { id: "unc1", product: "Weighted sleep mask set",   gtins: 1 },
  { id: "unc2", product: "Travel slipper and pouch",  gtins: 2 },
  { id: "unc3", product: "Heated throw wrap",         gtins: 1 },
  { id: "unc4", product: "Monogrammed pillow sleeve", gtins: 2 },
]

/** All category names a sleepwear product can be moved to. */
export const SLEEPWEAR_AVAILABLE_CATEGORIES = SLEEPWEAR_CATEGORY_OPTIONS[0].children.map((c) => c.name)
