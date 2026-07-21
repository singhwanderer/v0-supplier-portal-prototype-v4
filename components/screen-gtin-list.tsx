"use client"

import { Sparkles, Copy } from "lucide-react"
import type { DrillDownProduct } from "@/components/screen-product-list"

// Scenario 2: TGC-style GTIN List drill-down (Product List → GTIN List).
// Single header-level "Enrich Attributes with AI" CTA for the whole product;
// the assigned category is surfaced in the header info block.

interface GtinRow {
  gtin: string
  gtinType: string
  pack: string
  color: string
  colorDescription: string
  size: string
  sizeDescription: string
  publishedCost: string
  suggestedRetail: string
  createDate: string
  lastUpdateDate: string
  discontinueDate: string
  images: number
}

const GTINS_BY_PRODUCT: Record<string, GtinRow[]> = {
  S22011: [
    { gtin: "114415881201", gtinType: "UA", pack: "",   color: "105", colorDescription: "Blush",     size: "10006", sizeDescription: "Small",  publishedCost: "",         suggestedRetail: "",         createDate: "05/28/2026", lastUpdateDate: "07/20/2026", discontinueDate: "", images: 1 },
    { gtin: "214415881201", gtinType: "UA", pack: "",   color: "106", colorDescription: "Navy",      size: "10006", sizeDescription: "Small",  publishedCost: "",         suggestedRetail: "",         createDate: "05/28/2026", lastUpdateDate: "",           discontinueDate: "", images: 1 },
    { gtin: "334415881201", gtinType: "UA", pack: "",   color: "505", colorDescription: "Ivory",     size: "10009", sizeDescription: "Medium", publishedCost: "",         suggestedRetail: "",         createDate: "05/28/2026", lastUpdateDate: "",           discontinueDate: "", images: 1 },
    { gtin: "574211012895", gtinType: "UA", pack: "PP", color: "203", colorDescription: "Heather",   size: "10005", sizeDescription: "Large",  publishedCost: "multiple", suggestedRetail: "multiple", createDate: "01/22/2026", lastUpdateDate: "03/24/2026", discontinueDate: "", images: 4 },
    { gtin: "574211012904", gtinType: "UA", pack: "PP", color: "203", colorDescription: "Heather",   size: "10015", sizeDescription: "XLarge", publishedCost: "multiple", suggestedRetail: "multiple", createDate: "03/10/2026", lastUpdateDate: "",           discontinueDate: "", images: 1 },
  ],
}

// Synthesized rows so every product renders a plausible GTIN list
function buildFallbackGtins(product: DrillDownProduct): GtinRow[] {
  return Array.from({ length: Math.max(product.gtins, 1) }, (_, i) => ({
    gtin: `${(i + 1) * 111111111111 % 999999999999}`.padStart(12, "0"),
    gtinType: "UA",
    pack: i % 3 === 0 ? "PP" : "",
    color: `${100 + i}`,
    colorDescription: `Color${100 + i}`,
    size: `${10001 + i}`,
    sizeDescription: `Size${10001 + i}`,
    publishedCost: "",
    suggestedRetail: "",
    createDate: "05/28/2026",
    lastUpdateDate: i === 0 ? "07/20/2026" : "",
    discontinueDate: "",
    images: 1,
  }))
}

interface ScreenGtinListProps {
  code: string
  codeDescription: string
  product: DrillDownProduct
  onBack: () => void
  onBackToSelectionCodes: () => void
  onEnrich: () => void
}

