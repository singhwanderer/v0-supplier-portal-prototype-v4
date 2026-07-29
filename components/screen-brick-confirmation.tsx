"use client"

import { useState } from "react"
import { CheckCircle2, ArrowRight, Info, HelpCircle, ArrowLeft, ListChecks, AlertTriangle } from "lucide-react"
import type { ConfirmedCategory } from "@/app/page"

interface BrickCategory {
  id: string
  name: string
  brickCode: string
  productCount: number  // Primary unit is now products, not GTINs
  gtinCount: number     // GTINs shown in parentheses for reference
  confidence: number
  confirmed: boolean
  enriched?: boolean           // Change 5: Previously enriched category
  enrichedDate?: string        // Change 5: Date when enrichment completed
}

export type BrickConfirmationSource =
  | { type: "upload"; fileName: string }
  | { type: "selection-code"; codes: string[]; metadata: Record<string, { gtins: number; products: number; description: string }> }

interface ScreenBrickConfirmationProps {
  fileName: string
  totalGtinCount: number
  totalProductCount: number
  sourceContext?: BrickConfirmationSource
  // When entered from the Category Coverage screen, only the unassigned subset is in scope
  coverageScope?: "all" | "unassigned-only"
  onViewGtins: (categoryId: string, categoryName: string, brickCode: string) => void
  onProceedToEnrichment: (categories: ConfirmedCategory[]) => void
  onBack: () => void
  // Scenario 3: persist confirmed categories and return to the Selection Code List
  onSaveAndExit: (categories: ConfirmedCategory[]) => void
  // Bug 3 fix: Handler for individual product assignment view
  onAssignIndividually?: (scope: "unclassified" | "all-low-confidence", productCount: number) => void
}

// Change 1: Product-level grouping - categories show product counts as primary
const INITIAL_CATEGORIES: BrickCategory[] = [
  { id: "1", name: "Shoes - General Purpose",             brickCode: "10001077", productCount: 125, gtinCount: 288, confidence: 94, confirmed: false },
  { id: "2", name: "Boots - General Purpose",             brickCode: "10001076", productCount: 72,  gtinCount: 157, confidence: 91, confirmed: false },
  { id: "3", name: "Athletic Footwear - General Purpose", brickCode: "10001070", productCount: 88,  gtinCount: 198, confidence: 96, confirmed: false },
]

// Change 2: Low-confidence categories replace the single uncertain tile picker
const LOW_CONFIDENCE_CATEGORIES: BrickCategory[] = [
  { id: "lc1", name: "Shoes - General Purpose", brickCode: "10001077", productCount: 8, gtinCount: 18, confidence: 52, confirmed: false },
  { id: "lc2", name: "Night Dresses/Shirts",    brickCode: "10001339", productCount: 6, gtinCount: 14, confidence: 48, confirmed: false },
  { id: "lc3", name: "Bracelets",               brickCode: "10001342", productCount: 4, gtinCount: 9,  confidence: 45, confirmed: false },
  { id: "lc4", name: "Could not classify",      brickCode: "",         productCount: 4, gtinCount: 8,  confidence: 0,  confirmed: false },
]

// Change 1: Sample PRODUCTS shown in the "Review individually" table for the unclassified section
interface UncertainProduct { id: string; description: string; gtinCount: number }
const SAMPLE_UNCERTAIN_PRODUCTS: UncertainProduct[] = [
  { id: "prod1", description: "Blue canvas sneaker collection",     gtinCount: 4 },
  { id: "prod2", description: "Leather ankle boot set",             gtinCount: 3 },
  { id: "prod3", description: "Running shoe series, mesh upper",    gtinCount: 6 },
  { id: "prod4", description: "Silk nightgown collection",          gtinCount: 2 },
  { id: "prod5", description: "Cotton sleep shorts set",            gtinCount: 3 },
  { id: "prod6", description: "Silver charm bracelet line",         gtinCount: 1 },
  { id: "prod7", description: "Gold pendant necklace collection",   gtinCount: 2 },
  { id: "prod8", description: "Pearl drop earring set",             gtinCount: 1 },
]

