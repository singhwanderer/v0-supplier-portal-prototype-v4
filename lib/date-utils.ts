// Shared date helpers for the "MM/DD/YYYY" strings used across the product/GTIN
// drill-down screens and the selection code list.

export function parseMDY(dateStr: string): Date | null {
  if (!dateStr) return null
  const [month, day, year] = dateStr.split("/").map(Number)
  if (!month || !day || !year) return null
  return new Date(year, month - 1, day)
}

// Enrichment can't touch anything created more than a year ago — fixed, not
// configurable, so it's computed once from the real clock rather than stored.
export function getEnrichmentCutoffDate(): Date {
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 1)
  return cutoff
}

export function isEligibleForEnrichment(dateStr: string): boolean {
  const parsed = parseMDY(dateStr)
  if (!parsed) return false
  return parsed >= getEnrichmentCutoffDate()
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
}
