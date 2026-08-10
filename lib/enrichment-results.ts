// What an enrichment run actually wrote, per product.
//
// Both review screens hold their decisions in local state (`attributeGroups` ×
// `productStates`) and previously discarded them on unmount — `onComplete` only
// reported a percentage. Nothing downstream could show a supplier what had been
// written, or which attributes were still empty and why. This module is the
// shared shape those screens hand upward, and the detail screen reads back.

export type EnrichmentSource = "ai-confirmed" | "user-edited"

export interface EnrichedAttributeValue {
  attribute: string
  value: string
  /** GS1 code when the value came from a code list rather than free text. */
  codeListValue?: string
  source: EnrichmentSource
  confidence: number
}

/**
 * Why an attribute in the product's category has no value. These are distinct
 * outcomes, not one "missing" bucket — "the AI never proposed anything" and
 * "you turned the AI's proposal down" need different follow-up.
 */
export type UnenrichedReason = "rejected" | "pending" | "no-suggestion"

export interface UnenrichedAttribute {
  attribute: string
  reason: UnenrichedReason
  /** Present for `rejected` and `pending` — what the AI had put forward. */
  aiSuggestion?: string
  confidence?: number
}

export interface ProductEnrichmentResult {
  /** The label the review screen used, e.g. "S22011 — Cotton pajama set". */
  productKey: string
  /** Real catalog id, when the run was scoped to actual products. */
  productId?: string
  description: string
  brickCode?: string
  values: EnrichedAttributeValue[]
  unenriched: UnenrichedAttribute[]
  /**
   * How many of the product's GTINs this run covered. Not a per-GTIN value
   * table — GTIN identity isn't threaded through the review screens, and
   * products stay the primary unit of account per CLAUDE.md — but enough to
   * tell whether the product has since gained a GTIN the run never saw.
   */
  gtinsCovered: number
}

// Minimal structural view of the review screens' state, so this module doesn't
// depend on either screen's private types.
interface AttributeRowLike {
  productDescription: string
  aiSuggestion: string
  confidence: number
  userValue?: string
}
interface AttributeGroupLike {
  attributeName: string
  gtins: AttributeRowLike[]
}

/** "S22011 — Cotton pajama set" → { id: "S22011", description: "Cotton pajama set" } */
function splitProductKey(key: string): { id?: string; description: string } {
  const m = key.match(/^(\S+)\s+—\s+(.*)$/)
  return m ? { id: m[1], description: m[2] } : { description: key }
}

export function buildEnrichmentResults(
  groups: AttributeGroupLike[],
  productStates: Record<string, string>,
  options: {
    /** Every attribute the product's category asks for, including ones the AI skipped. */
    allAttributeNames?: string[]
    brickCodeFor?: (productKey: string) => string | undefined
    /** Maps a confirmed value to its GS1 code, when the attribute uses a code list. */
    codeListValueFor?: (attribute: string, value: string) => string | undefined
    /** How many GTINs this run covered for a product — defaults to 0. */
    gtinsCoveredFor?: (productKey: string) => number
  } = {}
): ProductEnrichmentResult[] {
  const { allAttributeNames, brickCodeFor, codeListValueFor, gtinsCoveredFor } = options

  // Product order follows first appearance so the detail screen lists them the
  // same way the review screen did.
  const productKeys: string[] = []
  const seen = new Set<string>()
  for (const group of groups) {
    for (const row of group.gtins) {
      if (!seen.has(row.productDescription)) {
        seen.add(row.productDescription)
        productKeys.push(row.productDescription)
      }
    }
  }

  return productKeys.map((productKey) => {
    const { id, description } = splitProductKey(productKey)
    const values: EnrichedAttributeValue[] = []
    const unenriched: UnenrichedAttribute[] = []
    const covered = new Set<string>()

    for (const group of groups) {
      const row = group.gtins.find((g) => g.productDescription === productKey)
      if (!row) continue
      covered.add(group.attributeName)

      const state = productStates[`${group.attributeName}|${productKey}`] ?? "pending"
      if (state === "confirmed" || state === "batch-selected") {
        const value = row.userValue ?? row.aiSuggestion
        values.push({
          attribute: group.attributeName,
          value,
          codeListValue: codeListValueFor?.(group.attributeName, value),
          source: row.userValue ? "user-edited" : "ai-confirmed",
          confidence: row.confidence,
        })
      } else {
        unenriched.push({
          attribute: group.attributeName,
          reason: state === "rejected" ? "rejected" : "pending",
          aiSuggestion: row.aiSuggestion,
          confidence: row.confidence,
        })
      }
    }

    // Attributes the category asks for that the AI never put a row against.
    for (const name of allAttributeNames ?? []) {
      if (!covered.has(name)) unenriched.push({ attribute: name, reason: "no-suggestion" })
    }

    return {
      productKey,
      productId: id,
      description,
      brickCode: brickCodeFor?.(productKey),
      values,
      unenriched,
      gtinsCovered: gtinsCoveredFor?.(productKey) ?? 0,
    }
  })
}

