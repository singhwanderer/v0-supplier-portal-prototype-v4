"use client"

import { CheckCircle2, XCircle, Clock, ChevronRight } from "lucide-react"
import type { EnrichmentSummaryData } from "./screen-ai-enrichment-review"

interface ScreenEnrichmentSummaryProps {
  summaryData: EnrichmentSummaryData
  onBackToList: () => void
}

export function ScreenEnrichmentSummary({ summaryData, onBackToList }: ScreenEnrichmentSummaryProps) {
  const { description, totalProducts, attributeGroups, productStates, confirmedPercentage, completedAt, codes } = summaryData

  // Per-attribute breakdown: count confirmed, rejected, pending across that attribute's GTINs
  const attributeRows = attributeGroups.map((group) => {
    let confirmed = 0
    let rejected = 0
    let pending = 0

    group.gtins.forEach((gtin) => {
      const state = productStates[`${group.attributeName}|${gtin.productDescription}`] || "pending"
      if (state === "confirmed" || state === "batch-selected") confirmed++
      else if (state === "rejected") rejected++
      else pending++
    })

    const total = group.gtins.length
    const avgConfidence = total > 0
      ? Math.round(group.gtins.reduce((sum, g) => sum + g.confidence, 0) / total)
      : 0

    return { name: group.attributeName, confirmed, rejected, pending, total, avgConfidence }
  })

  // Top-level counts
  const totalConfirmed = attributeRows.reduce((s, r) => s + r.confirmed, 0)
  const totalPending   = attributeRows.reduce((s, r) => s + r.pending, 0)
  const totalRejected  = attributeRows.reduce((s, r) => s + r.rejected, 0)
  const totalPairs     = attributeRows.reduce((s, r) => s + r.total, 0)

  // Unique products that had at least one confirmed attribute
  const enrichedProducts = new Set(
    Object.entries(productStates)
      .filter(([, s]) => s === "confirmed" || s === "batch-selected")
      .map(([key]) => key.split("|")[1])
  ).size

  const allDone = totalPending === 0 && totalRejected === 0

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 font-sans">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-5 h-5 text-[#2e7d32]" />
            <h1 className="text-[20px] font-bold text-[#1a1f2e]">Enrichment Complete</h1>
          </div>
          <p className="text-[13px] text-[#6b7280]">
            Selection Code <span className="font-semibold text-[#1a1f2e]">{codes[0]}</span>
            {" — "}
            <span className="font-semibold text-[#1a1f2e]">{description}</span>
          </p>
          <p className="text-[12px] text-[#9ca3af] mt-0.5">Completed {completedAt}</p>
        </div>
        <button
          onClick={onBackToList}
          className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-[#1a5fa6] rounded hover:bg-[#154d8a] transition-colors"
        >
          Back to Selection Codes
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Summary chips ─────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[#d1d5db] rounded p-4">
          <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Total Products</p>
          <p className="text-[24px] font-bold text-[#1a1f2e] mt-1">{totalProducts}</p>
        </div>
        <div className="bg-white border border-[#d1d5db] rounded p-4">
          <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Products Enriched</p>
          <p className="text-[24px] font-bold text-[#2e7d32] mt-1">
            {enrichedProducts}
            <span className="text-[14px] font-normal text-[#6b7280] ml-1">/ {totalProducts}</span>
          </p>
        </div>
        <div className="bg-white border border-[#d1d5db] rounded p-4">
          <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Suggestions Confirmed</p>
          <p className="text-[24px] font-bold text-[#1a5fa6] mt-1">
            {totalConfirmed}
            <span className="text-[14px] font-normal text-[#6b7280] ml-1">/ {totalPairs}</span>
          </p>
        </div>
        <div className={`rounded p-4 border ${allDone ? "bg-[#f0fdf4] border-[#bbf7d0]" : "bg-[#fffbeb] border-[#fde68a]"}`}>
          <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Pending Review</p>
          <p className={`text-[24px] font-bold mt-1 ${allDone ? "text-[#2e7d32]" : "text-[#b45309]"}`}>
            {totalPending}
          </p>
        </div>
      </div>

      {/* ── Status banner ─────────────────────────────────────────── */}
      {totalPending > 0 && (
        <div className="flex items-center gap-2 bg-[#fffbeb] border border-[#fde68a] rounded px-4 py-3 mb-6 text-[13px] text-[#92400e]">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>{totalPending}</strong> suggestion{totalPending !== 1 ? "s" : ""} across{" "}
            <strong>{attributeRows.filter((r) => r.pending > 0).length}</strong> attribute{attributeRows.filter((r) => r.pending > 0).length !== 1 ? "s" : ""} still pending review. Return to the enrichment screen to complete them.
          </span>
        </div>
      )}

      {/* ── Per-attribute table ───────────────────────────────────── */}
      <div className="bg-white border border-[#d1d5db] rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e5e7eb] bg-[#f9fafb]">
          <h2 className="text-[13px] font-semibold text-[#1a1f2e]">Attribute Breakdown</h2>
          <p className="text-[12px] text-[#6b7280] mt-0.5">Per-attribute results across all reviewed products</p>
        </div>

        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
              <th className="text-left px-4 py-2.5 font-semibold text-[#6b7280] text-[11px] uppercase tracking-wide w-[220px]">Attribute</th>
              <th className="text-center px-4 py-2.5 font-semibold text-[#6b7280] text-[11px] uppercase tracking-wide">Confirmed</th>
              <th className="text-center px-4 py-2.5 font-semibold text-[#6b7280] text-[11px] uppercase tracking-wide">Rejected</th>
              <th className="text-center px-4 py-2.5 font-semibold text-[#6b7280] text-[11px] uppercase tracking-wide">Pending</th>
              <th className="text-left px-4 py-2.5 font-semibold text-[#6b7280] text-[11px] uppercase tracking-wide w-[200px]">Avg Confidence</th>
              <th className="text-center px-4 py-2.5 font-semibold text-[#6b7280] text-[11px] uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {attributeRows.map((row, i) => {
              const isFullyConfirmed = row.pending === 0 && row.rejected === 0
              const hasRejected      = row.rejected > 0
              const hasPending       = row.pending > 0
              const confidenceColor  = row.avgConfidence >= 90
                ? "#2e7d32"
                : row.avgConfidence >= 80
                ? "#b45309"
                : "#dc2626"

              return (
                <tr
                  key={row.name}
                  className={`border-b border-[#f3f4f6] last:border-0 ${
                    isFullyConfirmed ? "bg-[#f0fdf4]" : hasPending ? "bg-white" : "bg-white"
                  }`}
                >
                  {/* Attribute name */}
                  <td className="px-4 py-3 font-medium text-[#1a1f2e]">{row.name}</td>

                  {/* Confirmed */}
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#dcfce7] text-[#166534]">
                      <CheckCircle2 className="w-3 h-3" />
                      {row.confirmed} / {row.total}
                    </span>
                  </td>

                  {/* Rejected */}
                  <td className="px-4 py-3 text-center">
                    {row.rejected > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#fee2e2] text-[#991b1b]">
                        <XCircle className="w-3 h-3" />
                        {row.rejected}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#d1d5db]">—</span>
                    )}
                  </td>

                  {/* Pending */}
                  <td className="px-4 py-3 text-center">
                    {row.pending > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#fef3c7] text-[#92400e]">
                        <Clock className="w-3 h-3" />
                        {row.pending}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#d1d5db]">—</span>
                    )}
                  </td>

                  {/* Avg confidence bar */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-[#e5e7eb] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${row.avgConfidence}%`, backgroundColor: confidenceColor }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold w-8 text-right" style={{ color: confidenceColor }}>
                        {row.avgConfidence}%
                      </span>
                    </div>
                  </td>

                  {/* Status pill */}
                  <td className="px-4 py-3 text-center">
                    {isFullyConfirmed ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#dcfce7] text-[#166534]">
                        Complete
                      </span>
                    ) : hasPending ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#fef3c7] text-[#92400e]">
                        Pending
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#fee2e2] text-[#991b1b]">
                        Rejected
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer action ─────────────────────────────────────────── */}
      <div className="flex justify-end mt-6">
        <button
          onClick={onBackToList}
          className="px-5 py-2.5 text-[13px] font-semibold text-white bg-[#1a5fa6] rounded hover:bg-[#154d8a] transition-colors"
        >
          Back to Selection Codes
        </button>
      </div>
    </div>
  )
}
