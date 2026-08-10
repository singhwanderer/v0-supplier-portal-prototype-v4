// Selection Code 002 (Sleepwear) catalog — categories and sample products.
//
// Selection Code 001 keeps the original footwear flow; 002 demos the newer
// product-level flow and needs its own categories and sample products. This
// module backs the three 002-specific screens (sleepwear brick confirmation,
// sleepwear brick GTIN list, sleepwear enrichment review).
//
// Attributes are NOT here: they're resolved per brick from lib/category-attributes.ts,
// with values from the real GS1 code lists in lib/gs1-code-lists.ts.
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
  /**
   * Why AI grouped products here — shown on the card so the code-level step
   * explains itself the same way the product-level step does. Authored from the
   * garment nouns lib/category-suggestion.ts matches on, so both tell one story.
   */
  evidence: string
}

// High-confidence groups AI proposes for sleepwear.
export const SLEEPWEAR_BRICKS: SleepwearBrick[] = [
  { id: "1", name: "Night Dresses/Shirts",  brickCode: "10001339", confidence: 95, weight: 0.30,
    evidence: `"nightgown", "sleep shirt" and "chemise" matched in the product descriptions` },
  { id: "2", name: "Dressing Gowns",        brickCode: "10001338", confidence: 92, weight: 0.22,
    evidence: `"robe" and "kimono" matched in the product descriptions` },
  { id: "3", name: "Sleep Trousers/Shorts", brickCode: "10001341", confidence: 94, weight: 0.20,
    evidence: `"sleep pant", "sleep short" and "lounge pant" matched in the product descriptions` },
]

// The "help us confirm the product type" tier. lc4 is the unclassifiable
// remainder and must keep confidence 0 / the "Could not classify" name — the
// confirmation screen keys its red card off both.
export const SLEEPWEAR_LOW_CONFIDENCE_BRICKS: SleepwearBrick[] = [
  { id: "lc1", name: "Sleepwear Variety Packs", brickCode: "10001358", confidence: 54, weight: 0.10,
    evidence: `Only "set" and "pack" matched — too generic to be sure` },
  { id: "lc2", name: "Night Dresses/Shirts",    brickCode: "10001339", confidence: 48, weight: 0.08,
    evidence: `Only "camisole" matched — could also be a variety pack` },
  { id: "lc3", name: "Dressing Gowns",          brickCode: "10001338", confidence: 45, weight: 0.06,
    evidence: `Only "wrap" matched — could also be a shawl or a cover-up` },
  { id: "lc4", name: "Could not classify",      brickCode: "",         confidence: 0,  weight: 0.04,
    evidence: "No garment type could be read from these product descriptions" },
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

// ── Category Coverage detail ────────────────────────────────────────────────
//
// Single source of truth for the Category Coverage screen's numbers: 38 of 52
// products already have categories, split across these three; six of the
// remaining 14 are named so the coverage table isn't empty. Coherent with
// screen-selection-code-list.tsx and screen-product-list.tsx — change one and
// the others must follow.

export interface CoverageAssignedGroup {
  categoryName: string
  brickCode: string
  productCount: number
}

export const SLEEPWEAR_COVERAGE_ASSIGNED: CoverageAssignedGroup[] = [
  { categoryName: "Night Dresses/Shirts",  brickCode: "10001339", productCount: 18 },
  { categoryName: "Dressing Gowns",        brickCode: "10001338", productCount: 12 },
  { categoryName: "Sleep Trousers/Shorts", brickCode: "10001341", productCount: 8 },
]

export interface CoverageUnassignedSample {
  id: string
  description: string
  gtins: number
}

export const SLEEPWEAR_COVERAGE_UNASSIGNED_SAMPLES: CoverageUnassignedSample[] = [
  { id: "S22041", description: "Silk nightgown collection",    gtins: 2 },
  { id: "S22044", description: "Flannel pajama top",           gtins: 4 },
  { id: "S22047", description: "Satin camisole set",           gtins: 2 },
  { id: "S22051", description: "Jersey sleep dress",           gtins: 3 },
  { id: "S22054", description: "Thermal henley nightshirt",    gtins: 2 },
  { id: "S22058", description: "Waffle-knit robe",             gtins: 3 },
]

export interface CoverageScopeProduct {
  id: string
  description: string
  gtins: number
  category: { name: string; brickCode: string } | null
  createDate: string
}

/**
 * Full product list behind the Category Coverage screen's "Continue" button —
 * the assigned products plus the ones that still need a category, so the
 * review screen that follows can show both instead of an unscoped whole-code
 * run. Real curated products fill in first; anything past that is a numbered
 * synthetic entry, same pattern as buildFallbackRows in screen-product-list.tsx.
 */
export function buildCoverageReviewScope(assignedCount: number, unassignedCount: number): CoverageScopeProduct[] {
  const weights = SLEEPWEAR_COVERAGE_ASSIGNED.map((g) => g.productCount)
  const counts = distributeProducts(assignedCount, weights)

  let seq = 1
  const nextId = () => `S22${String(100 + seq++).padStart(3, "0")}`

  const assigned: CoverageScopeProduct[] = SLEEPWEAR_COVERAGE_ASSIGNED.flatMap((group, i) => {
    const brick = SLEEPWEAR_BRICKS.find((b) => b.brickCode === group.brickCode)
    const pool = (brick && SLEEPWEAR_PRODUCTS_BY_CATEGORY[brick.id]) ?? []
    return Array.from({ length: counts[i] }, (_, j) => {
      const base = pool.length > 0 ? pool[j % pool.length] : null
      const pass = pool.length > 0 ? Math.floor(j / pool.length) : 0
      return {
        id: nextId(),
        description: base ? (pass === 0 ? base.product : `${base.product} (${pass + 1})`) : `${group.categoryName} item ${j + 1}`,
        gtins: base?.gtins ?? 3,
        category: { name: group.categoryName, brickCode: group.brickCode },
        createDate: "04/07/2021",
      }
    })
  })

  const unassigned: CoverageScopeProduct[] = Array.from({ length: unassignedCount }, (_, i) => {
    const sample = SLEEPWEAR_COVERAGE_UNASSIGNED_SAMPLES[i]
    return {
      id: sample?.id ?? nextId(),
      description: sample?.description ?? `Unclassified sleepwear item ${i + 1}`,
      gtins: sample?.gtins ?? 2,
      category: null,
      createDate: "05/28/2026",
    }
  })

  return [...assigned, ...unassigned]
}