/**
 * Every attribute the category asks for that still has no value, recorded
 * reasons first. Shared by the Enrichment Detail screen and the Product List so
 * the two can't disagree — a row reading "7/16" must open on "7/16".
 */
export function unenrichedAttributesFor(
  result: ProductEnrichmentResult | undefined,
  categoryAttributeNames: string[]
): UnenrichedAttribute[] {
  const enriched = new Set((result?.values ?? []).map((v) => v.attribute))
  const recorded = (result?.unenriched ?? []).filter((u) => !enriched.has(u.attribute))
  const seen = new Set(recorded.map((u) => u.attribute))
  const missing = categoryAttributeNames
    .filter((name) => !enriched.has(name) && !seen.has(name))
    .map((name): UnenrichedAttribute => ({ attribute: name, reason: "no-suggestion" }))
  return [...recorded, ...missing]
}

export interface EnrichmentSummary {
  enriched: number
  /** Size of the category's attribute set — what enrichment could have filled. */
  total: number
  coverage: number
  /** False when the product has never been through a run. */
  hasRun: boolean
}

/** One product's enrichment progress, as the Product List column reports it. */
export function summarizeEnrichment(
  result: ProductEnrichmentResult | undefined,
  categoryAttributeNames: string[]
): EnrichmentSummary {
  const enriched = result?.values.length ?? 0
  const total = enriched + unenrichedAttributesFor(result, categoryAttributeNames).length
  return {
    enriched,
    total,
    coverage: total > 0 ? Math.round((enriched / total) * 100) : 0,
    hasRun: result !== undefined,
  }
}

/** Merge a fresh run over anything already recorded for the same products. */
export function mergeEnrichmentResults(
  previous: Record<string, ProductEnrichmentResult>,
  incoming: ProductEnrichmentResult[]
): Record<string, ProductEnrichmentResult> {
  const next = { ...previous }
  for (const result of incoming) {
    const prior = next[result.productKey]
    if (!prior) {
      next[result.productKey] = result
      continue
    }
    // Later confirmations win; attributes only present in the earlier run survive.
    const byName = new Map(prior.values.map((v) => [v.attribute, v]))
    for (const v of result.values) byName.set(v.attribute, v)
    const mergedValues = Array.from(byName.values())
    const enrichedNames = new Set(mergedValues.map((v) => v.attribute))
    const mergedUnenriched = [...prior.unenriched, ...result.unenriched]
      .filter((u) => !enrichedNames.has(u.attribute))
      .filter((u, i, arr) => arr.findIndex((o) => o.attribute === u.attribute) === i)
    next[result.productKey] = {
      ...result,
      brickCode: result.brickCode ?? prior.brickCode,
      values: mergedValues,
      unenriched: mergedUnenriched,
      // Each run covers every GTIN the product had at the time; the latest
      // run's count is the current picture, same as brickCode above.
      gtinsCovered: result.gtinsCovered,
    }
  }
  return next
}

/**
 * True when the product has more GTINs today than the run that produced
 * `result` covered — it gained one afterward, so nothing has been written
 * for that GTIN yet.
 */
export function hasUncoveredGtins(result: ProductEnrichmentResult | undefined, currentGtinCount: number): boolean {
  if (!result) return false
  return currentGtinCount > result.gtinsCovered
}
