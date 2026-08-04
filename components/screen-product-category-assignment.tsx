"use client"

import { useMemo, useState } from "react"
import { Sparkles, CheckCircle2, ChevronDown, Info, AlertTriangle, ArrowRight, HelpCircle } from "lucide-react"
import type { CategoryOptionGroup, CategoryAssignment } from "@/components/screen-individual-assignment"
import { suggestCategory, LOW_CONFIDENCE_THRESHOLD, type CategorySuggestion } from "@/lib/category-suggestion"

// AI category assignment for the products in an enrichment scope.
//
// Assigning a category is part of enrichment, so AI proposes one for every
// product and the supplier confirms or overrides — the same review-AI's-work
// pattern used everywhere else. Picking from a list by hand is the fallback for
// what AI couldn't classify, not the default path.

export interface CategorizableProduct {
  id: string
  description: string
  gtins: number
  /** Products that already have a category are shown read-only, not run through AI assignment. */
  category?: { name: string; brickCode: string } | null
}

interface RowState {
  product: CategorizableProduct
  suggestion: CategorySuggestion | null
  /** Set once the user confirms AI's proposal or picks their own. */
  chosen: { name: string; brickCode: string } | null
  /** True when the value came from the picker rather than from AI. */
  overridden: boolean
}

interface ScreenProductCategoryAssignmentProps {
  code: string
  codeDescription: string
  products: CategorizableProduct[]
  categoryOptions: CategoryOptionGroup[]
  /** Restricts AI to the categories this selection code actually covers. */
  allowedBrickCodes?: string[]
  onBack: () => void
  onConfirm: (assignments: CategoryAssignment[]) => void
  onSaveAndExit?: (assignments: CategoryAssignment[]) => void
}

