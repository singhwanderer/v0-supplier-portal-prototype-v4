"use client"

import { useState, useEffect } from "react"
import { Sparkles, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"

type EnrichmentStatus = "ai-enriched" | "in-progress" | "needs-enrichment"

interface SelectionCodeRow {
  id: string
  code: string
  description: string
  products: number
  gtins: number
  createDate: string
  lastUpdateDate: string
  lastEnrichedDate: string // "TBD" if never enriched, otherwise date
  status: EnrichmentStatus
}

interface ScreenSelectionCodeListProps {
onEnrichSelected: (codes: string[], metadata: Record<string, { gtins: number; products: number; description: string }>) => void
  enrichmentUpdates?: Record<string, { status: EnrichmentStatus; lastEnrichedDate: string }>
  }

const INITIAL_SELECTION_CODE_DATA: SelectionCodeRow[] = [
  { id: "1", code: "001", description: "Footwear",             products: 52, gtins: 288, createDate: "08/10/2015", lastUpdateDate: "03/10/2026", lastEnrichedDate: "TBD",         status: "needs-enrichment" },
  { id: "2", code: "002", description: "Sleepwear",            products: 58, gtins: 157, createDate: "06/20/2007", lastUpdateDate: "06/24/2025", lastEnrichedDate: "02/15/2026", status: "in-progress" },
  { id: "3", code: "003", description: "Jewellery & Watches",  products: 44, gtins: 198, createDate: "07/22/2011", lastUpdateDate: "04/05/2025", lastEnrichedDate: "04/05/2025", status: "ai-enriched" },
]

type SortKey = "code" | "description" | "products" | "gtins" | "createDate" | "lastUpdateDate" | "lastEnrichedDate"
type SortDir = "asc" | "desc"

export function ScreenSelectionCodeList({ onEnrichSelected, enrichmentUpdates }: ScreenSelectionCodeListProps) {
  const [data, setData] = useState<SelectionCodeRow[]>(INITIAL_SELECTION_CODE_DATA)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>("code")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 25
  const totalRecords = 3

  // Apply enrichment updates when they change
  useEffect(() => {
    if (enrichmentUpdates && Object.keys(enrichmentUpdates).length > 0) {
      setData((prev) =>
        prev.map((row) => {
          const update = enrichmentUpdates[row.code]
          if (update) {
            return { ...row, status: update.status, lastEnrichedDate: update.lastEnrichedDate }
          }
          return row
        })
      )
    }
  }, [enrichmentUpdates])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sortedData = [...data].sort((a, b) => {
    let aVal: string | number = a[sortKey]
    let bVal: string | number = b[sortKey]
    
    if (sortKey === "createDate" || sortKey === "lastUpdateDate") {
      aVal = new Date(aVal as string).getTime()
      bVal = new Date(bVal as string).getTime()
    }

    if (sortKey === "lastEnrichedDate") {
      // Handle "TBD" as oldest
      if (aVal === "TBD") aVal = 0
      else aVal = new Date(aVal as string).getTime()
      if (bVal === "TBD") bVal = 0
      else bVal = new Date(bVal as string).getTime()
    }
    
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
  })

  const handleRowSelect = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set<string>()
      // Only allow single selection - clicking same row toggles off
      if (!prev.has(id)) {
        next.add(id)
      }
      return next
    })
  }

  const handleClearFilter = () => {
    setSelectedRows(new Set())
  }

