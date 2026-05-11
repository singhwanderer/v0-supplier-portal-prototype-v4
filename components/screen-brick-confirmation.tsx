"use client"

import { useState } from "react"
import { CheckCircle2, ArrowRight, Info, HelpCircle, ArrowLeft, ListChecks } from "lucide-react"
import type { ConfirmedCategory } from "@/app/page"

interface BrickCategory {
  id: string
  name: string
  brickCode: string
  gtinCount: number
  confidence: number
  confirmed: boolean
}

export type BrickConfirmationSource =
  | { type: "upload"; fileName: string }
  | { type: "selection-code"; codes: string[]; metadata: Record<string, { gtins: number; description: string }> }

interface ScreenBrickConfirmationProps {
  fileName: string
  totalGtinCount: number
  sourceContext?: BrickConfirmationSource
  onViewGtins: (categoryId: string, categoryName: string, brickCode: string) => void
  onProceedToEnrichment: (categories: ConfirmedCategory[]) => void
  onBack: () => void
  onSkipToSelectionCodeList: () => void
}

const INITIAL_CATEGORIES: BrickCategory[] = [
  { id: "1", name: "Shoes - General Purpose",             brickCode: "10001077", gtinCount: 288, confidence: 94, confirmed: false },
  { id: "2", name: "Boots - General Purpose",             brickCode: "10001076", gtinCount: 157, confidence: 91, confirmed: false },
  { id: "3", name: "Athletic Footwear - General Purpose", brickCode: "10001070", gtinCount: 198, confidence: 96, confirmed: false },
  // Example of an unresolved group (confidence < 70) that triggers the inline fallback picker
  { id: "4", name: "Unresolved group",                    brickCode: "",         gtinCount: 47,  confidence: 62, confirmed: false },
]

// Segment tiles shown when confidence < 70. Each tile carries a plain-language reason — no GPC/brick mentioned.
const FALLBACK_SEGMENTS: { id: string; label: string; reason: string }[] = [
  { id: "footwear",  label: "Footwear",            reason: "Based on your size codes and product description" },
  { id: "sleepwear", label: "Sleepwear",           reason: "Based on fabric and product naming patterns" },
  { id: "jewellery", label: "Jewellery & Watches", reason: "Based on material terms in your descriptions" },
]

// Sub-options within each segment. Brick codes are carried silently until the user confirms.
const FALLBACK_SUB_OPTIONS: Record<string, { name: string; brickCode: string }[]> = {
  footwear: [
    { name: "Shoes - General Purpose",             brickCode: "10001077" },
    { name: "Boots - General Purpose",             brickCode: "10001076" },
    { name: "Athletic Footwear - General Purpose", brickCode: "10001070" },
  ],
  sleepwear: [
    { name: "Dressing Gowns",            brickCode: "10001338" },
    { name: "Night Dresses/Shirts",      brickCode: "10001339" },
    { name: "Sleep Trousers/Shorts",     brickCode: "10001341" },
    { name: "Sleepwear Variety Packs",   brickCode: "10001358" },
  ],
  jewellery: [
    { name: "Anklets",                   brickCode: "10001083" },
    { name: "Bracelets",                 brickCode: "10001084" },
    { name: "Brooches",                  brickCode: "10001085" },
    { name: "Cuff-links",                brickCode: "10001086" },
    { name: "Earrings/Body Jewellery",   brickCode: "10001087" },
    { name: "Necklaces/Necklets",        brickCode: "10001090" },
    { name: "Pendants",                  brickCode: "10001091" },
    { name: "Rings",                     brickCode: "10001092" },
    { name: "Tiaras",                    brickCode: "10001093" },
    { name: "Watches",                   brickCode: "10001105" },
  ],
}

