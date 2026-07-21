"use client"

import { CheckCircle2, ArrowRight, Info, HelpCircle, Sparkles, AlertTriangle, Check } from "lucide-react"

// Category Coverage step — opens the "Enrich with AI" black box.
// Before any AI category assignment happens, the supplier sees exactly which
// products already have categories (kept as-is, no AI) and which don't, and
// chooses how to close the gap — or proceeds with what's covered.

interface AssignedCategoryGroup {
  categoryName: string
  brickCode: string
  productCount: number
}

interface UnassignedSample {
  id: string
  description: string
  gtins: number
}

interface CoverageDetail {
  assignedGroups: AssignedCategoryGroup[]
  unassignedSamples: UnassignedSample[]
}

const COVERAGE_DETAIL_BY_CODE: Record<string, CoverageDetail> = {
  "001": {
    assignedGroups: [
      { categoryName: "Shoes - General Purpose",             brickCode: "10001077", productCount: 20 },
      { categoryName: "Boots - General Purpose",             brickCode: "10001076", productCount: 10 },
      { categoryName: "Athletic Footwear - General Purpose", brickCode: "10001070", productCount: 8 },
    ],
    unassignedSamples: [
      { id: "B11510", description: "Blue canvas sneaker collection",  gtins: 4 },
      { id: "B11512", description: "Running shoe series, mesh upper", gtins: 6 },
      { id: "B11515", description: "Casual lace-up walking shoe",     gtins: 3 },
      { id: "B11518", description: "Slip-on garden clog",             gtins: 2 },
      { id: "B11521", description: "Platform espadrille",             gtins: 3 },
      { id: "B11524", description: "Woven slide sandal",              gtins: 2 },
    ],
  },
  "002": {
    assignedGroups: [
      { categoryName: "Dressing Gowns",        brickCode: "10001338", productCount: 18 },
      { categoryName: "Night Dresses/Shirts",  brickCode: "10001339", productCount: 24 },
      { categoryName: "Sleep Trousers/Shorts", brickCode: "10001341", productCount: 16 },
    ],
    unassignedSamples: [],
  },
  "004": {
    assignedGroups: [],
    unassignedSamples: [
      { id: "G20011", description: "Vintage pocket watch",       gtins: 1 },
      { id: "G20014", description: "Embroidered table runner",   gtins: 2 },
      { id: "G20017", description: "Crystal wine stopper set",   gtins: 1 },
      { id: "G20021", description: "Monogrammed handkerchief",   gtins: 3 },
      { id: "G20024", description: "Ceramic trinket dish",       gtins: 2 },
      { id: "G20028", description: "Scented candle gift trio",   gtins: 2 },
    ],
  },
}

interface ScreenCategoryCoverageProps {
  selectedCodes: string[]
  codesMetadata: Record<string, { gtins: number; products: number; description: string; categoriesAssigned: number }>
  onAssignWithAI: (unassignedCount: number) => void
  onAssignIndividually: (unassignedCount: number) => void
  onProceedToEnrichment: (opts: { coveredCount: number; parkedUnassignedCount: number }) => void
  onBack: () => void
}

