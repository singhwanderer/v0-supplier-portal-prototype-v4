"use client"

import { useState } from "react"
import { Sparkles, Copy } from "lucide-react"

// Scenario 2: TGC-style Product List drill-down (Selection Code List → Product List).
// Mirrors the classic TGC layout (breadcrumb, header info block, filter band, table)
// and adds category/enrichment visibility plus product-level enrichment CTAs.

type ProductEnrichmentStatus = "ai-enriched" | "in-progress" | "needs-enrichment"

export interface DrillDownProduct {
  id: string
  description: string
  gtins: number
  category: { name: string; brickCode: string } | null
}

interface ProductRow extends DrillDownProduct {
  createDate: string
  lastUpdateDate: string
  images: number
  status: ProductEnrichmentStatus
}

// Selection Code 002 (Sleepwear): coherent with the Category Coverage screen —
// 38 of 52 products have categories; the unassigned samples reappear here.
const PRODUCTS_BY_CODE: Record<string, ProductRow[]> = {
  "002": [
    { id: "S22011", description: "Cotton pajama set, long sleeve",   gtins: 6, category: { name: "Night Dresses/Shirts", brickCode: "10001339" },  createDate: "04/07/2021", lastUpdateDate: "06/24/2025", images: 3, status: "needs-enrichment" },
    { id: "S22014", description: "Plush fleece robe",                gtins: 4, category: { name: "Dressing Gowns", brickCode: "10001338" },        createDate: "04/07/2021", lastUpdateDate: "06/24/2025", images: 1, status: "needs-enrichment" },
    { id: "S22017", description: "Modal sleep shirt",                gtins: 5, category: { name: "Night Dresses/Shirts", brickCode: "10001339" },  createDate: "04/07/2021", lastUpdateDate: "03/12/2025", images: 1, status: "needs-enrichment" },
    { id: "S22021", description: "Kimono wrap robe",                 gtins: 4, category: { name: "Dressing Gowns", brickCode: "10001338" },        createDate: "04/07/2021", lastUpdateDate: "03/12/2025", images: 2, status: "needs-enrichment" },
    { id: "S22024", description: "Drawstring sleep pants",           gtins: 6, category: { name: "Sleep Trousers/Shorts", brickCode: "10001341" }, createDate: "04/07/2021", lastUpdateDate: "11/03/2025", images: 0, status: "needs-enrichment" },
    { id: "S22027", description: "Knit sleep shorts, two-pack",      gtins: 3, category: { name: "Sleep Trousers/Shorts", brickCode: "10001341" }, createDate: "04/07/2021", lastUpdateDate: "09/18/2025", images: 0, status: "needs-enrichment" },
    { id: "S22031", description: "Lace-trim chemise",                gtins: 5, category: { name: "Night Dresses/Shirts", brickCode: "10001339" },  createDate: "04/07/2021", lastUpdateDate: "09/18/2025", images: 1, status: "needs-enrichment" },
    { id: "S22034", description: "Hooded terry robe",                gtins: 4, category: { name: "Dressing Gowns", brickCode: "10001338" },        createDate: "04/07/2021", lastUpdateDate: "08/02/2025", images: 2, status: "needs-enrichment" },
    { id: "S22037", description: "Jogger-style lounge pants",        gtins: 5, category: { name: "Sleep Trousers/Shorts", brickCode: "10001341" }, createDate: "04/07/2021", lastUpdateDate: "08/02/2025", images: 1, status: "needs-enrichment" },
    { id: "S22041", description: "Silk nightgown collection",        gtins: 2, category: null,                                                    createDate: "05/28/2026", lastUpdateDate: "07/20/2026", images: 1, status: "needs-enrichment" },
    { id: "S22044", description: "Flannel pajama top",               gtins: 4, category: null,                                                    createDate: "05/28/2026", lastUpdateDate: "",           images: 1, status: "needs-enrichment" },
    { id: "S22047", description: "Satin camisole set",               gtins: 2, category: null,                                                    createDate: "05/28/2026", lastUpdateDate: "",           images: 0, status: "needs-enrichment" },
  ],
}

