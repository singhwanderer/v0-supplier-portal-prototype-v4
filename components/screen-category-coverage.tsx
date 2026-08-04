"use client"

import { CheckCircle2, ArrowRight, Info, HelpCircle, Sparkles, AlertTriangle } from "lucide-react"

// Category Coverage view — shown when a selection code already has category
// assignments. The supplier sees which products keep their existing categories
// (no AI involved) and, if any are missing, assigns the remainder with AI.

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
  "002": {
    assignedGroups: [
      { categoryName: "Night Dresses/Shirts",  brickCode: "10001339", productCount: 18 },
      { categoryName: "Dressing Gowns",        brickCode: "10001338", productCount: 12 },
      { categoryName: "Sleep Trousers/Shorts", brickCode: "10001341", productCount: 8 },
    ],
    unassignedSamples: [
      { id: "S22041", description: "Silk nightgown collection",    gtins: 2 },
      { id: "S22044", description: "Flannel pajama top",           gtins: 4 },
      { id: "S22047", description: "Satin camisole set",           gtins: 2 },
      { id: "S22051", description: "Jersey sleep dress",           gtins: 3 },
      { id: "S22054", description: "Thermal henley nightshirt",    gtins: 2 },
      { id: "S22058", description: "Waffle-knit robe",             gtins: 3 },
    ],
  },
  "003": {
    assignedGroups: [
      { categoryName: "Bracelets",            brickCode: "10001084", productCount: 16 },
      { categoryName: "Necklaces/Necklets",   brickCode: "10001090", productCount: 15 },
      { categoryName: "Watches",              brickCode: "10001105", productCount: 13 },
    ],
    unassignedSamples: [],
  },
}

interface ScreenCategoryCoverageProps {
  selectedCodes: string[]
  codesMetadata: Record<string, { gtins: number; products: number; description: string; categoriesAssigned: number }>
  onAssignWithAI: (unassignedCount: number) => void
  onProceedToEnrichment: (opts: { coveredCount: number; parkedUnassignedCount: number }) => void
  onBack: () => void
  /** Leave the flow without enriching. Nothing is persisted — this screen is read-only. */
  onExit?: () => void
  /** e.g. "Step 1 of 3" — rendered in the scope banner. */
  stepLabel?: string
}

export function ScreenCategoryCoverage({ selectedCodes, codesMetadata, onAssignWithAI, onProceedToEnrichment, onBack, onExit, stepLabel }: ScreenCategoryCoverageProps) {
  const code = selectedCodes[0] ?? ""
  const meta = codesMetadata[code] ?? { gtins: 0, products: 0, description: "", categoriesAssigned: 0 }
  const totalProducts = selectedCodes.reduce((s, c) => s + (codesMetadata[c]?.products ?? 0), 0)
  const totalGtins = selectedCodes.reduce((s, c) => s + (codesMetadata[c]?.gtins ?? 0), 0)
  const assignedCount = selectedCodes.reduce((s, c) => s + Math.min(codesMetadata[c]?.categoriesAssigned ?? 0, codesMetadata[c]?.products ?? 0), 0)
  const unassignedCount = totalProducts - assignedCount
  const allCovered = unassignedCount === 0 && totalProducts > 0
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

  const shownGroups = detail.assignedGroups
  const groupsTotal = shownGroups.reduce((s, g) => s + g.productCount, 0)
  const otherAssigned = Math.max(0, assignedCount - groupsTotal)
  const moreSamples = Math.max(0, unassignedCount - detail.unassignedSamples.length)

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
          {stepLabel && <> &middot; {stepLabel}</>}
        </span>
      </div>

      {/* Coverage summary */}
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
            {`${assignedCount} products already have categories — only ${unassignedCount} left to assign`}
          </h2>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-[#fef3c7]" aria-hidden="true">
            <div className="h-full bg-[#2e7d32]" style={{ width: `${assignedPercent}%` }} />
          </div>
          <p className="text-[12px] text-[#6b7280]">
            {`${assignedPercent}% covered. Products that already have a category keep it — AI only classifies the ${unassignedCount} that don't.`}
          </p>
        </div>
      )}

      {/* Categories already assigned */}
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
                </div>
              </div>
            ))}
            {otherAssigned > 0 && (
              <p className="text-[12px] text-[#6b7280] pl-1">…and {otherAssigned} more products across other categories.</p>
            )}
          </div>
        </div>
      )}

      {/* Remaining products — AI classification only */}
      {unassignedCount > 0 && (
        <div className="rounded-lg border-2 border-dashed border-[#f59e0b] bg-[#fffbeb] p-4 space-y-3">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#92400e]" aria-hidden="true" />
            <div>
              <h3 className="text-[14px] font-semibold text-[#1a1f2e]">
                {`${unassignedCount} products don't have a category yet`}
              </h3>
              <p className="text-[12px] text-[#6b7280] mt-0.5">
                Attributes can only be enriched once a product has a category.
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

          <div className="pt-1">
            <button
              onClick={() => onAssignWithAI(unassignedCount)}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white rounded transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
              style={{ backgroundColor: "#1a5fa6" }}
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              Assign with AI
            </button>
            <p className="text-[11px] text-[#6b7280] mt-1">
              AI suggests a category for each product; you confirm before anything is saved.
            </p>
          </div>
        </div>
      )}

      {/* Bottom action bar */}
      <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#d1d5db] flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3 py-1.5 text-[13px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
          >
            &#8592; Back
          </button>
          {/* Deliberately "Exit", not "Save & Return" — this screen is a read-only
              summary, so there is nothing pending to persist. */}
          {onExit && (
            <button
              onClick={onExit}
              className="px-3 py-1.5 text-[13px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
            >
              Exit to Selection Code List
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {!allCovered && (
            <p className="flex items-center gap-1.5 text-[12px] text-[#92400e]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {unassignedCount} products without categories will be skipped and stay flagged as needing a category.
            </p>
          )}
          <button
            onClick={() => onProceedToEnrichment({ coveredCount: assignedCount, parkedUnassignedCount: unassignedCount })}
            disabled={assignedCount === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white rounded transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
            style={{ backgroundColor: "#1a5fa6" }}
          >
            Continue to Attribute Enrichment ({assignedCount.toLocaleString()} products)
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
