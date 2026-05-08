"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, ChevronDown, Check, X, Ban, Search, ChevronLeft, ChevronRight } from "lucide-react"

interface GTINRecord {
  gtin: string
  description: string
  confidence: number
  category: string
  selectionCode: string
  gtinType: string
  declined: boolean
  declineReason: string
}

interface ScreenBrickGtinListProps {
  categoryId: string
  categoryName: string
  brickCode: string
  onBack: () => void
}

const AVAILABLE_CATEGORIES = [
  "Women's Footwear — Ankle Boots",
  "Women's Casual Dresses",
  "Handbags — Tote",
  "Women's Athletic Shoes",
  "Women's Blazers",
  "Scarves & Wraps",
  "Women's Sandals",
  "Women's Heels",
  "Women's Flats",
]

const generateGtins = (categoryName: string, count: number): GTINRecord[] => {
  const descriptions: Record<string, string[]> = {
    "Women's Footwear — Ankle Boots": [
      "Women's Ankle Boot Suede Lace-up",
      "Women's Leather Ankle Bootie",
      "Women's Heeled Ankle Boot",
      "Women's Chelsea Boot Black",
      "Women's Combat Boot Leather",
    ],
    "Women's Casual Dresses": [
      "Women's Floral Midi Dress",
      "Women's A-Line Summer Dress",
      "Women's Wrap Dress Navy",
      "Women's Shift Dress Cotton",
      "Women's Maxi Dress Print",
    ],
    "Handbags — Tote": [
      "Women's Leather Tote Bag",
      "Women's Canvas Tote Large",
      "Women's Structured Tote Black",
      "Women's Everyday Tote Tan",
      "Women's Work Tote Professional",
    ],
  }

  const descs = descriptions[categoryName] || [
    "Product Item A",
    "Product Item B",
    "Product Item C",
    "Product Item D",
    "Product Item E",
  ]

  // Selection codes mapped to categories for consistency
  const categorySelectionCodes: Record<string, string> = {
    "Women's Footwear — Ankle Boots": "004",
    "Women's Casual Dresses": "001",
    "Handbags — Tote": "006",
    "Women's Athletic Shoes": "009",
    "Women's Blazers": "008",
    "Scarves & Wraps": "007",
  }
  const selectionCode = categorySelectionCodes[categoryName] || "001"
  const gtinTypes = ["UP", "EN", "UK", "UA", "EO"]

  return Array.from({ length: count }, (_, i) => ({
    gtin: `0${String(888546413183 + i).padStart(12, "0")}`,
    description: descs[i % descs.length],
    confidence: Math.min(99, 85 + Math.floor(Math.random() * 14)),
    category: categoryName,
    selectionCode: selectionCode,
    gtinType: gtinTypes[i % gtinTypes.length],
    declined: false,
    declineReason: "",
  }))
}

const ITEMS_PER_PAGE = 25

