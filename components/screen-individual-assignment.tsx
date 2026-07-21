"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, ChevronDown, Check } from "lucide-react"

// Bug 3 fix: Individual product assignment screen for unclassified products

interface UnassignedProduct {
  id: string
  product: string
  gtins: number
  category: string
}

// Unclassified products (Could not classify)
const UNCLASSIFIED_PRODUCTS: UnassignedProduct[] = [
  { id: "unc1", product: "Vintage pocket watch", gtins: 1, category: "Unassigned" },
  { id: "unc2", product: "Embroidered table runner", gtins: 2, category: "Unassigned" },
  { id: "unc3", product: "Crystal wine stopper set", gtins: 1, category: "Unassigned" },
  { id: "unc4", product: "Monogrammed handkerchief", gtins: 3, category: "Unassigned" },
]

// Low-confidence products from the three categories
const LOW_CONFIDENCE_PRODUCTS: UnassignedProduct[] = [
  // Shoes - General Purpose (52%, 8 products)
  { id: "lc-s1", product: "Blue canvas sneaker collection", gtins: 4, category: "Unassigned" },
  { id: "lc-s2", product: "Running shoe series, mesh upper", gtins: 6, category: "Unassigned" },
  { id: "lc-s3", product: "Casual lace-up walking shoe", gtins: 3, category: "Unassigned" },
  { id: "lc-s4", product: "Slip-on garden clog", gtins: 2, category: "Unassigned" },
  { id: "lc-s5", product: "Platform espadrille", gtins: 3, category: "Unassigned" },
  { id: "lc-s6", product: "Woven slide sandal", gtins: 2, category: "Unassigned" },
  { id: "lc-s7", product: "Ankle-strap flat", gtins: 1, category: "Unassigned" },
  { id: "lc-s8", product: "Studded mule", gtins: 2, category: "Unassigned" },
  // Night Dresses/Shirts (48%, 6 products)
  { id: "lc-n1", product: "Silk nightgown collection", gtins: 2, category: "Unassigned" },
  { id: "lc-n2", product: "Cotton sleep shorts set", gtins: 3, category: "Unassigned" },
  { id: "lc-n3", product: "Flannel pajama top", gtins: 4, category: "Unassigned" },
  { id: "lc-n4", product: "Satin camisole set", gtins: 2, category: "Unassigned" },
  { id: "lc-n5", product: "Jersey sleep dress", gtins: 3, category: "Unassigned" },
  { id: "lc-n6", product: "Thermal henley nightshirt", gtins: 2, category: "Unassigned" },
  // Bracelets (45%, 4 products)
  { id: "lc-b1", product: "Silver charm bracelet line", gtins: 1, category: "Unassigned" },
  { id: "lc-b2", product: "Gold bangle set", gtins: 2, category: "Unassigned" },
  { id: "lc-b3", product: "Leather wrap bracelet", gtins: 1, category: "Unassigned" },
  { id: "lc-b4", product: "Beaded stretch bracelet", gtins: 3, category: "Unassigned" },
]

// Category options organized by parent
const CATEGORY_OPTIONS = [
  {
    parent: "Footwear",
    children: [
      { name: "Shoes - General Purpose", brickCode: "10001077" },
      { name: "Boots - General Purpose", brickCode: "10001076" },
      { name: "Athletic Footwear - General Purpose", brickCode: "10001070" },
    ],
  },
  {
    parent: "Sleepwear",
    children: [
      { name: "Dressing Gowns", brickCode: "10001338" },
      { name: "Night Dresses/Shirts", brickCode: "10001339" },
      { name: "Sleep Trousers/Shorts", brickCode: "10001341" },
      { name: "Sleepwear Variety Packs", brickCode: "10001358" },
    ],
  },
  {
    parent: "Jewellery & Watches",
    children: [
      { name: "Anklets", brickCode: "10001083" },
      { name: "Bracelets", brickCode: "10001084" },
      { name: "Brooches", brickCode: "10001085" },
      { name: "Cuff-links", brickCode: "10001086" },
      { name: "Earrings/Body Jewellery", brickCode: "10001087" },
      { name: "Necklaces/Necklets", brickCode: "10001090" },
      { name: "Pendants", brickCode: "10001091" },
      { name: "Rings", brickCode: "10001092" },
      { name: "Tiaras", brickCode: "10001093" },
      { name: "Watches", brickCode: "10001105" },
    ],
  },
]