export function ScreenGtinList({ code, codeDescription, product, onBack, onBackToSelectionCodes, onEnrich }: ScreenGtinListProps) {
  const rows = GTINS_BY_PRODUCT[product.id] ?? buildFallbackGtins(product)
  const hasCategory = product.category !== null

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="text-[13px]" aria-label="Breadcrumb">
        <button onClick={onBackToSelectionCodes} className="text-[#1a5fa6] font-medium hover:underline focus:outline-none">
          Selection Code List
        </button>
        <span className="mx-1.5 text-[#9ca3af]">&gt;</span>
        <button onClick={onBack} className="text-[#1a5fa6] font-medium hover:underline focus:outline-none">
          Product List
        </button>
        <span className="mx-1.5 text-[#9ca3af]">&gt;</span>
        <span className="font-semibold text-[#1a1f2e]">GTIN List</span>
      </nav>

      {/* Header info block with product-level enrichment CTA */}
      <div className="bg-[#f0f1f3] border border-[#d1d5db] rounded px-4 py-3">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-1 text-[13px] max-w-lg">
            <dt className="text-[#374151]">Company Name</dt>
            <dd className="font-semibold text-[#1a1f2e]">KIBBLES N BITS</dd>
            <dt className="text-[#374151]">Account Number</dt>
            <dd className="font-semibold text-[#1a1f2e]">125103335555</dd>
            <dt className="text-[#374151]">Selection Code</dt>
            <dd className="font-semibold text-[#1a1f2e]">
              <button onClick={onBack} className="text-[#1a5fa6] hover:underline">{code}</button>{" "}
              <span className="font-normal text-[#6b7280]">{codeDescription}</span>
            </dd>
            <dt className="text-[#374151]">Product</dt>
            <dd className="font-semibold text-[#1a1f2e]">
              {product.id} <button className="text-[#1a5fa6] font-normal hover:underline">(details)</button>
            </dd>
            <dt className="text-[#374151]">Product Description</dt>
            <dd className="font-semibold text-[#1a1f2e]">{product.description}</dd>
            <dt className="text-[#374151]">Category</dt>
            <dd>
              {product.category ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-semibold text-[#166534]">{product.category.name}</span>
                  <span className="text-[10px] font-mono text-[#9ca3af]">{product.category.brickCode}</span>
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded bg-[#f3f4f6] text-[#6b7280]">
                  Not assigned
                </span>
              )}
            </dd>
            <dt className="text-[#374151]">Total GTINs</dt>
            <dd className="font-semibold text-[#1a1f2e]">{rows.length}</dd>
          </dl>
          <div className="shrink-0">
            <button
              onClick={onEnrich}
              disabled={!hasCategory}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white rounded transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
              style={{ backgroundColor: "#1a5fa6" }}
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              Enrich Attributes with AI
            </button>
            <p className="text-[11px] text-[#6b7280] mt-1.5 max-w-[240px]">
              {hasCategory
                ? `AI will suggest attribute values for all ${rows.length} GTINs of this product — you review before anything is saved.`
                : "Assign a category to this product first — attributes can only be enriched for categorized products."}
            </p>
          </div>
        </div>
      </div>

      {/* GTIN table */}
      <div className="bg-white border border-[#d1d5db] rounded overflow-hidden">
        <div className="px-4 py-2 border-b border-[#e5e7eb] flex items-center justify-between">
          <span className="text-[12px] text-[#1a5fa6] hover:underline cursor-pointer">Clear Filter</span>
          <span className="text-[12px] text-[#6b7280]">1-{rows.length} of {rows.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-[#f7f8fa] border-b border-[#d1d5db]">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">GTIN</th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">GTIN Type</th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">Pack</th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">Color</th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">Color Description</th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">Size</th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">Size Description</th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">Published Cost</th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">Suggested Retail</th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">Create Date</th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">Last Update Date</th>
                <th className="px-3 py-2 text-left font-semibold text-[#374151]">Discontinue Date</th>
                <th className="px-3 py-2 text-right font-semibold text-[#374151]">Images</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.gtin} className="border-b border-[#e5e7eb] hover:bg-[#f9fafb] transition-colors">
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-mono text-[#1a5fa6]">{row.gtin}</span>
                      <Copy className="w-3.5 h-3.5 text-[#9ca3af]" aria-hidden="true" />
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[#374151]">{row.gtinType}</td>
                  <td className="px-3 py-2 text-[#374151]">{row.pack}</td>
                  <td className="px-3 py-2 text-[#374151]">{row.color}</td>
                  <td className="px-3 py-2 text-[#374151]">{row.colorDescription}</td>
                  <td className="px-3 py-2 text-[#374151]">{row.size}</td>
                  <td className="px-3 py-2 text-[#374151]">{row.sizeDescription}</td>
                  <td className="px-3 py-2 text-[#6b7280]">{row.publishedCost}</td>
                  <td className="px-3 py-2 text-[#6b7280]">{row.suggestedRetail}</td>
                  <td className="px-3 py-2 text-[#6b7280]">{row.createDate}</td>
                  <td className="px-3 py-2 text-[#6b7280]">{row.lastUpdateDate}</td>
                  <td className="px-3 py-2 text-[#6b7280]">{row.discontinueDate}</td>
                  <td className="px-3 py-2 text-right text-[#1a5fa6]">{row.images}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
