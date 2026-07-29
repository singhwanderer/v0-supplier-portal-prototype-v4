// Which attributes apply to which product category.
//
// The GS1 master file supplies code lists but no brick-to-attribute mapping, so
// that part is authored here. Every attribute names the GS1 code list that
// supplies its values, and that same name is what the review screen shows as
// the attribute label — so a supplier sees the field they'd see in the spec.
//
// Brick codes match the ones already used across the app (see
// screen-individual-assignment.tsx and screen-category-coverage.tsx).

import { GS1_CODE_LISTS } from "@/lib/gs1-code-lists"

export interface AttributeDef {
  /** GS1 code list name — also the label shown in the review table. */
  name: string
  /** Key into GS1_CODE_LISTS. Omitted for free-text attributes. */
  codeList?: string
  /** Drives the confidence bar and the "Needs review" badge (rule c). */
  avgConfidence: number
  /** Lowest individual value confidence — rule (b); null means no suggested value — rule (a). */
  minProductConfidence: number | null
  /** How many products get a sub-70 score. 0 means fully auto-validated. */
  lowConfidenceSlots?: number
}

// ── Confidence choreography ───────────────────────────────────────────────────
// Assigned per attribute name and shared across categories, so every category's
// review screen exercises all four badge states:
//   green · low average (rule c) · low value (rule b) · no value (rule a)
const CONFIDENCE: Record<string, Pick<AttributeDef, "avgConfidence" | "minProductConfidence" | "lowConfidenceSlots">> = {
  // Rule (c) — average confidence is orange/red
  "Special Embellishment": { avgConfidence: 0.67, minProductConfidence: 0.90 },
  Fit:                     { avgConfidence: 0.84, minProductConfidence: 0.91 },
  // Rule (b) — a product value is orange/red
  Closure:                 { avgConfidence: 0.91, minProductConfidence: 0.79, lowConfidenceSlots: 4 },
  "Fabric or Material":    { avgConfidence: 0.90, minProductConfidence: 0.83, lowConfidenceSlots: 3 },
  // Rule (a) — attribute has no suggested value
  Fiber:                   { avgConfidence: 0.91, minProductConfidence: null, lowConfidenceSlots: 3 },
}

const GREEN: Record<string, number> = {
  "Brand Name": 0.96,
  Gender: 0.97,
  "Care Instructions": 0.94,
  "Country of Origin": 0.93,
  "Sleepwear Type": 0.95,
  "Collar/Neck Type": 0.92,
  "Sleeve Type": 0.95,
  "Length Description": 0.92,
  "Lining Material": 0.92,
  "Waistband Type": 0.93,
  "Leg Type": 0.94,
  "Knit Type": 0.91,
  Occasion: 0.92,
  Pattern: 0.95,
  "Shoe Type": 0.93,
  "Shoe Style": 0.94,
  "Open/Closed Toe": 0.91,
  "Toe Shape": 0.92,
  "Toe Style": 0.91,
  "Heel Height Range": 0.93,
  "Heel Type": 0.92,
  "Heel Material": 0.91,
  "Outsole Type": 0.93,
  "Sole Type": 0.92,
  "Boot Shaft Type": 0.94,
  "Water Repellent": 0.94,
  Sport: 0.93,
  "Jewelry Type": 0.96,
  "Bracelet Type": 0.94,
  "Necklace Type": 0.94,
  "Earring Type": 0.94,
  "Ring Type": 0.93,
  Metal: 0.95,
  "Metal Composition": 0.93,
  "Band Type": 0.92,
  "Watch Case Shape": 0.93,
  Crown: 0.91,
  "Number of Settings": 0.90,
}

/**
 * Build an attribute definition. Attributes are bound to the GS1 code list of
 * the same name; the handful with no list (Brand Name, Country of Origin,
 * Pattern) are free text.
 */
function attr(name: string): AttributeDef {
  const tuned = CONFIDENCE[name]
  const base = tuned ?? {
    avgConfidence: GREEN[name] ?? 0.92,
    minProductConfidence: 0.90,
  }
  return {
    name,
    codeList: name in GS1_CODE_LISTS ? name : undefined,
    ...base,
  }
}

// ── Brick → attribute sets ────────────────────────────────────────────────────
// Attribute names common to every apparel/accessory brick.
const COMMON = ["Brand Name", "Country of Origin", "Gender", "Care Instructions"]

