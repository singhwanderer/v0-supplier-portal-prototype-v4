"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react"
import type { ConfirmedCategory } from "@/app/page"

interface Screen2Props {
  fileName: string
  gtinCount: number
  confirmedCategories: ConfirmedCategory[]
  onReviewCategory: (categoryKey: string) => void
  onRejectCategory?: (categoryKey: string) => void
  onModifyCategory?: (categoryKey: string) => void
  onBack: () => void
}

// Static attribute data keyed by category id
const CATEGORY_ATTRIBUTES: Record<string, {
  attrCount: number
  needsInput: number
  attributes: { name: string; suggestion: string; confidence: number; gtins: string; flag: string | null; note?: string }[]
}> = {
  "1": {
    attrCount: 4, needsInput: 1,
    attributes: [
      { name: "Closure Type",   suggestion: "Lace-up",    confidence: 98, gtins: "87/87",  flag: null },
      { name: "Upper Material", suggestion: "Suede/Mesh", confidence: 95, gtins: "87/87",  flag: null },
      { name: "Faux Fur",       suggestion: "No",         confidence: 97, gtins: "87/87",  flag: null },
      { name: "Sole Material",  suggestion: "Rubber",     confidence: 82, gtins: "81/87",  flag: "amber", note: "6 GTINs have a different suggestion — visible in review" },
    ],
  },
  "2": {
    attrCount: 6, needsInput: 2,
    attributes: [
      { name: "Neckline",       suggestion: "V-Neck",     confidence: 91, gtins: "214/214", flag: null },
      { name: "Sleeve Length",  suggestion: "Short",      confidence: 88, gtins: "198/214", flag: "amber", note: "16 GTINs may differ — check in review" },
      { name: "Fabric",         suggestion: "Cotton",     confidence: 94, gtins: "214/214", flag: null },
      { name: "Fit",            suggestion: "Regular",    confidence: 85, gtins: "214/214", flag: null },
    ],
  },
  "3": {
    attrCount: 5, needsInput: 0,
    attributes: [
      { name: "Strap Type",     suggestion: "Double",     confidence: 97, gtins: "63/63",  flag: null },
      { name: "Closure",        suggestion: "Magnetic",   confidence: 93, gtins: "63/63",  flag: null },
      { name: "Lining Material",suggestion: "Suede",      confidence: 89, gtins: "63/63",  flag: null },
    ],
  },
  "4": {
    attrCount: 5, needsInput: 1,
    attributes: [
      { name: "Closure Type",   suggestion: "Lace-up",    confidence: 96, gtins: "156/156", flag: null },
      { name: "Sole Type",      suggestion: "Rubber",     confidence: 90, gtins: "150/156", flag: "amber", note: "6 GTINs have a different sole — check in review" },
      { name: "Upper Material", suggestion: "Mesh",       confidence: 93, gtins: "156/156", flag: null },
    ],
  },
  "5": {
    attrCount: 6, needsInput: 3,
    attributes: [
      { name: "Lapel Style",    suggestion: "Notched",    confidence: 87, gtins: "312/312", flag: null },
      { name: "Button Count",   suggestion: "2",          confidence: 83, gtins: "289/312", flag: "amber", note: "23 GTINs may differ" },
      { name: "Lining",         suggestion: "Full",       confidence: 91, gtins: "312/312", flag: null },
    ],
  },
  "6": {
    attrCount: 4, needsInput: 0,
    attributes: [
      { name: "Material",       suggestion: "Silk",       confidence: 95, gtins: "192/192", flag: null },
      { name: "Pattern",        suggestion: "Solid",      confidence: 90, gtins: "192/192", flag: null },
      { name: "Size",           suggestion: "One Size",   confidence: 98, gtins: "192/192", flag: null },
    ],
  },
}