// Sample GTINs shown in the "Review individually" table for the uncertain card (47 GTINs total in prototype).
interface UncertainGtin { gtin: string; description: string }
const SAMPLE_UNCERTAIN_GTINS: UncertainGtin[] = [
  { gtin: "019283501116", description: "Blue canvas sneaker, lace-up" },
  { gtin: "045678123452", description: "Leather ankle boot, side zip" },
  { gtin: "052847141271", description: "Running shoe, mesh upper, rubber sole" },
  { gtin: "088854561795", description: "Silk nightgown, knee length" },
  { gtin: "091638770968", description: "Cotton sleep shorts, elastic waist" },
  { gtin: "084756388063", description: "Silver charm bracelet, 7.5 inch" },
  { gtin: "057421469391", description: "Gold pendant necklace, 18 inch chain" },
  { gtin: "019283356486", description: "Pearl drop earrings, sterling silver" },
  { gtin: "084756508498", description: "Wool dressing gown, tie waist" },
  { gtin: "052847134948", description: "Athletic training shoe, cushioned sole" },
]

// Per-card picker state: quick-pick (segment tiles) vs. individual-review (per-GTIN table)
type PickerMode = "quick" | "individual"
type PickerState = { mode: PickerMode; segmentId: string | null }

// Each GTIN's assignment is encoded as "segmentId:brickCode" — null means unassigned
type Assignments = Record<string, string | null>