const BRICK_ATTRIBUTE_NAMES: Record<string, string[]> = {
  // ── Sleepwear ──────────────────────────────────────────────────────────────
  // 10001339 Night Dresses/Shirts
  "10001339": [...COMMON, "Sleepwear Type", "Collar/Neck Type", "Sleeve Type", "Length Description",
               "Fit", "Fabric or Material", "Fiber", "Lining Material", "Closure",
               "Special Embellishment", "Knit Type", "Occasion"],
  // 10001338 Dressing Gowns
  "10001338": [...COMMON, "Sleepwear Type", "Collar/Neck Type", "Sleeve Type", "Length Description",
               "Fit", "Fabric or Material", "Fiber", "Lining Material", "Closure",
               "Special Embellishment", "Occasion"],
  // 10001341 Sleep Trousers/Shorts — no neckline or sleeves; waist and leg instead
  "10001341": [...COMMON, "Sleepwear Type", "Waistband Type", "Leg Type", "Length Description",
               "Fit", "Fabric or Material", "Fiber", "Closure", "Special Embellishment",
               "Knit Type", "Occasion"],
  // 10001358 Sleepwear Variety Packs — mixed contents, so only pack-level attributes
  "10001358": [...COMMON, "Sleepwear Type", "Fit", "Fabric or Material", "Fiber",
               "Special Embellishment", "Occasion"],

  // ── Footwear ───────────────────────────────────────────────────────────────
  // 10001077 Shoes - General Purpose
  "10001077": [...COMMON, "Shoe Type", "Shoe Style", "Open/Closed Toe", "Toe Shape", "Toe Style",
               "Heel Height Range", "Heel Type", "Heel Material", "Outsole Type", "Sole Type",
               "Fabric or Material", "Fiber", "Lining Material", "Closure", "Water Repellent"],
  // 10001076 Boots - General Purpose — adds shaft height
  "10001076": [...COMMON, "Shoe Type", "Shoe Style", "Boot Shaft Type", "Toe Shape", "Toe Style",
               "Heel Height Range", "Heel Type", "Heel Material", "Outsole Type", "Sole Type",
               "Fabric or Material", "Fiber", "Lining Material", "Closure", "Water Repellent"],
  // 10001070 Athletic Footwear — sport-led; no heel or toe styling
  "10001070": [...COMMON, "Shoe Type", "Shoe Style", "Sport", "Outsole Type", "Sole Type",
               "Fabric or Material", "Fiber", "Lining Material", "Closure", "Water Repellent"],

  // ── Jewellery & Watches ────────────────────────────────────────────────────
  // 10001084 Bracelets
  "10001084": ["Brand Name", "Country of Origin", "Gender", "Jewelry Type", "Bracelet Type",
               "Metal", "Metal Composition", "Fabric or Material", "Closure",
               "Number of Settings", "Special Embellishment"],
  // 10001090 Necklaces/Necklets
  "10001090": ["Brand Name", "Country of Origin", "Gender", "Jewelry Type", "Necklace Type",
               "Metal", "Metal Composition", "Length Description", "Closure",
               "Number of Settings", "Special Embellishment"],
  // 10001087 Earrings/Body Jewellery
  "10001087": ["Brand Name", "Country of Origin", "Gender", "Jewelry Type", "Earring Type",
               "Metal", "Metal Composition", "Number of Settings", "Special Embellishment"],
  // 10001092 Rings
  "10001092": ["Brand Name", "Country of Origin", "Gender", "Jewelry Type", "Ring Type",
               "Metal", "Metal Composition", "Number of Settings", "Special Embellishment"],
  // 10001105 Watches — case and movement rather than stone settings
  "10001105": ["Brand Name", "Country of Origin", "Gender", "Jewelry Type", "Band Type",
               "Watch Case Shape", "Crown", "Metal", "Metal Composition", "Water Repellent",
               "Closure"],
}

/**
 * Bricks each demo selection code covers. Used as a last resort when a run
 * reaches review without a product scope or confirmed categories to name the
 * bricks — e.g. proceeding straight from the Category Coverage screen.
 */
