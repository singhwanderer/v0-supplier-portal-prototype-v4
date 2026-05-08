"use client"

import { useState } from "react"
import { CheckCircle2, ChevronDown, ChevronRight, Search, Edit2, Check, X, Download, AlertTriangle } from "lucide-react"

interface SelectionCodeScreenProps {
  confirmedCategories: { id: string; name: string; gtinCount: number }[]
  onComplete: () => void
  onBack: () => void
}

interface GTINItem {
  gtin: string
  productDescription: string
  gtinDescription: string
  category: string
  selectionCode: string
  gtinType: string
}

// Selection codes pre-assigned from CSV with descriptions - consistent with Selection Code List
const CSV_SELECTION_CODES: Record<string, { description: string }> = {
  "001": { description: "dresses" },
  "002": { description: "tops" },
  "003": { description: "Womens Jeans" },
  "004": { description: "Footwear - General" },
  "005": { description: "Boots Collection" },
  "006": { description: "Handbags" },
  "007": { description: "Scarves & Wraps" },
  "008": { description: "Blazers" },
  "009": { description: "Athletic Wear" },
  "010": { description: "Outerwear" },
}

// GTIN types from initial upload
const GTIN_TYPES: Record<string, string> = {
  "UP": "UPC-A (12 digits)",
  "UK": "UPC-E (8 digits)",
  "EN": "EAN-13 (13 digits)",
  "UA": "EAN-8 (8 digits)",
  "EO": "GTIN-14 (14 digits)",
}

// Mock GTIN data with pre-assigned selection codes and types from CSV
const generateMockGtins = (categories: { id: string; name: string; gtinCount: number }[]): GTINItem[] => {
  const gtins: GTINItem[] = []
  const selectionCodes = Object.keys(CSV_SELECTION_CODES)
  const gtinTypes = Object.keys(GTIN_TYPES)
  
  const descriptions: Record<string, string[]> = {
    "1": ["Women's Ankle Boot - Suede Taupe", "Women's Knee High Boot - Black Leather", "Women's Chelsea Boot - Burgundy"],
    "2": ["Women's Midi Dress - Floral Print", "Women's Maxi Dress - Solid Navy", "Women's Wrap Dress - Polka Dot"],
    "3": ["Women's Tote Bag - Leather Tan", "Women's Tote Bag - Canvas Black", "Women's Tote Bag - Woven Natural"],
    "4": ["Women's Running Shoe - Grey/Pink", "Women's Training Sneaker - White/Blue", "Women's Walking Shoe - Black"],
    "5": ["Women's Blazer - Navy Wool", "Women's Blazer - Black Crepe", "Women's Blazer - Grey Tweed"],
    "6": ["Women's Silk Scarf - Paisley", "Women's Wool Wrap - Plaid", "Women's Cotton Scarf - Solid"],
  }

  let gtinIndex = 0
  categories.forEach((cat, catIdx) => {
    const catDescriptions = descriptions[cat.id] || [`${cat.name} - Style A`, `${cat.name} - Style B`, `${cat.name} - Style C`]
    // Assign selection code based on category pattern
    const defaultCode = selectionCodes[catIdx % selectionCodes.length]
    const defaultType = gtinTypes[catIdx % gtinTypes.length]
    
    for (let i = 0; i < Math.min(cat.gtinCount, 50); i++) {
      const desc = catDescriptions[i % catDescriptions.length]
      gtins.push({
        gtin: `0${888546413000 + gtinIndex}`,
        productDescription: desc,
        gtinDescription: `${desc} - Size ${6 + (i % 8)}, Color ${["Black", "Brown", "Tan", "Red", "Blue"][i % 5]}`,
        category: cat.name,
        selectionCode: defaultCode,
        gtinType: defaultType,
      })
      gtinIndex++
    }
  })
  return gtins
}

