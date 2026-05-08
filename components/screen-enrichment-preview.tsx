"use client"

import { useState } from "react"
import { ArrowRight, Upload, Eye } from "lucide-react"

interface ScreenEnrichmentPreviewProps {
  fileName: string
  confirmedCategories: { id: string; name: string; gtinCount: number }[]
  onViewSelectionCodeList: () => void
  onUploadAnother: () => void
}

// Generate selection codes from confirmed categories
function generateSelectionCodePreview(categories: { id: string; name: string; gtinCount: number }[]) {
  const selectionCodes = [
    { code: "001", description: "dresses", products: 52, totalGtins: 288, enrichedGtins: 245 },
    { code: "002", description: "tops", products: 58, totalGtins: 157, enrichedGtins: 157 },
    { code: "003", description: "Womens Jeans", products: 7, totalGtins: 4, enrichedGtins: 4 },
    { code: "004", description: "Footwear - General", products: 30, totalGtins: 32, enrichedGtins: 0 },
    { code: "005", description: "Boots Collection", products: 52, totalGtins: 299, enrichedGtins: 150 },
  ]

  return selectionCodes.map((sc) => ({
    ...sc,
    notEnrichedGtins: sc.totalGtins - sc.enrichedGtins,
    status: sc.enrichedGtins >= sc.totalGtins * 0.5 ? "ai-enriched" : "needs-enrichment",
  }))
}

export function ScreenEnrichmentPreview({
  fileName,
  confirmedCategories,
  onViewSelectionCodeList,
  onUploadAnother,
}: ScreenEnrichmentPreviewProps) {
  const [expandedCode, setExpandedCode] = useState<string | null>(null)
  const selectionCodes = generateSelectionCodePreview(confirmedCategories)

  const totalEnrichedGtins = selectionCodes.reduce((sum, sc) => sum + sc.enrichedGtins, 0)
  const totalGtins = selectionCodes.reduce((sum, sc) => sum + sc.totalGtins, 0)
  const totalProducts = selectionCodes.reduce((sum, sc) => sum + sc.products, 0)

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-[16px] font-semibold text-[#1a1f2e]">Enrichment Preview by Selection Code</h2>
        <p className="text-[13px] text-[#6b7280] mt-1">
          File: <span className="font-mono text-[#374151]">{fileName}</span>
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-[#d1d5db] rounded p-4">
          <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-2">Total Products</p>
          <p className="text-[24px] font-bold text-[#1a1f2e]">{totalProducts}</p>
        </div>
        <div className="bg-white border border-[#d1d5db] rounded p-4">
          <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-2">Total GTINs</p>
          <p className="text-[24px] font-bold text-[#1a1f2e]">{totalGtins}</p>
        </div>
        <div className="bg-white border border-[#d1d5db] rounded p-4">
          <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-2">GTINs Enriched</p>
          <p className="text-[24px] font-bold" style={{ color: "#2e7d32" }}>
            {totalEnrichedGtins}
          </p>
        </div>
        <div className="bg-white border border-[#d1d5db] rounded p-4">
          <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-2">Enrichment Rate</p>
          <p className="text-[24px] font-bold text-[#1a1f2e]">
            {totalGtins > 0 ? Math.round((totalEnrichedGtins / totalGtins) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Selection Code Table */}
      <div className="bg-white border border-[#d1d5db] rounded overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-[#f7f8fa] border-b border-[#d1d5db]">
              <th className="text-left px-4 py-3 font-semibold text-[#374151]">Selection Code</th>
              <th className="text-left px-4 py-3 font-semibold text-[#374151]">Description</th>
              <th className="text-right px-4 py-3 font-semibold text-[#374151]">Products</th>
              <th className="text-right px-4 py-3 font-semibold text-[#374151]">Enriched</th>
              <th className="text-right px-4 py-3 font-semibold text-[#374151]">Not Enriched</th>
              <th className="text-center px-4 py-3 font-semibold text-[#374151]">Status</th>
            </tr>
          </thead>
          <tbody>
            {selectionCodes.map((sc) => (
              <tr
                key={sc.code}
                className="border-b border-[#e5e7eb] last:border-0 hover:bg-[#f9fafb] cursor-pointer transition-colors"
                onClick={() => setExpandedCode(expandedCode === sc.code ? null : sc.code)}
              >
                <td className="px-4 py-3 font-mono font-semibold text-[#1a5fa6]">{sc.code}</td>
                <td className="px-4 py-3 text-[#1a1f2e]">{sc.description}</td>
                <td className="text-right px-4 py-3 text-[#374151]">{sc.products}</td>
                <td className="text-right px-4 py-3 font-semibold" style={{ color: "#2e7d32" }}>
                  {sc.enrichedGtins}/{sc.totalGtins}
                </td>
                <td className="text-right px-4 py-3 text-[#6b7280]">{sc.notEnrichedGtins}</td>
                <td className="text-center px-4 py-3">
                  <span
                    className="inline-block px-2 py-1 rounded text-[11px] font-semibold"
                    style={{
                      backgroundColor: sc.status === "ai-enriched" ? "#e8f5e9" : "#fff3e0",
                      color: sc.status === "ai-enriched" ? "#2e7d32" : "#e65100",
                    }}
                  >
                    {sc.status === "ai-enriched" ? "AI Enriched" : "Needs Enrichment"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info message */}
      <div className="bg-[#e3f2fd] border border-[#bbdefb] rounded p-4 flex gap-3">
        <Eye className="w-5 h-5 text-[#1a5fa6] shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="text-[13px] font-semibold text-[#1a5fa6]">Preview: Enrichment Status by Selection Code</p>
          <p className="text-[12px] text-[#1565c0] mt-1">
            This shows how many GTINs within each selection code have been enriched. Access the full Selection Code List for detailed management and to enrich additional codes.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onViewSelectionCodeList}
          className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-white rounded hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#1a5fa6]"
          style={{ backgroundColor: "#1a5fa6" }}
        >
          View Selection Code List
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          onClick={onUploadAnother}
          className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-[#374151] border border-[#d1d5db] rounded bg-white hover:bg-[#f3f4f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
        >
          <Upload className="w-4 h-4" aria-hidden="true" />
          Upload Another File
        </button>
      </div>
    </div>
  )
}