export const BRICKS_BY_SELECTION_CODE: Record<string, string[]> = {
  "001": ["10001077", "10001076", "10001070"],                         // Footwear
  "002": ["10001339", "10001338", "10001341", "10001358"],             // Sleepwear
  "003": ["10001084", "10001090", "10001105"],                         // Jewellery & Watches
}

export function getBricksForSelectionCode(code: string): string[] {
  return BRICKS_BY_SELECTION_CODE[code] ?? []
}

/** Fallback for a brick we have no mapping for — generic apparel attributes. */
const DEFAULT_ATTRIBUTE_NAMES = [
  ...COMMON, "Fit", "Fabric or Material", "Fiber", "Lining Material", "Closure",
  "Length Description", "Special Embellishment", "Occasion",
]

export function getAttributesForBrick(brickCode: string): AttributeDef[] {
  return (BRICK_ATTRIBUTE_NAMES[brickCode] ?? DEFAULT_ATTRIBUTE_NAMES).map(attr)
}

/**
 * Union of the attributes for several bricks, in first-seen order. A scope
 * covering more than one category has to collect every attribute any of its
 * products needs.
 */
export function getAttributesForBricks(brickCodes: string[]): AttributeDef[] {
  const codes = brickCodes.filter(Boolean)
  if (codes.length === 0) return DEFAULT_ATTRIBUTE_NAMES.map(attr)

  const seen = new Set<string>()
  const names: string[] = []
  codes.forEach((code) => {
    ;(BRICK_ATTRIBUTE_NAMES[code] ?? DEFAULT_ATTRIBUTE_NAMES).forEach((name) => {
      if (!seen.has(name)) {
        seen.add(name)
        names.push(name)
      }
    })
  })
  return names.map(attr)
}

/** True when we hold a curated attribute set for this brick. */
export function hasAttributesForBrick(brickCode: string): boolean {
  return brickCode in BRICK_ATTRIBUTE_NAMES
}

// ── Suggested values ──────────────────────────────────────────────────────────

/**
 * Plausible AI suggestions for an attribute: real GS1 values where the
 * attribute has a code list, otherwise a small free-text pool.
 */
const FREE_TEXT_SUGGESTIONS: Record<string, string[]> = {
  "Brand Name": ["Nautica", "Calvin Klein", "Hanes", "Clarks", "Fossil"],
  "Country of Origin": ["China", "Vietnam", "India", "Bangladesh", "Turkey"],
  Pattern: ["Solid", "Striped", "Floral", "Plaid", "Printed"],
}

export function getSuggestionsFor(attribute: AttributeDef): string[] {
  if (attribute.codeList) {
    // Skip the "Other" catch-all — a suggestion of "Other" tells a supplier nothing.
    const values = GS1_CODE_LISTS[attribute.codeList]
      .filter((v) => v.label !== "Other" && !v.label.startsWith("Other "))
      .map((v) => v.label)
    if (values.length > 0) return values
  }
  return FREE_TEXT_SUGGESTIONS[attribute.name] ?? ["Not specified"]
}

