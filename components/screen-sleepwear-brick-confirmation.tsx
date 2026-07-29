"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, ArrowRight, Info, HelpCircle, ListChecks, AlertTriangle } from "lucide-react"
import type { ConfirmedCategory } from "@/app/page"
import type { BrickConfirmationSource } from "@/components/screen-brick-confirmation"
import {
  SLEEPWEAR_BRICKS,
  SLEEPWEAR_LOW_CONFIDENCE_BRICKS,
  distributeProducts,
  estimateGtins,
} from "@/lib/sleepwear-catalog"

// Category confirmation for Selection Code 002 (Sleepwear).
//
// Same shape and props as the footwear screen so app/page.tsx can swap between
// them, with two differences that matter: the categories are sleepwear bricks,
// and every product count is derived from the scope the user actually selected
// rather than a fixed catalog total. Enriching one product shows one product.

interface SleepwearCategory {
  id: string
  name: string
  brickCode: string
  productCount: number
  gtinCount: number
  confidence: number
  confirmed: boolean
}

interface ScreenSleepwearBrickConfirmationProps {
  totalGtinCount: number
  totalProductCount: number
  sourceContext?: BrickConfirmationSource
  coverageScope?: "all" | "unassigned-only"
  /** Labels the subset being categorized, e.g. "Product S22041 — Silk nightgown collection". */
  scopeLabel?: string
  onViewGtins: (categoryId: string, categoryName: string, brickCode: string) => void
  onProceedToEnrichment: (categories: ConfirmedCategory[]) => void
  onBack: () => void
  onSaveAndExit: (categories: ConfirmedCategory[]) => void
  onAssignIndividually?: (scope: "unclassified" | "all-low-confidence", productCount: number) => void
}

