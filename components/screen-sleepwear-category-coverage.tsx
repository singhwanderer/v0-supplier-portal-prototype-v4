"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, ArrowRight, Info, HelpCircle, ListChecks, AlertTriangle } from "lucide-react"
import type { ConfirmedCategory } from "@/app/page"
import { SaveAndExitDialog } from "@/components/save-and-exit-dialog"
import {
  SLEEPWEAR_BRICKS,
  SLEEPWEAR_LOW_CONFIDENCE_BRICKS,
  SLEEPWEAR_COVERAGE_ASSIGNED,
  distributeProducts,
  estimateGtins,
} from "@/lib/sleepwear-catalog"

// Category Coverage for Selection Code 002 (Sleepwear) — merges what used to be
// two screens (a read-only coverage summary, then a separate AI category
// confirmation screen) into one. Confirming a proposed category here moves its
// products straight into the "already assigned" section above, merging into an
// existing card by GS1 brick code where one exists. There is exactly one
// forward action (Continue, at the bottom) — no per-card "Enrich This Category"
// detour like the standalone confirmation screen has, since that screen still
// serves Footwear's whole-code flow and must keep behaving as it does today.

interface SleepwearCategory {
  id: string
  name: string
  brickCode: string
  productCount: number
  gtinCount: number
  confidence: number
  confirmed: boolean
  evidence: string
}

interface AssignedGroup {
  categoryName: string
  brickCode: string
  productCount: number
}

interface ScreenSleepwearCategoryCoverageProps {
  selectedCodes: string[]
  codesMetadata: Record<string, { gtins: number; products: number; description: string; categoriesAssigned: number }>
  stepLabel?: string
  onViewGtins: (categoryId: string, categoryName: string, brickCode: string) => void
  onProceedToEnrichment: (categories: ConfirmedCategory[], sessionConfirmedCount: number) => void
  onSaveAndExit: (categories: ConfirmedCategory[], sessionConfirmedCount: number) => void
  onAssignIndividually: (scope: "unclassified" | "all-low-confidence") => void
  onBack: () => void
  onExit?: () => void
}

