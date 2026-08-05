"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, AlertCircle, Info, Pencil, Plus, X, Sparkles } from "lucide-react"

import { AttributeValueCombobox } from "@/components/attribute-value-combobox"
import { getAttributesForBrick, type AttributeDef } from "@/lib/category-attributes"
import { getCodeListValues } from "@/lib/gs1-code-lists"
import { summarizeEnrichment, unenrichedAttributesFor } from "@/lib/enrichment-results"
import type {
  EnrichedAttributeValue,
  ProductEnrichmentResult,
  UnenrichedAttribute,
  UnenrichedReason,
} from "@/lib/enrichment-results"

// What enrichment actually wrote for one product, and what it didn't.
//
// The review screens are about deciding; this screen is about seeing the
// outcome. It answers two questions the prototype previously couldn't:
// "what values does this product now carry?" and "what is still empty, and
// why?" — then offers a form for the attributes the AI never proposed.

const REASON_COPY: Record<UnenrichedReason, { label: string; detail: string; tone: "grey" | "amber" }> = {
  "no-suggestion": {
    label: "AI had no suggestion",
    detail: "The AI didn't put a value forward for this attribute.",
    tone: "grey",
  },
  rejected: {
    label: "You rejected AI's suggestion",
    detail: "The AI proposed a value and you turned it down.",
    tone: "amber",
  },
  pending: {
    label: "Left pending",
    detail: "The AI proposed a value but it was never confirmed or rejected.",
    tone: "amber",
  },
}

interface ScreenProductEnrichmentDetailProps {
  code: string
  codeDescription: string
  product: { id: string; description: string; category: { name: string; brickCode: string } | null }
  result?: ProductEnrichmentResult
  /** Where "back" goes — the caller decides which list the user came from. */
  onBack: () => void
  backLabel: string
  onBackToSelectionCodes: () => void
  /** Persist values typed into the add-missing-attributes form. */
  onAddValues: (values: EnrichedAttributeValue[]) => void
}