export function ScreenSleepwearBrickConfirmation({
  totalGtinCount,
  totalProductCount,
  sourceContext,
  coverageScope = "all",
  scopeLabel,
  onViewGtins,
  onProceedToEnrichment,
  onBack,
  onSaveAndExit,
  onAssignIndividually,
}: ScreenSleepwearBrickConfirmationProps) {
  // Split the in-scope products across the sleepwear categories. Categories
  // that end up with zero products are dropped so a small scope doesn't render
  // a wall of empty cards.
  const initialCategories = useMemo<SleepwearCategory[]>(() => {
    const defs = [...SLEEPWEAR_BRICKS, ...SLEEPWEAR_LOW_CONFIDENCE_BRICKS]
    const counts = distributeProducts(totalProductCount, defs.map((d) => d.weight))
    return defs
      .map((def, i) => ({
        id: def.id,
        name: def.name,
        brickCode: def.brickCode,
        productCount: counts[i],
        gtinCount: estimateGtins(counts[i]),
        confidence: def.confidence,
        confirmed: false,
      }))
      .filter((c) => c.productCount > 0)
  }, [totalProductCount])

  const [categories, setCategories] = useState<SleepwearCategory[]>(initialCategories)
  const [batchConfirmed, setBatchConfirmed] = useState(false)
  const [preConfirmAllSnapshot, setPreConfirmAllSnapshot] = useState<Set<string>>(new Set())
  const [selectedEnrichId, setSelectedEnrichId] = useState<string | null>(null)

  const highConfidenceCategories = categories.filter((c) => c.confidence >= 70)
  const lowConfidenceCategories = categories.filter((c) => c.confidence < 70 && c.confidence > 0)
  const unclassifiableCategory = categories.find((c) => c.confidence === 0)

  const confirmedList = categories.filter((c) => c.confirmed)
  const confirmedCount = confirmedList.length
  const totalCount = categories.length
  const allConfirmed = confirmedCount === totalCount && totalCount > 0
  const totalConfirmedProducts = confirmedList.reduce((s, c) => s + c.productCount, 0)
  const totalLowConfidenceProducts =
    lowConfidenceCategories.reduce((s, c) => s + c.productCount, 0) + (unclassifiableCategory?.productCount ?? 0)

  const fromSelectionCode = sourceContext?.type === "selection-code"
  const selectionCodeLabel =
    fromSelectionCode && sourceContext.codes.length > 0
      ? `${sourceContext.codes[0]} ${sourceContext.metadata[sourceContext.codes[0]]?.description ?? ""}`.trim()
      : ""

  const handleConfirmCategory = (id: string) => {
    setBatchConfirmed(false)
    setCategories((prev) => prev.map((cat) => (cat.id === id ? { ...cat, confirmed: true } : cat)))
  }

  const handleUnconfirmCategory = (id: string) => {
    setBatchConfirmed(false)
    setSelectedEnrichId((prev) => (prev === id ? null : prev))
    setCategories((prev) => prev.map((cat) => (cat.id === id ? { ...cat, confirmed: false } : cat)))
  }

  const handleConfirmAll = () => {
    setPreConfirmAllSnapshot(new Set(categories.filter((c) => c.confirmed).map((c) => c.id)))
    setBatchConfirmed(true)
    // Only auto-confirm what AI actually resolved — uncertain groups still need a manual pick.
    setCategories((prev) => prev.map((cat) => (cat.confidence >= 70 ? { ...cat, confirmed: true } : cat)))
  }

  const handleUndoConfirmAll = () => {
    setCategories((prev) => prev.map((cat) => (preConfirmAllSnapshot.has(cat.id) ? cat : { ...cat, confirmed: false })))
    setBatchConfirmed(false)
    setPreConfirmAllSnapshot(new Set())
    setSelectedEnrichId(null)
  }

  const toConfirmedCategory = (c: SleepwearCategory): ConfirmedCategory => ({
    id: c.id,
    name: c.name,
    gtinCount: c.gtinCount,
    productCount: c.productCount,
    confidence: c.confidence,
  })

  const handleEnrichSingle = (cat: SleepwearCategory) => {
    if (selectedEnrichId === cat.id) {
      setSelectedEnrichId(null)
      return
    }
    setSelectedEnrichId(cat.id)
    onProceedToEnrichment([toConfirmedCategory(cat)])
  }

  const handleEnrichAll = () => {
    onProceedToEnrichment(confirmedList.map(toConfirmedCategory))
  }

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
          {scopeLabel ? (
            <>
              Assigning categories for <strong>{scopeLabel}</strong> &middot; {totalProductCount.toLocaleString()}{" "}
              {totalProductCount === 1 ? "Product" : "Products"} ({totalGtinCount.toLocaleString()} GTINs)
            </>
          ) : coverageScope === "unassigned-only" ? (
            <>
              Assigning categories for the <strong>{totalProductCount.toLocaleString()} unassigned products</strong> in
              Selection Code <strong>{selectionCodeLabel}</strong> ({totalGtinCount.toLocaleString()} GTINs)
            </>
          ) : (
            <>
              Enriching Selection Code <strong>{selectionCodeLabel}</strong> &middot;{" "}
              {totalProductCount.toLocaleString()} {totalProductCount === 1 ? "Product" : "Products"} (
              {totalGtinCount.toLocaleString()} GTINs)
            </>
          )}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[16px] font-semibold text-[#1a1f2e]">
            {scopeLabel || coverageScope === "unassigned-only"
              ? `Assign categories for ${totalProductCount.toLocaleString()} ${totalProductCount === 1 ? "product" : "products"}`
              : `Review product categories for ${selectionCodeLabel}`}
          </h2>
          <p className="text-[13px] text-[#6b7280] mt-1 max-w-2xl">
            We read your product descriptions and grouped them into sleepwear categories. Review each group, then
            continue to attribute enrichment.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[13px] font-medium text-[#374151]">
            {confirmedCount} of {totalCount} categories confirmed
          </p>
          {confirmedCount > 0 && (
            <p className="text-[12px] text-[#1a5fa6] mt-0.5">
              {totalConfirmedProducts.toLocaleString()} {totalConfirmedProducts === 1 ? "Product" : "Products"} ready for
              enrichment
            </p>
          )}
        </div>
      </div>

      {/* Info tip */}
      <div className="flex items-start gap-2 px-3 py-2 rounded border border-[#bfdbfe] bg-[#eff6ff] text-[12px] text-[#1e40af]">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          <strong>How this works:</strong> You don&apos;t have to confirm every group before moving on. Use &ldquo;Enrich
          This Category&rdquo; to start one at a time, or confirm them all and enrich in bulk.
        </span>
      </div>

      {/* High-confidence category cards */}
      <div className="grid gap-3">
        {highConfidenceCategories.map((cat) => (
          <div
            key={cat.id}
            className={`rounded border p-4 bg-white transition-colors ${
              cat.confirmed ? "border-[#2e7d32] bg-[#f0fdf4]" : "border-[#d1d5db]"
            }`}
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-[14px] font-semibold text-[#1a1f2e]">{cat.name}</h3>
                  <span className="text-[10px] font-mono text-[#9ca3af]">{cat.brickCode}</span>
                  <span className="text-[13px] text-[#6b7280]">
                    {cat.productCount} {cat.productCount === 1 ? "Product" : "Products"} ({cat.gtinCount} GTINs)
                  </span>
                  {cat.confirmed && (
                    <span className="flex items-center gap-1 text-[12px] text-[#2e7d32] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Confirmed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[12px] text-[#6b7280] w-20">Confidence:</span>
                  <div className="flex-1 max-w-xs h-2 rounded-full bg-[#e8eaed] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${cat.confidence}%`,
                        backgroundColor: cat.confidence >= 90 ? "#2e7d32" : cat.confidence >= 70 ? "#f59e0b" : "#dc2626",
                      }}
                    />
                  </div>
                  <span className="text-[12px] font-medium text-[#374151] w-10">{cat.confidence}%</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  onClick={() => onViewGtins(cat.id, cat.name, cat.brickCode)}
                  className="px-3 py-1.5 text-[12px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors"
                >
                  View {cat.productCount} {cat.productCount === 1 ? "Product" : "Products"}
                </button>
                {!cat.confirmed ? (
                  <button
                    onClick={() => handleConfirmCategory(cat.id)}
                    className="px-3 py-1.5 text-[12px] font-semibold text-white rounded transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
                    style={{ backgroundColor: "#1a5fa6" }}
                  >
                    Confirm Category
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUnconfirmCategory(cat.id)}
                      className="px-2.5 py-1.5 text-[12px] font-medium border border-[#d1d5db] rounded bg-white text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#374151] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6b7280]"
                      title="Undo category confirmation"
                    >
                      Undo Confirm
                    </button>
                    <button
                      onClick={() => handleEnrichSingle(cat)}
                      className={`flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e7d32] ${
                        selectedEnrichId === cat.id
                          ? "text-white bg-[#2e7d32] hover:bg-[#1b5e20]"
                          : "text-[#2e7d32] border-2 border-[#2e7d32] bg-white hover:bg-[#f0fdf4]"
                      }`}
                      aria-pressed={selectedEnrichId === cat.id}
                    >
                      {selectedEnrichId === cat.id ? (
                        <>
                          Enriching This Category
                          <span className="text-[11px] font-normal ml-0.5 opacity-80">(Unselect)</span>
                        </>
                      ) : (
                        <>
                          Enrich This Category
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Low-confidence section */}
      {(lowConfidenceCategories.length > 0 || unclassifiableCategory) && (
        <div className="rounded-lg border-2 border-dashed border-[#f59e0b] bg-[#fffbeb] p-4 space-y-4">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#92400e]" aria-hidden="true" />
            <div>
              <h3 className="text-[14px] font-semibold text-[#1a1f2e]">
                Help us confirm the product type — {totalLowConfidenceProducts}{" "}
                {totalLowConfidenceProducts === 1 ? "Product" : "Products"} remaining
              </h3>
              <p className="text-[12px] text-[#6b7280] mt-1">
                We grouped the remaining products by our best guess. Confirm if correct, or review products individually
                to reassign.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {lowConfidenceCategories.map((cat) => (
              <div
                key={cat.id}
                className={`rounded border p-4 bg-white transition-colors ${
                  cat.confirmed ? "border-[#2e7d32] bg-[#f0fdf4]" : "border-[#fcd34d]"
                }`}
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[14px] font-semibold text-[#1a1f2e]">{cat.name}</h3>
                      <span className="text-[10px] font-mono text-[#9ca3af]">{cat.brickCode}</span>
                      <span className="text-[13px] text-[#6b7280]">
                        {cat.productCount} {cat.productCount === 1 ? "Product" : "Products"}
                      </span>
                      {cat.confirmed && (
                        <span className="flex items-center gap-1 text-[12px] text-[#2e7d32] font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Confirmed
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[12px] text-[#6b7280] w-20">Confidence:</span>
                      <div className="flex-1 max-w-xs h-2 rounded-full bg-[#e8eaed] overflow-hidden">
                        <div className="h-full rounded-full bg-[#f59e0b]" style={{ width: `${cat.confidence}%` }} />
                      </div>
                      <span className="text-[12px] font-medium text-[#92400e] w-10">{cat.confidence}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() => onViewGtins(cat.id, cat.name, cat.brickCode)}
                      className="px-3 py-1.5 text-[12px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors"
                    >
                      View {cat.productCount} {cat.productCount === 1 ? "Product" : "Products"}
                    </button>
                    {!cat.confirmed ? (
                      <button
                        onClick={() => handleConfirmCategory(cat.id)}
                        className="px-3 py-1.5 text-[12px] font-semibold text-white rounded bg-[#1a5fa6] hover:opacity-90 transition-opacity"
                      >
                        Confirm Category
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUnconfirmCategory(cat.id)}
                        className="px-2.5 py-1.5 text-[12px] font-medium border border-[#d1d5db] rounded bg-white text-[#6b7280] hover:bg-[#f3f4f6]"
                      >
                        Undo Confirm
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {unclassifiableCategory && (
              <div className="rounded border-2 border-[#dc2626] border-dashed p-4 bg-[#fef2f2]">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <AlertTriangle className="w-4 h-4 text-[#dc2626]" aria-hidden="true" />
                      <h3 className="text-[14px] font-semibold text-[#1a1f2e]">Could not classify</h3>
                      <span className="text-[13px] text-[#6b7280]">
                        {unclassifiableCategory.productCount}{" "}
                        {unclassifiableCategory.productCount === 1 ? "Product" : "Products"}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#6b7280] mt-1">
                      These products could not be automatically categorized. Please assign them individually.
                    </p>
                  </div>
                  <button
                    onClick={() => onAssignIndividually?.("unclassified", unclassifiableCategory.productCount)}
                    className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-[#1a5fa6] border border-[#1a5fa6] rounded bg-white hover:bg-[#eff6ff] transition-colors"
                  >
                    Assign Individually
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#fde68a]">
            <button
              onClick={() => onAssignIndividually?.("all-low-confidence", totalLowConfidenceProducts)}
              className="inline-flex items-center gap-1.5 text-[12px] text-[#1a5fa6] font-medium hover:underline"
            >
              <ListChecks className="w-3.5 h-3.5" aria-hidden="true" />
              Not all the same type? Review all {totalLowConfidenceProducts} products individually
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#d1d5db] flex-wrap">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="px-3 py-1.5 text-[13px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
          >
            &#8592; Previous
          </button>
          <div>
            <button
              onClick={() => onSaveAndExit(confirmedList.map(toConfirmedCategory))}
              className="px-3 py-1.5 text-[13px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
            >
              {confirmedCount > 0 ? "Save & Return to List" : "Exit to Selection Code List"}
            </button>
            {confirmedCount > 0 && (
              <p className="text-[11px] text-[#6b7280] mt-1 max-w-[260px]">
                Confirmed categories are kept — this code will show “Categories Assigned – Not Enriched”.
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[12px] text-[#6b7280]">
            {confirmedCount > 0
              ? `${confirmedCount} categor${confirmedCount === 1 ? "y" : "ies"} confirmed (${totalConfirmedProducts.toLocaleString()} ${totalConfirmedProducts === 1 ? "Product" : "Products"}) — ready for enrichment.`
              : "Confirm at least one category to begin enrichment."}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {batchConfirmed ? (
            <button
              onClick={handleUndoConfirmAll}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold border-2 rounded transition-colors hover:bg-[#fef2f2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#dc2626]"
              style={{ borderColor: "#dc2626", color: "#dc2626" }}
            >
              Undo Confirm All
            </button>
          ) : !allConfirmed ? (
            <button
              onClick={handleConfirmAll}
              className="px-4 py-2 text-[13px] font-semibold border-2 rounded transition-colors hover:bg-[#f0f2f5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
              style={{ borderColor: "#1a1f5e", color: "#1a1f5e" }}
            >
              Confirm All Categories
            </button>
          ) : null}
          {confirmedCount > 0 && (
            <button
              onClick={handleEnrichAll}
              className="px-4 py-2 text-[13px] font-semibold text-white rounded transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
              style={{ backgroundColor: "#1a5fa6" }}
            >
              {allConfirmed
                ? `Proceed with All ${totalCount} Categories (${totalConfirmedProducts.toLocaleString()} ${totalConfirmedProducts === 1 ? "Product" : "Products"})`
                : `Proceed with ${confirmedCount} Confirmed Categor${confirmedCount === 1 ? "y" : "ies"} (${totalConfirmedProducts.toLocaleString()} ${totalConfirmedProducts === 1 ? "Product" : "Products"})`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
