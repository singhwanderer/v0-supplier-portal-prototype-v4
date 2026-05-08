"use client"

import { useState } from "react"
import { Check, ChevronLeft, Sparkles, Info } from "lucide-react"

interface SubOption {
  code: string
  name: string
  reason?: string
  isTop?: boolean
}

interface CategoryTile {
  id: string
  label: string
  reason: string
  subOptions: SubOption[]
}

interface ScreenCategoryFallbackProps {
  onBack: () => void
  onConfirm: (selection: { categoryLabel: string; subLabel: string; brickCode: string }) => void
}

// Three top-level categories from the product matrix. Reasons are plain-language —
// no confidence numbers, no AI decision-making jargon.
const CATEGORY_TILES: CategoryTile[] = [
  {
    id: "footwear",
    label: "Footwear",
    reason: "Based on your size codes and product description",
    subOptions: [
      { code: "10001077", name: "Shoes",             reason: "Most common match for your descriptions", isTop: true },
      { code: "10001076", name: "Boots",             reason: "Some items mention higher shaft heights",  isTop: true },
      { code: "10001070", name: "Athletic Footwear", reason: "Running or sports terms found",            isTop: true },
    ],
  },
  {
    id: "sleepwear",
    label: "Sleepwear",
    reason: "Based on fabric terms and product naming patterns",
    subOptions: [
      { code: "10001339", name: "Night Dresses / Shirts",  reason: "Most common match for your fabric terms", isTop: true },
      { code: "10001338", name: "Dressing Gowns",                                                              isTop: true },
      { code: "10001341", name: "Sleep Trousers / Shorts",                                                     isTop: true },
      { code: "10001358", name: "Sleepwear Variety Packs" },
    ],
  },
  {
    id: "jewellery",
    label: "Jewellery & Watches",
    reason: "Based on material and metal references",
    subOptions: [
      { code: "10001090", name: "Necklaces / Necklets", reason: "Most common match in your data", isTop: true },
      { code: "10001092", name: "Rings",                                                            isTop: true },
      { code: "10001105", name: "Watches",                                                          isTop: true },
      { code: "10001083", name: "Anklets" },
      { code: "10001084", name: "Bracelets" },
      { code: "10001085", name: "Brooches" },
      { code: "10001086", name: "Cuff-links" },
      { code: "10001087", name: "Earrings / Body-piercing Jewellery" },
      { code: "10001089", name: "Jewellery Boxes / Pouches" },
      { code: "10001091", name: "Pendants" },
      { code: "10001093", name: "Tiaras" },
      { code: "10001104", name: "Watch Accessories / Replacement Parts" },
      { code: "10001387", name: "Jewellery (Other)" },
      { code: "10001388", name: "Jewellery Variety Packs" },
    ],
  },
]