export function ScreenSelectionCode({ confirmedCategories, onComplete, onBack }: SelectionCodeScreenProps) {
  const [gtins, setGtins] = useState<GTINItem[]>(() => generateMockGtins(confirmedCategories))
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [editingGtin, setEditingGtin] = useState<string | null>(null)
  const [editCode, setEditCode] = useState("")
  const [editType, setEditType] = useState("")
  const [showMismatchWarning, setShowMismatchWarning] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)

  // Group GTINs by category with selection code summary
  const gtinsByCategory = confirmedCategories.map((cat) => {
    const categoryGtins = gtins.filter((g) => g.category === cat.name)
    // Count by selection code
    const codeCount: Record<string, number> = {}
    categoryGtins.forEach((g) => {
      codeCount[g.selectionCode] = (codeCount[g.selectionCode] || 0) + 1
    })
    // Count by GTIN type
    const typeCount: Record<string, number> = {}
    categoryGtins.forEach((g) => {
      typeCount[g.gtinType] = (typeCount[g.gtinType] || 0) + 1
    })
    return {
      ...cat,
      gtins: categoryGtins,
      codeCount,
      typeCount,
    }
  })

  // Overall statistics
  const totalGtins = gtins.length
  const selectionCodeStats: Record<string, number> = {}
  const gtinTypeStats: Record<string, number> = {}
  gtins.forEach((g) => {
    selectionCodeStats[g.selectionCode] = (selectionCodeStats[g.selectionCode] || 0) + 1
    gtinTypeStats[g.gtinType] = (gtinTypeStats[g.gtinType] || 0) + 1
  })

  const handleStartEdit = (gtin: GTINItem) => {
    setEditingGtin(gtin.gtin)
    setEditCode(gtin.selectionCode)
    setEditType(gtin.gtinType)
  }

  const handleSaveEdit = (gtinId: string) => {
    // Check for potential mismatch
    const gtin = gtins.find((g) => g.gtin === gtinId)
    if (gtin) {
      const footwearCategories = ["boots", "shoes", "footwear", "sandals", "athletic"]
      const isFootwear = footwearCategories.some(k => gtin.category.toLowerCase().includes(k))
      const jewelryCodes = ["JEWELRY", "ACCESSORIES-FINE"]
      const isJewelryCode = jewelryCodes.some(k => editCode.toUpperCase().includes(k))
      
      if (isFootwear && isJewelryCode) {
        setShowMismatchWarning(`Possible mismatch: "${gtin.category}" assigned to "${editCode}". Proceed if intentional.`)
      }
    }

    setGtins((prev) =>
      prev.map((g) =>
        g.gtin === gtinId ? { ...g, selectionCode: editCode, gtinType: editType } : g
      )
    )
    setEditingGtin(null)
    setEditCode("")
    setEditType("")
  }

  const handleCancelEdit = () => {
    setEditingGtin(null)
    setEditCode("")
    setEditType("")
  }

  const handleReassignCategory = (categoryName: string, newCode: string) => {
    setGtins((prev) =>
      prev.map((g) => (g.category === categoryName ? { ...g, selectionCode: newCode } : g))
    )
  }

  // Filter GTINs based on search
  const filteredGtins = gtins.filter(
    (g) =>
      g.gtin.includes(searchQuery) ||
      g.productDescription.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleFinish = () => {
    setCompleted(true)
  }

  if (completed) {
    return (
      <div className="max-w-2xl space-y-4">
        <div
          className="p-6 rounded border text-center space-y-3"
          style={{ backgroundColor: "#e8f5e9", borderColor: "#a5d6a7" }}
        >
          <CheckCircle2 className="w-10 h-10 mx-auto" style={{ color: "#2e7d32" }} aria-hidden="true" />
          <h2 className="text-[16px] font-semibold text-[#1b5e20]">Enrichment Complete</h2>
          <p className="text-[13px] text-[#2e7d32]">
            {totalGtins} GTINs have been enriched with attributes, selection codes, and GTIN types.
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={onComplete}
              className="px-4 py-1.5 text-[13px] font-semibold text-white rounded hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#1a5fa6" }}
            >
              Return to Text File Upload
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-[#374151] border border-[#d1d5db] rounded bg-white hover:bg-[#f3f4f6] transition-colors"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" /> Download enriched data .xlsx
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-[15px] font-semibold text-[#1a1f2e]">Review Selection Codes</h2>
        <p className="text-[13px] text-[#6b7280] mt-0.5">
          Selection codes from your CSV upload are shown below. You can reassign codes if needed.
        </p>
      </div>

      {/* Summary stats - Selection Code counts */}
      <div className="grid grid-cols-1 gap-4">
        {/* Selection Code Distribution */}
        <div className="bg-white border border-[#d1d5db] rounded p-3">
          <h3 className="text-[12px] font-semibold text-[#6b7280] uppercase tracking-wide mb-2">Selection Codes</h3>
          <div className="space-y-1.5">
            {Object.entries(selectionCodeStats).map(([code, count]) => (
              <div key={code} className="flex items-center justify-between">
                <span className="text-[12px]">
                  <span className="font-semibold text-[#1a5fa6]">{code}</span>
                  <span className="text-[#9ca3af] ml-1 text-[11px]">({CSV_SELECTION_CODES[code]?.description || "Custom"})</span>
                </span>
                <span className="text-[12px] font-semibold text-[#374151]">{count} GTINs</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-[#e5e7eb] flex justify-between">
            <span className="text-[12px] font-semibold text-[#1a1f2e]">Total</span>
            <span className="text-[12px] font-semibold text-[#1a1f2e]">{totalGtins} GTINs</span>
          </div>
        </div>
      </div>

      {/* Mismatch warning */}
      {showMismatchWarning && (
        <div className="flex items-start gap-2 px-3 py-2 rounded border bg-[#fffbeb] border-[#fcd34d] text-[#92400e]">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[12px]">{showMismatchWarning}</p>
            <button
              onClick={() => setShowMismatchWarning(null)}
              className="text-[11px] text-[#1a5fa6] hover:underline mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Category list with inline codes */}
      <div className="space-y-2">
        {gtinsByCategory.map((cat) => {
          const isExpanded = expandedCategory === cat.name
          const primaryCode = Object.entries(cat.codeCount).sort((a, b) => b[1] - a[1])[0]
          const primaryType = Object.entries(cat.typeCount).sort((a, b) => b[1] - a[1])[0]

          return (
            <div key={cat.id} className="bg-white border border-[#d1d5db] rounded overflow-hidden">
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : cat.name)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f7f8fa] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-[#6b7280]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[#6b7280]" />
                  )}
                  <div>
                    <p className="text-[13px] font-semibold text-[#1a1f2e]">{cat.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[12px] text-[#6b7280]">{cat.gtins.length} GTINs</span>
                      <span className="text-[11px] text-[#9ca3af]">|</span>
                      <span className="text-[11px]">
                        <span className="text-[#1a5fa6] font-medium">{primaryCode?.[0]}</span>
                        <span className="text-[#9ca3af] ml-1">({primaryCode?.[1]})</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleReassignCategory(cat.name, e.target.value)
                      }
                    }}
                    className="px-2 py-1 text-[11px] border border-[#d1d5db] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1a5fa6]"
                    defaultValue=""
                  >
                    <option value="">Reassign code...</option>
                    {Object.entries(CSV_SELECTION_CODES).map(([code, data]) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-[#e5e7eb] bg-[#fafbfc]">
                  {/* Search within category */}
                  <div className="p-3 border-b border-[#e5e7eb]">
                    <div className="relative max-w-xs">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af]" />
                      <input
                        type="text"
                        placeholder="Search GTINs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-[#d1d5db] rounded focus:outline-none focus:ring-1 focus:ring-[#1a5fa6]"
                      />
                    </div>
                  </div>

                  {/* GTIN table */}
                  <div className="max-h-64 overflow-auto">
                    <table className="w-full text-[12px]">
                      <thead className="bg-[#f7f8fa] sticky top-0">
                        <tr className="border-b border-[#e5e7eb]">
                          <th className="px-3 py-2 text-left font-semibold text-[#6b7280]">GTIN</th>
                          <th className="px-3 py-2 text-left font-semibold text-[#6b7280]">Product Description</th>
                          <th className="px-3 py-2 text-left font-semibold text-[#6b7280]">Selection Code</th>
                          <th className="px-3 py-2 text-left font-semibold text-[#6b7280] w-20">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.gtins
                          .filter((g) => !searchQuery || g.gtin.includes(searchQuery) || g.productDescription.toLowerCase().includes(searchQuery.toLowerCase()))
                          .slice(0, 20)
                          .map((g) => (
                            <tr key={g.gtin} className="border-b border-[#f0f0f0] last:border-0 hover:bg-white">
                              <td className="px-3 py-2 font-mono text-[#1a5fa6]">{g.gtin}</td>
                              <td className="px-3 py-2 text-[#374151]">{g.productDescription}</td>
                              <td className="px-3 py-2">
                                {editingGtin === g.gtin ? (
                                  <select
                                    value={editCode}
                                    onChange={(e) => setEditCode(e.target.value)}
                                    className="px-2 py-1 text-[11px] border border-[#1a5fa6] rounded bg-white"
                                  >
                                    {Object.keys(CSV_SELECTION_CODES).map((code) => (
                                      <option key={code} value={code}>{code}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-[#e5edf7] text-[#1a5fa6] rounded text-[11px] font-medium">
                                    {g.selectionCode}
                                  </span>
                                )}
                              </td>

                              <td className="px-3 py-2">
                                {editingGtin === g.gtin ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleSaveEdit(g.gtin)}
                                      className="p-1 text-[#2e7d32] hover:bg-[#e8f5e9] rounded"
                                      title="Save"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="p-1 text-[#dc2626] hover:bg-[#fef2f2] rounded"
                                      title="Cancel"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleStartEdit(g)}
                                    className="p-1 text-[#6b7280] hover:text-[#1a5fa6] hover:bg-[#e5edf7] rounded"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {cat.gtins.length > 20 && (
                    <div className="px-3 py-2 text-[11px] text-[#6b7280] bg-[#f7f8fa] border-t border-[#e5e7eb]">
                      Showing 20 of {cat.gtins.length} GTINs
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onBack}
          className="px-3 py-1.5 text-[13px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
        >
          &#8592; Previous
        </button>
        <button
          onClick={handleFinish}
          className="px-4 py-2 text-[13px] font-semibold text-white rounded hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#1a5fa6" }}
        >
          Complete Enrichment ({totalGtins} GTINs)
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-[#374151] border border-[#d1d5db] rounded bg-white hover:bg-[#f3f4f6] transition-colors ml-auto"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" /> Download preview .xlsx
        </button>
      </div>
    </div>
  )
}