export function ScreenBrickConfirmation({ fileName, totalGtinCount, sourceContext, onViewGtins, onProceedToEnrichment, onBack, onSkipToSelectionCodeList }: ScreenBrickConfirmationProps) {
  const [categories, setCategories] = useState<BrickCategory[]>(INITIAL_CATEGORIES)
  // Keyed by uncertain-card id → picker state
  const [pickerState, setPickerState] = useState<Record<string, PickerState>>({})
  // Keyed by uncertain-card id → per-GTIN assignment map
  const [assignments, setAssignments] = useState<Record<string, Assignments>>({})
  // Keyed by uncertain-card id → selected GTINs for bulk-apply
  const [bulkSelected, setBulkSelected] = useState<Record<string, Set<string>>>({})
  // Bulk-apply dropdown value per card
  const [bulkValue, setBulkValue] = useState<Record<string, string>>({})

  const confirmedList = categories.filter((c) => c.confirmed)
  const confirmedCount = confirmedList.length
  const totalCount = categories.length
  const allConfirmed = confirmedCount === totalCount
  const totalConfirmedGtins = confirmedList.reduce((s, c) => s + c.gtinCount, 0)
  const hasUncertain = categories.some((c) => c.confidence < 70 && !c.confirmed)

  const fromSelectionCode = sourceContext?.type === "selection-code"
  const selectionCodeLabel = fromSelectionCode && sourceContext.codes.length > 0
    ? `${sourceContext.codes[0]} ${sourceContext.metadata[sourceContext.codes[0]]?.description ?? ""}`.trim()
    : ""

  const handleConfirmCategory = (id: string) =>
    setCategories((prev) => prev.map((cat) => (cat.id === id ? { ...cat, confirmed: true } : cat)))

  const handleConfirmAll = () =>
    // Only auto-confirm categories that AI has resolved (>= 70). Uncertain ones still require a manual pick.
    setCategories((prev) => prev.map((cat) => (cat.confidence >= 70 ? { ...cat, confirmed: true } : cat)))

  const handleEnrichSingle = (cat: BrickCategory) => {
    const toEnrich: ConfirmedCategory[] = [{ id: cat.id, name: cat.name, gtinCount: cat.gtinCount, confidence: cat.confidence }]
    onProceedToEnrichment(toEnrich)
  }

  const handleEnrichAll = () => {
    const toEnrich: ConfirmedCategory[] = confirmedList.map((c) => ({
      id: c.id, name: c.name, gtinCount: c.gtinCount, confidence: c.confidence,
    }))
    onProceedToEnrichment(toEnrich)
  }

  // Fallback picker handlers
  const openSegment = (cardId: string, segmentId: string) =>
    setPickerState((prev) => ({ ...prev, [cardId]: { mode: "quick", segmentId } }))

  const resetSegment = (cardId: string) =>
    setPickerState((prev) => ({ ...prev, [cardId]: { mode: "quick", segmentId: null } }))

  const openIndividual = (cardId: string) => {
    setPickerState((prev) => ({ ...prev, [cardId]: { mode: "individual", segmentId: null } }))
    // Seed empty assignments map for this card if not present
    setAssignments((prev) => (prev[cardId] ? prev : { ...prev, [cardId]: {} }))
    setBulkSelected((prev) => (prev[cardId] ? prev : { ...prev, [cardId]: new Set() }))
  }

  const backToQuickPick = (cardId: string) =>
    setPickerState((prev) => ({ ...prev, [cardId]: { mode: "quick", segmentId: null } }))

  // Resolve an uncertain card once the supplier picks a sub-option: morph it into a confirmed category (quick path).
  const resolveUncertainCard = (cardId: string, option: { name: string; brickCode: string }) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === cardId
          ? { ...cat, name: option.name, brickCode: option.brickCode, confidence: 100, confirmed: true }
          : cat
      )
    )
    setPickerState((prev) => { const next = { ...prev }; delete next[cardId]; return next })
  }

  // Individual-review: set assignment for a single GTIN
  const setGtinAssignment = (cardId: string, gtin: string, value: string | null) =>
    setAssignments((prev) => ({ ...prev, [cardId]: { ...(prev[cardId] ?? {}), [gtin]: value } }))

  // Individual-review: toggle a GTIN in the bulk-selected set
  const toggleBulkSelected = (cardId: string, gtin: string) =>
    setBulkSelected((prev) => {
      const current = new Set(prev[cardId] ?? new Set<string>())
      if (current.has(gtin)) current.delete(gtin)
      else current.add(gtin)
      return { ...prev, [cardId]: current }
    })

  const toggleBulkAll = (cardId: string) =>
    setBulkSelected((prev) => {
      const current = prev[cardId] ?? new Set<string>()
      if (current.size === SAMPLE_UNCERTAIN_GTINS.length) return { ...prev, [cardId]: new Set() }
      return { ...prev, [cardId]: new Set(SAMPLE_UNCERTAIN_GTINS.map((g) => g.gtin)) }
    })

  // Apply the selected category to every GTIN in the bulk-selected set
  const applyBulkValue = (cardId: string) => {
    const value = bulkValue[cardId]
    const selected = bulkSelected[cardId]
    if (!value || !selected || selected.size === 0) return
    setAssignments((prev) => {
      const cardAssignments = { ...(prev[cardId] ?? {}) }
      selected.forEach((g) => { cardAssignments[g] = value })
      return { ...prev, [cardId]: cardAssignments }
    })
    // Clear selection + dropdown after apply
    setBulkSelected((prev) => ({ ...prev, [cardId]: new Set() }))
    setBulkValue((prev) => ({ ...prev, [cardId]: "" }))
  }

  // Save individual assignments: move assigned GTINs to confirmed categories while keeping the
  // uncertain card alive (with reduced count) until ALL GTINs are resolved.
  const saveIndividualAssignments = (cardId: string) => {
    const card = categories.find((c) => c.id === cardId)
    if (!card) return
    const cardAssignments = assignments[cardId] ?? {}
    const assignedGtins = Object.entries(cardAssignments).filter(([, v]) => Boolean(v))
    if (assignedGtins.length === 0) return

    // Count GTINs per (segmentId:brickCode)
    const counts: Record<string, number> = {}
    assignedGtins.forEach(([, key]) => { counts[key as string] = (counts[key as string] ?? 0) + 1 })

    const keys = Object.keys(counts)
    const totalAssigned = assignedGtins.length
    const remainingCount = card.gtinCount - totalAssigned

    // Build new confirmed category cards for the assigned GTINs
    const newCategories: BrickCategory[] = keys.map((key, idx) => {
      const [segmentId, brickCode] = key.split(":")
      const option = FALLBACK_SUB_OPTIONS[segmentId].find((o) => o.brickCode === brickCode)!
      return {
        id: `${cardId}-split-${Date.now()}-${idx}`,
        name: option.name,
        brickCode: option.brickCode,
        gtinCount: counts[key],
        confidence: 100,
        confirmed: true,
      }
    })

    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === cardId)
      if (idx === -1) return prev
      const next = [...prev]

      if (remainingCount > 0) {
        // Keep uncertain card alive with reduced count; insert new categories after it
        next[idx] = { ...card, gtinCount: remainingCount }
        next.splice(idx + 1, 0, ...newCategories)
      } else {
        // All GTINs resolved — replace the uncertain card entirely
        next.splice(idx, 1, ...newCategories)
        // Clean up picker state since card is gone
        setPickerState((p) => { const n = { ...p }; delete n[cardId]; return n })
      }
      return next
    })

    // Clear out saved assignments for the GTINs that were just resolved
    setAssignments((prev) => {
      const remaining: Assignments = {}
      Object.entries(prev[cardId] ?? {}).forEach(([g, v]) => {
        if (!v) remaining[g] = v // keep unassigned GTINs
      })
      if (remainingCount > 0) return { ...prev, [cardId]: remaining }
      const next = { ...prev }
      delete next[cardId]
      return next
    })
    setBulkSelected((prev) => {
      if (remainingCount > 0) return { ...prev, [cardId]: new Set() }
      const next = { ...prev }; delete next[cardId]; return next
    })
    setBulkValue((prev) => {
      if (remainingCount > 0) return { ...prev, [cardId]: "" }
      const next = { ...prev }; delete next[cardId]; return next
    })
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
            Enriching Selection Code <strong>{selectionCodeLabel}</strong> &middot; {totalGtinCount.toLocaleString()} GTINs
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
            Upload complete — <strong>{fileName || "catalog.csv"}</strong> &middot; {totalGtinCount.toLocaleString()} GTINs loaded
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[16px] font-semibold text-[#1a1f2e]">
            {fromSelectionCode
              ? `Review product categories for ${selectionCodeLabel}`
              : `Review product categories for your ${totalGtinCount.toLocaleString()} GTINs`}
          </h2>
          <p className="text-[13px] text-[#6b7280] mt-1 max-w-2xl">
            We read your GTIN descriptions and grouped them into product categories. Review each group, then continue to attribute enrichment.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[13px] font-medium text-[#374151]">
            {confirmedCount} of {totalCount} categories confirmed
          </p>
          {confirmedCount > 0 && (
            <p className="text-[12px] text-[#1a5fa6] mt-0.5">
              {totalConfirmedGtins.toLocaleString()} GTINs ready for enrichment
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

      {/* Category Cards */}
      <div className="grid gap-3">
        {categories.map((cat) => {
          const isUncertain = cat.confidence < 70 && !cat.confirmed
          const picker = pickerState[cat.id] ?? { mode: "quick", segmentId: null }

          // Uncertain card: inline disambiguation picker — no confidence numbers, no jargon.
          if (isUncertain) {
            const subOptions = picker.segmentId ? FALLBACK_SUB_OPTIONS[picker.segmentId] : null
            const selectedSegmentLabel = FALLBACK_SEGMENTS.find((s) => s.id === picker.segmentId)?.label
            const cardAssignments = assignments[cat.id] ?? {}
            const cardSelected = bulkSelected[cat.id] ?? new Set<string>()
            const assignedCount = Object.values(cardAssignments).filter(Boolean).length
            const allSelected = cardSelected.size === SAMPLE_UNCERTAIN_GTINS.length
            const someSelected = cardSelected.size > 0

            // Live count: remaining = total minus number of sample GTINs already assigned (1:1, no scaling)
            const remainingCount = Math.max(0, cat.gtinCount - assignedCount)
            // Build a live preview of tallies per assigned category — raw sample counts, no scaling
            const liveTallies: Record<string, { name: string; count: number }> = {}
            Object.values(cardAssignments).forEach((key) => {
              if (!key) return
              const [segId, brickCode] = key.split(":")
              const opt = FALLBACK_SUB_OPTIONS[segId]?.find((o) => o.brickCode === brickCode)
              if (!opt) return
              if (!liveTallies[key]) liveTallies[key] = { name: opt.name, count: 0 }
              liveTallies[key].count += 1
            })
            const liveTalliesArr = Object.entries(liveTallies).map(([key, t]) => ({
              key,
              name: t.name,
              count: t.count,
            }))

            return (
              <div
                key={cat.id}
                className="rounded border-2 border-dashed border-[#f59e0b] bg-[#fffbeb] p-4"
                role="region"
                aria-label="Help us confirm the product type"
              >
                <div className="flex items-start gap-2 mb-3">
                  <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#92400e]" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[14px] font-semibold text-[#1a1f2e]">
                        Help us confirm the product type
                      </h3>
                      {/* Live count badge — decreases by 1 for each GTIN assigned */}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold bg-[#fef3c7] text-[#92400e] border border-[#fcd34d] tabular-nums transition-all duration-200">
                        {remainingCount} GTINs remaining
                      </span>
                    </div>
                    <p className="text-[12px] text-[#6b7280] mt-0.5">
                      To suggest the right attributes, we need to know what type of product this is. Based on your submission, here are the closest matches — select the one that fits.
                    </p>
                  </div>
                </div>
                
                {/* Live preview of category tallies when in individual mode and some are assigned */}
                {picker.mode === "individual" && liveTalliesArr.length > 0 && (
                  <div className="mb-3 p-2.5 rounded border border-[#d1fae5] bg-[#ecfdf5] flex items-center gap-3 flex-wrap">
                    <span className="text-[11px] font-semibold text-[#047857]">Assigned so far:</span>
                    {liveTalliesArr.map((t) => (
                      <span key={t.key} className="inline-flex items-center gap-1 text-[11px] text-[#065f46] bg-[#d1fae5] px-2 py-0.5 rounded-full">
                        <span className="font-semibold">{t.count}</span>
                        <span className="text-[#047857]">{t.count === 1 ? "GTIN" : "GTINs"} →</span>
                        <span>{t.name}</span>
                      </span>
                    ))}
                    {remainingCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#92400e] bg-[#fef3c7] px-2 py-0.5 rounded-full">
                        <span className="font-semibold">{remainingCount}</span>
                        <span>unassigned</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Step 1 (quick pick): Segment tiles */}
                {picker.mode === "quick" && !picker.segmentId && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {FALLBACK_SEGMENTS.map((seg) => (
                        <button
                          key={seg.id}
                          onClick={() => openSegment(cat.id, seg.id)}
                          className="text-left p-3 rounded border border-[#d1d5db] bg-white hover:border-[#1a5fa6] hover:bg-[#f0f7ff] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
                        >
                          <p className="text-[13px] font-semibold text-[#1a1f2e]">{seg.label}</p>
                          <p className="text-[11px] text-[#6b7280] mt-1">{seg.reason}</p>
                        </button>
                      ))}
                    </div>
                    {/* Assign all at once shortcut */}
                    <div className="mt-3 pt-3 border-t border-[#fde68a] flex items-center justify-between gap-3 flex-wrap">
                      <button
                        onClick={() => openIndividual(cat.id)}
                        className="inline-flex items-center gap-1.5 text-[12px] text-[#1a5fa6] font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6] rounded"
                      >
                        <ListChecks className="w-3.5 h-3.5" aria-hidden="true" />
                        Not all the same type? Review GTINs individually
                        <ArrowRight className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </div>
                  </>
                )}

                {/* Step 2 (quick pick): Sub-option selection within the chosen segment */}
                {picker.mode === "quick" && picker.segmentId && subOptions && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] text-[#374151]">
                        <span className="text-[#6b7280]">Selected:</span>{" "}
                        <span className="font-semibold text-[#1a1f2e]">{selectedSegmentLabel}</span>
                        <span className="text-[#6b7280]"> — now pick the specific product type.</span>
                      </p>
                      <button
                        onClick={() => resetSegment(cat.id)}
                        className="flex items-center gap-1 text-[12px] text-[#1a5fa6] hover:underline focus:outline-none"
                      >
                        <ArrowLeft className="w-3 h-3" aria-hidden="true" />
                        Change
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                      {subOptions.map((opt) => (
                        <button
                          key={opt.brickCode}
                          onClick={() => resolveUncertainCard(cat.id, opt)}
                          className="text-left p-2.5 rounded border border-[#d1d5db] bg-white hover:border-[#2e7d32] hover:bg-[#f0fdf4] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e7d32]"
                        >
                          <p className="text-[12px] font-semibold text-[#1a1f2e]">{opt.name}</p>
                          <p className="text-[10px] font-mono text-[#9ca3af] mt-0.5" title="Internal category reference">
                            {opt.brickCode}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Individual-review mode: per-GTIN category assignment */}
                {picker.mode === "individual" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-[12px] text-[#374151]">
                        <span className="text-[#6b7280]">Showing {SAMPLE_UNCERTAIN_GTINS.length} of {cat.gtinCount} GTINs.</span>{" "}
                        Assign a category to each, then save.
                      </p>
                      <button
                        onClick={() => backToQuickPick(cat.id)}
                        className="flex items-center gap-1 text-[12px] text-[#1a5fa6] hover:underline focus:outline-none"
                      >
                        <ArrowLeft className="w-3 h-3" aria-hidden="true" />
                        Back to Quick Pick
                      </button>
                    </div>

                    {/* Bulk-apply toolbar */}
                    <div className="flex items-center gap-2 flex-wrap p-2 rounded bg-white border border-[#e5e7eb]">
                      <span className="text-[12px] text-[#374151]">
                        {someSelected ? `${cardSelected.size} selected` : "Select GTINs to bulk-apply"}
                      </span>
                      <select
                        value={bulkValue[cat.id] ?? ""}
                        onChange={(e) => setBulkValue((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                        disabled={!someSelected}
                        className="text-[12px] border border-[#d1d5db] rounded px-2 py-1 bg-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
                        aria-label="Bulk category to apply"
                      >
                        <option value="">Choose category...</option>
                        {FALLBACK_SEGMENTS.map((seg) => (
                          <optgroup key={seg.id} label={seg.label}>
                            {FALLBACK_SUB_OPTIONS[seg.id].map((opt) => (
                              <option key={opt.brickCode} value={`${seg.id}:${opt.brickCode}`}>
                                {opt.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <button
                        onClick={() => applyBulkValue(cat.id)}
                        disabled={!someSelected || !(bulkValue[cat.id])}
                        className="px-2.5 py-1 text-[12px] font-semibold text-white rounded transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
                        style={{ backgroundColor: "#1a5fa6" }}
                      >
                        Apply to selected
                      </button>
                    </div>

                    {/* Per-GTIN table */}
                    <div className="rounded border border-[#e5e7eb] bg-white overflow-hidden">
                      <table className="w-full text-[12px]">
                        <thead className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                          <tr>
                            <th className="w-8 px-2 py-2">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={() => toggleBulkAll(cat.id)}
                                aria-label="Select all GTINs"
                                className="cursor-pointer"
                              />
                            </th>
                            <th className="text-left px-3 py-2 font-semibold text-[#374151] w-32">GTIN</th>
                            <th className="text-left px-3 py-2 font-semibold text-[#374151]">Description</th>
                            <th className="text-left px-3 py-2 font-semibold text-[#374151] w-64">Category</th>
                          </tr>
                        </thead>
                        <tbody>
                          {SAMPLE_UNCERTAIN_GTINS.map((g) => {
                            const value = cardAssignments[g.gtin] ?? ""
                            const isSelected = cardSelected.has(g.gtin)
                            return (
                              <tr key={g.gtin} className="border-b border-[#f3f4f6] last:border-0 hover:bg-[#fafafa]">
                                <td className="px-2 py-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleBulkSelected(cat.id, g.gtin)}
                                    aria-label={`Select GTIN ${g.gtin}`}
                                    className="cursor-pointer"
                                  />
                                </td>
                                <td className="px-3 py-2 font-mono text-[11px] text-[#1a5fa6]">{g.gtin}</td>
                                <td className="px-3 py-2 text-[#374151]">{g.description}</td>
                                <td className="px-3 py-2">
                                  <select
                                    value={value}
                                    onChange={(e) => setGtinAssignment(cat.id, g.gtin, e.target.value || null)}
                                    className="w-full text-[12px] border border-[#d1d5db] rounded px-2 py-1 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
                                    aria-label={`Category for GTIN ${g.gtin}`}
                                  >
                                    <option value="">Unassigned</option>
                                    {FALLBACK_SEGMENTS.map((seg) => (
                                      <optgroup key={seg.id} label={seg.label}>
                                        {FALLBACK_SUB_OPTIONS[seg.id].map((opt) => (
                                          <option key={opt.brickCode} value={`${seg.id}:${opt.brickCode}`}>
                                            {opt.name}
                                          </option>
                                        ))}
                                      </optgroup>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-[11px] text-[#6b7280] italic">
                        + {cat.gtinCount - SAMPLE_UNCERTAIN_GTINS.length} more GTINs will be categorized using the same pattern.
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] text-[#374151] tabular-nums">
                          <span className={assignedCount === SAMPLE_UNCERTAIN_GTINS.length ? "text-[#047857] font-semibold" : "text-[#374151]"}>
                            {assignedCount}
                          </span>
                          {" "}of {SAMPLE_UNCERTAIN_GTINS.length} assigned
                          {remainingCount > 0 && (
                            <span className="ml-1.5 text-[#92400e]">({remainingCount} GTINs remaining)</span>
                          )}
                        </p>
                        <button
                          onClick={() => saveIndividualAssignments(cat.id)}
                          disabled={assignedCount === 0}
                          className="px-3 py-1.5 text-[12px] font-semibold text-white rounded transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e7d32]"
                          style={{ backgroundColor: "#2e7d32" }}
                        >
                          Save &amp; Apply to ({assignedCount}) {assignedCount === 1 ? "GTIN" : "GTINs"} Selected
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          }

          // Confident or already-confirmed card: existing layout unchanged.
          return (
            <div
              key={cat.id}
              className={`rounded border p-4 bg-white transition-colors ${
                cat.confirmed ? "border-[#2e7d32] bg-[#f0fdf4]" : "border-[#d1d5db]"
              }`}
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Left */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[14px] font-semibold text-[#1a1f2e]">{cat.name}</h3>
                    <span
                      className="text-[10px] font-mono text-[#9ca3af]"
                      title="Internal category reference"
                    >
                      {cat.brickCode}
                    </span>
                    <span className="text-[13px] text-[#6b7280]">{cat.gtinCount} GTINs</span>
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

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={() => onViewGtins(cat.id, cat.name, cat.brickCode)}
                    className="px-3 py-1.5 text-[12px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
                  >
                    View {cat.gtinCount} GTINs
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
                    <button
                      onClick={() => handleEnrichSingle(cat)}
                      className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-white rounded transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
                      style={{ backgroundColor: "#2e7d32" }}
                    >
                      Enrich This Category
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer tip — shown only when at least one uncertain group exists */}
      {hasUncertain && (
        <p className="text-[12px] text-[#6b7280] italic px-1">
          Tip: Adding details like a short marketing message helps us suggest the right category automatically next time.
        </p>
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
          {!fromSelectionCode && (
            <button
              onClick={onSkipToSelectionCodeList}
              className="px-3 py-1.5 text-[13px] font-medium text-[#6b7280] hover:text-[#374151] hover:underline transition-colors focus:outline-none"
            >
              Skip Enrichment → Go to Selection Code List
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[12px] text-[#6b7280]">
            {confirmedCount > 0
              ? `${confirmedCount} categor${confirmedCount === 1 ? "y" : "ies"} confirmed (${totalConfirmedGtins.toLocaleString()} GTINs) — ready for enrichment.`
              : "Confirm at least one category to begin enrichment."}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {!allConfirmed && (
            <button
              onClick={handleConfirmAll}
              className="px-4 py-2 text-[13px] font-semibold border-2 rounded transition-colors hover:bg-[#f0f2f5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
              style={{ borderColor: "#1a1f5e", color: "#1a1f5e" }}
            >
              Confirm All Categories
            </button>
          )}
          {confirmedCount > 0 && (
            <button
              onClick={handleEnrichAll}
              className="px-4 py-2 text-[13px] font-semibold text-white rounded transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
              style={{ backgroundColor: "#1a5fa6" }}
            >
              {allConfirmed
                ? `Proceed with All ${totalCount} Categories (${totalConfirmedGtins.toLocaleString()} GTINs)`
                : `Proceed with ${confirmedCount} Confirmed Categor${confirmedCount === 1 ? "y" : "ies"} (${totalConfirmedGtins.toLocaleString()} GTINs)`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