export function ScreenCategoryFallback({ onBack, onConfirm }: ScreenCategoryFallbackProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedSub, setSelectedSub] = useState<SubOption | null>(null)
  const [showAllSubs, setShowAllSubs] = useState(false)

  const selectedCategory = CATEGORY_TILES.find((t) => t.id === selectedCategoryId) ?? null
  const canConfirm = Boolean(selectedCategory && selectedSub)

  const handleSelectCategory = (tile: CategoryTile) => {
    setSelectedCategoryId(tile.id)
    setSelectedSub(null)
    setShowAllSubs(false)
  }

  const handleConfirm = () => {
    if (!selectedCategory || !selectedSub) return
    onConfirm({
      categoryLabel: selectedCategory.label,
      subLabel: selectedSub.name,
      brickCode: selectedSub.code,
    })
  }

  const topSubs = selectedCategory?.subOptions.filter((s) => s.isTop) ?? []
  const otherSubs = selectedCategory?.subOptions.filter((s) => !s.isTop) ?? []
  const visibleSubs = showAllSubs ? selectedCategory?.subOptions ?? [] : topSubs

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="max-w-3xl">
          <h2 className="text-[17px] font-semibold text-[#1a1f2e]">Help us confirm the product type</h2>
          <p className="text-[13px] text-[#6b7280] mt-1 leading-relaxed">
            To suggest the right product attributes, we need to confirm what type of product this is. Based on your submission, here are the closest matches — select the one that fits.
          </p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-3 py-1.5 text-[13px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </button>
      </div>

      {/* Step 1 — category tiles */}
      <section aria-labelledby="step-1-heading">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1a5fa6] text-white text-[11px] font-bold">1</span>
          <h3 id="step-1-heading" className="text-[13px] font-semibold text-[#374151]">Choose the category</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CATEGORY_TILES.map((tile) => {
            const isSelected = tile.id === selectedCategoryId
            return (
              <button
                key={tile.id}
                onClick={() => handleSelectCategory(tile)}
                aria-pressed={isSelected}
                className={`text-left rounded-lg border-2 p-4 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6] ${
                  isSelected
                    ? "border-[#1a5fa6] bg-[#eff6ff] shadow-sm"
                    : "border-[#d1d5db] bg-white hover:border-[#9ca3af] hover:bg-[#f9fafb]"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[15px] font-semibold text-[#1a1f2e]">{tile.label}</span>
                  {isSelected && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1a5fa6] text-white shrink-0">
                      <Check className="w-3 h-3" aria-hidden="true" />
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#6b7280] leading-relaxed">{tile.reason}</p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Step 2 — sub-option selection (appears after step 1) */}
      {selectedCategory && (
        <section aria-labelledby="step-2-heading" className="rounded-lg border border-[#d1d5db] bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1a5fa6] text-white text-[11px] font-bold">2</span>
            <h3 id="step-2-heading" className="text-[13px] font-semibold text-[#374151]">
              Choose a specific product type in {selectedCategory.label}
            </h3>
          </div>

          <div role="radiogroup" aria-label={`Product types in ${selectedCategory.label}`} className="space-y-2">
            {visibleSubs.map((sub) => {
              const isSelected = selectedSub?.code === sub.code
              return (
                <label
                  key={sub.code}
                  className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${
                    isSelected
                      ? "border-[#1a5fa6] bg-[#eff6ff]"
                      : "border-[#e5e7eb] bg-white hover:bg-[#f9fafb]"
                  }`}
                >
                  <input
                    type="radio"
                    name="sub-option"
                    value={sub.code}
                    checked={isSelected}
                    onChange={() => setSelectedSub(sub)}
                    className="mt-0.5 w-4 h-4 text-[#1a5fa6] border-[#d1d5db] focus:ring-[#1a5fa6]"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-medium text-[#1a1f2e]">{sub.name}</span>
                      {sub.isTop && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#dcfce7] text-[#166534]">
                          <Sparkles className="w-2.5 h-2.5" aria-hidden="true" />
                          Likely match
                        </span>
                      )}
                    </span>
                    {sub.reason && (
                      <span className="block text-[12px] text-[#6b7280] mt-0.5">{sub.reason}</span>
                    )}
                  </span>
                </label>
              )
            })}
          </div>

          {otherSubs.length > 0 && (
            <button
              onClick={() => setShowAllSubs((v) => !v)}
              className="mt-3 text-[12px] font-medium text-[#1a5fa6] hover:underline focus:outline-none"
            >
              {showAllSubs
                ? "Show only likely matches"
                : `Show all ${selectedCategory.subOptions.length} ${selectedCategory.label.toLowerCase()} options`}
            </button>
          )}
        </section>
      )}

      {/* Footer tip */}
      <div className="flex items-start gap-2 px-3 py-2 rounded border border-[#bfdbfe] bg-[#eff6ff] text-[12px] text-[#1e40af]">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          Adding details like a short marketing message to your uploads helps us suggest the right category automatically next time.
        </span>
      </div>

      {/* Confirm */}
      <div className="flex items-center justify-between pt-2 border-t border-[#e5e7eb]">
        <p className="text-[12px] text-[#6b7280]">
          {canConfirm
            ? `Ready to continue: ${selectedCategory?.label} → ${selectedSub?.name}`
            : "Select a category and a product type to continue"}
        </p>
        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="px-4 py-2 text-[13px] font-semibold text-white rounded transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
          style={{ backgroundColor: "#1a5fa6" }}
        >
          Confirm &amp; Continue
        </button>
      </div>
    </div>
  )
}