export function ScreenProductEnrichmentDetail({
  code,
  codeDescription,
  product,
  result,
  onBack,
  backLabel,
  onBackToSelectionCodes,
  onAddValues,
}: ScreenProductEnrichmentDetailProps) {
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})

  const brickCode = result?.brickCode ?? product.category?.brickCode
  // The category's full attribute set is the definition of what *could* be
  // enriched, so "not enriched" is computed rather than guessed.
  const categoryAttributes: AttributeDef[] = useMemo(
    () => (brickCode ? getAttributesForBrick(brickCode) : []),
    [brickCode]
  )
  const attrDefByName = useMemo(
    () => new Map(categoryAttributes.map((a) => [a.name, a])),
    [categoryAttributes]
  )

  const values = result?.values ?? []

  // Anything in the category's attribute set with no value, however it got there.
  // Counted by the same helper the Product List uses, so the "7/16" on the row
  // the user clicked is the "7/16" they land on.
  const attributeNames = useMemo(() => categoryAttributes.map((a) => a.name), [categoryAttributes])
  const unenriched: UnenrichedAttribute[] = useMemo(
    () => unenrichedAttributesFor(result, attributeNames),
    [result, attributeNames]
  )
  const { total: totalAttributes, coverage } = summarizeEnrichment(result, attributeNames)

  const handleSaveForm = () => {
    const added: EnrichedAttributeValue[] = Object.entries(draft)
      .filter(([, v]) => v.trim().length > 0)
      .map(([attribute, value]) => ({
        attribute,
        value: value.trim(),
        codeListValue: getCodeListValues(attrDefByName.get(attribute)?.codeList).find(
          (o) => o.label === value.trim()
        )?.code,
        source: "user-edited",
        confidence: 100,
      }))
    if (added.length > 0) onAddValues(added)
    setDraft({})
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="text-[13px]" aria-label="Breadcrumb">
        <button onClick={onBackToSelectionCodes} className="text-[#1a5fa6] font-medium hover:underline focus:outline-none">
          Selection Code List
        </button>
        <span className="mx-1.5 text-[#9ca3af]">&gt;</span>
        <button onClick={onBack} className="text-[#1a5fa6] font-medium hover:underline focus:outline-none">
          {backLabel}
        </button>
        <span className="mx-1.5 text-[#9ca3af]">&gt;</span>
        <span className="font-semibold text-[#1a1f2e]">Enrichment Detail</span>
      </nav>

      {/* Header info block */}
      <div className="bg-[#f0f1f3] border border-[#d1d5db] rounded px-4 py-3">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-1 text-[13px] max-w-xl">
            <dt className="text-[#374151]">Selection Code</dt>
            <dd className="font-semibold text-[#1a1f2e]">
              {code} <span className="font-normal text-[#6b7280]">{codeDescription}</span>
            </dd>
            <dt className="text-[#374151]">Product</dt>
            <dd className="font-semibold text-[#1a1f2e]">
              <span className="font-mono">{product.id}</span>{" "}
              <span className="font-normal text-[#374151]">{product.description}</span>
            </dd>
            <dt className="text-[#374151]">Category</dt>
            <dd className="font-semibold text-[#1a1f2e]">
              {product.category ? (
                <>
                  {product.category.name}{" "}
                  <span className="font-mono font-normal text-[11px] text-[#6b7280]">
                    (GPC {product.category.brickCode})
                  </span>
                </>
              ) : (
                <span className="font-normal text-[#9ca3af] italic">Not assigned</span>
              )}
            </dd>
          </dl>

          <div className="text-right">
            <div className="text-[22px] font-semibold text-[#1a1f2e]">
              {values.length}
              <span className="text-[14px] font-normal text-[#6b7280]">/{totalAttributes}</span>
            </div>
            <p className="text-[11px] text-[#6b7280]">attributes enriched ({coverage}%)</p>
          </div>
        </div>
      </div>

      {/* Nothing has been enriched yet */}
      {!result && (
        <div
          className="flex items-start gap-2 px-4 py-3 rounded border text-[13px]"
          style={{ backgroundColor: "#eff6ff", borderColor: "#bfdbfe", color: "#1e40af" }}
          role="status"
        >
          <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            This product hasn&apos;t been through an enrichment run yet, so nothing has been written.
            Everything its category asks for is listed below as not enriched.
          </span>
        </div>
      )}

      {/* ── Enriched ─────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#d1d5db] rounded overflow-hidden">
        <header className="flex items-center gap-2 px-4 py-2.5 bg-[#f7f8fa] border-b border-[#d1d5db]">
          <CheckCircle2 className="w-4 h-4 text-[#16a34a]" aria-hidden="true" />
          <h2 className="text-[13px] font-semibold text-[#1a1f2e]">Enriched ({values.length})</h2>
          <span className="text-[12px] text-[#6b7280]">— values now carried by this product</span>
        </header>

        {values.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-[#9ca3af] italic text-center">No attributes enriched yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-white border-b border-[#e5e7eb]">
                <tr className="text-[11px] uppercase tracking-wide text-[#6b7280]">
                  <th className="px-4 py-2 text-left font-semibold">Attribute</th>
                  <th className="px-4 py-2 text-left font-semibold">Value</th>
                  <th className="px-4 py-2 text-left font-semibold">GS1 Code</th>
                  <th className="px-4 py-2 text-left font-semibold">Source</th>
                  <th className="px-4 py-2 text-right font-semibold">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {values.map((v) => (
                  <tr key={v.attribute} className="border-b border-[#e5e7eb] last:border-0 hover:bg-[#f9fafb]">
                    <td className="px-4 py-2 text-[#374151]">{v.attribute}</td>
                    <td className="px-4 py-2 font-medium text-[#1a1f2e]">{v.value}</td>
                    <td className="px-4 py-2 font-mono text-[11px] text-[#6b7280]">
                      {v.codeListValue ?? <span className="italic font-sans text-[#9ca3af]">free text</span>}
                    </td>
                    <td className="px-4 py-2">
                      {v.source === "user-edited" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded bg-[#dbeafe] text-[#1e40af]">
                          <Pencil className="w-2.5 h-2.5" aria-hidden="true" />
                          You edited
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded bg-[#dcfce7] text-[#166534]">
                          <Sparkles className="w-2.5 h-2.5" aria-hidden="true" />
                          AI confirmed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-[#6b7280]">{v.confidence}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Not enriched ─────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#d1d5db] rounded overflow-hidden">
        <header className="flex items-center gap-2 px-4 py-2.5 bg-[#f7f8fa] border-b border-[#d1d5db] flex-wrap">
          <AlertCircle className="w-4 h-4 text-[#d97706]" aria-hidden="true" />
          <h2 className="text-[13px] font-semibold text-[#1a1f2e]">Not enriched ({unenriched.length})</h2>
          <span className="text-[12px] text-[#6b7280]">
            — asked for by {product.category?.name ?? "this category"}, still empty
          </span>
          {unenriched.length > 0 && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white rounded transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
              style={{ backgroundColor: "#1a5fa6" }}
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Add missing attributes
            </button>
          )}
        </header>

        {unenriched.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-[#9ca3af] italic text-center">
            Every attribute this category asks for has a value.
          </p>
        ) : showForm ? (
          /* In-app form — GS1 dropdowns where a code list exists, free text otherwise */
          <div className="px-4 py-3 space-y-3">
            <p className="text-[12px] text-[#6b7280]">
              Values you enter are saved against this product. Attributes with a GS1 code list offer their
              values as a dropdown; the rest accept free text.
            </p>
            <div className="space-y-2">
              {unenriched.map((u) => {
                const def = attrDefByName.get(u.attribute)
                return (
                  <div key={u.attribute} className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] gap-3 items-start">
                    <label className="text-[13px] text-[#374151] pt-1.5" htmlFor={`add-${u.attribute}`}>
                      {u.attribute}
                      <span className="block text-[11px] text-[#9ca3af]">{REASON_COPY[u.reason].label}</span>
                    </label>
                    <div id={`add-${u.attribute}`}>
                      <AttributeValueCombobox
                        attributeName={u.attribute}
                        codeList={def?.codeList}
                        value={draft[u.attribute] ?? ""}
                        onChange={(v) => setDraft((d) => ({ ...d, [u.attribute]: v }))}
                        onSave={handleSaveForm}
                        onCancel={() => setShowForm(false)}
                        autoFocus={false}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSaveForm}
                className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-semibold text-white rounded transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#1a5fa6" }}
              >
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                Save {Object.values(draft).filter((v) => v.trim()).length || ""} values
              </button>
              <button
                onClick={() => { setDraft({}); setShowForm(false) }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-[#6b7280] hover:text-[#374151] focus:outline-none"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-white border-b border-[#e5e7eb]">
                <tr className="text-[11px] uppercase tracking-wide text-[#6b7280]">
                  <th className="px-4 py-2 text-left font-semibold">Attribute</th>
                  <th className="px-4 py-2 text-left font-semibold">Why it&apos;s empty</th>
                  <th className="px-4 py-2 text-left font-semibold">AI had proposed</th>
                </tr>
              </thead>
              <tbody>
                {unenriched.map((u) => {
                  const copy = REASON_COPY[u.reason]
                  return (
                    <tr key={u.attribute} className="border-b border-[#e5e7eb] last:border-0 hover:bg-[#f9fafb]">
                      <td className="px-4 py-2 text-[#374151]">{u.attribute}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded ${
                            copy.tone === "amber" ? "bg-[#fef3c7] text-[#92400e]" : "bg-[#f3f4f6] text-[#6b7280]"
                          }`}
                          title={copy.detail}
                        >
                          {copy.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-[#6b7280]">
                        {u.aiSuggestion ? (
                          <>
                            <span className="line-through">{u.aiSuggestion}</span>
                            {typeof u.confidence === "number" && (
                              <span className="ml-2 text-[11px] tabular-nums">{u.confidence}%</span>
                            )}
                          </>
                        ) : (
                          <span className="italic text-[#9ca3af]">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex items-center">
        <button onClick={onBack} className="text-[13px] text-[#1a5fa6] hover:underline focus:outline-none">
          ← {backLabel}
        </button>
      </div>
    </div>
  )
}
