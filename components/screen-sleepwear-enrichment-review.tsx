"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { ChevronRight, ChevronDown, Check, X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { SLEEPWEAR_PRODUCTS_BY_CATEGORY } from "@/lib/sleepwear-catalog"
import {
  getAttributesForBricks,
  getReasoningFor,
  getSuggestionsFor,
  type AttributeDef,
} from "@/lib/category-attributes"
import { getCodeListValues } from "@/lib/gs1-code-lists"

// Attribute enrichment review for Selection Code 002 (Sleepwear).
//
// The attribute set is resolved from the GS1 bricks in scope, so a robe and a
// pair of sleep shorts are asked different questions. Values come from the real
// GS1 code lists.
//
// Differences from the footwear review beyond the data itself:
//   · one attribute table instead of two parallel ones, so display metadata and
//     suggestions can't disagree
//   · the progress denominator follows the attribute list rather than a fixed
//     module constant
//   · when the caller passes the products in scope, review rows carry the real
//     product and GTIN identities the user just drilled into

// ── Inline value editor ───────────────────────────────────────────────────────

function AttributeValueCombobox({
  attributeName,
  codeList,
  value,
  onChange,
  onSave,
  onCancel,
}: {
  attributeName: string
  codeList?: string
  value: string
  onChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  const options = getCodeListValues(codeList)
  const hasCodeList = options.length > 0
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const filtered = useMemo(() => {
    if (!query.trim()) return options
    const q = query.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.code.toLowerCase().includes(q))
  }, [options, query])

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center border border-[#1a5fa6] rounded overflow-hidden bg-white">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            onChange(e.target.value)
            if (hasCodeList) setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave()
            if (e.key === "Escape") onCancel()
          }}
          onFocus={() => hasCodeList && setOpen(true)}
          className="flex-1 px-2 py-1.5 text-[12px] outline-none bg-transparent"
          autoFocus
          placeholder={hasCodeList ? "Type or select from list…" : "Enter value…"}
          aria-label={`Edit value for ${attributeName}`}
          aria-expanded={open}
          aria-haspopup={hasCodeList ? "listbox" : undefined}
        />
        {hasCodeList && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setOpen((o) => !o)}
            className="px-1.5 text-[#6b7280] hover:text-[#1a5fa6] transition-colors"
            aria-label="Toggle dropdown"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        )}
      </div>

      {open && hasCodeList && filtered.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 left-0 top-full mt-1 w-full max-h-48 overflow-y-auto bg-white border border-[#d1d5db] rounded shadow-lg text-[12px]"
        >
          {filtered.map((opt) => (
            <li
              key={opt.code}
              role="option"
              aria-selected={value === opt.label}
              onMouseDown={(e) => {
                e.preventDefault()
                setQuery(opt.label)
                onChange(opt.label)
                setOpen(false)
              }}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[#eff6ff] ${
                value === opt.label ? "bg-[#dbeafe] font-semibold" : ""
              }`}
            >
              <span className="text-[#1a1f2e]">{opt.label}</span>
              <span className="text-[10px] font-mono text-[#6b7280] ml-2">{opt.code}</span>
            </li>
          ))}
        </ul>
      )}
      {open && hasCodeList && filtered.length === 0 && (
        <div className="absolute z-50 left-0 top-full mt-1 w-full bg-white border border-[#d1d5db] rounded shadow-lg px-3 py-2 text-[12px] text-[#9ca3af] italic">
          No matching options — value will be saved as free text
        </div>
      )}
    </div>
  )
}

// ── Data generation ───────────────────────────────────────────────────────────

interface ProductAttribute {
  gtin: string
  productDescription: string
  aiSuggestion: string
  aiReasoning: string
  confidence: number
  status: "pending" | "confirmed" | "edited" | "rejected" | "batch-selected"
  userValue?: string
}

interface AttributeGroup {
  attributeName: string
  gtins: ProductAttribute[]
}

export interface ScopeProduct {
  id: string
  description: string
  gtins: number
}

// Deterministic GTIN so a product keeps the same identifier across re-renders.
function gtinForProduct(seed: string, index: number): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  const body = String((hash + index * 7919) % 1000000).padStart(6, "0")
  return `08885464${body}`.slice(0, 12)
}

// Sample sleepwear products used when the caller hasn't scoped the run to
// specific products (e.g. enriching a whole selection code).
const SAMPLE_POOL = Object.values(SLEEPWEAR_PRODUCTS_BY_CATEGORY)
  .flat()
  .map((p) => p.product)

function buildProductPool(count: number, scopeProducts?: ScopeProduct[]): { gtin: string; productDesc: string }[] {
  if (scopeProducts && scopeProducts.length > 0) {
    // Real identities from the drill-down — "S22011 — Cotton pajama set, long sleeve"
    return scopeProducts.map((p, i) => ({
      gtin: gtinForProduct(p.id, i),
      productDesc: `${p.id} — ${p.description}`,
    }))
  }
  return Array.from({ length: count }, (_, i) => {
    const base = SAMPLE_POOL[i % SAMPLE_POOL.length]
    const pass = Math.floor(i / SAMPLE_POOL.length)
    const productDesc = pass === 0 ? base : `${base} (${pass + 1})`
    return { gtin: gtinForProduct(productDesc, i), productDesc }
  })
}

function generateAttributeData(
  productCount: number,
  attributes: AttributeDef[],
  scopeProducts?: ScopeProduct[]
): AttributeGroup[] {
  const allProducts = buildProductPool(productCount, scopeProducts)

  return attributes.map((attr) => {
    const suggestions = getSuggestionsFor(attr)

    // Brand and origin apply to everything; other attributes cover a subset.
    let applicableCount = allProducts.length
    if (attr.name !== "Brand Name" && attr.name !== "Country of Origin") {
      applicableCount = Math.max(1, Math.floor(allProducts.length * (0.6 + Math.random() * 0.3)))
    }

    const shuffled = [...allProducts].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, applicableCount)

    // Only the flagged attributes carry sub-70 rows; everything else is auto-validated.
    const lowConfidenceSlots = Math.min(selected.length, attr.lowConfidenceSlots ?? 0)

    const gtins: ProductAttribute[] = selected.map((p, index) => {
      const hash = p.gtin.split("").reduce((a, c) => a + c.charCodeAt(0), 0)

      // The first low-confidence slot always lands below 60 so its suggestion is
      // suppressed; the rest sit in 61–68 and show with a flag.
      const isLowConfidence = index < lowConfidenceSlots
      const confidence = isLowConfidence
        ? index === 0
          ? Math.floor(40 + Math.random() * 20)
          : Math.floor(61 + Math.random() * 8)
        : Math.floor(82 + Math.random() * 18)

      return {
        gtin: p.gtin,
        productDescription: p.productDesc,
        aiSuggestion: suggestions[hash % suggestions.length],
        aiReasoning: getReasoningFor(attr.name, p.productDesc),
        confidence,
        status: "pending" as const,
      }
    })

    return { attributeName: attr.name, gtins }
  })
}

// ── Screen ────────────────────────────────────────────────────────────────────

interface ScreenSleepwearEnrichmentReviewProps {
  selectedCodes: string[]
  codesMetadata: Record<string, { gtins: number; products?: number; description: string }>
  /** Labels the subset being enriched, e.g. "Product S22011 — Cotton pajama set". */
  scopeLabel?: string
  /** Real products in scope; when present, review rows use their identities. */
  scopeProducts?: ScopeProduct[]
  /** GS1 bricks in scope — decides which attributes are asked for. */
  brickCodes?: string[]
  /** e.g. "Step 2 of 2" — rendered beside the attributes-reviewed chip. */
  stepLabel?: string
  onBack: () => void
  onComplete: (confirmedPercentage: number, codes: string[]) => void
}

export function ScreenSleepwearEnrichmentReview({
  selectedCodes,
  codesMetadata,
  scopeLabel,
  scopeProducts,
  brickCodes,
  stepLabel,
  onBack,
  onComplete,
}: ScreenSleepwearEnrichmentReviewProps) {
  const code = selectedCodes[0]
  const metadata = codesMetadata[code] || { gtins: 32, description: "Sleepwear" }
  // A scoped run reports the scope's own totals, not the whole code's.
  const totalProducts = scopeProducts?.length || metadata.products || metadata.gtins
  const totalGtins = scopeProducts?.length
    ? scopeProducts.reduce((s, p) => s + p.gtins, 0)
    : metadata.gtins

  // Attributes follow the categories in scope, not the selection code.
  const attributes = useMemo(() => getAttributesForBricks(brickCodes ?? []), [brickCodes])

  const [attributeGroups, setAttributeGroups] = useState<AttributeGroup[]>(() =>
    generateAttributeData(totalProducts, attributes, scopeProducts)
  )
  const [expandedAttributes, setExpandedAttributes] = useState<Set<string>>(new Set())
  const [showLowConfidenceOnly, setShowLowConfidenceOnly] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [hasExpandedOnce, setHasExpandedOnce] = useState(false)
  const [batchSelectedThreshold, setBatchSelectedThreshold] = useState<number | null>(null)
  const [expandedProductGtins, setExpandedProductGtins] = useState<Set<string>>(new Set())
  const [productStates, setProductStates] = useState<
    Record<string, "pending" | "confirmed" | "rejected" | "batch-selected">
  >({})
  const [editingProduct, setEditingProduct] = useState<{ attribute: string; product: string } | null>(null)
  const [editProductValue, setEditProductValue] = useState("")
  const [isCompleted, setIsCompleted] = useState(false)
  const [completedAt, setCompletedAt] = useState("")

  const attrDefByName = useMemo(() => new Map(attributes.map((a) => [a.name, a])), [attributes])

  const toggleProductGtins = (productName: string) => {
    setExpandedProductGtins((prev) => {
      const next = new Set(prev)
      if (next.has(productName)) next.delete(productName)
      else next.add(productName)
      return next
    })
  }

  const toggleExpand = (attrName: string) => {
    setExpandedAttributes((prev) => {
      const next = new Set(prev)
      if (next.has(attrName)) {
        next.delete(attrName)
      } else {
        next.add(attrName)
        if (!hasExpandedOnce) setHasExpandedOnce(true)
      }
      return next
    })
  }

  const confirmAllProducts = (attributeName: string) => {
    setProductStates((prev) => {
      const next = { ...prev }
      const group = attributeGroups.find((g) => g.attributeName === attributeName)
      group?.gtins.forEach((gtin) => {
        const key = `${attributeName}|${gtin.productDescription}`
        const current = next[key] || "pending"
        // Skip already-confirmed, rejected, and below-threshold items.
        if ((current === "pending" || current === "batch-selected") && Math.round(gtin.confidence) >= 60) {
          next[key] = "confirmed"
        }
      })
      return next
    })
  }

  // Batch confirm: toggling the same threshold undoes it. Only one active at a time.
  const toggleBatchThreshold = (threshold: number) => {
    if (batchSelectedThreshold === threshold) {
      setBatchSelectedThreshold(null)
      setProductStates((prev) => {
        const next = { ...prev }
        Object.keys(next).forEach((key) => {
          if (next[key] === "batch-selected") next[key] = "pending"
        })
        return next
      })
      return
    }

    setBatchSelectedThreshold(threshold)
    setProductStates((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((key) => {
        if (next[key] === "batch-selected") next[key] = "pending"
      })
      attributeGroups.forEach((group) => {
        group.gtins.forEach((gtin) => {
          const key = `${group.attributeName}|${gtin.productDescription}`
          if ((next[key] || "pending") === "pending" && gtin.confidence >= threshold) {
            next[key] = "batch-selected"
          }
        })
      })
      return next
    })
  }

  const undoAllForAttribute = (attrName: string) => {
    setProductStates((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`${attrName}|`)) next[key] = "pending"
      })
      return next
    })
  }

  const setProductState = (attrName: string, productName: string, state: "confirmed" | "rejected" | "pending") => {
    setProductStates((prev) => ({ ...prev, [`${attrName}|${productName}`]: state }))
  }

  const saveProductEdit = (attrName: string, productName: string) => {
    setAttributeGroups((prev) =>
      prev.map((group) =>
        group.attributeName === attrName
          ? {
              ...group,
              gtins: group.gtins.map((g) =>
                g.productDescription === productName ? { ...g, userValue: editProductValue, aiSuggestion: editProductValue } : g
              ),
            }
          : group
      )
    )
    setProductStates((prev) => ({ ...prev, [`${attrName}|${productName}`]: "confirmed" }))
    setEditingProduct(null)
    setEditProductValue("")
  }

  const cancelProductEdit = () => {
    setEditingProduct(null)
    setEditProductValue("")
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  const totalAttributePairs = attributeGroups.reduce((sum, group) => sum + group.gtins.length, 0)
  const confirmedOrBatchStates = Object.values(productStates).filter(
    (s) => s === "confirmed" || s === "batch-selected"
  ).length
  const enrichedProductSet = new Set(
    Object.entries(productStates)
      .filter(([, s]) => s === "confirmed" || s === "batch-selected")
      .map(([key]) => key.split("|")[1])
  )
  const productsEnriched = enrichedProductSet.size

  const confirmedPercentage =
    totalAttributePairs > 0 ? Math.min(100, Math.round((confirmedOrBatchStates / totalAttributePairs) * 100)) : 0
  const pendingAttributes = totalAttributePairs - confirmedOrBatchStates
  const enrichedProductPercent =
    totalProducts > 0 ? Math.min(100, Math.round((productsEnriched / totalProducts) * 100)) : 0

  // Denominator follows the attribute list actually rendered.
  const totalAttributeRows = attributeGroups.length
  const reviewedAttributeRows = attributeGroups.filter((group) => {
    const eligible = group.gtins.filter((g) => Math.round(g.confidence) >= 60)
    return (
      eligible.length > 0 &&
      eligible.every((gtin) => {
        const state = productStates[`${group.attributeName}|${gtin.productDescription}`] || "pending"
        return state === "confirmed" || state === "batch-selected"
      })
    )
  }).length
  const attributeReviewPercent =
    totalAttributeRows > 0 ? Math.round((reviewedAttributeRows / totalAttributeRows) * 100) : 0

  const canComplete = confirmedOrBatchStates > 0

  const handleConfirmComplete = () => {
    const finalStates = { ...productStates }
    Object.keys(finalStates).forEach((key) => {
      if (finalStates[key] === "batch-selected") finalStates[key] = "confirmed"
    })
    setProductStates(finalStates)
    setShowConfirmDialog(false)
    setCompletedAt(
      new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    )
    setIsCompleted(true)
    onComplete(confirmedPercentage, [code])
  }

  // Attributes the user has opened that still hold unreviewed low-confidence rows.
  const attributesWithLowConfidence = attributeGroups
    .filter((g) => expandedAttributes.has(g.attributeName))
    .map((g) => ({
      attributeName: g.attributeName,
      lowConfidenceCount: g.gtins.filter((gt) => {
        const state = productStates[`${g.attributeName}|${gt.productDescription}`] || "pending"
        return gt.confidence < 70 && state === "pending"
      }).length,
    }))
    .filter((row) => row.lowConfidenceCount > 0)
    .slice(0, 4)

  const jumpToAttribute = (attrName: string) => {
    setShowConfirmDialog(false)
    setExpandedAttributes((prev) => {
      const next = new Set(prev)
      next.add(attrName)
      if (!hasExpandedOnce) setHasExpandedOnce(true)
      return next
    })
    setTimeout(() => {
      document
        .getElementById(`attr-row-${attrName.replace(/\s+/g, "-").toLowerCase()}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 50)
  }

  const attributeSummaryRows = attributeGroups.map((group) => {
    const confirmed = group.gtins.filter((g) => {
      const s = productStates[`${group.attributeName}|${g.productDescription}`] || "pending"
      return s === "confirmed" || s === "batch-selected"
    }).length
    const rejected = group.gtins.filter(
      (g) => (productStates[`${group.attributeName}|${g.productDescription}`] || "pending") === "rejected"
    ).length
    const attrDef = attrDefByName.get(group.attributeName)
    return {
      name: group.attributeName,
      total: group.gtins.length,
      confirmed,
      rejected,
      pending: group.gtins.length - confirmed - rejected,
      avgConf: attrDef
        ? Math.round(attrDef.avgConfidence * 100)
        : Math.round(group.gtins.reduce((sum, g) => sum + g.confidence, 0) / group.gtins.length),
    }
  })

  // ── Completed view ──────────────────────────────────────────────────────────
  if (isCompleted) {
    const totalConfirmed = attributeSummaryRows.reduce((s, r) => s + r.confirmed, 0)
    const totalPending = attributeSummaryRows.reduce((s, r) => s + r.pending, 0)
    const totalRejected = attributeSummaryRows.reduce((s, r) => s + r.rejected, 0)
    const backLabel = scopeProducts?.length ? "Back to Product List" : "Back to Selection Codes"

    return (
      <div className="space-y-6 pb-10">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#2e7d32]" />
              <h2 className="text-[16px] font-semibold text-[#1a1f2e]">Enrichment Completed</h2>
            </div>
            <p className="text-[13px] text-[#6b7280] mt-1">
              {scopeLabel && (
                <>
                  Scope: <span className="font-semibold text-[#374151]">{scopeLabel}</span> &middot;{" "}
                </>
              )}
              Selection Code: <span className="font-mono text-[#1a5fa6] font-semibold">{code}</span> —{" "}
              {metadata.description} &middot; {completedAt}
            </p>
          </div>
          <button
            onClick={onBack}
            className="px-3 py-1.5 text-[12px] font-medium border border-[#d1d5db] rounded text-[#374151] hover:bg-[#f3f4f6] transition-colors"
          >
            &larr; {backLabel}
          </button>
        </div>

        {totalPending > 0 && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded border border-[#fed7aa] bg-[#fef5e7]">
            <AlertTriangle className="w-4 h-4 text-[#d97706] shrink-0 mt-0.5" />
            <p className="text-[13px] text-[#b45309]">
              <span className="font-semibold">{totalPending} suggestions</span> are still pending across{" "}
              {attributeSummaryRows.filter((r) => r.pending > 0).length} attribute
              {attributeSummaryRows.filter((r) => r.pending > 0).length !== 1 ? "s" : ""}. Continue enrichment to action
              them.
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-[#d1d5db] rounded p-4">
            <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Total Products</p>
            <p className="text-[24px] font-bold text-[#1a1f2e] mt-1">{totalProducts}</p>
          </div>
          <div className="bg-white border border-[#d1d5db] rounded p-4">
            <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Suggestions Confirmed</p>
            <p className="text-[24px] font-bold text-[#2e7d32] mt-1">{totalConfirmed}</p>
            {totalPending > 0 && (
              <p className="text-[11px] text-[#6b7280] mt-0.5">
                {totalPending} pending &middot; {totalRejected} rejected
              </p>
            )}
          </div>
          <div className="bg-white border border-[#d1d5db] rounded p-4">
            <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Confirmed</p>
            <p className="text-[24px] font-bold text-[#1a5fa6] mt-1">{confirmedPercentage}%</p>
          </div>
        </div>

        <div className="bg-white border border-[#d1d5db] rounded overflow-hidden">
          <div className="px-4 py-3 border-b border-[#e5e7eb] bg-[#f9fafb]">
            <h3 className="text-[13px] font-semibold text-[#374151]">Attribute Breakdown</h3>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                <th className="text-left px-4 py-2.5 font-semibold text-[#6b7280] text-[11px] uppercase tracking-wide">
                  Attribute
                </th>
                <th className="text-center px-4 py-2.5 font-semibold text-[#6b7280] text-[11px] uppercase tracking-wide">
                  Products Enriched
                </th>
                <th className="text-left px-4 py-2.5 font-semibold text-[#6b7280] text-[11px] uppercase tracking-wide">
                  Avg Confidence
                </th>
                <th className="text-center px-4 py-2.5 font-semibold text-[#6b7280] text-[11px] uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {attributeSummaryRows.map((row, i) => (
                <tr key={row.name} className={`border-b border-[#f3f4f6] ${i % 2 === 0 ? "bg-white" : "bg-[#fafafa]"}`}>
                  <td className="px-4 py-2.5 font-medium text-[#1a1f2e]">{row.name}</td>
                  <td className="px-4 py-2.5 text-center font-mono text-[#1a5fa6] font-semibold">
                    {row.confirmed}/{row.total}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-[#e5e7eb] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.avgConf >= 90 ? "bg-[#2e7d32]" : row.avgConf >= 80 ? "bg-[#d97706]" : "bg-[#dc2626]"}`}
                          style={{ width: `${row.avgConf}%` }}
                        />
                      </div>
                      <span className="text-[12px] text-[#374151]">{row.avgConf}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {row.pending === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#dcfce7] text-[#166534]">
                        <Check className="w-3 h-3" /> Completed
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#fef3c7] text-[#92400e]">
                        {row.pending} Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setIsCompleted(false)}
            className={`px-4 py-2 text-[13px] font-semibold rounded transition-colors ${
              totalPending > 0
                ? "bg-[#1a5fa6] text-white hover:bg-[#1a4f8c]"
                : "border border-[#1a5fa6] text-[#1a5fa6] bg-white hover:bg-[#eff6ff]"
            }`}
          >
            Continue Enrichment
          </button>
          <button
            onClick={onBack}
            className="px-4 py-2 text-[13px] font-semibold text-white rounded bg-[#2e7d32] hover:opacity-90 transition-opacity"
          >
            {backLabel}
          </button>
        </div>
      </div>
    )
  }

  // ── Review view ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-[16px] font-semibold text-[#1a1f2e]">AI Attribute Enrichment Review</h2>
            <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#f3f4f6] text-[#6b7280]">
              {reviewedAttributeRows} of {totalAttributeRows} attributes reviewed
            </span>
            {stepLabel && (
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#f3f4f6] text-[#6b7280]">
                {stepLabel}
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#6b7280] mt-1">
            {scopeLabel && (
              <>
                Enriching <span className="font-semibold text-[#374151]">{scopeLabel}</span> &middot;{" "}
              </>
            )}
            Selection Code: <span className="font-mono text-[#1a5fa6] font-semibold">{code}</span> —{" "}
            {metadata.description} ({totalGtins} GTINs)
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 max-w-xs h-2 rounded-full bg-[#e5e7eb] overflow-hidden">
              <div
                className="h-full bg-[#1a5fa6] transition-all duration-300"
                style={{ width: `${attributeReviewPercent}%` }}
              />
            </div>
            <span className="text-[11px] font-medium text-[#6b7280]">{attributeReviewPercent}% complete</span>
          </div>
        </div>
        <button
          onClick={onBack}
          className="px-3 py-1.5 text-[13px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors"
        >
          ← {scopeProducts?.length ? "Back to Product List" : "Back to List"}
        </button>
      </div>

      <div className="flex items-start gap-2 px-3 py-2 rounded border border-[#bfdbfe] bg-[#eff6ff] text-[12px] text-[#1e40af]">
        <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-[#3b82f6]">Review suggestions below. Expand any row to edit individual items.</p>
      </div>

      {/* Batch actions */}
      <div className="flex flex-col gap-4 p-3 bg-white border border-[#d1d5db] rounded">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-[#1e40af]">Batch Confirm:</span>
          {[95, 90, 80].map((threshold) => (
            <button
              key={threshold}
              onClick={() => toggleBatchThreshold(threshold)}
              className={`px-2 py-1 text-[12px] rounded transition-colors ${
                batchSelectedThreshold === threshold
                  ? "bg-[#dcfce7] border-2 border-[#22c55e] text-[#166534] font-semibold"
                  : "bg-white border border-[#1e40af] text-[#1e40af] hover:bg-[#eff6ff]"
              }`}
            >
              {threshold}%+ {batchSelectedThreshold === threshold && "✓"}
            </button>
          ))}
          {batchSelectedThreshold && (
            <button
              onClick={() => toggleBatchThreshold(batchSelectedThreshold)}
              className="px-2 py-1 text-[12px] text-[#dc2626] hover:underline"
            >
              Clear selection
            </button>
          )}
        </div>
        {batchSelectedThreshold && (
          <p className="text-[11px] text-[#6b7280] italic">
            Batch selection sets your intention — click &quot;Complete Enrichment&quot; to save all changes.
          </p>
        )}

        <div className="border-t border-[#e5e7eb]" />

        <div className="flex items-center justify-end gap-2">
          <span className="text-[12px] font-semibold text-[#6b7280]">Filter:</span>
          <button
            type="button"
            role="switch"
            aria-checked={showLowConfidenceOnly}
            onClick={() => setShowLowConfidenceOnly((prev) => !prev)}
            className={`flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold rounded border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] ${
              showLowConfidenceOnly
                ? "bg-[#fef3c7] border-[#f59e0b] text-[#92400e]"
                : "bg-white border-[#d1d5db] text-[#6b7280] hover:border-[#f59e0b] hover:text-[#92400e]"
            }`}
            title="Toggle to show only attributes and products with AI confidence below 90%"
          >
            <span
              className={`w-3 h-3 rounded-full border-2 transition-colors ${
                showLowConfidenceOnly ? "bg-[#f59e0b] border-[#f59e0b]" : "bg-transparent border-[#9ca3af]"
              }`}
              aria-hidden="true"
            />
            Low Confidence Only (&lt;90%)
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-[#d1d5db] rounded p-4">
          <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Total Products</p>
          <p className="text-[24px] font-bold text-[#1a1f2e] mt-1">{totalProducts}</p>
        </div>
        <div className="bg-white border border-[#d1d5db] rounded p-4">
          <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Total Attributes</p>
          <p className="text-[24px] font-bold text-[#1a1f2e] mt-1">{totalAttributePairs}</p>
        </div>
        <div className="bg-white border border-[#d1d5db] rounded p-4">
          <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Confirmed</p>
          <p className="text-[24px] font-bold text-[#1a5fa6] mt-1">{confirmedPercentage}%</p>
        </div>
      </div>

      {pendingAttributes > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded border bg-[#fef3c7] border-[#fcd34d] text-[#92400e]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-[13px] font-medium">{pendingAttributes} attributes pending — expand rows to review</span>
        </div>
      )}

      {/* Attribute table */}
      <div className="bg-white border border-[#d1d5db] rounded overflow-hidden">
        <table className="w-full text-[13px] table-fixed border-collapse">
          <colgroup>
            <col style={{ width: "40px" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "45%" }} />
          </colgroup>
          <thead className="bg-[#f7f8fa] border-b border-[#d1d5db]">
            <tr>
              <th className="px-3 py-2.5"></th>
              <th className="px-3 py-2.5 text-left font-semibold text-[#374151] uppercase text-[11px] tracking-wide">
                Attribute
              </th>
              <th className="px-3 py-2.5 text-center font-semibold text-[#374151] uppercase text-[11px] tracking-wide">
                Products Enriched
              </th>
              <th className="px-3 py-2.5 text-center font-semibold text-[#374151] uppercase text-[11px] tracking-wide">
                Avg Confidence
              </th>
              <th className="px-3 py-2.5 text-center font-semibold text-[#374151] uppercase text-[11px] tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          {attributeGroups
            .filter((group) => {
              if (!showLowConfidenceOnly) return true
              const attrDef = attrDefByName.get(group.attributeName)
              return attrDef ? attrDef.avgConfidence < 0.9 : false
            })
            .map((group) => {
              const isExpanded = expandedAttributes.has(group.attributeName)
              const attrDef = attrDefByName.get(group.attributeName)
              const totalProductsForAttr = group.gtins.length
              const confirmedProductCount = group.gtins.filter((g) => {
                const s = productStates[`${group.attributeName}|${g.productDescription}`] || "pending"
                return s === "confirmed" || s === "batch-selected"
              }).length
              const avgConfidence = attrDef
                ? Math.round(attrDef.avgConfidence * 100)
                : Math.round(group.gtins.reduce((sum, g) => sum + g.confidence, 0) / group.gtins.length)
              const eligibleGtins = group.gtins.filter((g) => Math.round(g.confidence) >= 60)
              const allConfirmed =
                eligibleGtins.length > 0 &&
                eligibleGtins.every((g) => {
                  const s = productStates[`${group.attributeName}|${g.productDescription}`] || "pending"
                  return s === "confirmed" || s === "batch-selected"
                })

              return (
                <tbody
                  key={group.attributeName}
                  id={`attr-row-${group.attributeName.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <tr
                    className={`border-b border-[#e5e7eb] hover:bg-[#f9fafb] transition-colors cursor-pointer ${
                      allConfirmed ? "bg-[#f0fdf4]" : ""
                    }`}
                    onClick={() => toggleExpand(group.attributeName)}
                  >
                    <td className="px-3 py-3">
                      <button className="p-0.5 hover:bg-[#e5e7eb] rounded transition-colors">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[#374151]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[#374151]" />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#1a1f2e]">{group.attributeName}</span>
                        {(() => {
                          if (allConfirmed) {
                            return (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#dcfce7] text-[#166534]">
                                {completedAt ? "Completed" : "Confirmed"}
                              </span>
                            )
                          }
                          // (a) no suggested value · (b) a product value is low · (c) avg is low
                          const hasNoValue = attrDef?.minProductConfidence === null
                          const valueIsLow = attrDef?.minProductConfidence != null && attrDef.minProductConfidence < 0.9
                          const avgIsLow = avgConfidence < 90
                          if (hasNoValue || valueIsLow || avgIsLow) {
                            return (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#fed7aa] text-[#b45309]">
                                Needs review
                              </span>
                            )
                          }
                          return null
                        })()}
                      </div>
                      {!hasExpandedOnce && group.attributeName === attributeGroups[0]?.attributeName && (
                        <p className="text-[10px] text-[#9ca3af] mt-0.5 italic">Click to expand and review</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`font-semibold ${allConfirmed ? "text-[#166534]" : "text-[#1a5fa6]"}`}>
                        {confirmedProductCount}/{totalProductsForAttr}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-14 h-2 rounded-full bg-[#e5e7eb] overflow-hidden">
                          <div
                            className={`h-full transition-all ${avgConfidence >= 90 ? "bg-[#2e7d32]" : avgConfidence >= 80 ? "bg-[#f59e0b]" : "bg-[#dc2626]"}`}
                            style={{ width: `${avgConfidence}%` }}
                          />
                        </div>
                        <span className="text-[12px] font-semibold text-[#374151]">{avgConfidence}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        {allConfirmed ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded bg-[#dcfce7] text-[#166534]">
                              <Check className="w-3.5 h-3.5" />
                              {completedAt ? "Completed" : "Confirmed"}
                            </span>
                            {!completedAt && (
                              <button
                                onClick={() => undoAllForAttribute(group.attributeName)}
                                className="px-2 py-1.5 text-[12px] font-medium border border-[#d1d5db] rounded bg-white text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#374151] transition-colors whitespace-nowrap"
                                title="Undo all confirmations for this attribute"
                              >
                                Undo
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => confirmAllProducts(group.attributeName)}
                            className="px-3 py-1.5 text-[12px] font-semibold text-white rounded bg-[#1a5fa6] hover:bg-[#1a4f8c] transition-colors whitespace-nowrap"
                          >
                            Confirm All ({totalProductsForAttr - confirmedProductCount})
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {isExpanded && (
                    <>
                      <tr className="border-b border-[#e5e7eb] bg-[#f7f8fa]">
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2 text-[11px] font-semibold text-[#374151] uppercase tracking-wide">
                          Product
                        </td>
                        <td className="px-3 py-2 text-[11px] font-semibold text-[#374151] uppercase tracking-wide text-center">
                          Suggested Value
                        </td>
                        <td className="px-3 py-2 text-[11px] font-semibold text-[#374151] uppercase tracking-wide text-center">
                          Confidence
                        </td>
                        <td className="px-3 py-2 text-[11px] font-semibold text-[#374151] uppercase tracking-wide text-center">
                          Actions
                        </td>
                      </tr>

                      {group.gtins
                        .filter((gtin) => (showLowConfidenceOnly ? gtin.confidence < 90 : true))
                        .map((gtin) => {
                          const confidencePercent = Math.round(gtin.confidence)
                          const isBelowThreshold = confidencePercent < 60
                          const isProductGtinsExpanded = expandedProductGtins.has(gtin.productDescription)
                          const productKey = `${group.attributeName}|${gtin.productDescription}`
                          const productState = productStates[productKey] || "pending"
                          const isEditing =
                            editingProduct?.attribute === group.attributeName &&
                            editingProduct?.product === gtin.productDescription
                          const isConfirmed = productState === "confirmed"
                          const isBatchSelected = productState === "batch-selected"
                          const isRejected = productState === "rejected"

                          return (
                            <Fragment key={`${group.attributeName}-${gtin.gtin}`}>
                              <tr
                                className={`border-b ${
                                  isConfirmed
                                    ? "border-[#bbf7d0] bg-[#f0fdf4]"
                                    : isBatchSelected
                                      ? "border-[#bfdbfe] bg-[#eff6ff]"
                                      : isRejected
                                        ? "border-[#fecaca] bg-[#fef2f2]"
                                        : isBelowThreshold
                                          ? "border-[#fecaca] bg-[#fff5f5]"
                                          : "border-[#f3f4f6] bg-[#fafbfc]"
                                }`}
                              >
                                <td className="px-3 py-2.5"></td>
                                <td className="px-3 py-2.5">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[12px] text-[#1a1f2e] font-medium">
                                      {gtin.productDescription}
                                    </span>
                                    <button
                                      onClick={() => toggleProductGtins(gtin.productDescription)}
                                      className="text-[10px] text-[#6b7280] hover:text-[#1a5fa6] hover:underline text-left w-fit"
                                    >
                                      {isProductGtinsExpanded ? "Hide GTINs" : "View GTINs"}
                                    </button>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  {isEditing ? (
                                    <div className="w-full max-w-[200px] mx-auto">
                                      <AttributeValueCombobox
                                        attributeName={group.attributeName}
                                        codeList={attrDef?.codeList}
                                        value={editProductValue}
                                        onChange={setEditProductValue}
                                        onSave={() => saveProductEdit(group.attributeName, gtin.productDescription)}
                                        onCancel={cancelProductEdit}
                                      />
                                    </div>
                                  ) : isBelowThreshold ? (
                                    <span className="text-[12px] font-semibold text-[#9ca3af] italic">N/A</span>
                                  ) : (
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className="text-[12px] font-semibold text-[#1a1f2e]">
                                        {gtin.aiSuggestion}
                                      </span>
                                      {gtin.aiReasoning && (
                                        <span className="text-[10px] text-[#6b7280] italic">{gtin.aiReasoning}</span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  {!isBelowThreshold && !isEditing && (
                                    <div className="flex items-center justify-center gap-1.5">
                                      <div className="w-10 h-1.5 rounded-full bg-[#e5e7eb] overflow-hidden">
                                        <div
                                          className={`h-full ${confidencePercent >= 90 ? "bg-[#2e7d32]" : confidencePercent >= 80 ? "bg-[#f59e0b]" : "bg-[#dc2626]"}`}
                                          style={{ width: `${confidencePercent}%` }}
                                        />
                                      </div>
                                      <span
                                        className={`text-[11px] font-medium ${confidencePercent >= 90 ? "text-[#6b7280]" : confidencePercent >= 80 ? "text-[#b45309]" : "text-[#dc2626]"}`}
                                      >
                                        {confidencePercent}%
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {isConfirmed || isBatchSelected || isRejected ? (
                                      <>
                                        {isConfirmed && (
                                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#dcfce7] text-[#166534]">
                                            <Check className="w-3.5 h-3.5" /> Confirmed
                                          </span>
                                        )}
                                        {isBatchSelected && (
                                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#dbeafe] text-[#1e40af] border border-[#93c5fd]">
                                            Batch-confirmed
                                          </span>
                                        )}
                                        {isRejected && (
                                          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#dc2626]">
                                            <X className="w-3.5 h-3.5" /> Rejected
                                          </span>
                                        )}
                                        <button
                                          onClick={() =>
                                            setProductState(group.attributeName, gtin.productDescription, "pending")
                                          }
                                          className="px-2 py-1 text-[11px] font-medium text-[#6b7280] hover:text-[#1a5fa6] hover:underline"
                                        >
                                          Undo
                                        </button>
                                      </>
                                    ) : isEditing ? (
                                      <>
                                        <button
                                          onClick={() => saveProductEdit(group.attributeName, gtin.productDescription)}
                                          className="px-2.5 py-1 text-[11px] font-semibold text-white rounded bg-[#2e7d32] hover:bg-[#1b5e20] transition-colors"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={cancelProductEdit}
                                          className="px-2 py-1 text-[11px] font-medium text-[#6b7280] hover:text-[#dc2626]"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        {/* Below 60% there is no suggestion to confirm — edit or reject only. */}
                                        {!isBelowThreshold && (
                                          <button
                                            onClick={() =>
                                              setProductState(
                                                group.attributeName,
                                                gtin.productDescription,
                                                "confirmed"
                                              )
                                            }
                                            className="px-2.5 py-1 text-[11px] font-semibold text-white rounded bg-[#2e7d32] hover:bg-[#1b5e20] transition-colors"
                                          >
                                            Confirm
                                          </button>
                                        )}
                                        <button
                                          onClick={() => {
                                            setEditingProduct({
                                              attribute: group.attributeName,
                                              product: gtin.productDescription,
                                            })
                                            setEditProductValue(gtin.aiSuggestion || "")
                                          }}
                                          className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                                            isBelowThreshold
                                              ? "border border-[#1a5fa6] text-[#1a5fa6] bg-white hover:bg-[#eff6ff] font-semibold"
                                              : "border border-[#6b7280] text-[#374151] hover:bg-[#f3f4f6]"
                                          }`}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() =>
                                            setProductState(group.attributeName, gtin.productDescription, "rejected")
                                          }
                                          className="px-2 py-1 text-[11px] font-medium border border-[#dc2626] text-[#dc2626] rounded hover:bg-[#fee2e2] transition-colors"
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>

                              {isProductGtinsExpanded && (
                                <tr>
                                  <td colSpan={5} className="p-0">
                                    <div className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                                      <table className="w-full text-[11px]">
                                        <thead>
                                          <tr className="border-b border-[#e5e7eb]">
                                            <th className="text-left px-8 py-1.5 font-medium text-[#6b7280] w-40">
                                              GTIN
                                            </th>
                                            <th className="text-left px-3 py-1.5 font-medium text-[#6b7280]">
                                              AI Suggestion
                                            </th>
                                            <th className="text-left px-3 py-1.5 font-medium text-[#6b7280]">
                                              Confidence
                                            </th>
                                            <th className="text-left px-3 py-1.5 font-medium text-[#6b7280]">Status</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr className="border-b border-[#f3f4f6] last:border-0">
                                            <td className="px-8 py-1.5 font-mono text-[10px] text-[#374151]">
                                              {gtin.gtin}
                                            </td>
                                            <td className="px-3 py-1.5 text-[#374151]">{gtin.aiSuggestion || "—"}</td>
                                            <td className="px-3 py-1.5 text-[#374151]">{confidencePercent}%</td>
                                            <td className="px-3 py-1.5 text-[#374151] capitalize">{productState}</td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          )
                        })}
                    </>
                  )}
                </tbody>
              )
            })}
        </table>
      </div>

      {attributesWithLowConfidence.length > 0 && (
        <div className="rounded border border-[#fed7aa] bg-[#fef5e7] px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#d97706] shrink-0" aria-hidden="true" />
            <span className="text-[13px] font-semibold text-[#b45309]">
              {attributesWithLowConfidence.length} attribute
              {attributesWithLowConfidence.length > 1 ? "s need" : " needs"} review
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {attributesWithLowConfidence.map((row) => (
              <button
                key={row.attributeName}
                onClick={() => jumpToAttribute(row.attributeName)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] rounded border border-[#fed7aa] bg-white text-[#b45309] hover:bg-[#fffbf0] transition-colors"
                title={`${row.lowConfidenceCount} items need review`}
              >
                <span className="font-medium">{row.attributeName}</span>
                <span className="text-[11px] text-[#d97706] bg-[#fef5e7] px-1.5 py-0.5 rounded-full">
                  {row.lowConfidenceCount}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#b45309]">
            All other attributes are confirmed. Click any above to jump directly to items needing review.
          </p>
        </div>
      )}

      {/* Sticky footer */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-[#d1d5db] px-4 py-3 -mx-4 mt-4 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#6b7280]">Progress:</span>
              <div className="w-24 h-2 rounded-full bg-[#e5e7eb] overflow-hidden">
                <div
                  className="h-full bg-[#1a5fa6] transition-all duration-300"
                  style={{ width: `${attributeReviewPercent}%` }}
                />
              </div>
              <span className="text-[12px] font-semibold text-[#374151]">
                {reviewedAttributeRows}/{totalAttributeRows} attributes
              </span>
            </div>
            <span className="text-[12px] text-[#6b7280]">|</span>
            <span className="text-[12px] text-[#6b7280]">
              {productsEnriched} of {totalProducts} products enriched ({enrichedProductPercent}%)
            </span>
          </div>
          <button
            onClick={() => setShowConfirmDialog(true)}
            disabled={!canComplete}
            className="px-4 py-2 text-[13px] font-semibold text-white rounded bg-[#2e7d32] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Complete Enrichment
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirmDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-[#e5e7eb]">
              <h3 id="confirm-dialog-title" className="text-[16px] font-semibold text-[#1a1f2e]">
                Complete Enrichment?
              </h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[13px] text-[#374151]">
                  <CheckCircle2 className="w-4 h-4 text-[#2e7d32] shrink-0" />
                  <span>
                    <strong>{productsEnriched}</strong> of {totalProducts} products enriched
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-[#374151]">
                  <CheckCircle2 className="w-4 h-4 text-[#2e7d32] shrink-0" />
                  <span>
                    <strong>{reviewedAttributeRows}</strong> of {totalAttributeRows} attributes reviewed
                  </span>
                </div>
              </div>
              {reviewedAttributeRows < totalAttributeRows && (
                <p className="text-[12px] text-[#6b7280] italic">
                  Unreviewed attributes will not be saved. You can return to enrich more later.
                </p>
              )}

              {attributesWithLowConfidence.length > 0 && (
                <div className="rounded border border-[#fed7aa] bg-[#fef5e7] px-3 py-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-[#d97706] shrink-0" />
                    <span className="text-[12px] font-semibold text-[#b45309]">
                      {attributesWithLowConfidence.length} attribute
                      {attributesWithLowConfidence.length > 1 ? "s need" : " needs"} review:
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {attributesWithLowConfidence.map((row) => (
                      <li
                        key={row.attributeName}
                        className="flex items-center justify-between text-[12px] px-2 py-1 rounded bg-white"
                      >
                        <span className="text-[#374151] font-medium">{row.attributeName}</span>
                        <span className="text-[11px] text-[#b45309]">{row.lowConfidenceCount} items</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => setShowConfirmDialog(false)}
                    className="text-[12px] font-medium text-[#1a5fa6] underline underline-offset-2 hover:text-[#1a4f8c] transition-colors"
                  >
                    Go back and review
                  </button>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-[#f9fafb] border-t border-[#e5e7eb] flex items-center justify-between gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 text-[13px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmComplete}
                className="px-4 py-2 text-[13px] font-semibold text-white rounded bg-[#2e7d32] hover:opacity-90 transition-opacity"
              >
                Complete Enrichment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
