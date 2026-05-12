"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, ChevronDown, ChevronRight, Search, ChevronLeft } from "lucide-react"

// Fix 1A: Product-level mock data with expandable GTIN sub-tables
interface ChildGtin {
  gtin: string
  colorCode: string
  sizeCode: string
}

interface ProductRecord {
  product: string
  gtins: number
  selCode: string
  confidence: number
  category: string
  childGtins: ChildGtin[]
  declined: boolean
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

// Exact mock data from specification
const MOCK_PRODUCTS: ProductRecord[] = [
  {
    product: "Men's Oxford Dress Shoe",
    gtins: 8,
    selCode: "001",
    confidence: 0.98,
    category: "Shoes - General Purpose",
    childGtins: [
      { gtin: "0888546413183", colorCode: "001 - Black", sizeCode: "10070 - 9" },
      { gtin: "0888546413184", colorCode: "002 - Brown", sizeCode: "10070 - 9" },
      { gtin: "0888546413185", colorCode: "001 - Black", sizeCode: "10080 - 10" },
    ],
    declined: false,
  },
  {
    product: "Women's Canvas Slip-on",
    gtins: 6,
    selCode: "001",
    confidence: 0.97,
    category: "Shoes - General Purpose",
    childGtins: [
      { gtin: "0888546413190", colorCode: "010 - White", sizeCode: "10060 - 7" },
      { gtin: "0888546413191", colorCode: "003 - Navy", sizeCode: "10060 - 7" },
    ],
    declined: false,
  },
  {
    product: "Kids' Velcro Sneaker",
    gtins: 10,
    selCode: "001",
    confidence: 0.85,
    category: "Shoes - General Purpose",
    childGtins: [
      { gtin: "0888546413200", colorCode: "005 - Red", sizeCode: "10030 - 1" },
      { gtin: "0888546413201", colorCode: "001 - Black", sizeCode: "10035 - 2" },
    ],
    declined: false,
  },
  {
    product: "Leather Moccasin Loafer",
    gtins: 4,
    selCode: "001",
    confidence: 0.85,
    category: "Shoes - General Purpose",
    childGtins: [
      { gtin: "0888546413210", colorCode: "002 - Brown", sizeCode: "10080 - 10" },
      { gtin: "0888546413211", colorCode: "006 - Tan", sizeCode: "10090 - 11" },
    ],
    declined: false,
  },
  {
    product: "Platform Wedge Sandal",
    gtins: 5,
    selCode: "001",
    confidence: 0.93,
    category: "Shoes - General Purpose",
    childGtins: [
      { gtin: "0888546413220", colorCode: "010 - White", sizeCode: "10060 - 7" },
      { gtin: "0888546413221", colorCode: "001 - Black", sizeCode: "10065 - 8" },
    ],
    declined: false,
  },
  {
    product: "Suede Chelsea Boot",
    gtins: 7,
    selCode: "001",
    confidence: 0.94,
    category: "Shoes - General Purpose",
    childGtins: [
      { gtin: "0888546413230", colorCode: "006 - Tan", sizeCode: "10080 - 10" },
      { gtin: "0888546413231", colorCode: "002 - Brown", sizeCode: "10085 - 10.5" },
    ],
    declined: false,
  },
  {
    product: "Mesh Running Trainer",
    gtins: 12,
    selCode: "001",
    confidence: 0.90,
    category: "Shoes - General Purpose",
    childGtins: [
      { gtin: "0888546413240", colorCode: "005 - Red", sizeCode: "10080 - 10" },
      { gtin: "0888546413241", colorCode: "003 - Navy", sizeCode: "10090 - 11" },
      { gtin: "0888546413242", colorCode: "010 - White", sizeCode: "10070 - 9" },
    ],
    declined: false,
  },
  {
    product: "Waterproof Hiking Shoe",
    gtins: 3,
    selCode: "001",
    confidence: 0.95,
    category: "Shoes - General Purpose",
    childGtins: [
      { gtin: "0888546413250", colorCode: "004 - Grey", sizeCode: "10080 - 10" },
      { gtin: "0888546413251", colorCode: "001 - Black", sizeCode: "10090 - 11" },
    ],
    declined: false,
  },
]

// Bug 2 fix: Low-confidence category mock data
const LOW_CONFIDENCE_SHOES: ProductRecord[] = [
  { product: "Blue canvas sneaker collection", gtins: 4, selCode: "001", confidence: 0.55, category: "Shoes - General Purpose", childGtins: [{ gtin: "0888546414001", colorCode: "003 - Navy", sizeCode: "10070 - 9" }], declined: false },
  { product: "Running shoe series, mesh upper", gtins: 6, selCode: "001", confidence: 0.50, category: "Shoes - General Purpose", childGtins: [{ gtin: "0888546414002", colorCode: "010 - White", sizeCode: "10080 - 10" }], declined: false },
  { product: "Casual lace-up walking shoe", gtins: 3, selCode: "001", confidence: 0.48, category: "Shoes - General Purpose", childGtins: [{ gtin: "0888546414003", colorCode: "001 - Black", sizeCode: "10075 - 9.5" }], declined: false },
  { product: "Slip-on garden clog", gtins: 2, selCode: "001", confidence: 0.52, category: "Shoes - General Purpose", childGtins: [{ gtin: "0888546414004", colorCode: "007 - Green", sizeCode: "10065 - 8" }], declined: false },
  { product: "Platform espadrille", gtins: 3, selCode: "001", confidence: 0.49, category: "Shoes - General Purpose", childGtins: [{ gtin: "0888546414005", colorCode: "008 - Beige", sizeCode: "10060 - 7" }], declined: false },
  { product: "Woven slide sandal", gtins: 2, selCode: "001", confidence: 0.53, category: "Shoes - General Purpose", childGtins: [{ gtin: "0888546414006", colorCode: "002 - Brown", sizeCode: "10070 - 9" }], declined: false },
  { product: "Ankle-strap flat", gtins: 1, selCode: "001", confidence: 0.51, category: "Shoes - General Purpose", childGtins: [{ gtin: "0888546414007", colorCode: "001 - Black", sizeCode: "10065 - 8" }], declined: false },
  { product: "Studded mule", gtins: 2, selCode: "001", confidence: 0.54, category: "Shoes - General Purpose", childGtins: [{ gtin: "0888546414008", colorCode: "006 - Tan", sizeCode: "10070 - 9" }], declined: false },
]

const LOW_CONFIDENCE_NIGHTWEAR: ProductRecord[] = [
  { product: "Silk nightgown collection", gtins: 2, selCode: "001", confidence: 0.46, category: "Night Dresses/Shirts", childGtins: [{ gtin: "0888546415001", colorCode: "011 - Pink", sizeCode: "10040 - S" }], declined: false },
  { product: "Cotton sleep shorts set", gtins: 3, selCode: "001", confidence: 0.44, category: "Night Dresses/Shirts", childGtins: [{ gtin: "0888546415002", colorCode: "003 - Navy", sizeCode: "10050 - M" }], declined: false },
  { product: "Flannel pajama top", gtins: 4, selCode: "001", confidence: 0.48, category: "Night Dresses/Shirts", childGtins: [{ gtin: "0888546415003", colorCode: "005 - Red", sizeCode: "10060 - L" }], declined: false },
  { product: "Satin camisole set", gtins: 2, selCode: "001", confidence: 0.45, category: "Night Dresses/Shirts", childGtins: [{ gtin: "0888546415004", colorCode: "010 - White", sizeCode: "10040 - S" }], declined: false },
  { product: "Jersey sleep dress", gtins: 3, selCode: "001", confidence: 0.47, category: "Night Dresses/Shirts", childGtins: [{ gtin: "0888546415005", colorCode: "004 - Grey", sizeCode: "10050 - M" }], declined: false },
  { product: "Thermal henley nightshirt", gtins: 2, selCode: "001", confidence: 0.43, category: "Night Dresses/Shirts", childGtins: [{ gtin: "0888546415006", colorCode: "001 - Black", sizeCode: "10060 - L" }], declined: false },
]

const LOW_CONFIDENCE_BRACELETS: ProductRecord[] = [
  { product: "Silver charm bracelet line", gtins: 1, selCode: "001", confidence: 0.42, category: "Bracelets", childGtins: [{ gtin: "0888546416001", colorCode: "012 - Silver", sizeCode: "10001 - OS" }], declined: false },
  { product: "Gold bangle set", gtins: 2, selCode: "001", confidence: 0.44, category: "Bracelets", childGtins: [{ gtin: "0888546416002", colorCode: "013 - Gold", sizeCode: "10001 - OS" }], declined: false },
  { product: "Leather wrap bracelet", gtins: 1, selCode: "001", confidence: 0.46, category: "Bracelets", childGtins: [{ gtin: "0888546416003", colorCode: "002 - Brown", sizeCode: "10001 - OS" }], declined: false },
  { product: "Beaded stretch bracelet", gtins: 3, selCode: "001", confidence: 0.45, category: "Bracelets", childGtins: [{ gtin: "0888546416004", colorCode: "014 - Multi", sizeCode: "10001 - OS" }], declined: false },
]

// Bug 2 fix: Map category IDs to their respective mock data
const CATEGORY_DATA_MAP: Record<string, ProductRecord[]> = {
  // High-confidence categories (from INITIAL_CATEGORIES)
  "1": MOCK_PRODUCTS,
  "2": MOCK_PRODUCTS,
  "3": MOCK_PRODUCTS,
  // Low-confidence categories (from LOW_CONFIDENCE_CATEGORIES)
  "lc1": LOW_CONFIDENCE_SHOES,
  "lc2": LOW_CONFIDENCE_NIGHTWEAR,
  "lc3": LOW_CONFIDENCE_BRACELETS,
}

const ITEMS_PER_PAGE = 25

export function ScreenBrickGtinList({ categoryId, categoryName, onBack }: ScreenBrickGtinListProps) {
  // Bug 2 fix: Select correct mock data based on categoryId
  const initialProducts = CATEGORY_DATA_MAP[categoryId] || MOCK_PRODUCTS
  const [products, setProducts] = useState<ProductRecord[]>(initialProducts)
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())
  const [movingProduct, setMovingProduct] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)

  // Filter and search
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.declined) return false
      const matchesSearch =
        searchQuery === "" ||
        p.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.childGtins.some((g) => g.gtin.includes(searchQuery))
      return matchesSearch
    })
  }, [products, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const activeCount = products.filter((p) => !p.declined).length

  const toggleExpanded = (product: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev)
      if (next.has(product)) {
        next.delete(product)
      } else {
        next.add(product)
      }
      return next
    })
  }

  const handleMoveCategory = (product: string, newCategory: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.product === product ? { ...p, category: newCategory } : p))
    )
    setMovingProduct(null)
    setSelectedCategory("")
  }

  const handleCancelMove = () => {
    setMovingProduct(null)
    setSelectedCategory("")
  }

  const handleDecline = (product: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.product === product ? { ...p, declined: true } : p))
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with back arrow */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded border border-[#d1d5db] bg-white hover:bg-[#f3f4f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
          aria-label="Back to categories"
        >
          <ArrowLeft className="w-4 h-4 text-[#374151]" aria-hidden="true" />
        </button>
        <div>
          <h2 className="text-[16px] font-semibold text-[#1a1f2e]">{categoryName}</h2>
          <p className="text-[13px] text-[#6b7280]">
            125 products in this category. Move any that don&apos;t fit, or decline the ones you don&apos;t want to enrich.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-white border border-[#d1d5db] rounded p-3">
        <div className="flex items-center gap-4 text-[12px]">
          <span className="font-medium text-[#374151]">{activeCount} active</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af]" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search product or GTIN..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-8 pr-3 py-1.5 text-[12px] border border-[#d1d5db] rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1a5fa6] w-56"
            />
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div className="rounded border border-[#d1d5db] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#f7f8fa] border-b border-[#d1d5db]">
                <th className="text-left px-3 py-2 font-semibold text-[#374151]">Product</th>
                <th className="text-left px-3 py-2 font-semibold text-[#374151] w-16">GTINs</th>
                <th className="text-left px-3 py-2 font-semibold text-[#374151] w-20">Sel. Code</th>
                <th className="text-left px-3 py-2 font-semibold text-[#374151] w-28">Confidence</th>
                <th className="text-left px-3 py-2 font-semibold text-[#374151]">Category</th>
                <th className="text-left px-3 py-2 font-semibold text-[#374151] w-40">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product, idx) => {
                const isExpanded = expandedProducts.has(product.product)
                const confidencePercent = Math.round(product.confidence * 100)
                const isLowConfidence = confidencePercent < 85

                return (
                  <>
                    {/* Product row */}
                    <tr
                      key={product.product}
                      className={`border-b border-[#e5e7eb] ${idx % 2 === 0 ? "bg-white" : "bg-[#fafbfc]"}`}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleExpanded(product.product)}
                            className="p-0.5 rounded hover:bg-[#f3f4f6] transition-colors"
                            aria-label={isExpanded ? "Collapse GTINs" : "Expand GTINs"}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[#6b7280]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-[#6b7280]" />
                            )}
                          </button>
                          <span className="text-[#1a1f2e]">{product.product}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[#374151]">{product.gtins}</td>
                      <td className="px-3 py-2">
                        <span className="font-mono text-[11px] px-1.5 py-0.5 bg-[#eff6ff] text-[#1a5fa6] rounded border border-[#bfdbfe] cursor-pointer hover:bg-[#dbeafe]">
                          {product.selCode}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-[#e8eaed] overflow-hidden max-w-16">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${confidencePercent}%`,
                                backgroundColor: isLowConfidence ? "#f59e0b" : "#2e7d32",
                              }}
                            />
                          </div>
                          <span className={`text-[12px] w-8 ${isLowConfidence ? "text-[#92400e]" : "text-[#374151]"}`}>
                            {confidencePercent}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {movingProduct === product.product ? (
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="appearance-none pl-2 pr-7 py-1 text-[12px] border border-[#d1d5db] rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1a5fa6]"
                              >
                                <option value="">Select category...</option>
                                {AVAILABLE_CATEGORIES.filter((c) => c !== product.category).map((cat) => (
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
                              onClick={() => selectedCategory && handleMoveCategory(product.product, selectedCategory)}
                              disabled={!selectedCategory}
                              className="px-2 py-1 text-[11px] font-medium rounded bg-[#2e7d32] text-white hover:bg-[#1b5e20] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={handleCancelMove}
                              className="px-2 py-1 text-[11px] font-medium rounded border border-[#d1d5db] bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className="text-[12px] text-[#6b7280]">
                            {product.category.length > 25 ? `${product.category.slice(0, 25)}...` : product.category}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {movingProduct !== product.product && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setMovingProduct(product.product)}
                              className="px-2 py-1 text-[11px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors"
                            >
                              Move
                            </button>
                            <button
                              onClick={() => handleDecline(product.product)}
                              className="px-2 py-1 text-[11px] font-medium border border-[#fecaca] rounded bg-white text-[#dc2626] hover:bg-[#fef2f2] transition-colors"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Expanded GTIN sub-table */}
                    {isExpanded && (
                      <tr key={`${product.product}-gtins`}>
                        <td colSpan={6} className="p-0">
                          <div className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                            <table className="w-full text-[12px]">
                              <thead>
                                <tr className="border-b border-[#e5e7eb]">
                                  <th className="text-left px-6 py-1.5 font-medium text-[#6b7280] w-40">GTIN</th>
                                  <th className="text-left px-3 py-1.5 font-medium text-[#6b7280]">Color Code</th>
                                  <th className="text-left px-3 py-1.5 font-medium text-[#6b7280]">Size Code</th>
                                </tr>
                              </thead>
                              <tbody>
                                {product.childGtins.map((child) => (
                                  <tr key={child.gtin} className="border-b border-[#f3f4f6] last:border-0">
                                    <td className="px-6 py-1.5 font-mono text-[11px] text-[#374151]">{child.gtin}</td>
                                    <td className="px-3 py-1.5 text-[#374151]">{child.colorCode}</td>
                                    <td className="px-3 py-1.5 text-[#374151]">{child.sizeCode}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 bg-[#f7f8fa] border-t border-[#d1d5db]">
            <span className="text-[12px] text-[#6b7280]">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of{" "}
              {filteredProducts.length} products
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