export function ScreenBrickGtinList({ categoryId, categoryName, brickCode, onBack }: ScreenBrickGtinListProps) {
  const gtinCounts: Record<string, number> = {
    "1": 87,
    "2": 214,
    "3": 63,
    "4": 156,
    "5": 312,
    "6": 192,
  }
  const count = gtinCounts[categoryId] || 87

  const [gtins, setGtins] = useState<GTINRecord[]>(() => generateGtins(categoryName, count))
  const [editingGtin, setEditingGtin] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [decliningGtin, setDecliningGtin] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "declined">("all")

  // Filter and search
  const filteredGtins = useMemo(() => {
    return gtins.filter((g) => {
      const matchesSearch =
        searchQuery === "" ||
        g.gtin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.description.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "active" && !g.declined) ||
        (filterStatus === "declined" && g.declined)

      return matchesSearch && matchesFilter
    })
  }, [gtins, searchQuery, filterStatus])

  // Pagination
  const totalPages = Math.ceil(filteredGtins.length / ITEMS_PER_PAGE)
  const paginatedGtins = filteredGtins.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const declinedCount = gtins.filter((g) => g.declined).length
  const activeCount = gtins.filter((g) => !g.declined).length

  const handleMoveCategory = (gtin: string, newCategory: string) => {
    setGtins((prev) =>
      prev.map((g) => (g.gtin === gtin ? { ...g, category: newCategory } : g))
    )
    setEditingGtin(null)
    setSelectedCategory("")
  }

  const handleCancelMove = () => {
    setEditingGtin(null)
    setSelectedCategory("")
  }

  const handleDecline = (gtin: string) => {
    if (!declineReason.trim()) return
    setGtins((prev) =>
      prev.map((g) =>
        g.gtin === gtin ? { ...g, declined: true, declineReason: declineReason.trim() } : g
      )
    )
    setDecliningGtin(null)
    setDeclineReason("")
  }

  const handleCancelDecline = () => {
    setDecliningGtin(null)
    setDeclineReason("")
  }

  const handleUndoDecline = (gtin: string) => {
    setGtins((prev) =>
      prev.map((g) => (g.gtin === gtin ? { ...g, declined: false, declineReason: "" } : g))
    )
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-[#6b7280]">
        <button
          onClick={onBack}
          className="hover:text-[#1a5fa6] transition-colors focus:outline-none focus-visible:underline"
        >
          Enrichment
        </button>
        <span>/</span>
        <button
          onClick={onBack}
          className="hover:text-[#1a5fa6] transition-colors focus:outline-none focus-visible:underline"
        >
          Confirm Categories
        </button>
        <span>/</span>
        <span className="text-[#374151] font-medium">{categoryName}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded border border-[#d1d5db] bg-white hover:bg-[#f3f4f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
          aria-label="Back to categories"
        >
          <ArrowLeft className="w-4 h-4 text-[#374151]" aria-hidden="true" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-semibold text-[#1a1f2e]">{categoryName}</h2>
          </div>
          <p className="text-[13px] text-[#6b7280]">
            {count} GTINs in this category. Move any that don&apos;t fit, or decline the ones you don&apos;t want to enrich.
          </p>
        </div>
      </div>

      {/* Stats + Search + Filter bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-white border border-[#d1d5db] rounded p-3">
        <div className="flex items-center gap-4 text-[12px]">
          <span className="font-medium text-[#374151]">{activeCount} active</span>
          {declinedCount > 0 && (
            <span className="text-[#dc2626] font-medium">{declinedCount} declined</span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af]" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search GTIN or description..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-8 pr-3 py-1.5 text-[12px] border border-[#d1d5db] rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1a5fa6] w-56"
            />
          </div>
          {/* Filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as "all" | "active" | "declined")
                setCurrentPage(1)
              }}
              className="appearance-none pl-3 pr-8 py-1.5 text-[12px] border border-[#d1d5db] rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1a5fa6]"
            >
              <option value="all">All GTINs</option>
              <option value="active">Active only</option>
              <option value="declined">Declined only</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b7280] pointer-events-none" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* GTIN Table */}
      <div className="rounded border border-[#d1d5db] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#f7f8fa] border-b border-[#d1d5db]">
                <th className="text-left px-3 py-2 font-semibold text-[#374151]">GTIN</th>
                <th className="text-left px-3 py-2 font-semibold text-[#374151]">Product Description</th>
                <th className="text-left px-3 py-2 font-semibold text-[#374151] w-16">Sel. Code</th>
                <th className="text-left px-3 py-2 font-semibold text-[#374151] w-24">Confidence</th>
                <th className="text-left px-3 py-2 font-semibold text-[#374151]">Category</th>
                <th className="text-left px-3 py-2 font-semibold text-[#374151] w-24">Status</th>
                <th className="text-left px-3 py-2 font-semibold text-[#374151] w-56">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedGtins.map((gtin, idx) => (
                <tr
                  key={gtin.gtin}
                  className={`border-b border-[#e5e7eb] ${
                    gtin.declined
                      ? "bg-[#fef2f2]"
                      : idx % 2 === 0
                      ? "bg-white"
                      : "bg-[#fafbfc]"
                  }`}
                >
                  <td className="px-3 py-2 font-mono text-[12px] text-[#374151]">{gtin.gtin}</td>
                  <td className={`px-3 py-2 ${gtin.declined ? "text-[#9ca3af] line-through" : "text-[#1a1f2e]"}`}>
                    {gtin.description}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-[11px] px-1.5 py-0.5 bg-[#f3f4f6] text-[#1a5fa6] rounded">{gtin.selectionCode}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-[#e8eaed] overflow-hidden max-w-12">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${gtin.confidence}%`,
                            backgroundColor:
                              gtin.confidence >= 90 ? "#2e7d32" : gtin.confidence >= 70 ? "#f59e0b" : "#dc2626",
                          }}
                        />
                      </div>
                      <span className="text-[12px] text-[#374151] w-8">{gtin.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {editingGtin === gtin.gtin ? (
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="appearance-none pl-2 pr-7 py-1 text-[12px] border border-[#d1d5db] rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1a5fa6]"
                          >
                            <option value="">Select category...</option>
                            {AVAILABLE_CATEGORIES.filter((c) => c !== gtin.category).map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#6b7280] pointer-events-none"
                            aria-hidden="true"
                          />
                        </div>
                        <button
                          onClick={() => selectedCategory && handleMoveCategory(gtin.gtin, selectedCategory)}
                          disabled={!selectedCategory}
                          className="p-1 rounded bg-[#2e7d32] text-white hover:bg-[#1b5e20] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none"
                          aria-label="Confirm move"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={handleCancelMove}
                          className="p-1 rounded border border-[#d1d5db] bg-white text-[#6b7280] hover:bg-[#f3f4f6] transition-colors focus:outline-none"
                          aria-label="Cancel move"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`text-[12px] ${
                          gtin.category !== categoryName ? "text-[#1a5fa6] font-medium" : "text-[#6b7280]"
                        }`}
                      >
                        {gtin.category.length > 25 ? `${gtin.category.slice(0, 25)}...` : gtin.category}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {gtin.declined ? (
                      <span className="flex items-center gap-1 text-[11px] text-[#dc2626] font-medium" title={gtin.declineReason}>
                        <Ban className="w-3 h-3" aria-hidden="true" />
                        Declined
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#2e7d32] font-medium">Active</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {decliningGtin === gtin.gtin ? (
                      <div className="flex flex-col gap-1.5">
                        <input
                          type="text"
                          placeholder="Reason for declining (required)"
                          value={declineReason}
                          onChange={(e) => setDeclineReason(e.target.value)}
                          className="px-2 py-1 text-[11px] border border-[#d1d5db] rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626] w-full"
                          autoFocus
                        />
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDecline(gtin.gtin)}
                            disabled={!declineReason.trim()}
                            className="px-2 py-0.5 text-[11px] font-medium rounded bg-[#dc2626] text-white hover:bg-[#b91c1c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none"
                          >
                            Confirm Decline
                          </button>
                          <button
                            onClick={handleCancelDecline}
                            className="px-2 py-0.5 text-[11px] font-medium rounded border border-[#d1d5db] bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors focus:outline-none"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : gtin.declined ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-[#9ca3af] italic truncate max-w-40" title={gtin.declineReason}>
                          {gtin.declineReason}
                        </span>
                        <button
                          onClick={() => handleUndoDecline(gtin.gtin)}
                          className="px-2 py-0.5 text-[11px] font-medium rounded border border-[#d1d5db] bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors focus:outline-none w-fit"
                        >
                          Undo Decline
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {editingGtin !== gtin.gtin && (
                          <>
                            <button
                              onClick={() => setEditingGtin(gtin.gtin)}
                              className="px-2 py-1 text-[11px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors focus:outline-none"
                            >
                              Move
                            </button>
                            <button
                              onClick={() => setDecliningGtin(gtin.gtin)}
                              className="px-2 py-1 text-[11px] font-medium border border-[#fecaca] rounded bg-[#fef2f2] text-[#dc2626] hover:bg-[#fee2e2] transition-colors focus:outline-none"
                            >
                              Decline
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 bg-[#f7f8fa] border-t border-[#d1d5db]">
            <span className="text-[12px] text-[#6b7280]">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredGtins.length)} of{" "}
              {filteredGtins.length} GTINs
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-[#d1d5db] bg-white hover:bg-[#f3f4f6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-[#374151]" />
              </button>
              <span className="px-2 text-[12px] text-[#374151]">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-[#d1d5db] bg-white hover:bg-[#f3f4f6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none"
                aria-label="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5 text-[#374151]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Back button */}
      <div className="pt-2">
        <button
          onClick={onBack}
          className="px-4 py-2 text-[13px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
        >
          Back to Categories
        </button>
      </div>
    </div>
  )
}