// ── Reasoning copy ────────────────────────────────────────────────────────────
// Why AI picked a value, shown under each suggestion.
const REASONING: Record<string, (desc: string) => string> = {
  "Brand Name":             () => "Extracted from product title",
  "Country of Origin":      () => "Sourced from product data",
  Gender:                   () => "Inferred from product title and category",
  "Care Instructions":      (d) => /silk|satin/i.test(d) ? "Delicate fabric detected — hand wash inferred" : "Matched to standard care label codes",
  Closure:                  (d) => /drawstring|zip|button|lace/i.test(d) ? `"${d.match(/drawstring|zip|button|lace/i)?.[0]}" found in description` : "Common closure for this product type",
  "Fabric or Material":     (d) => /satin|flannel|fleece|mesh|leather|suede|canvas|denim/i.test(d) ? `"${d.match(/satin|flannel|fleece|mesh|leather|suede|canvas|denim/i)?.[0]}" detected in title` : "Inferred from product image analysis",
  Fiber:                    (d) => /cotton|silk|modal|wool|linen|bamboo/i.test(d) ? `"${d.match(/cotton|silk|modal|wool|linen|bamboo/i)?.[0]}" found in description` : "Requires fiber content from the supplier",
  Fit:                      () => "Estimated from size curve and product images",
  "Sleepwear Type":         (d) => /pajama|robe|gown|chemise|nightshirt|pant|short/i.test(d) ? `"${d.match(/pajama|robe|gown|chemise|nightshirt|pant|short/i)?.[0]}" found in description` : "Derived from product category",
  "Collar/Neck Type":       (d) => /henley|v-neck|crew|scoop/i.test(d) ? `"${d.match(/henley|v-neck|crew|scoop/i)?.[0]}" found in description` : "Derived from product image analysis",
  "Sleeve Type":            (d) => /long sleeve|short sleeve|sleeveless/i.test(d) ? `"${d.match(/long sleeve|short sleeve|sleeveless/i)?.[0]}" found in description` : "Derived from product category",
  "Length Description":     (d) => /short|long|midi|maxi|ankle|knee/i.test(d) ? `"${d.match(/short|long|midi|maxi|ankle|knee/i)?.[0]}" found in description` : "Inferred from category norms",
  "Lining Material":        () => "Inferred from category norms",
  "Waistband Type":         (d) => /drawstring|elastic/i.test(d) ? `"${d.match(/drawstring|elastic/i)?.[0]}" found in description` : "Common waistband for this garment",
  "Leg Type":               () => "Estimated from product images",
  "Knit Type":              () => "Inferred from fabric construction",
  Occasion:                 () => "Derived from product category and styling",
  "Special Embellishment":  (d) => /lace|embroider|ruffle|bead|sequin/i.test(d) ? `"${d.match(/lace|embroider|ruffle|bead|sequin/i)?.[0]}" found in description` : "No embellishment detected in product images",
  "Shoe Type":              () => "Derived from product category",
  "Shoe Style":             (d) => /sneaker|loafer|oxford|boot|sandal|mule/i.test(d) ? `"${d.match(/sneaker|loafer|oxford|boot|sandal|mule/i)?.[0]}" found in description` : "Derived from product images",
  "Open/Closed Toe":        (d) => /sandal|slide|peep/i.test(d) ? "Open toe inferred from style" : "Standard for this shoe type",
  "Toe Shape":              () => "Estimated from product images",
  "Toe Style":              () => "Estimated from product images",
  "Heel Height Range":      () => "Estimated from product measurements",
  "Heel Type":              () => "Derived from product images",
  "Heel Material":          () => "Inferred from category and price tier",
  "Outsole Type":           () => "Inferred from category norms",
  "Sole Type":              () => "Inferred from category and price tier",
  "Boot Shaft Type":        (d) => /ankle|knee|chelsea/i.test(d) ? `"${d.match(/ankle|knee|chelsea/i)?.[0]}" found in description` : "Estimated from product images",
  "Water Repellent":        () => "Checked description for water resistance claims",
  Sport:                    (d) => /running|training|basketball|hiking/i.test(d) ? `"${d.match(/running|training|basketball|hiking/i)?.[0]}" found in description` : "Derived from product category",
  "Jewelry Type":           () => "Inferred from materials and price tier",
  "Bracelet Type":          (d) => /bangle|charm|cuff|wrap|beaded/i.test(d) ? `"${d.match(/bangle|charm|cuff|wrap|beaded/i)?.[0]}" found in description` : "Derived from product images",
  "Necklace Type":          (d) => /pendant|choker|chain|strand/i.test(d) ? `"${d.match(/pendant|choker|chain|strand/i)?.[0]}" found in description` : "Derived from product images",
  "Earring Type":           (d) => /hoop|stud|drop|dangle/i.test(d) ? `"${d.match(/hoop|stud|drop|dangle/i)?.[0]}" found in description` : "Derived from product images",
  "Ring Type":              () => "Derived from product images",
  Metal:                    (d) => /gold|silver|platinum|steel/i.test(d) ? `"${d.match(/gold|silver|platinum|steel/i)?.[0]}" found in description` : "Inferred from product data",
  "Metal Composition":      () => "Inferred from metal type and price tier",
  "Band Type":              () => "Derived from product images",
  "Watch Case Shape":       () => "Derived from product images",
  Crown:                    () => "Inferred from movement type",
  "Number of Settings":     () => "Counted from product images",
  Pattern:                  () => "Detected from primary product image",
}

export function getReasoningFor(attributeName: string, productDescription: string): string {
  const fn = REASONING[attributeName]
  return fn ? fn(productDescription) : "AI analysis of product data"
}
