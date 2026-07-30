"use client"

import { useMemo, useState } from "react"
import { Sparkles, CheckCircle2, ChevronDown, Info, AlertTriangle, ArrowRight } from "lucide-react"
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
  const initial = useMemo<RowState[]>(
    () =>
      products.map((product) => ({
        product,
        suggestion: suggestCategory(product.description, allowedBrickCodes),
        chosen: null,
        overridden: false,
      })),
    [products, allowedBrickCodes]
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
          Enriching {rows.length} {rows.length === 1 ? "product" : "products"} in Selection Code{" "}
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

      {(uncertain.length > 0 || unclassified.length > 0) && (
        <div className="flex items-start gap-2 px-3 py-2 rounded border border-[#fcd34d] bg-[#fffbeb] text-[12px] text-[#92400e]">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            {uncertain.length > 0 && (
              <>
                {uncertain.length} {uncertain.length === 1 ? "suggestion needs" : "suggestions need"} a closer look
                {unclassified.length > 0 ? " and " : "."}
              </>
            )}
            {unclassified.length > 0 && (
              <>
                {unclassified.length} {unclassified.length === 1 ? "product" : "products"} couldn&apos;t be classified —
                choose a category for {unclassified.length === 1 ? "it" : "them"} below.
              </>
            )}
          </span>
        </div>
      )}

      {/* Products */}
      <div className="bg-white border border-[#d1d5db] rounded overflow-visible">
        <table className="w-full text-[13px]">
          <thead className="bg-[#f7f8fa] border-b border-[#d1d5db]">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-[#374151]">Product</th>
              <th className="px-3 py-2 text-left font-semibold text-[#374151]">Description</th>
              <th className="px-3 py-2 text-right font-semibold text-[#374151] w-16">GTINs</th>
              <th className="px-3 py-2 text-left font-semibold text-[#374151] w-[30%]">AI Suggested Category</th>
              <th className="px-3 py-2 text-left font-semibold text-[#374151] w-56">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { product, suggestion, chosen, overridden } = row
              const isPickerOpen = openPicker === product.id
              const isLow = suggestion !== null && suggestion.confidence < LOW_CONFIDENCE_THRESHOLD

              return (
                <tr
                  key={product.id}
                  className={`border-b border-[#e5e7eb] last:border-b-0 ${chosen ? "bg-[#f0fdf4]" : isLow || !suggestion ? "bg-[#fffbeb]" : "bg-white"}`}
                >
                  <td className="px-3 py-2.5 font-mono text-[#1a5fa6]">{product.id}</td>
                  <td className="px-3 py-2.5 text-[#374151]">{product.description}</td>
                  <td className="px-3 py-2.5 text-right text-[#6b7280]">{product.gtins}</td>

                  <td className="px-3 py-2.5">
                    {chosen ? (
                      <span className="inline-flex items-center gap-1.5 flex-wrap">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2e7d32]" aria-hidden="true" />
                        <span className="text-[#166534] font-medium">{chosen.name}</span>
                        <span className="text-[10px] font-mono text-[#9ca3af]">{chosen.brickCode}</span>
                        {overridden && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#e5e7eb] text-[#6b7280]">
                            You changed this
                          </span>
                        )}
                      </span>
                    ) : suggestion ? (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1.5 flex-wrap">
                          <Sparkles className="w-3.5 h-3.5 text-[#1a5fa6]" aria-hidden="true" />
                          <span className="font-medium text-[#1a1f2e]">{suggestion.name}</span>
                          <span className="text-[10px] font-mono text-[#9ca3af]">{suggestion.brickCode}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-[#e5e7eb] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${suggestion.confidence}%`,
                                backgroundColor: confidenceColor(suggestion.confidence),
                              }}
                            />
                          </div>
                          <span className="text-[11px]" style={{ color: confidenceColor(suggestion.confidence) }}>
                            {suggestion.confidence}%
                          </span>
                          {isLow && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#fed7aa] text-[#b45309] font-medium">
                              Needs review
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#6b7280] italic">{suggestion.reasoning}</p>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#dc2626]" aria-hidden="true" />
                        <span className="text-[12px] text-[#dc2626] font-medium">Could not classify</span>
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-2.5 relative">
                    <div className="flex items-center gap-2 flex-wrap">
                      {chosen ? (
                        <button
                          onClick={() => setChosen(product.id, null, false)}
                          className="px-2.5 py-1 text-[11px] font-medium border border-[#d1d5db] rounded bg-white text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#374151] transition-colors"
                        >
                          Undo
                        </button>
                      ) : (
                        <>
                          {suggestion && (
                            <button
                              onClick={() => acceptSuggestion(row)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-white rounded bg-[#2e7d32] hover:bg-[#1b5e20] transition-colors"
                            >
                              Confirm
                            </button>
                          )}
                          <button
                            onClick={() => setOpenPicker(isPickerOpen ? null : product.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-[#1a5fa6] text-[#1a5fa6] rounded bg-white hover:bg-[#eff6ff] transition-colors"
                          >
                            {suggestion ? "Change" : "Choose category"}
                            <ChevronDown className="w-3 h-3" aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>

                    {isPickerOpen && (
                      <div className="absolute z-50 top-full right-3 mt-1 w-64 max-h-60 overflow-y-auto bg-white border border-[#d1d5db] rounded shadow-lg">
                        {categoryOptions.map((group) => (
                          <div key={group.parent}>
                            <div className="px-2 py-1.5 text-[10px] font-bold text-[#6b7280] uppercase tracking-wide bg-[#f9fafb]">
                              {group.parent}
                            </div>
                            {group.children.map((cat) => (
                              <button
                                key={cat.brickCode}
                                onClick={() => setChosen(product.id, { name: cat.name, brickCode: cat.brickCode }, true)}
                                className="w-full px-3 py-1.5 text-left text-[12px] text-[#374151] hover:bg-[#eff6ff] hover:text-[#1a5fa6]"
                              >
                                {cat.name}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

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
