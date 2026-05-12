"use client"

import { useState, useMemo } from "react"
import { CheckCircle2, Pencil, X, Check, AlertTriangle, ChevronLeft, ChevronRight, Zap, Search } from "lucide-react"
import type { ConfirmedCategory } from "@/app/page"

interface AttrRow {
  attribute: string
  aiValue: string
  confidence: number
  reason: string
  status: "confirmed" | "pending" | "edited"
  editedValue?: string
}

interface GTINRecord {
  gtin: string
  description: string
  rows: AttrRow[]
}

interface Screen3Props {
  category: string
  confirmedCategories: ConfirmedCategory[]
  onBack: () => void
  onConfirmGroup: () => void
}

// Attribute templates per category id
const ATTR_TEMPLATES: Record<string, AttrRow[]> = {
  "1": [
    { attribute: "Closure Type",   aiValue: "Lace-up",    confidence: 98, reason: '"lace-up" in description',          status: "confirmed" },
    { attribute: "Upper Material", aiValue: "Suede/Mesh", confidence: 95, reason: '"suede" and "mesh" in description', status: "confirmed" },
    { attribute: "Faux Fur",       aiValue: "No",         confidence: 97, reason: "no fur/faux fur in material list",  status: "confirmed" },
    { attribute: "Sole Material",  aiValue: "Rubber",     confidence: 82, reason: "common for this boot type",         status: "pending"   },
  ],
  "2": [
    { attribute: "Neckline",      aiValue: "V-Neck",  confidence: 91, reason: '"v-neck" in product title',    status: "confirmed" },
    { attribute: "Sleeve Length", aiValue: "Short",   confidence: 88, reason: "sleeve info in description",   status: "pending"   },
    { attribute: "Fabric",        aiValue: "Cotton",  confidence: 94, reason: '"100% cotton" on label',       status: "confirmed" },
    { attribute: "Fit",           aiValue: "Regular", confidence: 85, reason: "standard sizing chart match",  status: "confirmed" },
  ],
  "3": [
    { attribute: "Strap Type",      aiValue: "Double",   confidence: 97, reason: "double strap in image alt text", status: "confirmed" },
    { attribute: "Closure",         aiValue: "Magnetic", confidence: 93, reason: "product detail mentions magnet",  status: "confirmed" },
    { attribute: "Lining Material", aiValue: "Suede",    confidence: 89, reason: '"suede lining" in description',   status: "confirmed" },
  ],
  "default": [
    { attribute: "Material",  aiValue: "Mixed",   confidence: 88, reason: "inferred from product description", status: "confirmed" },
    { attribute: "Style",     aiValue: "Classic", confidence: 84, reason: "matched to category norms",         status: "pending"   },
  ],
}

const DESCRIPTIONS: Record<string, string[]> = {
  "1": ["Women's Ankle Boot — Suede", "Women's Ankle Boot — Leather", "Women's Chelsea Boot Black", "Women's Combat Boot", "Women's Heeled Ankle Boot"],
  "2": ["Women's Floral Midi Dress", "Women's Wrap Dress Navy", "Women's A-Line Summer Dress", "Women's Shift Dress Cotton", "Women's Maxi Dress Print"],
  "3": ["Women's Leather Tote Bag", "Women's Canvas Tote Large", "Women's Structured Tote Black", "Women's Everyday Tote Tan", "Women's Work Tote Professional"],
}

function generateGtins(categoryId: string, count: number): GTINRecord[] {
  const descs = DESCRIPTIONS[categoryId] ?? ["Product Item"]
  const template = ATTR_TEMPLATES[categoryId] ?? ATTR_TEMPLATES["default"]
  return Array.from({ length: count }, (_, i) => ({
    gtin: `0${String(888546413183 + i).padStart(12, "0")}`,
    description: descs[i % descs.length],
    rows: template.map((r) => ({ ...r })),
  }))
}

const ITEMS_PER_PAGE = 10

function ConfidenceBar({ value }: { value: number }) {
  const filled = Math.round(value / 25)
  const color = value >= 90 ? "#2e7d32" : value >= 70 ? "#f59e0b" : "#dc2626"
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-2 h-1.5 rounded-sm" style={{ backgroundColor: i < filled ? color : "#e8eaed" }} />
        ))}
      </div>
      <span className="text-[12px] tabular-nums" style={{ color }}>{value}%</span>
    </div>
  )
}