export function ScreenCategoryCoverage({ selectedCodes, codesMetadata, onAssignWithAI, onAssignIndividually, onProceedToEnrichment, onBack }: ScreenCategoryCoverageProps) {
  const code = selectedCodes[0] ?? ""
  const meta = codesMetadata[code] ?? { gtins: 0, products: 0, description: "", categoriesAssigned: 0 }
  const totalProducts = selectedCodes.reduce((s, c) => s + (codesMetadata[c]?.products ?? 0), 0)
  const totalGtins = selectedCodes.reduce((s, c) => s + (codesMetadata[c]?.gtins ?? 0), 0)
  const assignedCount = selectedCodes.reduce((s, c) => s + Math.min(codesMetadata[c]?.categoriesAssigned ?? 0, codesMetadata[c]?.products ?? 0), 0)
  const unassignedCount = totalProducts - assignedCount
  const allCovered = unassignedCount === 0 && totalProducts > 0
  const noneCovered = assignedCount === 0
  const assignedPercent = totalProducts > 0 ? Math.round((assignedCount / totalProducts) * 100) : 0

  const codeLabel = `${code} ${meta.description}`.trim()

  // Mock detail data, with a synthesized fallback so any code renders coherently
  const detail: CoverageDetail = COVERAGE_DETAIL_BY_CODE[code] ?? {
    assignedGroups: assignedCount > 0
      ? [{ categoryName: meta.description || "Assigned category", brickCode: "10001000", productCount: assignedCount }]
      : [],
    unassignedSamples: unassignedCount > 0
      ? Array.from({ length: Math.min(unassignedCount, 5) }, (_, i) => ({
          id: `P${code}${String(i + 1).padStart(2, "0")}`,
          description: `${meta.description || "Product"} item ${i + 1}`,
          gtins: 2,
        }))
      : [],
  }

  // Cap displayed group counts so the pre-confirmed section never claims more than assignedCount
  const shownGroups = detail.assignedGroups
  const groupsTotal = shownGroups.reduce((s, g) => s + g.productCount, 0)
  const otherAssigned = Math.max(0, assignedCount - groupsTotal)
  const moreSamples = Math.max(0, unassignedCount - detail.unassignedSamples.length)

  const steps = [
    { n: 1, label: "Review category coverage", state: "active" as const },
    { n: 2, label: "Assign missing categories", state: allCovered ? ("skipped" as const) : ("upcoming" as const) },
    { n: 3, label: "AI enriches attributes for your review", state: "upcoming" as const },
  ]

  return (
    <div className="space-y-5">
      {/* Source banner */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded border text-[12px]"
        style={{ backgroundColor: "#eff6ff", borderColor: "#bfdbfe", color: "#1e40af" }}
        role="status"
      >
        <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>
          Reviewing Selection Code <strong>{codeLabel}</strong> &middot; {totalProducts.toLocaleString()} Products ({totalGtins.toLocaleString()} GTINs)
        </span>
      </div>

      {/* What happens next — stepper */}
      <div className="bg-white border border-[#d1d5db] rounded p-4">
        <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-3">What happens next</p>
        <ol className="flex items-start gap-0 flex-wrap">
          {steps.map((step, i) => (
            <li key={step.n} className="flex items-start flex-1 min-w-[180px]">
              <div className="flex flex-col items-center mr-2">
                {step.state === "skipped" ? (
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#e8f5e9] border border-[#a5d6a7]">
                    <Check className="w-3.5 h-3.5 text-[#2e7d32]" aria-hidden="true" />
                  </span>
                ) : (
                  <span
                    className={`flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-semibold ${
                      step.state === "active" ? "bg-[#1a5fa6] text-white" : "bg-[#e8eaed] text-[#6b7280]"
                    }`}
                  >
                    {step.n}
                  </span>
                )}
              </div>
              <div className="flex-1 pr-3">
                <p className={`text-[12px] font-medium ${step.state === "active" ? "text-[#1a1f2e]" : "text-[#6b7280]"} ${step.state === "skipped" ? "line-through" : ""}`}>
                  {step.label}
                </p>
                {step.state === "skipped" && (
                  <p className="text-[11px] text-[#2e7d32]">No missing categories — skipped</p>
                )}
                {i < steps.length - 1 && <div className="hidden" />}
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className="w-4 h-4 text-[#9ca3af] shrink-0 mt-1 mr-3" aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>
      </div>

      {/* Coverage split */}
      {allCovered ? (
        <div
          className="flex items-start gap-2 px-4 py-3 rounded border text-[13px]"
          style={{ backgroundColor: "#e8f5e9", borderColor: "#a5d6a7", color: "#1b5e20" }}
          role="status"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#2e7d32" }} aria-hidden="true" />
          <span>
            <strong>All {totalProducts} products already have categories</strong> — no AI category assignment needed. You can go straight to attribute enrichment.
          </span>
        </div>
      ) : (
        <div className="bg-white border border-[#d1d5db] rounded p-4 space-y-2">
          <h2 className="text-[15px] font-semibold text-[#1a1f2e]">
            {`${assignedCount} of ${totalProducts} products have categories · ${unassignedCount} don't`}
          </h2>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-[#fef3c7]" aria-hidden="true">
            <div className="h-full bg-[#2e7d32]" style={{ width: `${assignedPercent}%` }} />
          </div>
          <p className="text-[12px] text-[#6b7280]">
            {`${assignedPercent}% covered. Products that already have a category keep it — AI only helps with the ${unassignedCount} that don't.`}
          </p>
        </div>
      )}

      {/* Pre-confirmed group — categories already assigned, no AI involved */}
      {assignedCount > 0 && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h3 className="text-[14px] font-semibold text-[#1a1f2e]">
              Products with categories already assigned ({assignedCount})
            </h3>
            <p className="text-[12px] text-[#6b7280]">These products keep their existing categories — no AI is involved.</p>
          </div>
          <div className="grid gap-2">
            {shownGroups.map((group) => (
              <div key={group.brickCode + group.categoryName} className="rounded border p-3 bg-[#f0fdf4] border-[#86efac]">
                <div className="flex items-center gap-2 flex-wrap">
                  <CheckCircle2 className="w-4 h-4 text-[#2e7d32]" aria-hidden="true" />
                  <h4 className="text-[13px] font-semibold text-[#1a1f2e]">{group.categoryName}</h4>
                  <span className="text-[10px] font-mono text-[#9ca3af]">{group.brickCode}</span>
                  <span className="text-[12px] text-[#6b7280]">{group.productCount} Products</span>
                  <span className="ml-auto px-2 py-0.5 text-[11px] font-medium rounded bg-[#f3f4f6] text-[#6b7280]">
                    Manually assigned
                  </span>
                </div>
              </div>
            ))}
            {otherAssigned > 0 && (
              <p className="text-[12px] text-[#6b7280] pl-1">…and {otherAssigned} more products across other categories.</p>
            )}
          </div>
        </div>
      )}

      {/* Unassigned group — the gap to close before enrichment */}
      {unassignedCount > 0 && (
        <div className="rounded-lg border-2 border-dashed border-[#f59e0b] bg-[#fffbeb] p-4 space-y-3">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#92400e]" aria-hidden="true" />
            <div>
              <h3 className="text-[14px] font-semibold text-[#1a1f2e]">
                {`${unassignedCount} products don't have a category yet`}
              </h3>
              <p className="text-[12px] text-[#6b7280] mt-0.5">
                Attributes can only be enriched once a product has a category. Choose how to assign them:
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#fcd34d] rounded overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-[#fffbeb] border-b border-[#fde68a]">
                  <th className="px-3 py-1.5 text-left font-semibold text-[#92400e]">Product</th>
                  <th className="px-3 py-1.5 text-left font-semibold text-[#92400e]">Description</th>
                  <th className="px-3 py-1.5 text-right font-semibold text-[#92400e]">GTINs</th>
                </tr>
              </thead>
              <tbody>
                {detail.unassignedSamples.map((p) => (
                  <tr key={p.id} className="border-b border-[#fef3c7] last:border-b-0">
                    <td className="px-3 py-1.5 font-mono text-[#1a5fa6]">{p.id}</td>
                    <td className="px-3 py-1.5 text-[#374151]">{p.description}</td>
                    <td className="px-3 py-1.5 text-right text-[#6b7280]">{p.gtins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {moreSamples > 0 && (
              <p className="px-3 py-1.5 text-[11px] text-[#6b7280] border-t border-[#fef3c7]">…and {moreSamples} more</p>
            )}
          </div>

          <div className="flex items-start gap-6 flex-wrap pt-1">
            <div>
              <button
                onClick={() => onAssignWithAI(unassignedCount)}
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white rounded transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
                style={{ backgroundColor: "#1a5fa6" }}
              >
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                Assign with AI
              </button>
              <p className="text-[11px] text-[#6b7280] mt-1 max-w-[220px]">
                AI suggests a category for each product; you confirm before anything is saved.
              </p>
            </div>
            <div>
              <button
                onClick={() => onAssignIndividually(unassignedCount)}
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-[#1a5fa6] border border-[#1a5fa6] rounded bg-white hover:bg-[#eff6ff] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
              >
                Assign individually
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <p className="text-[11px] text-[#6b7280] mt-1 max-w-[220px]">
                Pick a category per product yourself.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom action bar */}
      <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#d1d5db] flex-wrap">
        <button
          onClick={onBack}
          className="px-3 py-1.5 text-[13px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
        >
          &#8592; Back
        </button>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {!allCovered && !noneCovered && (
            <p className="flex items-center gap-1.5 text-[12px] text-[#92400e]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {unassignedCount} products without categories will be skipped and stay flagged as needing a category.
            </p>
          )}
          {noneCovered && !allCovered && (
            <p className="text-[12px] text-[#6b7280]">Assign at least one category to proceed to enrichment.</p>
          )}
          <button
            onClick={() => onProceedToEnrichment({ coveredCount: assignedCount, parkedUnassignedCount: unassignedCount })}
            disabled={noneCovered}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white rounded transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
            style={{ backgroundColor: "#1a5fa6" }}
          >
            Proceed to Enrichment ({assignedCount.toLocaleString()} products)
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