export function ScreenSleepwearCategoryCoverage({
  selectedCodes,
  codesMetadata,
  stepLabel,
  onViewGtins,
  onProceedToEnrichment,
  onSaveAndExit,
  onAssignIndividually,
  onBack,
  onExit,
}: ScreenSleepwearCategoryCoverageProps) {
  const code = selectedCodes[0] ?? ""
  const meta = codesMetadata[code] ?? { gtins: 0, products: 0, description: "", categoriesAssigned: 0 }
  const totalProducts = selectedCodes.reduce((s, c) => s + (codesMetadata[c]?.products ?? 0), 0)
  const totalGtins = selectedCodes.reduce((s, c) => s + (codesMetadata[c]?.gtins ?? 0), 0)
  const baseAssignedCount = selectedCodes.reduce(
    (s, c) => s + Math.min(codesMetadata[c]?.categoriesAssigned ?? 0, codesMetadata[c]?.products ?? 0),
    0,
  )
  const baseUnassignedCount = totalProducts - baseAssignedCount
  const codeLabel = `${code} ${meta.description}`.trim()

  // Same apportionment the standalone confirmation screen uses, seeded from the
  // products this screen still needs to categorize rather than a fixed total.
  const initialCategories = useMemo<SleepwearCategory[]>(() => {
    const defs = [...SLEEPWEAR_BRICKS, ...SLEEPWEAR_LOW_CONFIDENCE_BRICKS]
    const counts = distributeProducts(baseUnassignedCount, defs.map((d) => d.weight))
    return defs
      .map((def, i) => ({
        id: def.id,
        name: def.name,
        brickCode: def.brickCode,
        productCount: counts[i],
        gtinCount: estimateGtins(counts[i]),
        confidence: def.confidence,
        confirmed: false,
        evidence: def.evidence,
      }))
      .filter((c) => c.productCount > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUnassignedCount])

  const [categories, setCategories] = useState<SleepwearCategory[]>(initialCategories)
  const [batchConfirmed, setBatchConfirmed] = useState(false)
  const [preConfirmAllSnapshot, setPreConfirmAllSnapshot] = useState<Set<string>>(new Set())
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // Confirmed proposals fold into the assigned list by brick code — an existing
  // card's count grows in place, or a new card appears if the brick isn't
  // already represented. This same total drives the progress header, so the
  // header and the card list can never disagree.
  const assignedGroups = useMemo<AssignedGroup[]>(() => {
    const map = new Map<string, AssignedGroup>()
    for (const g of SLEEPWEAR_COVERAGE_ASSIGNED) {
      map.set(g.brickCode, { ...g })
    }
    for (const cat of categories) {
      if (!cat.confirmed || !cat.brickCode) continue
      const existing = map.get(cat.brickCode)
      map.set(
        cat.brickCode,
        existing
          ? { ...existing, productCount: existing.productCount + cat.productCount }
          : { categoryName: cat.name, brickCode: cat.brickCode, productCount: cat.productCount },
      )
    }
    return Array.from(map.values())
  }, [categories])

  const liveAssignedCount = assignedGroups.reduce((s, g) => s + g.productCount, 0)
  const liveUnassignedCount = totalProducts - liveAssignedCount
  const allCovered = liveUnassignedCount === 0 && totalProducts > 0
  const assignedPercent = totalProducts > 0 ? Math.round((liveAssignedCount / totalProducts) * 100) : 0
  const sessionConfirmedCount = liveAssignedCount - baseAssignedCount

  const unconfirmedHighConfidence = categories.filter((c) => c.confidence >= 70 && !c.confirmed)
  const unconfirmedLowConfidence = categories.filter((c) => c.confidence < 70 && c.confidence > 0 && !c.confirmed)
  const unclassifiableCategory = categories.find((c) => c.confidence === 0)
  const remainingCount =
    unconfirmedHighConfidence.length + unconfirmedLowConfidence.length + (unclassifiableCategory ? 1 : 0)
  const totalLowConfidenceProducts =
    unconfirmedLowConfidence.reduce((s, c) => s + c.productCount, 0) + (unclassifiableCategory?.productCount ?? 0)

  const handleConfirmCategory = (id: string) => {
    setBatchConfirmed(false)
    setCategories((prev) => prev.map((cat) => (cat.id === id ? { ...cat, confirmed: true } : cat)))
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
  }

  const toConfirmedCategories = (): ConfirmedCategory[] =>
    assignedGroups.map((g) => ({
      id: g.brickCode,
      name: g.categoryName,
      productCount: g.productCount,
      gtinCount: estimateGtins(g.productCount),
      confidence: 100,
      brickCode: g.brickCode,
    }))

  const allConfirmable = categories.filter((c) => c.confidence >= 70).length
  const allConfirmed = allConfirmable > 0 && unconfirmedHighConfidence.length === 0

  const handleExitClick = () => {
    if (sessionConfirmedCount > 0) {
      setShowExitConfirm(true)
    } else {
      onSaveAndExit(toConfirmedCategories(), sessionConfirmedCount)
    }
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
          Reviewing Selection Code <strong>{codeLabel}</strong> &middot; {totalProducts.toLocaleString()} Products (
          {totalGtins.toLocaleString()} GTINs)
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
            <strong>All {totalProducts} products already have categories</strong> — no AI category assignment needed.
            You can go straight to attribute enrichment.
          </span>
        </div>
      ) : (
        <div className="bg-white border border-[#d1d5db] rounded p-4 space-y-2">
          <h2 className="text-[15px] font-semibold text-[#1a1f2e]">
            {`${liveAssignedCount} products already have categories — only ${liveUnassignedCount} left to assign`}
          </h2>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-[#fef3c7]" aria-hidden="true">
            <div className="h-full bg-[#2e7d32]" style={{ width: `${assignedPercent}%` }} />
          </div>
          <p className="text-[12px] text-[#6b7280]">
            {`${assignedPercent}% covered. Products that already have a category keep it — AI only classifies the ${liveUnassignedCount} that don't.`}
          </p>
        </div>
      )}

      {/* Categories already assigned */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h3 className="text-[14px] font-semibold text-[#1a1f2e]">
            Products with categories already assigned ({liveAssignedCount})
          </h3>
          <p className="text-[12px] text-[#6b7280]">These products keep their existing categories — no AI is involved.</p>
        </div>
        <div className="grid gap-2">
          {assignedGroups.map((group) => (
            <div key={group.brickCode + group.categoryName} className="rounded border p-3 bg-[#f0fdf4] border-[#86efac]">
              <div className="flex items-center gap-2 flex-wrap">
                <CheckCircle2 className="w-4 h-4 text-[#2e7d32]" aria-hidden="true" />
                <h4 className="text-[13px] font-semibold text-[#1a1f2e]">{group.categoryName}</h4>
                <span className="text-[10px] font-mono text-[#9ca3af]">{group.brickCode}</span>
                <span className="text-[12px] text-[#6b7280]">{group.productCount} Products</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Categorization — replaces the old static "don't have a category" list */}
      {!allCovered && (
        <div className="space-y-4">
          <div>
            <h3 className="text-[14px] font-semibold text-[#1a1f2e]">
              {liveUnassignedCount} {liveUnassignedCount === 1 ? "product" : "products"} still need a category
            </h3>
            <p className="text-[12px] text-[#6b7280] mt-0.5">
              We read your product descriptions and grouped them into sleepwear categories. Confirm a group and its
              products move into the assigned list above.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-[13px] font-medium text-[#374151]">
              {remainingCount} {remainingCount === 1 ? "group" : "groups"} left to review
            </p>
            <div className="flex items-start gap-2 px-3 py-2 rounded border border-[#bfdbfe] bg-[#eff6ff] text-[12px] text-[#1e40af] max-w-md">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <strong>How this works:</strong> Confirm groups one at a time, or use &ldquo;Confirm All
                Categories&rdquo; below for everything AI is confident about.
              </span>
            </div>
          </div>

          {/* High-confidence category cards */}
          {unconfirmedHighConfidence.length > 0 && (
            <div className="grid gap-3">
              {unconfirmedHighConfidence.map((cat) => (
                <div key={cat.id} className="rounded border p-4 bg-white border-[#d1d5db] transition-colors">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[14px] font-semibold text-[#1a1f2e]">{cat.name}</h3>
                        <span className="text-[10px] font-mono text-[#9ca3af]">{cat.brickCode}</span>
                        <span className="text-[13px] text-[#6b7280]">
                          {cat.productCount} {cat.productCount === 1 ? "Product" : "Products"} ({cat.gtinCount} GTINs)
                        </span>
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
                      <p className="text-[11px] text-[#6b7280] italic mt-1.5">{cat.evidence}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        onClick={() => onViewGtins(cat.id, cat.name, cat.brickCode)}
                        className="px-3 py-1.5 text-[12px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors"
                      >
                        View {cat.productCount} {cat.productCount === 1 ? "Product" : "Products"}
                      </button>
                      <button
                        onClick={() => handleConfirmCategory(cat.id)}
                        className="px-3 py-1.5 text-[12px] font-semibold text-white rounded transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
                        style={{ backgroundColor: "#1a5fa6" }}
                      >
                        Confirm Category
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Low-confidence + unclassifiable */}
          {(unconfirmedLowConfidence.length > 0 || unclassifiableCategory) && (
            <div className="rounded-lg border-2 border-dashed border-[#f59e0b] bg-[#fffbeb] p-4 space-y-4">
              <div className="flex items-start gap-2">
                <HelpCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#92400e]" aria-hidden="true" />
                <h3 className="text-[13px] font-semibold text-[#92400e]">
                  Help us confirm the product type — {totalLowConfidenceProducts}{" "}
                  {totalLowConfidenceProducts === 1 ? "Product" : "Products"} remaining
                </h3>
              </div>
              <div className="grid gap-3">
                {unconfirmedLowConfidence.map((cat) => (
                  <div key={cat.id} className="rounded border p-4 bg-white border-[#fcd34d] transition-colors">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-[14px] font-semibold text-[#1a1f2e]">{cat.name}</h3>
                          <span className="text-[10px] font-mono text-[#9ca3af]">{cat.brickCode}</span>
                          <span className="text-[13px] text-[#6b7280]">
                            {cat.productCount} {cat.productCount === 1 ? "Product" : "Products"}
                          </span>
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#fed7aa] text-[#b45309]">
                            Needs review
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[12px] text-[#6b7280] w-20">Confidence:</span>
                          <div className="flex-1 max-w-xs h-2 rounded-full bg-[#e8eaed] overflow-hidden">
                            <div className="h-full rounded-full bg-[#f59e0b]" style={{ width: `${cat.confidence}%` }} />
                          </div>
                          <span className="text-[12px] font-medium text-[#92400e] w-10">{cat.confidence}%</span>
                        </div>
                        <p className="text-[11px] text-[#6b7280] italic mt-1.5">{cat.evidence}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                          onClick={() => onViewGtins(cat.id, cat.name, cat.brickCode)}
                          className="px-3 py-1.5 text-[12px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors"
                        >
                          View {cat.productCount} {cat.productCount === 1 ? "Product" : "Products"}
                        </button>
                        <button
                          onClick={() => handleConfirmCategory(cat.id)}
                          className="px-3 py-1.5 text-[12px] font-semibold text-white rounded bg-[#1a5fa6] hover:opacity-90 transition-opacity"
                        >
                          Confirm Category
                        </button>
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
                        <p className="text-[11px] text-[#6b7280] italic mt-1">{unclassifiableCategory.evidence}</p>
                        <p className="text-[12px] text-[#6b7280] mt-1">
                          These products could not be automatically categorized. Please assign them individually.
                        </p>
                      </div>
                      <button
                        onClick={() => onAssignIndividually("unclassified")}
                        className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-[#1a5fa6] border border-[#1a5fa6] rounded bg-white hover:bg-[#eff6ff] transition-colors"
                      >
                        Assign Individually
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[#fde68a]">
                <button
                  onClick={() => onAssignIndividually("all-low-confidence")}
                  className="inline-flex items-center gap-1.5 text-[12px] text-[#1a5fa6] font-medium hover:underline"
                >
                  <ListChecks className="w-3.5 h-3.5" aria-hidden="true" />
                  Not all the same type? Review all {totalLowConfidenceProducts} products individually
                  <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
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
          {onExit && (
            <button
              onClick={handleExitClick}
              className="px-3 py-1.5 text-[13px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
            >
              {sessionConfirmedCount > 0 ? "Save & Return to List" : "Exit to Selection Code List"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {!allCovered && (
            <p className="flex items-center gap-1.5 text-[12px] text-[#92400e]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {liveUnassignedCount} products still don&apos;t have a category — you can leave them for a later visit,
              or confirm them above before continuing.
            </p>
          )}
          {!allCovered && !batchConfirmed && !allConfirmed && unconfirmedHighConfidence.length > 0 && (
            <button
              onClick={handleConfirmAll}
              className="px-4 py-2 text-[13px] font-semibold border-2 rounded transition-colors hover:bg-[#f0f2f5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
              style={{ borderColor: "#1a1f5e", color: "#1a1f5e" }}
            >
              Confirm All Categories
            </button>
          )}
          {!allCovered && batchConfirmed && (
            <button
              onClick={handleUndoConfirmAll}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold border-2 rounded transition-colors hover:bg-[#fef2f2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#dc2626]"
              style={{ borderColor: "#dc2626", color: "#dc2626" }}
            >
              Undo Confirm All
            </button>
          )}
          <button
            onClick={() => onProceedToEnrichment(toConfirmedCategories(), sessionConfirmedCount)}
            disabled={liveAssignedCount === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white rounded transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
            style={{ backgroundColor: "#1a5fa6" }}
          >
            Continue to Attribute Enrichment ({liveAssignedCount.toLocaleString()} products)
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {showExitConfirm && (
        <SaveAndExitDialog
          productCount={sessionConfirmedCount}
          onCancel={() => setShowExitConfirm(false)}
          onConfirm={() => {
            setShowExitConfirm(false)
            onSaveAndExit(toConfirmedCategories(), sessionConfirmedCount)
          }}
        />
      )}
    </div>
  )
}