interface EditableAttrRowProps {
  row: AttrRow
  onConfirm: () => void
  onEdit: (val: string) => void
  onBulkApply?: () => void
}
function EditableAttrRow({ row, onConfirm, onEdit, onBulkApply }: EditableAttrRowProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(row.editedValue ?? row.aiValue)

  return (
    <tr className={`border-b border-[#f0f0f0] last:border-0 text-[13px] ${row.confidence < 90 && row.status === "pending" ? "bg-[#fffbeb]" : ""}`}>
      <td className="px-3 py-2 text-[#374151] font-medium">{row.attribute}</td>
      <td className="px-3 py-2">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              className="border border-[#1a5fa6] rounded px-2 py-0.5 text-[13px] w-28 focus:outline-none focus:ring-1 focus:ring-[#1a5fa6]"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
            />
            <button onClick={() => { onEdit(editValue); setEditing(false) }} className="p-1 rounded hover:bg-[#e8f5e9] text-[#2e7d32]" aria-label="Save">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setEditing(false); setEditValue(row.editedValue ?? row.aiValue) }} className="p-1 rounded hover:bg-[#fef2f2] text-[#dc2626]" aria-label="Cancel">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <span className="text-[#1a1f2e]">{row.editedValue ?? row.aiValue}</span>
        )}
      </td>
      <td className="px-3 py-2"><ConfidenceBar value={row.confidence} /></td>
      <td className="px-3 py-2 text-[12px] text-[#6b7280] max-w-[180px]">{row.reason}</td>
      <td className="px-3 py-2">
        {(row.status === "confirmed" || row.status === "edited") ? (
          <div className="space-y-0.5">
            <span className="flex items-center gap-1 text-[12px] font-medium text-[#2e7d32]">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              {row.status === "edited" ? "Edited" : "Confirmed"}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-[11px] text-[#1a5fa6] hover:underline">
                <Pencil className="w-3 h-3" aria-hidden="true" /> Edit
              </button>
              {onBulkApply && (
                <button onClick={onBulkApply} className="text-[11px] text-[#6b7280] hover:text-[#1a5fa6] hover:underline">
                  Apply to all
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onConfirm}
              className="px-2.5 py-1 text-[12px] font-medium text-white rounded hover:opacity-90"
              style={{ backgroundColor: "#1a5fa6" }}
            >
              Confirm
            </button>
            <button
              onClick={() => setEditing(true)}
              className="px-2.5 py-1 text-[12px] font-medium border border-[#d1d5db] rounded text-[#374151] hover:bg-[#f3f4f6]"
            >
              Edit
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

export function Screen3Review({ category, confirmedCategories, onBack, onConfirmGroup }: Screen3Props) {
  // Resolve which category data to show
  const activeCat = confirmedCategories.find((c) => c.id === category) ?? confirmedCategories[0]
  const catId = activeCat?.id ?? "1"
  const catName = activeCat?.name ?? "Women's Footwear — Ankle Boots"
  const catGtinCount = activeCat?.gtinCount ?? 87

  const [gtins, setGtins] = useState<GTINRecord[]>(() => generateGtins(catId, Math.min(catGtinCount, 50)))
  const [bulkMsg, setBulkMsg] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [confidenceThreshold, setConfidenceThreshold] = useState<number | null>(null)

  // Filter by search
  const filteredGtins = useMemo(() => {
    if (!searchQuery) return gtins
    const q = searchQuery.toLowerCase()
    return gtins.filter((g) => g.gtin.includes(q) || g.description.toLowerCase().includes(q))
  }, [gtins, searchQuery])

  const totalPages = Math.ceil(filteredGtins.length / ITEMS_PER_PAGE)
  const paginatedGtins = filteredGtins.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const allRows = gtins.flatMap((g) => g.rows)
  const totalConfirmed = allRows.filter((r) => r.status === "confirmed" || r.status === "edited").length
  const totalPending = allRows.filter((r) => r.status === "pending").length
  const progressPct = allRows.length > 0 ? Math.round((totalConfirmed / allRows.length) * 100) : 0

  const handleConfirm = (gtinIdx: number, rowIdx: number) => {
    setGtins((prev) =>
      prev.map((g, gi) => gi !== gtinIdx ? g : {
        ...g, rows: g.rows.map((r, ri) => ri !== rowIdx ? r : { ...r, status: "confirmed" as const })
      })
    )
  }

  const handleEdit = (gtinIdx: number, rowIdx: number, val: string) => {
    setGtins((prev) =>
      prev.map((g, gi) => gi !== gtinIdx ? g : {
        ...g, rows: g.rows.map((r, ri) => ri !== rowIdx ? r : { ...r, editedValue: val, status: "edited" as const })
      })
    )
  }

  const handleBulkApply = (attribute: string, value: string) => {
    setGtins((prev) => prev.map((g) => ({
      ...g,
      rows: g.rows.map((r) =>
        r.attribute === attribute && r.status !== "edited"
          ? { ...r, editedValue: value, status: "confirmed" as const }
          : r
      ),
    })))
    setBulkMsg(`"${attribute}" set to "${value}" across all GTINs in this group.`)
    setTimeout(() => setBulkMsg(null), 4000)
  }

  const handleBatchConfirmByThreshold = (threshold: number) => {
    let count = 0
    setGtins((prev) => prev.map((g) => ({
      ...g,
      rows: g.rows.map((r) => {
        if (r.status === "pending" && r.confidence >= threshold) {
          count++
          return { ...r, status: "confirmed" as const }
        }
        return r
      }),
    })))
    setConfidenceThreshold(threshold)
    setBulkMsg(`Batch confirmed all attributes with confidence ≥${threshold}%. Review remaining ${totalPending - count > 0 ? totalPending - count : 0} pending.`)
    setTimeout(() => setBulkMsg(null), 5000)
  }

  return (
    <div className="max-w-5xl space-y-3">
      {/* Breadcrumb */}
      <nav className="text-[12px] text-[#6b7280]" aria-label="Breadcrumb">
        <button onClick={onBack} className="hover:text-[#1a5fa6] hover:underline focus:outline-none">Enrichment Summary</button>
        <span className="mx-1.5">›</span>
        <span className="text-[#1a1f2e] font-medium">{catName}</span>
      </nav>

      {/* Header + progress */}
      <div className="bg-white border border-[#d1d5db] rounded p-4 space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-[15px] font-semibold text-[#1a1f2e]">{catName}</h2>
            <p className="text-[13px] text-[#6b7280] mt-0.5">
              {catGtinCount.toLocaleString()} GTINs &middot; Review AI suggestions. You can edit any value at any time.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[12px] shrink-0">
            <span className="text-[#2e7d32] font-medium">{totalConfirmed} confirmed</span>
            {totalPending > 0 && (
              <span className="flex items-center gap-1 text-[#92400e] font-medium">
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                {totalPending} pending
              </span>
            )}
            <span className="text-[#6b7280]">of {allRows.length} total attributes</span>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-[#6b7280] mb-1">
            <span>Review progress</span>
            <span className="font-medium text-[#374151]">{progressPct}% complete</span>
          </div>
          <div className="h-2 rounded-full bg-[#e8eaed] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, backgroundColor: progressPct === 100 ? "#2e7d32" : "#1a5fa6" }}
            />
          </div>
        </div>

        {/* Batch confirm toolbar */}
        <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-[#e5e7eb]">
          <span className="text-[12px] font-medium text-[#374151] flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-[#f59e0b]" aria-hidden="true" />
            Batch confirm:
          </span>
          {[90, 80, 70].map((threshold) => (
            <button
              key={threshold}
              onClick={() => handleBatchConfirmByThreshold(threshold)}
              className={`px-3 py-1 text-[12px] font-medium border rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6] ${
                confidenceThreshold === threshold
                  ? "border-[#1a5fa6] bg-[#eff6ff] text-[#1a5fa6]"
                  : "border-[#d1d5db] bg-white text-[#374151] hover:bg-[#f3f4f6]"
              }`}
            >
              All at ≥{threshold}%
            </button>
          ))}
          <span className="text-[12px] text-[#9ca3af]">Auto-approves high-confidence suggestions</span>
        </div>
      </div>

      {/* Search + pagination info */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af]" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search GTIN or description..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            className="pl-8 pr-3 py-1.5 text-[12px] border border-[#d1d5db] rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1a5fa6] w-60"
          />
        </div>
        <div className="flex items-center gap-2 text-[12px] text-[#6b7280]">
          <span>Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredGtins.length)} of {filteredGtins.length} GTINs</span>
          {catGtinCount > filteredGtins.length && (
            <span className="text-[#9ca3af]">(displaying first {filteredGtins.length} of {catGtinCount.toLocaleString()} total)</span>
          )}
        </div>
      </div>

      {/* Bulk apply notification */}
      {bulkMsg && (
        <div className="px-3 py-2 rounded border text-[13px] flex items-center gap-2" style={{ backgroundColor: "#e8f5e9", borderColor: "#a5d6a7", color: "#1b5e20" }} role="status" aria-live="polite">
          <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#2e7d32" }} aria-hidden="true" />
          {bulkMsg}
        </div>
      )}

      {/* GTIN rows */}
      <div className="space-y-2">
        {paginatedGtins.map((gtin, pageIdx) => {
          const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + pageIdx
          const gtinConfirmed = gtin.rows.every((r) => r.status === "confirmed" || r.status === "edited")
          return (
            <div key={gtin.gtin} className={`bg-white border rounded overflow-hidden ${gtinConfirmed ? "border-[#a5d6a7]" : "border-[#d1d5db]"}`}>
              <div className={`px-4 py-2 border-b flex items-center justify-between ${gtinConfirmed ? "bg-[#f0fdf4] border-[#c6f0ce]" : "bg-[#f7f8fa] border-[#e5e7eb]"}`}>
                <div className="flex items-center gap-2">
                  {gtinConfirmed && <CheckCircle2 className="w-3.5 h-3.5 text-[#2e7d32]" aria-hidden="true" />}
                  <span className="text-[12px] font-mono text-[#1a5fa6] font-semibold">{gtin.gtin}</span>
                  <span className="text-[#d1d5db]">|</span>
                  <span className="text-[13px] font-medium text-[#1a1f2e]">{gtin.description}</span>
                </div>
                {gtinConfirmed && (
                  <span className="text-[11px] font-medium text-[#2e7d32]">All confirmed</span>
                )}
              </div>
              <table className="w-full" role="table">
                <thead>
                  <tr className="bg-[#f7f8fa] border-b border-[#e5e7eb]">
                    <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide w-32">Attribute</th>
                    <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide w-28">AI Value</th>
                    <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide w-28">Confidence</th>
                    <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Why AI suggested this</th>
                    <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide w-40">Your Action</th>
                  </tr>
                </thead>
                <tbody>
                  {gtin.rows.map((row, ri) => (
                    <EditableAttrRow
                      key={ri}
                      row={row}
                      onConfirm={() => handleConfirm(globalIdx, ri)}
                      onEdit={(val) => handleEdit(globalIdx, ri, val)}
                      onBulkApply={() => handleBulkApply(row.attribute, row.editedValue ?? row.aiValue)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 bg-white border border-[#d1d5db] rounded">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none"
          >
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" /> Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1 : i < 3 ? i + 1 : i === 3 ? -1 : totalPages - (6 - i)
              if (p === -1) return <span key="ellipsis" className="px-1 text-[12px] text-[#9ca3af]">...</span>
              return (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-7 h-7 text-[12px] rounded border transition-colors focus:outline-none ${
                    currentPage === p
                      ? "border-[#1a5fa6] bg-[#1a5fa6] text-white font-semibold"
                      : "border-[#d1d5db] bg-white text-[#374151] hover:bg-[#f3f4f6]"
                  }`}
                >
                  {p}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none"
          >
            Next <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Bottom action bar */}
      <div className="flex items-center justify-between pt-2 border-t border-[#e5e7eb]">
        <button
          onClick={onBack}
          className="px-4 py-1.5 text-[13px] font-medium border border-[#d1d5db] rounded text-[#374151] bg-white hover:bg-[#f3f4f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
        >
          &#8592; Back to Summary
        </button>
        <button
          onClick={onConfirmGroup}
          disabled={progressPct === 0}
          className="px-4 py-1.5 text-[13px] font-semibold text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#1a5fa6]"
          style={{ backgroundColor: "#1a5fa6" }}
        >
          Confirm Group &amp; Continue &#8594;
        </button>
      </div>
    </div>
  )
}