export function ScreenBrickConfirmation({ fileName, totalGtinCount, totalProductCount, sourceContext, coverageScope = "all", onViewGtins, onProceedToEnrichment, onBack, onSaveAndExit, onAssignIndividually }: ScreenBrickConfirmationProps) {
  // Merge high-confidence and low-confidence categories into a single list
  const [categories, setCategories] = useState<BrickCategory[]>([...INITIAL_CATEGORIES, ...LOW_CONFIDENCE_CATEGORIES])
  // Track whether "Confirm All" batch action was used (enables batch undo)
  const [batchConfirmed, setBatchConfirmed] = useState(false)
  // Snapshot of which category ids were confirmed before the batch action (for precise undo)
  const [preConfirmAllSnapshot, setPreConfirmAllSnapshot] = useState<Set<string>>(new Set())
  // Track which single category the user has selected to enrich (so it can be unselected)
  const [selectedEnrichId, setSelectedEnrichId] = useState<string | null>(null)

  // Separate high-confidence and low-confidence categories for display
  const highConfidenceCategories = categories.filter((c) => c.confidence >= 70 || c.enriched)
  const lowConfidenceCategories = categories.filter((c) => c.confidence < 70 && c.confidence > 0 && !c.enriched)
  const unclassifiableCategory = categories.find((c) => c.confidence === 0 && c.name === "Could not classify")
  
  const confirmedList = categories.filter((c) => c.confirmed || c.enriched)
  const confirmedCount = confirmedList.length
  const totalCount = categories.length
  const allConfirmed = confirmedCount === totalCount
  const totalConfirmedProducts = confirmedList.reduce((s, c) => s + c.productCount, 0)
  const totalConfirmedGtins = confirmedList.reduce((s, c) => s + c.gtinCount, 0)
  const hasUncertain = lowConfidenceCategories.length > 0 || unclassifiableCategory
  const totalLowConfidenceProducts = lowConfidenceCategories.reduce((s, c) => s + c.productCount, 0) + (unclassifiableCategory?.productCount ?? 0)

  const fromSelectionCode = sourceContext?.type === "selection-code"
  const selectionCodeLabel = fromSelectionCode && sourceContext.codes.length > 0
    ? `${sourceContext.codes[0]} ${sourceContext.metadata[sourceContext.codes[0]]?.description ?? ""}`.trim()
    : ""

  const handleConfirmCategory = (id: string) => {
    setBatchConfirmed(false) // individual confirm — clear batch state
    setCategories((prev) => prev.map((cat) => (cat.id === id ? { ...cat, confirmed: true } : cat)))
  }

  // Undo a single category confirmation
  const handleUnconfirmCategory = (id: string) => {
    setBatchConfirmed(false)
    setSelectedEnrichId((prev) => (prev === id ? null : prev))
    setCategories((prev) => prev.map((cat) => (cat.id === id ? { ...cat, confirmed: false } : cat)))
  }

  const handleConfirmAll = () => {
    // Snapshot which categories are already confirmed so we can restore exactly those on undo
    const alreadyConfirmedIds = new Set(categories.filter((c) => c.confirmed).map((c) => c.id))
    setPreConfirmAllSnapshot(alreadyConfirmedIds)
    setBatchConfirmed(true)
    // Only auto-confirm categories that AI has resolved (>= 70). Uncertain ones still require a manual pick.
    setCategories((prev) => prev.map((cat) => (cat.confidence >= 70 ? { ...cat, confirmed: true } : cat)))
  }

  // Undo the batch "Confirm All" — restore only the categories that weren't confirmed before
  const handleUndoConfirmAll = () => {
    setCategories((prev) =>
      prev.map((cat) =>
        preConfirmAllSnapshot.has(cat.id) ? cat : { ...cat, confirmed: false }
      )
    )
    setBatchConfirmed(false)
    setPreConfirmAllSnapshot(new Set())
    setSelectedEnrichId(null)
  }

  // Single-category enrich: mark it as selected (highlighted), can be unselected
  const handleEnrichSingle = (cat: BrickCategory) => {
    if (selectedEnrichId === cat.id) {
      setSelectedEnrichId(null)
      return
    }
    setSelectedEnrichId(cat.id)
    const toEnrich: ConfirmedCategory[] = [{ id: cat.id, name: cat.name, gtinCount: cat.gtinCount, productCount: cat.productCount, confidence: cat.confidence, brickCode: cat.brickCode }]
    onProceedToEnrichment(toEnrich)
  }

  const handleEnrichAll = () => {
    const toEnrich: ConfirmedCategory[] = confirmedList.filter(c => !c.enriched).map((c) => ({
      id: c.id, name: c.name, gtinCount: c.gtinCount, productCount: c.productCount, confidence: c.confidence, brickCode: c.brickCode,
    }))
    onProceedToEnrichment(toEnrich)
  }

  // Fix A: Handler for "View N Products" on low-confidence cards — navigates to category detail
  const handleViewLowConfidenceProducts = (categoryId: string, categoryName: string, brickCode: string) => {
    onViewGtins(categoryId, categoryName, brickCode)
  }

  // Bug 3 fix: Handler for "Assign Individually" on Could not classify card
  const handleAssignIndividually = () => {
    const unclassifiedCount = unclassifiableCategory?.productCount || 4
    if (onAssignIndividually) {
      onAssignIndividually("unclassified", unclassifiedCount)
    }
  }

  // Bug 3 fix: Handler for "Review all N products individually" link
  const handleReviewAllIndividually = () => {
    if (onAssignIndividually) {
      onAssignIndividually("all-low-confidence", totalLowConfidenceProducts)
    }
  }

  return (
    <div className="space-y-5">
      {/* Source banner — adapts to entry point */}
      {fromSelectionCode ? (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded border text-[12px]"
          style={{ backgroundColor: "#eff6ff", borderColor: "#bfdbfe", color: "#1e40af" }}
          role="status"
        >
          <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>
            {coverageScope === "unassigned-only"
              ? <>Assigning categories for the <strong>{totalProductCount.toLocaleString()} unassigned products</strong> in Selection Code <strong>{selectionCodeLabel}</strong> ({totalGtinCount.toLocaleString()} GTINs)</>
              : <>Enriching Selection Code <strong>{selectionCodeLabel}</strong> &middot; {totalProductCount.toLocaleString()} Products ({totalGtinCount.toLocaleString()} GTINs)</>}
          </span>
        </div>
      ) : (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded border text-[12px]"
          style={{ backgroundColor: "#e8f5e9", borderColor: "#a5d6a7", color: "#1b5e20" }}
          role="status"
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#2e7d32" }} aria-hidden="true" />
          <span>
            Upload complete — <strong>{fileName || "catalog.csv"}</strong> &middot; {totalProductCount.toLocaleString()} Products ({totalGtinCount.toLocaleString()} GTINs) loaded
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[16px] font-semibold text-[#1a1f2e]">
            {coverageScope === "unassigned-only" && fromSelectionCode
              ? `Assign categories for ${totalProductCount.toLocaleString()} unassigned products`
              : fromSelectionCode
                ? `Review product categories for ${selectionCodeLabel}`
                : `Review product categories for your ${totalProductCount.toLocaleString()} Products`}
          </h2>
          <p className="text-[13px] text-[#6b7280] mt-1 max-w-2xl">
            We read your product descriptions and grouped them into categories. Review each group, then continue to attribute enrichment.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[13px] font-medium text-[#374151]">
            {confirmedCount} of {totalCount} categories confirmed
          </p>
          {confirmedCount > 0 && (
            <p className="text-[12px] text-[#1a5fa6] mt-0.5">
              {totalConfirmedProducts.toLocaleString()} Products ready for enrichment
            </p>
          )}
        </div>
      </div>

      {/* Info tip */}
      <div className="flex items-start gap-2 px-3 py-2 rounded border border-[#bfdbfe] bg-[#eff6ff] text-[12px] text-[#1e40af]">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          <strong>How this works:</strong> You don&apos;t have to confirm every group before moving on. Use &ldquo;Enrich This Category&rdquo; to start one at a time, or confirm them all and enrich in bulk.
        </span>
      </div>

      {/* High-Confidence Category Cards */}
      <div className="grid gap-3">
        {highConfidenceCategories.map((cat) => {
          // Change 5: Enriched category state — read-only with green tint
          if (cat.enriched) {
            return (
              <div
                key={cat.id}
                className="rounded border p-4 bg-[#f0fdf4] border-[#86efac]"
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[14px] font-semibold text-[#1a1f2e]">{cat.name}</h3>
                      <span className="text-[10px] font-mono text-[#9ca3af]">{cat.brickCode}</span>
                      <span className="text-[13px] text-[#6b7280]">{cat.productCount} Products</span>
                      <span className="px-2 py-0.5 text-[11px] font-semibold text-white bg-[#2e7d32] rounded">AI Enriched</span>
                      <span className="text-[11px] text-[#6b7280]">Enriched on {cat.enrichedDate}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[12px] text-[#6b7280] w-20">Confidence:</span>
                      <div className="flex-1 max-w-xs h-2 rounded-full bg-[#e8eaed] overflow-hidden">
                        <div className="h-full rounded-full bg-[#2e7d32]" style={{ width: `${cat.confidence}%` }} />
                      </div>
                      <span className="text-[12px] font-medium text-[#374151] w-10">{cat.confidence}%</span>
                    </div>
                    <p className="text-[11px] text-[#6b7280] mt-1.5 italic">To edit attributes, use the product detail page.</p>
                  </div>
                  <button
                    onClick={() => onViewGtins(cat.id, cat.name, cat.brickCode)}
                    className="text-[12px] text-[#1a5fa6] font-medium hover:underline"
                  >
                    View Products
                  </button>
                </div>
              </div>
            )
          }

          // Confident or already-confirmed card
          return (
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
                    <span className="text-[13px] text-[#6b7280]">{cat.productCount} Products ({cat.gtinCount} GTINs)</span>
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
                    View {cat.productCount} Products
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
                      {/* Undo confirm — restores the card to unconfirmed state */}
                      <button
                        onClick={() => handleUnconfirmCategory(cat.id)}
                        className="px-2.5 py-1.5 text-[12px] font-medium border border-[#d1d5db] rounded bg-white text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#374151] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6b7280]"
                        title="Undo category confirmation"
                      >
                        Undo Confirm
                      </button>
                      {/* Enrich button: active when selected, outline when not */}
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
          )
        })}
      </div>

      {/* Change 2: Low-confidence section with multiple cards */}
      {(lowConfidenceCategories.length > 0 || unclassifiableCategory) && (
        <div className="rounded-lg border-2 border-dashed border-[#f59e0b] bg-[#fffbeb] p-4 space-y-4">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#92400e]" aria-hidden="true" />
            <div>
              <h3 className="text-[14px] font-semibold text-[#1a1f2e]">
                Help us confirm the product type — {totalLowConfidenceProducts} Products remaining
              </h3>
              <p className="text-[12px] text-[#6b7280] mt-1">
                We grouped the remaining products by our best guess. Confirm if correct, or review products individually to reassign.
              </p>
            </div>
          </div>

          {/* Low-confidence category cards */}
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
                      <span className="text-[13px] text-[#6b7280]">{cat.productCount} Products</span>
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
                      View {cat.productCount} Products
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

            {/* Unclassifiable remainder */}
            {unclassifiableCategory && (
              <div className="rounded border-2 border-[#dc2626] border-dashed p-4 bg-[#fef2f2]">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <AlertTriangle className="w-4 h-4 text-[#dc2626]" aria-hidden="true" />
                      <h3 className="text-[14px] font-semibold text-[#1a1f2e]">Could not classify</h3>
                      <span className="text-[13px] text-[#6b7280]">{unclassifiableCategory.productCount} Products</span>
                    </div>
                    <p className="text-[12px] text-[#6b7280] mt-1">
                      These products could not be automatically categorized. Please assign them individually.
                    </p>
                  </div>
                  <button
                    onClick={handleAssignIndividually}
                    className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-[#1a5fa6] border border-[#1a5fa6] rounded bg-white hover:bg-[#eff6ff] transition-colors"
                  >
                    Assign Individually
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Link to review all products individually */}
          <div className="pt-3 border-t border-[#fde68a]">
            <button
              onClick={handleReviewAllIndividually}
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
          {/* Scenario 3: exit without enriching — confirmed categories are saved, not discarded */}
          <div>
            <button
              onClick={() =>
                onSaveAndExit(
                  confirmedList.map((c) => ({ id: c.id, name: c.name, productCount: c.productCount, gtinCount: c.gtinCount, confidence: c.confidence, brickCode: c.brickCode }))
                )
              }
              className="px-3 py-1.5 text-[13px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
            >
              {confirmedCount > 0 ? "Save & Return to List" : "Exit to Selection Code List"}
            </button>
            {confirmedCount > 0 && (
              <p className="text-[11px] text-[#6b7280] mt-1 max-w-[260px]">
                {fromSelectionCode
                  ? "Confirmed categories are kept — this code will show “Categories Assigned – Not Enriched”."
                  : "Confirmed categories are kept — you can enrich later from the Selection Code List."}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[12px] text-[#6b7280]">
            {confirmedCount > 0
              ? `${confirmedCount} categor${confirmedCount === 1 ? "y" : "ies"} confirmed (${totalConfirmedProducts.toLocaleString()} Products) — ready for enrichment.`
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
                ? `Proceed with All ${totalCount} Categories (${totalConfirmedProducts.toLocaleString()} Products)`
                : `Proceed with ${confirmedCount} Confirmed Categor${confirmedCount === 1 ? "y" : "ies"} (${totalConfirmedProducts.toLocaleString()} Products)`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
