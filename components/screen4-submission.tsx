"use client"

import { useState } from "react"
import { CheckCircle2, Info, ChevronDown, ChevronRight, Download } from "lucide-react"

interface Screen4Props {
  onBack: () => void
  onHome: () => void
  onProceedToEnrichmentPreview: () => void
}

const PREVIEW_ROWS = [
  { gtin: "0888546413183", attribute: "Closure Type",     value: "Lace-up",    status: "confirmed" },
  { gtin: "0888546413183", attribute: "Upper Material",   value: "Suede/Mesh", status: "confirmed" },
  { gtin: "0888546413183", attribute: "Toe Shape",        value: "Round",      status: "confirmed" },
  { gtin: "0888546413183", attribute: "Sole Material",    value: "Rubber",     status: "confirmed" },
  { gtin: "0736654122091", attribute: "Closure Type",     value: "Zip",        status: "confirmed" },
  { gtin: "0736654122091", attribute: "Upper Material",   value: "Leather",    status: "confirmed" },
  { gtin: "0736654122091", attribute: "Sole Material",    value: "Synthetic",  status: "confirmed" },
]

export function Screen4Submission({ onBack, onHome, onProceedToEnrichmentPreview }: Screen4Props) {
  const [detailExpanded, setDetailExpanded] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <div className="max-w-2xl space-y-4">
        <div
          className="p-6 rounded border text-center space-y-3"
          style={{ backgroundColor: "#e8f5e9", borderColor: "#a5d6a7" }}
        >
          <CheckCircle2 className="w-10 h-10 mx-auto" style={{ color: "#2e7d32" }} aria-hidden="true" />
          <h2 className="text-[16px] font-semibold text-[#1b5e20]">Attributes submitted successfully</h2>
          <p className="text-[13px] text-[#2e7d32]">
            981 GTINs have been updated. Your catalog now averages 11.4 attributes per GTIN.
          </p>
          <p className="text-[13px] text-[#374151] mt-2">
            Next step: Review how your GTINs were enriched by Selection Code.
          </p>
          <button
            onClick={onProceedToEnrichmentPreview}
            className="mt-2 px-4 py-1.5 text-[13px] font-semibold text-white rounded hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#1a5fa6" }}
          >
            View Enrichment Results
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-[15px] font-semibold text-[#1a1f2e]">Ready to update your catalog</h2>
      </div>

      {/* Impact card */}
      <div
        className="bg-white border rounded p-4 space-y-4"
        style={{ borderColor: "#1a1f5e", borderLeftWidth: 3 }}
        aria-label="Impact summary"
      >
        <h3 className="text-[13px] font-semibold text-[#1a1f2e] uppercase tracking-wide text-[11px] text-[#6b7280]">
          Catalog Impact
        </h3>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-[11px] text-[#6b7280] mb-1">Before</p>
            <p className="text-[28px] font-bold text-[#374151]">6.2</p>
            <p className="text-[12px] text-[#9ca3af]">attributes / GTIN</p>
          </div>
          <div className="text-[#d1d5db] text-[20px] font-light select-none">&#8594;</div>
          <div className="text-center">
            <p className="text-[11px] text-[#6b7280] mb-1">After</p>
            <p className="text-[28px] font-bold" style={{ color: "#2e7d32" }}>11.4</p>
            <p className="text-[12px] text-[#9ca3af]">attributes / GTIN</p>
          </div>
          <div className="ml-auto">
            <span
              className="px-2.5 py-1 text-[12px] font-semibold rounded"
              style={{ backgroundColor: "#e8f5e9", color: "#2e7d32" }}
            >
              +84% improvement
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="bg-white border border-[#d1d5db] rounded p-4 space-y-2.5">
        <h3 className="text-[12px] font-semibold text-[#6b7280] uppercase tracking-wide">Breakdown</h3>
        <div className="flex items-start gap-2.5 text-[13px]">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#2e7d32" }} aria-hidden="true" />
          <div>
            <span className="font-semibold text-[#1a1f2e]">981 GTINs</span>
            <span className="text-[#374151]"> — confirmed and ready</span>
          </div>
        </div>
        <div className="flex items-start gap-2.5 text-[13px]">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-[#1a5fa6]" aria-hidden="true" />
          <div>
            <span className="font-semibold text-[#1a1f2e]">43 GTINs</span>
            <span className="text-[#374151]"> — submitted with confirmed attributes only</span>
            <p className="text-[12px] text-[#9ca3af] mt-0.5">Optional attributes not filled — this is fine</p>
          </div>
        </div>
      </div>

      {/* Expandable review */}
      <div className="bg-white border border-[#d1d5db] rounded overflow-hidden">
        <button
          onClick={() => setDetailExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f7f8fa] transition-colors text-[13px] font-medium text-[#374151] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
          aria-expanded={detailExpanded}
        >
          <span>Review what will be submitted</span>
          {detailExpanded
            ? <ChevronDown className="w-4 h-4 text-[#6b7280]" aria-hidden="true" />
            : <ChevronRight className="w-4 h-4 text-[#6b7280]" aria-hidden="true" />
          }
        </button>
        {detailExpanded && (
          <div className="border-t border-[#e5e7eb]">
            <table className="w-full text-[13px]" role="table">
              <thead>
                <tr className="bg-[#f7f8fa] border-b border-[#e5e7eb]">
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">GTIN</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Attribute</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Value</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {PREVIEW_ROWS.map((row, i) => (
                  <tr key={i} className="border-b border-[#f0f0f0] last:border-0">
                    <td className="px-4 py-2 font-mono text-[12px] text-[#1a5fa6]">{row.gtin}</td>
                    <td className="px-4 py-2 text-[#374151]">{row.attribute}</td>
                    <td className="px-4 py-2 text-[#1a1f2e] font-medium">{row.value}</td>
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-1 text-[12px]" style={{ color: "#2e7d32" }}>
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Confirmed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2.5 border-t border-[#e5e7eb] bg-[#f7f8fa]">
              <button className="flex items-center gap-1.5 text-[13px] text-[#1a5fa6] hover:underline focus:outline-none">
                <Download className="w-3.5 h-3.5" aria-hidden="true" /> Download as .xlsx
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-1">
        <button
          onClick={() => setSubmitted(true)}
          className="w-full py-2.5 text-[14px] font-semibold text-white rounded hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#1a5fa6]"
          style={{ backgroundColor: "#1a5fa6" }}
        >
          Submit to Catalog
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3 py-1.5 text-[13px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
          >
            &#8592; Previous
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-[#374151] border border-[#d1d5db] rounded bg-white hover:bg-[#f3f4f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]">
            <Download className="w-3.5 h-3.5" aria-hidden="true" /> Download confirmed data .xlsx
          </button>
        </div>
      </div>
    </div>
  )
}