function ConfidenceBar({ value }: { value: number }) {
  const filled = Math.round(value / 25)
  const color = value >= 90 ? "#2e7d32" : value >= 75 ? "#f59e0b" : "#dc2626"
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-2.5 h-2 rounded-sm" style={{ backgroundColor: i < filled ? color : "#e8eaed" }} />
        ))}
      </div>
      <span className="text-[12px]" style={{ color }}>{value}%</span>
    </div>
  )
}

export function Screen2Summary({ fileName, gtinCount, confirmedCategories, onReviewCategory, onRejectCategory, onModifyCategory, onBack }: Screen2Props) {
  const [expandedId, setExpandedId] = useState<string | null>(
    confirmedCategories.length > 0 ? confirmedCategories[0].id : null
  )

  // Use confirmed categories if provided, otherwise fall back to showing all
  const displayCategories = confirmedCategories.length > 0
    ? confirmedCategories
    : [
        { id: "1", name: "Women's Footwear — Ankle Boots", gtinCount: 87,  confidence: 94 },
        { id: "2", name: "Women's Casual Dresses",          gtinCount: 214, confidence: 88 },
        { id: "3", name: "Handbags — Tote",                 gtinCount: 63,  confidence: 96 },
      ]

  const totalGtins = displayCategories.reduce((s, c) => s + c.gtinCount, 0)
  
  // Calculate dynamic counts based on actual category attributes
  const totalNeedInput = displayCategories.reduce((s, c) => {
    const attrs = CATEGORY_ATTRIBUTES[c.id]
    if (!attrs) return s
    // Count GTINs that have at least one attribute needing input (amber flag)
    const amberAttrs = attrs.attributes.filter(a => a.flag === "amber")
    // Use the category's actual needsInput count or estimate from amber flags
    return s + (attrs.needsInput > 0 ? Math.min(attrs.needsInput * 10, c.gtinCount) : 0)
  }, 0)
  
  const totalReady = totalGtins - totalNeedInput
  
  // Count total attributes across all categories
  const totalAttributes = displayCategories.reduce((s, c) => {
    const attrs = CATEGORY_ATTRIBUTES[c.id]
    return s + (attrs?.attrCount ?? 0)
  }, 0)

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Upload success banner */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded border text-[12px]"
        style={{ backgroundColor: "#e8f5e9", borderColor: "#a5d6a7", color: "#1b5e20" }}
        role="status"
      >
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#2e7d32" }} aria-hidden="true" />
        <span>
          Upload complete — <strong>{fileName || "catalog.csv"}</strong> &middot; {gtinCount.toLocaleString()} GTINs loaded
        </span>
      </div>

      {/* Header card */}
      <div className="bg-white border border-[#d1d5db] rounded p-4 space-y-4">
        <div>
          <h2 className="text-[15px] font-semibold text-[#1a1f2e]">
            AI found additional attributes for{" "}
            <span style={{ color: "#1a5fa6" }}>{totalGtins.toLocaleString()} GTINs</span>
            {displayCategories.length !== confirmedCategories.length || confirmedCategories.length > 0
              ? <span className="text-[#6b7280] font-normal text-[13px]"> across {displayCategories.length} categor{displayCategories.length === 1 ? "y" : "ies"}</span>
              : null}
          </h2>
          <p className="text-[13px] text-[#6b7280] mt-0.5">
            Review AI suggestions below. Nothing is saved until you confirm.
          </p>
        </div>

        {/* Stat tiles */}
        <div className="flex gap-3">
          <div className="flex-1 border border-[#d1d5db] rounded p-3 bg-[#f7f8fa]">
            <p className="text-[20px] font-bold text-[#1a1f2e]">{totalReady.toLocaleString()}</p>
            <p className="text-[13px] font-medium text-[#1a1f2e]">GTINs — Suggestions ready</p>
            <p className="text-[12px] text-[#6b7280] mt-0.5">AI is confident</p>
          </div>
          {totalNeedInput > 0 && (
            <div className="flex-1 border border-[#f59e0b] rounded p-3 bg-[#fffbeb]">
              <p className="text-[20px] font-bold text-[#92400e]">{totalNeedInput}</p>
              <p className="text-[13px] font-medium text-[#92400e]">GTINs — Need your input</p>
            </div>
          )}
          <div className="flex-1 border border-[#bfdbfe] rounded p-3 bg-[#eff6ff]">
            <p className="text-[20px] font-bold text-[#1e40af]">{displayCategories.length}</p>
            <p className="text-[13px] font-medium text-[#1e40af]">Categor{displayCategories.length === 1 ? "y" : "ies"} to enrich</p>
            <p className="text-[12px] text-[#3b82f6] mt-0.5">{totalAttributes} attributes total</p>
          </div>
        </div>
      </div>

      {/* UX Enhancement Tips Panel */}
      <div className="bg-white border border-[#d1d5db] rounded overflow-hidden">
        <button
          onClick={() => setExpandedId(expandedId === "__tips__" ? null : "__tips__")}
          className="w-full flex items-center gap-2 px-4 py-3 bg-[#f7f8fa] hover:bg-[#eef0f4] transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
          aria-expanded={expandedId === "__tips__"}
        >
          <Lightbulb className="w-4 h-4 text-[#f59e0b] shrink-0" aria-hidden="true" />
          <span className="text-[13px] font-semibold text-[#1a1f2e]">
            UX Tips for Large Dataset Reviews ({totalGtins.toLocaleString()} GTINs)
          </span>
          {expandedId === "__tips__"
            ? <ChevronDown className="w-4 h-4 text-[#6b7280] ml-auto" aria-hidden="true" />
            : <ChevronRight className="w-4 h-4 text-[#6b7280] ml-auto" aria-hidden="true" />}
        </button>
        {expandedId === "__tips__" && (
          <div className="px-4 py-3 border-t border-[#e5e7eb] grid grid-cols-2 gap-3">
            {[
              { title: "Batch confirm by confidence", desc: "Use 'Confirm all at ≥90%' to auto-approve high-confidence suggestions in one click, leaving only uncertain items for manual review." },
              { title: "Review by exception", desc: "Amber-flagged GTINs are surfaced first. Focus on the 43 that need input before scanning confident ones — reduces cognitive load." },
              { title: "Category-first workflow", desc: "Complete one category at a time. Each confirmed group is saved independently, so you can pause and resume without losing progress." },
              { title: "Bulk-apply identical values", desc: "If one GTIN's attribute is edited, use 'Apply to all' to propagate it across the group instantly instead of editing row by row." },
              { title: "Pagination & search", desc: "The GTIN review table is paginated at 25 rows. Use the search bar to jump directly to a specific GTIN or description keyword." },
              { title: "Collapse identical GTINs", desc: "GTINs sharing the same attribute set are grouped. Confirm the group header to approve all matching GTINs simultaneously." },
            ].map((tip) => (
              <div key={tip.title} className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1a5fa6] mt-1.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-[12px] font-semibold text-[#1a1f2e]">{tip.title}</p>
                  <p className="text-[12px] text-[#6b7280] mt-0.5">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onBack}
          className="px-3 py-1.5 text-[13px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
        >
          &#8592; Previous
        </button>
        <span className="text-[12px] text-[#6b7280]">Back to category confirmation</span>
      </div>

      {/* Category cards */}
      <div className="space-y-2">
        {displayCategories.map((cat) => {
          const attrs = CATEGORY_ATTRIBUTES[cat.id]
          const isExpanded = expandedId === cat.id
          return (
            <div
              key={cat.id}
              className="bg-white border border-[#d1d5db] rounded overflow-hidden"
              style={{ borderLeftWidth: isExpanded ? 3 : 1, borderLeftColor: isExpanded ? "#1a1f5e" : "#d1d5db" }}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : cat.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f7f8fa] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isExpanded
                    ? <ChevronDown className="w-4 h-4 shrink-0 text-[#6b7280]" aria-hidden="true" />
                    : <ChevronRight className="w-4 h-4 shrink-0 text-[#6b7280]" aria-hidden="true" />}
                  <span className="text-[13px] font-semibold text-[#1a1f2e]">{cat.name}</span>
                  <span className="text-[12px] text-[#6b7280]">{cat.gtinCount.toLocaleString()} GTINs</span>
                </div>
                {!isExpanded && attrs && (
                  <span className="text-[12px] text-[#6b7280] shrink-0 ml-4">
                    {attrs.attrCount} attributes suggested
                    {attrs.needsInput > 0 ? ` · ${attrs.needsInput} need your input` : " · all confident"}
                  </span>
                )}
              </button>

              {isExpanded && attrs && attrs.attributes.length > 0 && (
                <div className="border-t border-[#e5e7eb]">
                  <table className="w-full text-[13px]" role="table">
                    <thead>
                      <tr className="bg-[#f7f8fa] border-b border-[#e5e7eb]">
                        <th className="px-4 py-2 text-left text-[12px] font-semibold text-[#6b7280] w-40">Attribute</th>
                        <th className="px-4 py-2 text-left text-[12px] font-semibold text-[#6b7280] w-36">AI Suggestion</th>
                        <th className="px-4 py-2 text-left text-[12px] font-semibold text-[#6b7280] w-32">Confidence</th>
                        <th className="px-4 py-2 text-left text-[12px] font-semibold text-[#6b7280] w-24">GTINs</th>
                        <th className="px-4 py-2 text-left text-[12px] font-semibold text-[#6b7280]">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attrs.attributes.map((attr, idx) => (
                        <tr key={idx} className="border-b border-[#f0f0f0] last:border-0">
                          <td className="px-4 py-2.5 text-[#374151] font-medium">{attr.name}</td>
                          <td className="px-4 py-2.5 text-[#1a1f2e]">{attr.suggestion}</td>
                          <td className="px-4 py-2.5"><ConfidenceBar value={attr.confidence} /></td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className={attr.flag === "amber" ? "text-[#92400e]" : "text-[#374151]"}>
                                {attr.gtins}
                              </span>
                              {attr.flag === "amber" && (
                                <AlertTriangle className="w-3.5 h-3.5 text-[#f59e0b]" aria-label="Warning" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            {attr.note && (
                              <span className="text-[12px]" style={{ color: attr.flag === "amber" ? "#92400e" : "#9ca3af" }}>
                                {attr.note}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {isExpanded && (!attrs || attrs.attributes.length === 0) && (
                <div className="border-t border-[#e5e7eb] px-4 py-3">
                  <p className="text-[13px] text-[#6b7280]">
                    {attrs?.attrCount ?? 0} attributes suggested — all confident across all GTINs
                  </p>
                </div>
              )}

              {isExpanded && (
                <div className="px-4 py-3 border-t border-[#e5e7eb] bg-[#f7f8fa] flex items-center gap-2">
                  <button
                    onClick={() => onReviewCategory(cat.id)}
                    className="px-4 py-1.5 text-[13px] font-semibold text-white rounded hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#1a5fa6]"
                    style={{ backgroundColor: "#1a5fa6" }}
                  >
                    Review &amp; Confirm — {cat.name} ({cat.gtinCount.toLocaleString()} GTINs) &#8594;
                  </button>
                  {onRejectCategory && (
                    <button
                      onClick={() => onRejectCategory(cat.id)}
                      className="px-4 py-1.5 text-[13px] font-semibold border border-[#dc2626] text-[#dc2626] rounded hover:bg-[#fee2e2] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#dc2626]"
                    >
                      Reject
                    </button>
                  )}
                  {onModifyCategory && (
                    <button
                      onClick={() => onModifyCategory(cat.id)}
                      className="px-4 py-1.5 text-[13px] font-semibold border border-[#6b7280] text-[#374151] rounded hover:bg-[#f3f4f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#6b7280]"
                    >
                      Modify Suggestions
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