interface ScreenIndividualAssignmentProps {
  scope: "unclassified" | "all-low-confidence"
  onBack: () => void
  // Scenario 3: save partial category assignments and return to the Selection Code List
  onSaveAndExit?: (assignedCount: number, totalCount: number) => void
}

export function ScreenIndividualAssignment({ scope, onBack, onSaveAndExit }: ScreenIndividualAssignmentProps) {
  // Get the correct product list based on scope
  const initialProducts = scope === "unclassified"
    ? UNCLASSIFIED_PRODUCTS
    : [...LOW_CONFIDENCE_PRODUCTS, ...UNCLASSIFIED_PRODUCTS]

  const backLabel = "Back to Quick Pick"
  
  const [products, setProducts] = useState<UnassignedProduct[]>(initialProducts)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [bulkCategory, setBulkCategory] = useState<string>("")
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const remainingCount = products.filter(p => p.category === "Unassigned").length
  const assignedCount = products.length - remainingCount

  // Toggle product selection
  const toggleSelection = (id: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Toggle all selection
  const toggleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)))
    }
  }

  // Assign category to a single product
  const assignCategory = (productId: string, categoryName: string) => {
    setProducts(prev => 
      prev.map(p => p.id === productId ? { ...p, category: categoryName } : p)
    )
    setOpenDropdown(null)
  }

  // Apply bulk category to selected products
  const applyBulkCategory = () => {
    if (!bulkCategory || selectedProducts.size === 0) return
    setProducts(prev =>
      prev.map(p => selectedProducts.has(p.id) ? { ...p, category: bulkCategory } : p)
    )
    setSelectedProducts(new Set())
    setBulkCategory("")
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded border border-[#d1d5db] bg-white hover:bg-[#f3f4f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
          aria-label={backLabel}
        >
          <ArrowLeft className="w-4 h-4 text-[#374151]" aria-hidden="true" />
        </button>
        <div>
          <h2 className="text-[16px] font-semibold text-[#1a1f2e]">
            Help us confirm the product type — {remainingCount} Products remaining
          </h2>
          <p className="text-[13px] text-[#6b7280]">
            {assignedCount} of {products.length} products assigned
          </p>
        </div>
      </div>

      {/* Bulk action bar */}
      <div className="flex items-center gap-3 p-3 bg-[#f0f9ff] border border-[#bfdbfe] rounded">
        <span className="text-[12px] font-semibold text-[#1e40af]">Select products to bulk-apply:</span>
        <select
          value={bulkCategory}
          onChange={(e) => setBulkCategory(e.target.value)}
          className="px-2 py-1.5 text-[12px] border border-[#d1d5db] rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1a5fa6]"
        >
          <option value="">Choose category...</option>
          {CATEGORY_OPTIONS.map(group => (
            <optgroup key={group.parent} label={group.parent}>
              {group.children.map(cat => (
                <option key={cat.brickCode} value={cat.name}>{cat.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          onClick={applyBulkCategory}
          disabled={!bulkCategory || selectedProducts.size === 0}
          className="px-3 py-1.5 text-[12px] font-semibold text-white rounded bg-[#1a5fa6] hover:bg-[#1a4f8c] disabled:bg-[#9ca3af] disabled:cursor-not-allowed transition-colors"
        >
          Apply to selected ({selectedProducts.size})
        </button>
        <button
          onClick={onBack}
          className="ml-auto text-[12px] text-[#1a5fa6] font-medium hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" />
          {backLabel}
        </button>
      </div>

      {/* Products table */}
      <div className="border border-[#e5e7eb] rounded overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
              <th className="px-3 py-2.5 text-left w-10">
                <input
                  type="checkbox"
                  checked={selectedProducts.size === products.length && products.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-[#d1d5db] text-[#1a5fa6] focus:ring-[#1a5fa6]"
                  aria-label="Select all products"
                />
              </th>
              <th className="px-3 py-2.5 text-left font-semibold text-[#374151]">Product</th>
              <th className="px-3 py-2.5 text-center font-semibold text-[#374151] w-24">GTINs</th>
              <th className="px-3 py-2.5 text-left font-semibold text-[#374151] w-64">Category</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const isSelected = selectedProducts.has(product.id)
              const isAssigned = product.category !== "Unassigned"
              const isDropdownOpen = openDropdown === product.id

              return (
                <tr 
                  key={product.id} 
                  className={`border-b border-[#f3f4f6] ${
                    isAssigned ? "bg-[#f0fdf4]" : "bg-white"
                  } hover:bg-[#f9fafb]`}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(product.id)}
                      className="w-4 h-4 rounded border-[#d1d5db] text-[#1a5fa6] focus:ring-[#1a5fa6]"
                      aria-label={`Select ${product.product}`}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-[#1a1f2e]">{product.product}</td>
                  <td className="px-3 py-2.5 text-center text-[#6b7280]">{product.gtins}</td>
                  <td className="px-3 py-2.5 relative">
                    {isAssigned ? (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#22c55e]" />
                        <span className="text-[#166534] font-medium">{product.category}</span>
                      </div>
                    ) : (
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdown(isDropdownOpen ? null : product.id)}
                          className="flex items-center justify-between w-full px-2 py-1.5 text-[12px] border border-[#d1d5db] rounded bg-white hover:border-[#1a5fa6] transition-colors"
                        >
                          <span className="text-[#6b7280]">Select category...</span>
                          <ChevronDown className="w-3 h-3 text-[#6b7280]" />
                        </button>
                        {isDropdownOpen && (
                          <div className="absolute z-50 top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto bg-white border border-[#d1d5db] rounded shadow-lg">
                            {CATEGORY_OPTIONS.map(group => (
                              <div key={group.parent}>
                                <div className="px-2 py-1.5 text-[10px] font-bold text-[#6b7280] uppercase tracking-wide bg-[#f9fafb]">
                                  {group.parent}
                                </div>
                                {group.children.map(cat => (
                                  <button
                                    key={cat.brickCode}
                                    onClick={() => assignCategory(product.id, cat.name)}
                                    className="w-full px-3 py-1.5 text-left text-[12px] text-[#374151] hover:bg-[#eff6ff] hover:text-[#1a5fa6]"
                                  >
                                    {cat.name}
                                  </button>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#e5e7eb] flex-wrap">
        <span className="text-[12px] text-[#6b7280]">
          {assignedCount} products assigned, {remainingCount} remaining
        </span>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* Scenario 3: save partial work and exit — remaining products stay flagged */}
          {onSaveAndExit && (
            <div className="text-right">
              <button
                onClick={() => onSaveAndExit(assignedCount, products.length)}
                disabled={assignedCount === 0}
                className="px-4 py-2 text-[13px] font-semibold border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save & Return to List
              </button>
              {remainingCount > 0 && assignedCount > 0 && (
                <p className="text-[11px] text-[#6b7280] mt-1">
                  {remainingCount} products will stay flagged as needing a category.
                </p>
              )}
            </div>
          )}
          <button
            onClick={onBack}
            disabled={remainingCount > 0}
            className="px-4 py-2 text-[13px] font-semibold text-white rounded bg-[#2e7d32] hover:bg-[#1b5e20] disabled:bg-[#9ca3af] disabled:cursor-not-allowed transition-colors"
          >
            Done — Return to Quick Pick
          </button>
        </div>
      </div>
    </div>
  )
}