export function ScreenProductCategoryAssignment({
  code,
  codeDescription,
  products,
  categoryOptions,
  allowedBrickCodes,
  onBack,
  onConfirm,
  onSaveAndExit,
}: ScreenProductCategoryAssignmentProps) {
  // Already-categorized products keep what they have — only uncategorized ones
  // go through AI suggestion. Both are shown, so a mixed selection is never silently
  // narrowed down to just the products that needed AI's help.
  const alreadyCategorized = products.filter((p) => p.category)
  const toAssign = products.filter((p) => !p.category)

  const initial = useMemo<RowState[]>(
    () =>
      toAssign.map((product) => ({
        product,
        suggestion: suggestCategory(product.description, allowedBrickCodes),
        chosen: null,
        overridden: false,
      })),
    [toAssign, allowedBrickCodes]
  )

  const [rows, setRows] = useState<RowState[]>(initial)
  const [openPicker, setOpenPicker] = useState<string | null>(null)

  const confident = rows.filter((r) => r.suggestion && r.suggestion.confidence >= LOW_CONFIDENCE_THRESHOLD)
  const uncertain = rows.filter((r) => r.suggestion && r.suggestion.confidence < LOW_CONFIDENCE_THRESHOLD)
  const unclassified = rows.filter((r) => !r.suggestion)
  const resolved = rows.filter((r) => r.chosen !== null)
  const allResolved = resolved.length === rows.length && rows.length > 0
  const pendingConfident = confident.filter((r) => r.chosen === null)

  const assignments: CategoryAssignment[] = rows
    .filter((r) => r.chosen !== null)
    .map((r) => ({ id: r.product.id, category: r.chosen!.name, brickCode: r.chosen!.brickCode }))

  const setChosen = (id: string, chosen: RowState["chosen"], overridden: boolean) => {
    setRows((prev) => prev.map((r) => (r.product.id === id ? { ...r, chosen, overridden } : r)))
    setOpenPicker(null)
  }

  const acceptSuggestion = (row: RowState) => {
    if (!row.suggestion) return
    setChosen(row.product.id, { name: row.suggestion.name, brickCode: row.suggestion.brickCode }, false)
  }

  const acceptAllConfident = () => {
    setRows((prev) =>
      prev.map((r) =>
        r.chosen === null && r.suggestion && r.suggestion.confidence >= LOW_CONFIDENCE_THRESHOLD
          ? { ...r, chosen: { name: r.suggestion.name, brickCode: r.suggestion.brickCode }, overridden: false }
          : r
      )
    )
  }

  const confidenceColor = (c: number) => (c >= 90 ? "#2e7d32" : c >= LOW_CONFIDENCE_THRESHOLD ? "#f59e0b" : "#dc2626")

  return (
    <div className="space-y-5">
      {/* Scope banner */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded border text-[12px]"
        style={{ backgroundColor: "#eff6ff", borderColor: "#bfdbfe", color: "#1e40af" }}
        role="status"
      >
        <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>
          Enriching {products.length} {products.length === 1 ? "product" : "products"} in Selection Code{" "}
          <strong>
            {code} {codeDescription}
          </strong>{" "}
          &middot; step 1 of 2
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[16px] font-semibold text-[#1a1f2e]">
            {unclassified.length === rows.length
              ? `Pick a category for ${rows.length} ${rows.length === 1 ? "product" : "products"}`
              : unclassified.length === 0
                ? `AI suggested a category for ${rows.length === 1 ? "this product" : `all ${rows.length} products`}`
                : `AI suggested a category for ${confident.length + uncertain.length} of ${rows.length} products`}
          </h2>
          <p className="text-[13px] text-[#6b7280] mt-1 max-w-2xl">
            Category assignment is part of enrichment — AI proposes one from the product description and you confirm.
            Change any suggestion, or pick one yourself where AI couldn&apos;t tell. Attribute enrichment follows.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[13px] font-medium text-[#374151]">
            {resolved.length} of {rows.length} confirmed
          </p>
        </div>
      </div>

      {/* Already-categorized products in this selection — kept as-is, shown for transparency */}
      {alreadyCategorized.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[13px] font-semibold text-[#374151]">
            Already categorized — kept as they are ({alreadyCategorized.length})
          </h3>
          <div className="grid gap-2">
            {alreadyCategorized.map((product) => (
              <div
                key={product.id}
                className="rounded border border-[#d1d5db] bg-[#f9fafb] p-3 flex items-center justify-between gap-4 flex-wrap"
              >
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="font-mono text-[13px] text-[#1a5fa6]">{product.id}</span>
                  <span className="text-[13px] text-[#374151]">{product.description}</span>
                  <span className="text-[12px] text-[#9ca3af]">({product.gtins} GTINs)</span>
                </div>
                <span className="inline-flex items-center gap-1.5 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2e7d32]" aria-hidden="true" />
                  <span className="text-[13px] font-medium text-[#166534]">{product.category!.name}</span>
                  <span className="text-[10px] font-mono text-[#9ca3af]">{product.category!.brickCode}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI-suggested categories — one card per product, styled like the Selection Code
          001 category-confirmation cards (border, confidence bar, Confirm/Undo actions). */}
      {confident.length > 0 && (
        <div className="grid gap-3">
          {confident.map((row) => (
            <ProductCategoryCard
              key={row.product.id}
              row={row}
              openPicker={openPicker}
              categoryOptions={categoryOptions}
              confidenceColor={confidenceColor}
              onAcceptSuggestion={acceptSuggestion}
              onOpenPicker={setOpenPicker}
              onSetChosen={setChosen}
            />
          ))}
        </div>
      )}

      {(uncertain.length > 0 || unclassified.length > 0) && (
        <div className="rounded-lg border-2 border-dashed border-[#f59e0b] bg-[#fffbeb] p-4 space-y-4">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#92400e]" aria-hidden="true" />
            <div>
              <h3 className="text-[14px] font-semibold text-[#1a1f2e]">
                Help us confirm the product type — {uncertain.length + unclassified.length}{" "}
                {uncertain.length + unclassified.length === 1 ? "product" : "products"} remaining
              </h3>
              <p className="text-[12px] text-[#6b7280] mt-1">
                We grouped these by our best guess, or couldn&apos;t classify them at all. Confirm if correct, or choose
                a category yourself.
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            {[...uncertain, ...unclassified].map((row) => (
              <ProductCategoryCard
                key={row.product.id}
                row={row}
                openPicker={openPicker}
                categoryOptions={categoryOptions}
                confidenceColor={confidenceColor}
                onAcceptSuggestion={acceptSuggestion}
                onOpenPicker={setOpenPicker}
                onSetChosen={setChosen}
                lowConfidence
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#d1d5db] flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3 py-1.5 text-[13px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
          >
            &#8592; Back
          </button>
          {onSaveAndExit && (
            <button
              onClick={() => onSaveAndExit(assignments)}
              disabled={assignments.length === 0}
              className="px-3 py-1.5 text-[13px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save &amp; Return to List
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          {pendingConfident.length > 0 && (
            <button
              onClick={acceptAllConfident}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold border-2 rounded transition-colors hover:bg-[#f0f2f5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
              style={{ borderColor: "#1a1f5e", color: "#1a1f5e" }}
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              Confirm {pendingConfident.length} Confident{" "}
              {pendingConfident.length === 1 ? "Suggestion" : "Suggestions"}
            </button>
          )}
          <div className="text-right">
            <button
              onClick={() => onConfirm(assignments)}
              disabled={!allResolved}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white rounded transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
              style={{ backgroundColor: "#1a5fa6" }}
            >
              Continue to Attribute Enrichment
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            {!allResolved && (
              <p className="text-[11px] text-[#6b7280] mt-1">
                {rows.length - resolved.length} still to confirm.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// One product's category card — styled to match ScreenBrickConfirmation's category
// cards (border/padding, confidence bar with the same color thresholds, Confirm/Undo
// button treatment) so the product-flow's category step reads consistently with
// Selection Code 001's, despite proposing categories per-product instead of per-group.
interface ProductCategoryCardProps {
  row: RowState
  openPicker: string | null
  categoryOptions: CategoryOptionGroup[]
  confidenceColor: (c: number) => string
  onAcceptSuggestion: (row: RowState) => void
  onOpenPicker: (id: string | null) => void
  onSetChosen: (id: string, chosen: RowState["chosen"], overridden: boolean) => void
  lowConfidence?: boolean
}

function ProductCategoryCard({
  row,
  openPicker,
  categoryOptions,
  confidenceColor,
  onAcceptSuggestion,
  onOpenPicker,
  onSetChosen,
  lowConfidence = false,
}: ProductCategoryCardProps) {
  const { product, suggestion, chosen, overridden } = row
  const isPickerOpen = openPicker === product.id

  return (
    <div
      className={`rounded border p-4 bg-white transition-colors ${
        chosen ? "border-[#2e7d32] bg-[#f0fdf4]" : lowConfidence ? "border-[#fcd34d]" : "border-[#d1d5db]"
      }`}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[14px] font-semibold text-[#1a1f2e]">{product.id}</h3>
            <span className="text-[13px] text-[#6b7280]">{product.description}</span>
            <span className="text-[12px] text-[#9ca3af]">({product.gtins} GTINs)</span>
            {chosen && (
              <span className="flex items-center gap-1 text-[12px] text-[#2e7d32] font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                Confirmed
              </span>
            )}
          </div>

          {chosen ? (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[13px] font-medium text-[#166534]">{chosen.name}</span>
              <span className="text-[10px] font-mono text-[#9ca3af]">{chosen.brickCode}</span>
              {overridden && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#e5e7eb] text-[#6b7280]">You changed this</span>
              )}
            </div>
          ) : suggestion ? (
            <>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Sparkles className="w-3.5 h-3.5 text-[#1a5fa6]" aria-hidden="true" />
                <span className="text-[13px] font-medium text-[#1a1f2e]">{suggestion.name}</span>
                <span className="text-[10px] font-mono text-[#9ca3af]">{suggestion.brickCode}</span>
                {lowConfidence && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#fed7aa] text-[#b45309] font-medium">
                    Needs review
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[12px] text-[#6b7280] w-20">Confidence:</span>
                <div className="flex-1 max-w-xs h-2 rounded-full bg-[#e8eaed] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${suggestion.confidence}%`, backgroundColor: confidenceColor(suggestion.confidence) }}
                  />
                </div>
                <span className="text-[12px] font-medium text-[#374151] w-10">{suggestion.confidence}%</span>
              </div>
              <p className="text-[11px] text-[#6b7280] mt-1.5 italic">{suggestion.reasoning}</p>
            </>
          ) : (
            <div className="flex items-center gap-1.5 mt-2">
              <AlertTriangle className="w-3.5 h-3.5 text-[#dc2626]" aria-hidden="true" />
              <span className="text-[12px] text-[#dc2626] font-medium">Could not classify</span>
            </div>
          )}
        </div>

        <div className="relative flex items-center gap-2 shrink-0 flex-wrap">
          {chosen ? (
            <button
              onClick={() => onSetChosen(product.id, null, false)}
              className="px-2.5 py-1.5 text-[12px] font-medium border border-[#d1d5db] rounded bg-white text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#374151] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6b7280]"
              title="Undo category confirmation"
            >
              Undo Confirm
            </button>
          ) : (
            <>
              {suggestion && (
                <button
                  onClick={() => onAcceptSuggestion(row)}
                  className="px-3 py-1.5 text-[12px] font-semibold text-white rounded transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
                  style={{ backgroundColor: "#1a5fa6" }}
                >
                  Confirm Category
                </button>
              )}
              <button
                onClick={() => onOpenPicker(isPickerOpen ? null : product.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium border border-[#1a5fa6] text-[#1a5fa6] rounded bg-white hover:bg-[#eff6ff] transition-colors"
              >
                {suggestion ? "Change" : "Choose Category"}
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </>
          )}

          {isPickerOpen && (
            <div className="absolute z-50 top-full right-0 mt-1 w-64 max-h-60 overflow-y-auto bg-white border border-[#d1d5db] rounded shadow-lg">
              {categoryOptions.map((group) => (
                <div key={group.parent}>
                  <div className="px-2 py-1.5 text-[10px] font-bold text-[#6b7280] uppercase tracking-wide bg-[#f9fafb]">
                    {group.parent}
                  </div>
                  {group.children.map((cat) => (
                    <button
                      key={cat.brickCode}
                      onClick={() => onSetChosen(product.id, { name: cat.name, brickCode: cat.brickCode }, true)}
                      className="w-full px-3 py-1.5 text-left text-[12px] text-[#374151] hover:bg-[#eff6ff] hover:text-[#1a5fa6]"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