// Synthesized rows for codes without curated mock data, driven by the code's coverage numbers
function buildFallbackRows(code: string, metadata: { products: number; description: string; categoriesAssigned: number }): ProductRow[] {
  const rowCount = Math.min(metadata.products, 10)
  const assignedRows = metadata.products > 0 ? Math.round((metadata.categoriesAssigned / metadata.products) * rowCount) : 0
  return Array.from({ length: rowCount }, (_, i) => ({
    id: `P${code}${String(i + 1).padStart(3, "0")}`,
    description: `${metadata.description} item ${i + 1}`,
    gtins: 2 + (i % 4),
    category: i < assignedRows ? { name: metadata.description, brickCode: "10001000" } : null,
    createDate: "04/07/2021",
    lastUpdateDate: i % 3 === 0 ? "01/22/2026" : "",
    images: i % 3,
    status: "needs-enrichment",
  }))
}

interface ScreenProductListProps {
  code: string
  metadata: { gtins: number; products: number; description: string; categoriesAssigned: number }
  productEnrichmentUpdates: Record<string, ProductEnrichmentStatus>
  onBack: () => void
  onOpenGtinList: (product: DrillDownProduct) => void
  onEnrichProducts: (products: DrillDownProduct[]) => void
}

export function ScreenProductList({ code, metadata, productEnrichmentUpdates, onBack, onOpenGtinList, onEnrichProducts }: ScreenProductListProps) {
  const baseRows = PRODUCTS_BY_CODE[code] ?? buildFallbackRows(code, metadata)
  const rows: ProductRow[] = baseRows.map((row) => ({
    ...row,
    status: productEnrichmentUpdates[row.id] ?? row.status,
  }))
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))))
  }

  const selectedRows = rows.filter((r) => selectedIds.has(r.id))
  const selectedWithCategory = selectedRows.filter((r) => r.category !== null)
  const selectedWithoutCategory = selectedRows.length - selectedWithCategory.length

  // Expectation-setting copy for the bulk CTA — no black box
  const enrichHelperText = selectedRows.length === 0
    ? "Select products to enrich. Products need a category before attributes can be enriched."
    : selectedWithoutCategory === 0
      ? `Next: AI will suggest attribute values for the ${selectedRows.length} selected product${selectedRows.length === 1 ? "" : "s"} — you review and confirm before anything is saved.`
      : `Next: review category coverage — ${selectedWithCategory.length} of ${selectedRows.length} selected products have categories; you'll assign the remaining ${selectedWithoutCategory} before AI enriches attributes.`

  const handleBulkEnrich = () => {
    if (selectedRows.length === 0) return
    onEnrichProducts(selectedRows.map(({ id, description, gtins, category }) => ({ id, description, gtins, category })))
  }

  const statusBadge = (status: ProductEnrichmentStatus) => {
    if (status === "ai-enriched") {
      return <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded bg-[#dcfce7] text-[#166534]">AI Enriched</span>
    }
    if (status === "in-progress") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded bg-[#fef3c7] text-[#92400e]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
          In Progress
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded bg-[#f3f4f6] text-[#6b7280]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af]" />
        Needs Enrichment
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="text-[13px]" aria-label="Breadcrumb">
        <button onClick={onBack} className="text-[#1a5fa6] font-medium hover:underline focus:outline-none">
          Selection Code List
        </button>
        <span className="mx-1.5 text-[#9ca3af]">&gt;</span>
        <span className="font-semibold text-[#1a1f2e]">Product List</span>
      </nav>

      {/* Header info block — TGC-style */}
      <div className="bg-[#f0f1f3] border border-[#d1d5db] rounded px-4 py-3">
        <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-1 text-[13px] max-w-lg">
          <dt className="text-[#374151]">Company Name</dt>
          <dd className="font-semibold text-[#1a1f2e]">KIBBLES N BITS</dd>
          <dt className="text-[#374151]">Account Number</dt>
          <dd className="font-semibold text-[#1a1f2e]">125103335555</dd>
          <dt className="text-[#374151]">Selection Code</dt>
          <dd className="font-semibold text-[#1a1f2e]">
            {code} <button className="text-[#1a5fa6] font-normal hover:underline">(details)</button>
          </dd>
          <dt className="text-[#374151]">Description</dt>
          <dd className="font-semibold text-[#1a1f2e]">{metadata.description}</dd>
          <dt className="text-[#374151]">Total Products</dt>
          <dd className="font-semibold text-[#1a1f2e]">{metadata.products}</dd>
          <dt className="text-[#374151]">Categories Assigned</dt>
          <dd>
            {metadata.categoriesAssigned >= metadata.products ? (
              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded bg-[#dcfce7] text-[#166534]">
                All assigned ({metadata.categoriesAssigned}/{metadata.products})
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded bg-[#fef3c7] text-[#92400e]">
                {metadata.categoriesAssigned}/{metadata.products} assigned
              </span>
            )}
          </dd>
        </dl>
      </div>

      {/* Action bar with bulk enrich CTA */}
      <div className="bg-white border border-[#d1d5db] rounded px-4 py-2 space-y-1.5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedIds(new Set())} className="text-[12px] text-[#1a5fa6] hover:underline focus:outline-none">
              Clear Filter
            </button>
            {selectedIds.size > 0 && <span className="text-[12px] text-[#6b7280]">{selectedIds.size} selected</span>}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleBulkEnrich}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-semibold text-white rounded transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: "#1a5fa6" }}
            >
              <Sparkles className="w-4 h-4" />
              Enrich Selected Products with AI
            </button>
            <span className="text-[12px] text-[#6b7280]">
              1-{rows.length} of {metadata.products} records
            </span>
          </div>
        </div>
        <p className="text-[12px] text-[#6b7280] text-right" role="status">
          {enrichHelperText}
        </p>
      </div>

      {/* Products table */}
      <div className="bg-white border border-[#d1d5db] rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-[#f7f8fa] border-b border-[#d1d5db]">
              <tr>
                <th className="w-10 px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === rows.length && rows.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-[#d1d5db] text-[#1a5fa6] focus:ring-[#1a5fa6]"
                    aria-label="Select all products"
                  />
                </th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">Product</th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">Description</th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">Category</th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">Enrichment</th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">Create Date</th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">Last Update Date</th>
                <th className="px-3 py-2 text-right font-semibold text-[#374151]">GTINs</th>
                <th className="px-3 py-2 text-right font-semibold text-[#374151]">Images</th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-[#e5e7eb] hover:bg-[#f9fafb] transition-colors ${selectedIds.has(row.id) ? "bg-[#eff6ff]" : ""}`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleSelection(row.id)}
                      className="w-4 h-4 rounded border-[#d1d5db] text-[#1a5fa6] focus:ring-[#1a5fa6]"
                      aria-label={`Select ${row.id}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => onOpenGtinList({ id: row.id, description: row.description, gtins: row.gtins, category: row.category })}
                        className="font-mono text-[#1a5fa6] hover:underline focus:outline-none"
                        title={`View GTINs for ${row.id}`}
                      >
                        {row.id}
                      </button>
                      <Copy className="w-3.5 h-3.5 text-[#9ca3af]" aria-hidden="true" />
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[#374151]">{row.description}</td>
                  <td className="px-3 py-2">
                    {row.category ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-[#166534] text-[12px] font-medium">{row.category.name}</span>
                        <span className="text-[10px] font-mono text-[#9ca3af]">{row.category.brickCode}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded bg-[#f3f4f6] text-[#6b7280]">
                        Not assigned
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{statusBadge(row.status)}</td>
                  <td className="px-3 py-2 text-[#6b7280]">{row.createDate}</td>
                  <td className="px-3 py-2 text-[#6b7280]">{row.lastUpdateDate}</td>
                  <td className="px-3 py-2 text-right text-[#1a5fa6]">{row.gtins}</td>
                  <td className="px-3 py-2 text-right text-[#1a5fa6]">{row.images}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => onEnrichProducts([{ id: row.id, description: row.description, gtins: row.gtins, category: row.category }])}
                      disabled={row.category === null}
                      title={row.category === null ? "Assign a category first" : `Enrich ${row.id} with AI`}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#1a5fa6] border border-[#1a5fa6] rounded bg-white hover:bg-[#eff6ff] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
                    >
                      <Sparkles className="w-3 h-3" aria-hidden="true" />
                      Enrich
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-[#e5e7eb] bg-[#f9fafb]">
          <span className="text-[12px] text-[#6b7280]">
            Showing 1 to {rows.length} of {metadata.products} entries
          </span>
        </div>
      </div>
    </div>
  )
}