const handleEnrichSelected = () => {
  const selectedData = sortedData.filter((r) => selectedRows.has(r.id))
  const selectedCodes = selectedData.map((r) => r.code)
  const metadata: Record<string, { gtins: number; products: number; description: string }> = {}
  selectedData.forEach((r) => {
    metadata[r.code] = { gtins: r.gtins, products: r.products, description: r.description }
  })
  onEnrichSelected(selectedCodes, metadata)
  }

  const SortIcon = ({ column }: { column: SortKey }) => (
    <span className="inline-flex flex-col ml-1">
      <ChevronUp
        className={`w-3 h-3 -mb-1 ${sortKey === column && sortDir === "asc" ? "text-[#1a5fa6]" : "text-[#9ca3af]"}`}
      />
      <ChevronDown
        className={`w-3 h-3 ${sortKey === column && sortDir === "desc" ? "text-[#1a5fa6]" : "text-[#9ca3af]"}`}
      />
    </span>
  )

  const startRecord = (currentPage - 1) * pageSize + 1
  const endRecord = Math.min(currentPage * pageSize, totalRecords)
  const totalPages = Math.ceil(totalRecords / pageSize)

  return (
    <div className="space-y-4">
      {/* Account info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Account Number</span>
            <p className="text-[14px] font-semibold text-[#1a1f2e]">125103335555</p>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Selection Codes</span>
            <p className="text-[14px] font-semibold text-[#1a1f2e]">{totalRecords}</p>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between bg-white border border-[#d1d5db] rounded px-4 py-2">
        <div className="flex items-center gap-4">
          <button
            onClick={handleClearFilter}
            className="text-[12px] text-[#1a5fa6] hover:underline focus:outline-none"
          >
            Clear Filter
          </button>
          {selectedRows.size > 0 && (
            <span className="text-[12px] text-[#6b7280]">
              {selectedRows.size} selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleEnrichSelected}
            disabled={selectedRows.size === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-semibold text-white rounded transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{ backgroundColor: "#1a5fa6" }}
          >
            <Sparkles className="w-4 h-4" />
            Enrich Selection Code with AI
          </button>
          <span className="text-[12px] text-[#6b7280]">
            {startRecord}-{endRecord} of {totalRecords} records
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#d1d5db] rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-[#f7f8fa] border-b border-[#d1d5db]">
              <tr>
                <th className="w-10 px-3 py-2 text-left">
                  {/* Single selection only - no header checkbox */}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">
                  <button
                    onClick={() => handleSort("code")}
                    className="flex items-center hover:text-[#1a5fa6] transition-colors"
                  >
                    Selection Code
                    <SortIcon column="code" />
                  </button>
                </th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">
                  <button
                    onClick={() => handleSort("description")}
                    className="flex items-center hover:text-[#1a5fa6] transition-colors"
                  >
                    Description
                    <SortIcon column="description" />
                  </button>
                </th>
                <th className="px-3 py-2 text-right font-semibold text-[#374151]">
                  <button
                    onClick={() => handleSort("products")}
                    className="flex items-center justify-end hover:text-[#1a5fa6] transition-colors"
                  >
                    Products
                    <SortIcon column="products" />
                  </button>
                </th>
                <th className="px-3 py-2 text-right font-semibold text-[#374151]">
                  <button
                    onClick={() => handleSort("gtins")}
                    className="flex items-center justify-end hover:text-[#1a5fa6] transition-colors"
                  >
                    GTINs
                    <SortIcon column="gtins" />
                  </button>
                </th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">
                  <button
                    onClick={() => handleSort("createDate")}
                    className="flex items-center hover:text-[#1a5fa6] transition-colors"
                  >
                    Create Date
                    <SortIcon column="createDate" />
                  </button>
                </th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">
                  <button
                    onClick={() => handleSort("lastUpdateDate")}
                    className="flex items-center hover:text-[#1a5fa6] transition-colors"
                  >
                    Last Update Date
                    <SortIcon column="lastUpdateDate" />
                  </button>
                </th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">
                  <button
                    onClick={() => handleSort("lastEnrichedDate")}
                    className="flex items-center hover:text-[#1a5fa6] transition-colors"
                  >
                    Last Enriched Date
                    <SortIcon column="lastEnrichedDate" />
                  </button>
                </th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-[#e5e7eb] hover:bg-[#f9fafb] transition-colors ${
                    selectedRows.has(row.id) ? "bg-[#eff6ff]" : ""
                  }`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row.id)}
                      onChange={() => handleRowSelect(row.id)}
                      className="w-4 h-4 rounded border-[#d1d5db] text-[#1a5fa6] focus:ring-[#1a5fa6]"
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-[#1a5fa6]">{row.code}</td>
                  <td className="px-3 py-2 text-[#374151]">{row.description}</td>
                  <td className="px-3 py-2 text-right text-[#374151]">{row.products}</td>
                  <td className="px-3 py-2 text-right text-[#374151]">{row.gtins}</td>
                  <td className="px-3 py-2 text-[#6b7280]">{row.createDate}</td>
                  <td className="px-3 py-2 text-[#6b7280]">{row.lastUpdateDate}</td>
                  <td className="px-3 py-2">
                    {row.lastEnrichedDate === "TBD" ? (
                      <span className="text-[#9ca3af]">TBD</span>
                    ) : (
                      <span className="text-[#6b7280]">{row.lastEnrichedDate}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.status === "ai-enriched" && (
                      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded bg-[#dcfce7] text-[#166534]">
                        AI Enriched
                      </span>
                    )}
                    {row.status === "in-progress" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded bg-[#fef3c7] text-[#92400e]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                        In Progress
                      </span>
                    )}
                    {row.status === "needs-enrichment" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded bg-[#f3f4f6] text-[#6b7280]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af]" />
                        Needs Enrichment
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#e5e7eb] bg-[#f9fafb]">
          <span className="text-[12px] text-[#6b7280]">
            Showing {startRecord} to {endRecord} of {totalRecords} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded border border-[#d1d5db] bg-white hover:bg-[#f3f4f6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-[#374151]" />
            </button>
            {[1, 2, 3, 4, 5].map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 text-[12px] rounded border transition-colors ${
                  currentPage === page
                    ? "bg-[#1a5fa6] text-white border-[#1a5fa6]"
                    : "bg-white text-[#374151] border-[#d1d5db] hover:bg-[#f3f4f6]"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded border border-[#d1d5db] bg-white hover:bg-[#f3f4f6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-[#374151]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
