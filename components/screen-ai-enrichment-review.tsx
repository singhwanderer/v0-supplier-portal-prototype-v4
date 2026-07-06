"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { ChevronRight, ChevronDown, Check, X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react"

// GS1 code list values keyed by attribute name.
// Each entry has a human-readable label and its GS1 code.
// Attributes without a code list allow free-text only.
const CODE_LIST_VALUES: Record<string, { label: string; code: string }[]> = {
  Closure: [
    { label: "Adjustable/Pull",      code: "GM03CLOSAP" },
    { label: "Back",                  code: "GM03CLOSBC" },
    { label: "Back Button/Zip",       code: "GM03CLOSBB" },
    { label: "Back Hook/Zip",         code: "GM03CLOSBH" },
    { label: "Barrel",                code: "GM03CLOSBA" },
    { label: "Box Tab Insert",        code: "GM03CLOSBT" },
    { label: "Buckle",                code: "GM03CLOSBU" },
    { label: "Button",                code: "GM03CLOSBN" },
    { label: "Button Back",           code: "GM03CLOSBK" },
    { label: "Button Front",          code: "GM03CLOSBF" },
    { label: "Button Front Partial",  code: "GM03CLOSBP" },
    { label: "Button Shoulder",       code: "GM03CLOSBS" },
    { label: "Clasp",                 code: "GM03CLOSCL" },
    { label: "Click Top",             code: "GM03CLOSCT" },
    { label: "Clip On",               code: "GM03CLOSCO" },
    { label: "Drawstring",            code: "GM03CLOSDS" },
    { label: "Drawstring Front",      code: "GM03CLOSDF" },
    { label: "Drawstring Elastic",    code: "GM03CLOSDE" },
    { label: "D Ring",                code: "GM03CLOSDR" },
    { label: "Elastic Lace with Toggle", code: "GM03CLOSET" },
    { label: "Fishhook",              code: "GM03CLOSFS" },
    { label: "Flap",                  code: "GM03CLOSFP" },
    { label: "Foldover",              code: "GM03CLOSFO" },
    { label: "French Wire",           code: "GM03CLOSFW" },
    { label: "Frog/Button Loop",      code: "GM03CLOSFA" },
    { label: "Front Button/Zip",      code: "GM03CLOSFZ" },
    { label: "Front Hook/Zip",        code: "GM03CLOSFH" },
    { label: "Hidden Button Front",   code: "GM03CLOSHB" },
    { label: "Hidden Snap Front",     code: "GM03CLOSHS" },
    { label: "Hidden Zip Front",      code: "GM03CLOSHZ" },
    { label: "Hinged",                code: "GM03CLOSHI" },
    { label: "Hinged/Foldover",       code: "GM03CLOSHE" },
    { label: "Hook",                  code: "GM03CLOSHO" },
    { label: "Lace-up Front",         code: "GM03CLOSLF" },
    { label: "Latch",                 code: "GM03CLOSLA" },
    { label: "Leverback",             code: "GM03CLOSLB" },
    { label: "Lift-Lock",             code: "GM03CLOSLL" },
    { label: "Link/Clasp",            code: "GM03CLOSLC" },
    { label: "Lobster Claw",          code: "GM03CLOSLW" },
    { label: "Magnetic",              code: "GM03CLOSMG" },
    { label: "O Ring",                code: "GM03CLOSDO" },
    { label: "Pierced Post",          code: "GM03CLOSPP" },
    { label: "Push-Lock",             code: "GM03CLOSPL" },
    { label: "Side Button/Zip",       code: "GM03CLOSSB" },
    { label: "Side Hook/Zip",         code: "GM03CLOSSZ" },
    { label: "Slip-on",               code: "GM03CLOSSL" },
    { label: "Snap",                  code: "GM03CLOSN"  },
    { label: "Snap Back",             code: "GM03CLOSSM" },
    { label: "Snap Front",            code: "GM03CLOSSF" },
    { label: "Snap Front Partial",    code: "GM03CLOSS2" },
    { label: "Snap Legs",             code: "GM03CLOSSE" },
    { label: "Snap Shoulder",         code: "GM03CLOSSS" },
    { label: "Snap Post",             code: "GM03CLOSSA" },
    { label: "String",                code: "GM03CLOSSR" },
    { label: "Swivel",                code: "GM03CLOSSW" },
    { label: "Tab",                   code: "GM03CLOSTB" },
    { label: "Tie",                   code: "GM03CLOSTI" },
    { label: "Tie Back/Halter",       code: "GM03CLOSTH" },
    { label: "Tie Front",             code: "GM03CLOSTF" },
    { label: "Tie Side",              code: "GM03CLOSTS" },
    { label: "Toggle",                code: "GM03CLOSTO" },
    { label: "Toggle Front",          code: "GM03CLOSTN" },
    { label: "Top Zip",               code: "GM03CLOSTZ" },
    { label: "Tunnel Side Tie",       code: "GM03CLOSTQ" },
    { label: "Turn Lock",             code: "GM03CLOSTL" },
    { label: "Velcro",                code: "GM03CLOSVC" },
    { label: "Wrap",                  code: "GM03CLOSWR" },
    { label: "Zip",                   code: "GM03CLOSZI" },
    { label: "Zipper Back",           code: "GM03CLOSZB" },
    { label: "Zipper Back Partial",   code: "GM03CLOSZP" },
  ],
  "Fabric or Material Code": [
    { label: "Canvas",    code: "GM03FABCA" },
    { label: "Leather",   code: "GM03FABLE" },
    { label: "Mesh",      code: "GM03FABME" },
    { label: "Suede",     code: "GM03FABSU" },
    { label: "Synthetic", code: "GM03FABSY" },
    { label: "Textile",   code: "GM03FABTE" },
  ],
  "Faux Fur": [
    { label: "Yes", code: "GM03FFYES" },
    { label: "No",  code: "GM03FFNO"  },
  ],
}

// Inline combo-box: shows GS1 code list as a searchable dropdown when available,
// always allows free text. Used for editing a single GTIN attribute value.
function AttributeValueCombobox({
  attributeName,
  value,
  onChange,
  onSave,
  onCancel,
}: {
  attributeName: string
  value: string
  onChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  const options = CODE_LIST_VALUES[attributeName] ?? []
  const hasCodeList = options.length > 0
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync query when value changes externally
  useEffect(() => { setQuery(value) }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const filtered = useMemo(() => {
    if (!query.trim()) return options
    const q = query.toLowerCase()
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.code.toLowerCase().includes(q)
    )
  }, [options, query])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    onChange(e.target.value)
    if (hasCodeList) setOpen(true)
  }

  const selectOption = (opt: { label: string; code: string }) => {
    const displayVal = opt.label
    setQuery(displayVal)
    onChange(displayVal)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { onSave(); return }
    if (e.key === "Escape") { onCancel(); return }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center border border-[#1a5fa6] rounded overflow-hidden bg-white">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => hasCodeList && setOpen(true)}
          className="flex-1 px-2 py-1.5 text-[12px] outline-none bg-transparent"
          autoFocus
          placeholder={hasCodeList ? "Type or select from list…" : "Enter value…"}
          aria-label={`Edit value for ${attributeName}`}
          aria-expanded={open}
          aria-haspopup={hasCodeList ? "listbox" : undefined}
        />
        {hasCodeList && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setOpen((o) => !o)}
            className="px-1.5 text-[#6b7280] hover:text-[#1a5fa6] transition-colors"
            aria-label="Toggle dropdown"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        )}
      </div>

      {open && hasCodeList && filtered.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 left-0 top-full mt-1 w-full max-h-48 overflow-y-auto bg-white border border-[#d1d5db] rounded shadow-lg text-[12px]"
        >
          {filtered.map((opt) => (
            <li
              key={opt.code}
              role="option"
              aria-selected={value === opt.label}
              onMouseDown={(e) => { e.preventDefault(); selectOption(opt) }}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[#eff6ff] ${
                value === opt.label ? "bg-[#dbeafe] font-semibold" : ""
              }`}
            >
              <span className="text-[#1a1f2e]">{opt.label}</span>
              <span className="text-[10px] font-mono text-[#6b7280] ml-2">{opt.code}</span>
            </li>
          ))}
        </ul>
      )}
      {open && hasCodeList && filtered.length === 0 && (
        <div className="absolute z-50 left-0 top-full mt-1 w-full bg-white border border-[#d1d5db] rounded shadow-lg px-3 py-2 text-[12px] text-[#9ca3af] italic">
          No matching options — value will be saved as free text
        </div>
      )}
    </div>
  )
}

interface ScreenAIEnrichmentReviewProps {
  selectedCodes: string[]
  codesMetadata: Record<string, { gtins: number; products?: number; description: string }>
  onBack: () => void
  onComplete: (confirmedPercentage: number, codes: string[]) => void
}

// Change 1: Renamed to ProductAttribute (was GTINAttribute) to reflect product-level grouping
// Change 4: Added "batch-selected" status for threshold toggles
interface GTINAttribute {
  gtin: string
  productDescription: string
  aiSuggestion: string
  aiReasoning: string
  confidence: number
  status: "pending" | "confirmed" | "edited" | "rejected" | "batch-selected"
  userValue?: string
}

interface AttributeGroup {
  attributeName: string
  gtins: GTINAttribute[]
}

// Reasoning patterns keyed to attribute names.
// User-facing: only the product category matters; the underlying taxonomy is not surfaced.
// Prompt 2: Removed Advertised Origin and Toe Shape, added Faux Fur
const reasoningPatterns: Record<string, (desc: string, gtin: string) => string> = {
  "Brand Name":              () => "Extracted from product title",
  "Care Instructions":       () => "Matched to standard care label codes",
  "Closure":                 (desc) => desc.toLowerCase().includes("lace") ? '"lace-up" found in description' : "Common closure for this category",
  "Country of Origin":       () => "Sourced from product data",
  "Fabric or Material Code": (desc) => desc.toLowerCase().includes("suede") ? '"suede" detected in title' : "Inferred from product image analysis",
  "Faux Fur":                () => "Checked material content for fur/faux fur",
  "Gender":                  () => "Inferred from product title and category",
  "Heel Height":             () => "Estimated from product measurements",
  "Lining Material":         () => "Inferred from category norms",
  "Open/Closed Toe":         (desc) => desc.toLowerCase().includes("sandal") ? "Open toe for sandals" : "Standard for this shoe type",
  "Shoe Type":               () => "Derived from product category",
  "Sole Material":           () => "Inferred from category and price tier",
  "Upper Material":          (desc) => desc.toLowerCase().includes("suede") ? '"suede" found in description' : "Material inferred from product data",
  "Waterproof":              () => "Checked product description for water resistance claims",
}

// Footwear attribute applicability table.
// `appliesTo` carries internal category IDs used for lookup only — never shown to users.
//   10001077 = Shoes - General Purpose
//   10001076 = Boots - General Purpose
//   10001070 = Athletic Footwear - General Purpose
interface FootwearAttributeDef {
  name: string
  suggestions: string[]
  appliesTo: ("10001077" | "10001076" | "10001070")[]
}

// 14 attributes per specification.
// avgConfidence: attribute-level average used for the confidence bar and avg-confidence badge rule.
// minProductConfidence: lowest individual product VALUE confidence for this attribute — drives the
//   "VALUE confidence is orange/red" badge rule independently of avgConfidence.
// needsReview is derived at render time from avgConfidence and minProductConfidence; not stored here.
const ATTRIBUTES = [
  // ── Green attributes (avg ≥90%, all product values ≥90%) — no "Needs review" ──────────────────
  { name: "Brand Name",              productsApplicable: 125, avgConfidence: 0.96, minProductConfidence: 0.97 },
  { name: "Care Instructions",       productsApplicable: 108, avgConfidence: 0.94, minProductConfidence: 0.92 },
  { name: "Country of Origin",       productsApplicable: 125, avgConfidence: 0.93, minProductConfidence: 0.91 },
  { name: "Faux Fur",                productsApplicable: 85,  avgConfidence: 0.95, minProductConfidence: 0.93 },
  { name: "Gender",                  productsApplicable: 102, avgConfidence: 0.97, minProductConfidence: 0.96 },
  { name: "Lining Material",         productsApplicable: 96,  avgConfidence: 0.92, minProductConfidence: 0.90 },
  { name: "Open/Closed Toe",         productsApplicable: 105, avgConfidence: 0.91, minProductConfidence: 0.90 },
  { name: "Shoe Type",               productsApplicable: 88,  avgConfidence: 0.93, minProductConfidence: 0.91 },
  { name: "Waterproof",              productsApplicable: 75,  avgConfidence: 0.94, minProductConfidence: 0.92 },
  // ── Needs review: avg confidence orange/red (avg < 90%) ─────────────────────────────────────────
  { name: "Heel Height",             productsApplicable: 110, avgConfidence: 0.84, minProductConfidence: 0.91 },
  // avg is orange (84%) → "Needs review" from rule (c), even though product values are green
  { name: "Sole Material",           productsApplicable: 92,  avgConfidence: 0.67, minProductConfidence: 0.90 },
  // avg is red (67%) → "Needs review" from rule (c)
  // ── Needs review: VALUE confidence orange/red (minProductConfidence < 90%) ───────────────────────
  { name: "Closure",                 productsApplicable: 112, avgConfidence: 0.91, minProductConfidence: 0.79 },
  // avg is green but a product value is 79% (red) → "Needs review" from rule (b)
  { name: "Fabric or Material Code", productsApplicable: 98,  avgConfidence: 0.90, minProductConfidence: 0.83 },
  // avg is green but a product value is 83% (orange) → "Needs review" from rule (b)
  // ── Needs review: attribute has no value (null suggestedValue) ───────────────────────────────────
  { name: "Upper Material",          productsApplicable: 118, avgConfidence: 0.91, minProductConfidence: null },
  // null minProductConfidence represents an attribute with no suggested value → rule (a)
]

// FOOTWEAR_ATTRIBUTES for attribute suggestions and brick mapping
const FOOTWEAR_ATTRIBUTES: FootwearAttributeDef[] = [
  { name: "Brand Name",              suggestions: ["Nike", "Adidas", "New Balance", "Clarks", "Timberland"],   appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Care Instructions",       suggestions: ["Wipe Clean", "Spot Clean", "Machine Wash", "Hand Wash"],   appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Closure",                 suggestions: ["Lace-up", "Zip", "Slip-on", "Velcro", "Buckle"],           appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Country of Origin",       suggestions: ["China", "Vietnam", "India", "Indonesia"],                  appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Fabric or Material Code", suggestions: ["Leather", "Suede", "Canvas", "Synthetic", "Textile"],      appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Faux Fur",                suggestions: ["Yes", "No"],                                               appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Gender",                  suggestions: ["Men", "Women", "Unisex", "Boys", "Girls"],                 appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Heel Height",             suggestions: ["Flat", "Low (<1in)", "Mid (1–2in)", "High (2–3in)"],       appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Lining Material",         suggestions: ["Leather", "Textile", "Mesh", "Synthetic"],                 appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Open/Closed Toe",         suggestions: ["Open Toe", "Closed Toe"],                                  appliesTo: ["10001077", "10001076"] },
  { name: "Shoe Type",               suggestions: ["Sneaker", "Loafer", "Oxford", "Ankle Boot", "Running"],    appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Sole Material",           suggestions: ["Rubber", "EVA", "PU", "Leather"],                          appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Upper Material",          suggestions: ["Leather", "Suede", "Canvas", "Synthetic", "Mesh"],         appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Waterproof",              suggestions: ["Yes", "No"],                                               appliesTo: ["10001077", "10001076", "10001070"] },
]

// Resolve the brick code from a category description (matches Brick Confirmation labels)
function getBrickCode(description: string): "10001077" | "10001076" | "10001070" {
  const desc = description.toLowerCase()
  if (desc.includes("athletic")) return "10001070"
  if (desc.includes("boots")) return "10001076"
  return "10001077"
}

// Map selection codes to appropriate attributes — derived strictly from the brick matrix
function getAttributesForCategory(description: string): { name: string; suggestions: string[] }[] {
  const brickCode = getBrickCode(description)
  return FOOTWEAR_ATTRIBUTES
    .filter((attr) => attr.appliesTo.includes(brickCode))
    .map(({ name, suggestions }) => ({ name, suggestions }))
}

function generateRandomGtin(): string {
  const prefixes = ["057421", "073665", "088854", "019283", "084756", "069312", "052847", "091638"]
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const suffix = String(Math.floor(Math.random() * 1000000)).padStart(6, "0")
  return `${prefix}${suffix}`
}

// Only these 3 attributes have any low-confidence products — all others are fully auto-validated.
// Change 3: Updated to match revised attribute list (Closure, Fabric or Material Code, Upper Material)
const LOW_CONFIDENCE_ATTRIBUTES = new Set(["Closure", "Fabric or Material Code", "Upper Material"])

// Generate attribute groups with unique suggestions per GTIN and reasoning
function generateAttributeData(code: string, gtinCount: number, description: string): AttributeGroup[] {
  const categoryAttributes = getAttributesForCategory(description)

  // Pre-generate all GTINs once so the same GTINs appear across all attributes
  const allGtins: { gtin: string; productDesc: string }[] = []
  for (let i = 0; i < gtinCount; i++) {
    allGtins.push({
      gtin: generateRandomGtin(),
      productDesc: `${description} - Item ${i + 1}`,
    })
  }

  return categoryAttributes.map(({ name: attrName, suggestions }) => {
    let applicableGtinCount = gtinCount
    if (attrName !== "Brand Name" && attrName !== "Country of Origin") {
      const percentage = 0.6 + Math.random() * 0.3
      applicableGtinCount = Math.max(1, Math.floor(gtinCount * percentage))
    }

    const shuffledGtins = [...allGtins].sort(() => Math.random() - 0.5)
    const selectedGtins = shuffledGtins.slice(0, applicableGtinCount)

    // For attributes that are NOT in the low-confidence set, all GTINs are high confidence (85-100).
    // For the 3 designated low-confidence attributes, exactly 3-4 GTINs per attribute fall below 70.
    const isLowConfidenceAttr = LOW_CONFIDENCE_ATTRIBUTES.has(attrName)
    // How many GTINs in this attribute will be marked low-confidence (3 or 4, max)
    const lowConfidenceSlots = isLowConfidenceAttr ? Math.min(selectedGtins.length, attrName === "Closure" ? 4 : 3) : 0

    const gtins: GTINAttribute[] = selectedGtins.map((g, index) => {
      const gtinHash = g.gtin.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
      const suggestion = suggestions[gtinHash % suggestions.length]
      const reasoningFn = reasoningPatterns[attrName]
      const reasoning = reasoningFn ? reasoningFn(g.productDesc, g.gtin) : "AI analysis of product data"

      // First `lowConfidenceSlots` GTINs get a sub-70 confidence score; the rest are high confidence.
      // Within low-confidence, the first slot always falls below 60 (suppressed suggestion),
      // and remaining low-confidence slots land in the 61–69 range (shown with flag).
      const isLowConfidenceGtin = index < lowConfidenceSlots
      const confidence = isLowConfidenceGtin
        ? index === 0
          ? Math.floor(40 + Math.random() * 20)  // 40–59 — below threshold, suggestion suppressed
          : Math.floor(61 + Math.random() * 8)   // 61–68 — low confidence, shown with flag
        : Math.floor(82 + Math.random() * 18)    // 82–99 — confidently validated

      return {
        gtin: g.gtin,
        productDescription: g.productDesc,
        aiSuggestion: suggestion,
        aiReasoning: reasoning,
        confidence,
        status: "pending" as const,
      }
    })

    return { attributeName: attrName, gtins }
  })
}

export function ScreenAIEnrichmentReview({ selectedCodes, codesMetadata, onBack, onComplete }: ScreenAIEnrichmentReviewProps) {
  const code = selectedCodes[0]
  const metadata = codesMetadata[code] || { gtins: 32, description: "Selection Code" }
  // Source of truth: use products count from previous screen (e.g., 125 for "Shoes - General Purpose")
  // Fall back to GTINs only if products is not provided
  const totalProducts = metadata.products || metadata.gtins
  
  const [attributeGroups, setAttributeGroups] = useState<AttributeGroup[]>(() =>
    generateAttributeData(code, totalProducts, metadata.description)
  )
  const [expandedAttributes, setExpandedAttributes] = useState<Set<string>>(new Set())
  const [editingGtin, setEditingGtin] = useState<{ attribute: string; gtin: string } | null>(null)
  const [editValue, setEditValue] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<"confidence" | "gtin" | "status">("confidence")
  const [showLowConfidenceOnly, setShowLowConfidenceOnly] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [hasExpandedOnce, setHasExpandedOnce] = useState(false)
  // Change 4: Batch confirm as toggles — tracks which threshold is currently selected (null = none)
  const [batchSelectedThreshold, setBatchSelectedThreshold] = useState<number | null>(null)
  // Fix 1B: Track which products have their GTIN sub-table expanded
  const [expandedProductGtins, setExpandedProductGtins] = useState<Set<string>>(new Set())
  // Product-level state — keyed by "attrName|productName"
  // "batch-selected" = included by a batch threshold click (intention, not yet saved)
  const [productStates, setProductStates] = useState<Record<string, "pending" | "confirmed" | "rejected" | "batch-selected">>({})
  // Track which product is currently being edited
  const [editingProduct, setEditingProduct] = useState<{ attribute: string; product: string } | null>(null)
  const [editProductValue, setEditProductValue] = useState("")
  const itemsPerPage = 25

  // Fix 1B: Toggle "View GTINs" sub-expansion for a product row
  const toggleProductGtins = (productName: string) => {
    setExpandedProductGtins((prev) => {
      const next = new Set(prev)
      if (next.has(productName)) {
        next.delete(productName)
      } else {
        next.add(productName)
      }
      return next
    })
  }

  const toggleExpand = (attrName: string) => {
    setExpandedAttributes((prev) => {
      const next = new Set(prev)
      if (next.has(attrName)) {
        next.delete(attrName)
      } else {
        next.add(attrName)
        if (!hasExpandedOnce) setHasExpandedOnce(true)
      }
      return next
    })
  }

  // Confirm all (non-rejected, non-below-threshold) products for an attribute
  const confirmAllProducts = (attributeName: string) => {
    setProductStates((prev) => {
      const next = { ...prev }
      // Find the attribute group to get its GTINs
      const group = attributeGroups.find((g) => g.attributeName === attributeName)
      if (group) {
        group.gtins.forEach((gtin) => {
          const confidencePercent = Math.round(gtin.confidence) // confidence is already 0-100
          const key = `${attributeName}|${gtin.productDescription}`
          const current = next[key] || "pending"
          // Confirm pending and batch-selected (skip already-confirmed, rejected, and <60% items)
          if ((current === "pending" || current === "batch-selected") && confidencePercent >= 60) {
            next[key] = "confirmed"
          }
        })
      }
      return next
    })
  }

  const rejectAllForAttribute = (attrName: string) => {
    setAttributeGroups((prev) =>
      prev.map((group) =>
        group.attributeName === attrName
          ? { ...group, gtins: group.gtins.filter((g) => g.status !== "pending") }
          : group
      )
    )
  }

  // Batch confirm: toggle a threshold. Same button = undo. Only one active at a time.
  const toggleBatchThreshold = (threshold: number) => {
    // threshold is already a percentage (95, 90, 80), confidence is also 0-100

    if (batchSelectedThreshold === threshold) {
      // Same threshold — undo all batch-selected product states back to pending
      setBatchSelectedThreshold(null)
      setProductStates((prev) => {
        const next = { ...prev }
        Object.keys(next).forEach((key) => {
          if (next[key] === "batch-selected") next[key] = "pending"
        })
        return next
      })
    } else {
      // New threshold — clear prior batch selections then mark qualifying pending products
      setBatchSelectedThreshold(threshold)
      setProductStates((prev) => {
        const next = { ...prev }
        // First clear any existing batch-selected states
        Object.keys(next).forEach((key) => {
          if (next[key] === "batch-selected") next[key] = "pending"
        })
        // Mark each GTIN that meets threshold and is still pending
        attributeGroups.forEach((group) => {
          group.gtins.forEach((gtin) => {
            const key = `${group.attributeName}|${gtin.productDescription}`
            const currentState = next[key] || "pending"
            if (currentState === "pending" && gtin.confidence >= threshold) {
              next[key] = "batch-selected"
            }
          })
        })
        return next
      })
    }
  }

  // Legacy function kept for compatibility — now routes through toggle
  const confirmByConfidenceThreshold = (threshold: number) => {
    toggleBatchThreshold(threshold)
  }

  const confirmSingleGtin = (attrName: string, gtin: string) => {
    setAttributeGroups((prev) =>
      prev.map((group) =>
        group.attributeName === attrName
          ? {
              ...group,
              gtins: group.gtins.map((g) => (g.gtin === gtin ? { ...g, status: "confirmed" } : g)),
            }
          : group
      )
    )
  }

  const undoSingleGtin = (attrName: string, gtin: string) => {
    setAttributeGroups((prev) =>
      prev.map((group) =>
        group.attributeName === attrName
          ? {
              ...group,
              gtins: group.gtins.map((g) =>
                g.gtin === gtin ? { ...g, status: "pending", userValue: undefined } : g
              ),
            }
          : group
      )
    )
  }

  const undoAllForAttribute = (attrName: string) => {
    // Reset all product-level states for this attribute back to pending
    setProductStates((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`${attrName}|`)) next[key] = "pending"
      })
      return next
    })
  }

  const rejectGtin = (attrName: string, gtin: string) => {
    setAttributeGroups((prev) =>
      prev.map((group) =>
        group.attributeName === attrName
          ? {
              ...group,
              gtins: group.gtins.map((g) =>
                g.gtin === gtin ? { ...g, status: "rejected" as const } : g
              ),
            }
          : group
      )
    )
  }

  const undoRejectGtin = (attrName: string, gtin: string) => {
    setAttributeGroups((prev) =>
      prev.map((group) =>
        group.attributeName === attrName
          ? {
              ...group,
              gtins: group.gtins.map((g) =>
                g.gtin === gtin ? { ...g, status: "pending", userValue: undefined } : g
              ),
            }
          : group
      )
    )
  }

  const startEdit = (attrName: string, gtin: string, currentValue: string) => {
    setEditingGtin({ attribute: attrName, gtin })
    setEditValue(currentValue)
  }

  // Bug fix: Product-level confirm handler
  const confirmProduct = (attrName: string, productName: string) => {
    const key = `${attrName}|${productName}`
    setProductStates((prev) => ({ ...prev, [key]: "confirmed" }))
  }

  // Bug fix: Product-level reject handler
  const rejectProduct = (attrName: string, productName: string) => {
    const key = `${attrName}|${productName}`
    setProductStates((prev) => ({ ...prev, [key]: "rejected" }))
  }

  // Bug fix: Product-level undo handler
  const undoProduct = (attrName: string, productName: string) => {
    const key = `${attrName}|${productName}`
    setProductStates((prev) => ({ ...prev, [key]: "pending" }))
  }

  // Bug fix: Start editing a product value
  const startProductEdit = (attrName: string, productName: string, currentValue: string) => {
    setEditingProduct({ attribute: attrName, product: productName })
    setEditProductValue(currentValue)
  }

  // Bug fix: Save product edit
  const saveProductEdit = (attrName: string, productName: string) => {
    const key = `${attrName}|${productName}`
    setProductStates((prev) => ({ ...prev, [key]: "confirmed" }))
    setEditingProduct(null)
    setEditProductValue("")
  }

  // Bug fix: Cancel product edit
  const cancelProductEdit = () => {
    setEditingProduct(null)
    setEditProductValue("")
  }

  const saveEdit = () => {
    if (!editingGtin) return
    setAttributeGroups((prev) =>
      prev.map((group) =>
        group.attributeName === editingGtin.attribute
          ? {
              ...group,
              gtins: group.gtins.map((g) =>
                g.gtin === editingGtin.gtin ? { ...g, status: "edited", userValue: editValue } : g
              ),
            }
          : group
      )
    )
    setEditingGtin(null)
    setEditValue("")
  }

  const cancelEdit = () => {
    setEditingGtin(null)
    setEditValue("")
  }

  // ── Stats calculations (all driven by productStates) ──────────────────────
  // Total attributes = sum of actual products across all attribute groups
  const totalAttributePairs = attributeGroups.reduce((sum, group) => sum + group.gtins.length, 0)

  // Count product-attribute pairs that are confirmed, edited, or batch-selected
  const confirmedOrBatchStates = Object.values(productStates).filter(
    (s) => s === "confirmed" || s === "batch-selected"
  ).length
  // Products Enriched tile = unique products that have at least one confirmed/batch-selected state
  const enrichedProductSet = new Set(
    Object.entries(productStates)
      .filter(([, s]) => s === "confirmed" || s === "batch-selected")
      .map(([key]) => key.split("|")[1])
  )
  const gtinsEnriched = enrichedProductSet.size

  // Confirmed percentage = confirmed pairs / total pairs (capped at 100%)
  const confirmedPercentage = totalAttributePairs > 0
    ? Math.min(100, Math.round((confirmedOrBatchStates / totalAttributePairs) * 100))
    : 0

  // Pending attributes = total pairs minus confirmed/batch-selected pairs
  const pendingAttributes = totalAttributePairs - confirmedOrBatchStates

  // Enriched percentage = unique enriched products / total products (capped at 100%)
  const enrichedGtinPercent = totalProducts > 0
    ? Math.min(100, Math.round((gtinsEnriched / totalProducts) * 100))
    : 0

  // Header progress: attribute rows where all per-attribute GTINs are confirmed/batch-selected
  const totalAttributeRows = ATTRIBUTES.length
  const reviewedAttributeRows = attributeGroups.filter((group) => {
    const eligibleGtins = group.gtins.filter((g) => Math.round(g.confidence) >= 60) // confidence is already 0-100
    return eligibleGtins.length > 0 && eligibleGtins.every((gtin) => {
      const state = productStates[`${group.attributeName}|${gtin.productDescription}`] || "pending"
      return state === "confirmed" || state === "batch-selected"
    })
  }).length
  const attributeReviewPercent = Math.round((reviewedAttributeRows / totalAttributeRows) * 100)

  const canComplete = confirmedOrBatchStates > 0

  // Filter and paginate GTINs for expanded view
  const getFilteredAndPaginatedGtins = (gtins: GTINAttribute[]) => {
    // When the low-confidence toggle is active, only show GTINs below 90% confidence
    let filtered = showLowConfidenceOnly ? gtins.filter((g) => g.confidence < 90) : gtins
    
    // Default: sort low-confidence (<70%) first for immediate attention
    filtered.sort((a, b) => {
      // Sort by confidence level first (low-confidence first)
      const aLow = a.confidence < 70 ? 0 : 1
      const bLow = b.confidence < 70 ? 0 : 1
      if (aLow !== bLow) return aLow - bLow
      // Within same confidence tier, sort by confidence descending
      return b.confidence - a.confidence
    })
    
    const start = (currentPage - 1) * itemsPerPage
    return {
      total: filtered.length,
      items: filtered.slice(start, start + itemsPerPage),
      totalPages: Math.ceil(filtered.length / itemsPerPage),
    }
  }

  const handleCompleteClick = () => {
    setShowConfirmDialog(true)
  }

  const [isCompleted, setIsCompleted] = useState(false)
  const [completedAt, setCompletedAt] = useState("")

  const handleConfirmComplete = () => {
    // Convert all batch-selected product states to confirmed on save
    const finalStates = { ...productStates }
    Object.keys(finalStates).forEach((key) => {
      if (finalStates[key] === "batch-selected") finalStates[key] = "confirmed"
    })
    setProductStates(finalStates)
    setShowConfirmDialog(false)
    const now = new Date().toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
    setCompletedAt(now)
    setIsCompleted(true)
    // Notify parent so selection-code-list status updates, but don't navigate away
    onComplete(confirmedPercentage, [code])
  }

  const handleContinueEnrichment = () => {
    setIsCompleted(false)
  }

  const handleCancelComplete = () => {
    setShowConfirmDialog(false)
  }

  // Derive a list of ONLY attributes with low-confidence GTINs (< 70%) that are still PENDING,
  // AND that the user has actually engaged with (expanded to view).
  // Once reviewed (confirmed/edited/rejected), they no longer need attention.
  const attributesWithLowConfidence = attributeGroups
    .filter((g) => expandedAttributes.has(g.attributeName)) // Only show attributes user has expanded
    .map((g) => {
      // Only count low-confidence items that are still pending (not yet reviewed)
      const pendingLowConfidenceGtins = g.gtins.filter(
        (gt) => gt.confidence < 70 && gt.status === "pending"
      )
      return {
        attributeName: g.attributeName,
        lowConfidenceCount: pendingLowConfidenceGtins.length,
      }
    })
    .filter((row) => row.lowConfidenceCount > 0) // Only show if there are pending low-confidence items
    .slice(0, 4) // Limit to 3-4 attributes for clarity

  const jumpToAttribute = (attrName: string) => {
    setShowConfirmDialog(false)
    setExpandedAttributes((prev) => {
      const next = new Set(prev)
      next.add(attrName)
      if (!hasExpandedOnce) setHasExpandedOnce(true)
      return next
    })
    // Scroll to the attribute row after state settles
    setTimeout(() => {
      const el = document.getElementById(`attr-row-${attrName.replace(/\s+/g, "-").toLowerCase()}`)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 50)
  }

  // ── Per-attribute summary stats (used in completed view) ─────────────────
  const attributeSummaryRows = attributeGroups.map((group) => {
    const confirmed = group.gtins.filter((g) => {
      const s = productStates[`${group.attributeName}|${g.productDescription}`] || "pending"
      return s === "confirmed" || s === "batch-selected"
    }).length
    const rejected = group.gtins.filter((g) => {
      const s = productStates[`${group.attributeName}|${g.productDescription}`] || "pending"
      return s === "rejected"
    }).length
    const pending = group.gtins.length - confirmed - rejected
    const attrDef = ATTRIBUTES.find((a) => a.name === group.attributeName)
    const avgConf = attrDef ? Math.round(attrDef.avgConfidence * 100) : Math.round(
      group.gtins.reduce((sum, g) => sum + g.confidence, 0) / group.gtins.length
    )
    return { name: group.attributeName, total: group.gtins.length, confirmed, rejected, pending, avgConf }
  })

  if (isCompleted) {
    const totalConfirmed = attributeSummaryRows.reduce((s, r) => s + r.confirmed, 0)
    const totalPending   = attributeSummaryRows.reduce((s, r) => s + r.pending,   0)
    const totalRejected  = attributeSummaryRows.reduce((s, r) => s + r.rejected,  0)
    const hasPending     = totalPending > 0

    return (
      <div className="space-y-6 pb-10">
        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#2e7d32]" />
              <h2 className="text-[16px] font-semibold text-[#1a1f2e]">Enrichment Completed</h2>
            </div>
            <p className="text-[13px] text-[#6b7280] mt-1">
              Selection Code: <span className="font-mono text-[#1a5fa6] font-semibold">{code}</span> — {metadata.description} &middot; {completedAt}
            </p>
          </div>
          <button
            onClick={onBack}
            className="px-3 py-1.5 text-[12px] font-medium border border-[#d1d5db] rounded text-[#374151] hover:bg-[#f3f4f6] transition-colors"
          >
            &larr; Back to List
          </button>
        </div>

        {/* ── Pending banner ── */}
        {hasPending && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded border border-[#fed7aa] bg-[#fef5e7]">
            <AlertTriangle className="w-4 h-4 text-[#d97706] shrink-0 mt-0.5" />
            <p className="text-[13px] text-[#b45309]">
              <span className="font-semibold">{totalPending} suggestions</span> are still pending across {attributeSummaryRows.filter((r) => r.pending > 0).length} attribute{attributeSummaryRows.filter((r) => r.pending > 0).length !== 1 ? "s" : ""}. Continue enrichment to action them.
            </p>
          </div>
        )}

        {/* ── Summary chips ── */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-[#d1d5db] rounded p-4">
            <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Total Products</p>
            <p className="text-[24px] font-bold text-[#1a1f2e] mt-1">{totalProducts}</p>
          </div>
          <div className="bg-white border border-[#d1d5db] rounded p-4">
            <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Suggestions Confirmed</p>
            <p className="text-[24px] font-bold text-[#2e7d32] mt-1">{totalConfirmed}</p>
            {totalPending > 0 && (
              <p className="text-[11px] text-[#6b7280] mt-0.5">{totalPending} pending &middot; {totalRejected} rejected</p>
            )}
          </div>
          <div className="bg-white border border-[#d1d5db] rounded p-4">
            <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Confirmed</p>
            <p className="text-[24px] font-bold text-[#1a5fa6] mt-1">{confirmedPercentage}%</p>
          </div>
        </div>

        {/* ── Per-attribute breakdown table ── */}
        <div className="bg-white border border-[#d1d5db] rounded overflow-hidden">
          <div className="px-4 py-3 border-b border-[#e5e7eb] bg-[#f9fafb]">
            <h3 className="text-[13px] font-semibold text-[#374151]">Attribute Breakdown</h3>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                <th className="text-left px-4 py-2.5 font-semibold text-[#6b7280] text-[11px] uppercase tracking-wide">Attribute</th>
                <th className="text-center px-4 py-2.5 font-semibold text-[#6b7280] text-[11px] uppercase tracking-wide">Products Enriched</th>
                <th className="text-left px-4 py-2.5 font-semibold text-[#6b7280] text-[11px] uppercase tracking-wide">Avg Confidence</th>
                <th className="text-center px-4 py-2.5 font-semibold text-[#6b7280] text-[11px] uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {attributeSummaryRows.map((row, i) => (
                <tr key={row.name} className={`border-b border-[#f3f4f6] ${i % 2 === 0 ? "bg-white" : "bg-[#fafafa]"}`}>
                  <td className="px-4 py-2.5 font-medium text-[#1a1f2e]">{row.name}</td>
                  <td className="px-4 py-2.5 text-center font-mono text-[#1a5fa6] font-semibold">
                    {row.confirmed}/{row.total}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-[#e5e7eb] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.avgConf >= 90 ? "bg-[#2e7d32]" : row.avgConf >= 80 ? "bg-[#d97706]" : "bg-[#dc2626]"}`}
                          style={{ width: `${row.avgConf}%` }}
                        />
                      </div>
                      <span className="text-[12px] text-[#374151]">{row.avgConf}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#dcfce7] text-[#166534]">
                      <Check className="w-3 h-3" /> Completed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Action buttons ── */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleContinueEnrichment}
            className={`px-4 py-2 text-[13px] font-semibold rounded transition-colors ${
              hasPending
                ? "bg-[#1a5fa6] text-white hover:bg-[#1a4f8c]"
                : "border border-[#1a5fa6] text-[#1a5fa6] bg-white hover:bg-[#eff6ff]"
            }`}
          >
            Continue Enrichment
          </button>
          <button
            onClick={onBack}
            className="px-4 py-2 text-[13px] font-semibold text-white rounded bg-[#2e7d32] hover:opacity-90 transition-opacity"
          >
            Back to Selection Codes
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with progress indicator */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-[16px] font-semibold text-[#1a1f2e]">AI Attribute Enrichment Review</h2>
            <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#f3f4f6] text-[#6b7280]">
              {reviewedAttributeRows} of {totalAttributeRows} attributes reviewed
            </span>
          </div>
          <p className="text-[13px] text-[#6b7280] mt-1">
            Selection Code: <span className="font-mono text-[#1a5fa6] font-semibold">{code}</span> — {metadata.description} ({metadata.gtins} GTINs)
          </p>
          {/* Progress bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 max-w-xs h-2 rounded-full bg-[#e5e7eb] overflow-hidden">
              <div
                className="h-full bg-[#1a5fa6] transition-all duration-300"
                style={{ width: `${attributeReviewPercent}%` }}
              />
            </div>
            <span className="text-[11px] font-medium text-[#6b7280]">{attributeReviewPercent}% complete</span>
          </div>
        </div>
        <button
          onClick={onBack}
          className="px-3 py-1.5 text-[13px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors"
        >
          ← Back to List
        </button>
      </div>

      {/* Onboarding banner — action-oriented copy */}
      <div className="flex items-start gap-2 px-3 py-2 rounded border border-[#bfdbfe] bg-[#eff6ff] text-[12px] text-[#1e40af]">
        <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-[#3b82f6]">Review suggestions below. Expand any row to edit individual items.</p>
      </div>

      {/* Batch Actions — Change 4: Toggles that set intention, not immediate persist */}
      <div className="flex flex-col gap-4 p-3 bg-white border border-[#d1d5db] rounded">
        {/* Fix E: Row 1 - Batch Confirm (left-aligned) */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-[#1e40af]">Batch Confirm:</span>
            {[95, 90, 80].map((threshold) => (
              <button
                key={threshold}
                onClick={() => toggleBatchThreshold(threshold)}
                className={`px-2 py-1 text-[12px] rounded transition-colors ${
                  batchSelectedThreshold === threshold
                    ? "bg-[#dcfce7] border-2 border-[#22c55e] text-[#166534] font-semibold"
                    : "bg-white border border-[#1e40af] text-[#1e40af] hover:bg-[#eff6ff]"
                }`}
              >
                {threshold}%+ {batchSelectedThreshold === threshold && "✓"}
              </button>
            ))}
            {batchSelectedThreshold && (
              <button
                onClick={() => toggleBatchThreshold(batchSelectedThreshold)}
                className="px-2 py-1 text-[12px] text-[#dc2626] hover:underline"
              >
                Clear selection
              </button>
            )}
        </div>
        {/* Change 4: Note about batch selection being intention, not persist */}
        {batchSelectedThreshold && (
          <p className="text-[11px] text-[#6b7280] italic">
            Batch selection sets your intention — click &quot;Complete Enrichment&quot; to save all changes.
          </p>
        )}

        {/* Fix E: Visual divider between Batch Select and Filter */}
        <div className="border-t border-[#e5e7eb]" />

        {/* Fix E: Row 2 - Low Confidence Filter (right-aligned, separate container styling) */}
        <div className="flex items-center justify-end gap-2">
          <span className="text-[12px] font-semibold text-[#6b7280]">Filter:</span>
          <button
            type="button"
            role="switch"
            aria-checked={showLowConfidenceOnly}
            onClick={() => {
              setShowLowConfidenceOnly((prev) => !prev)
              setCurrentPage(1)
            }}
            className={`flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold rounded border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] ${
              showLowConfidenceOnly
                ? "bg-[#fef3c7] border-[#f59e0b] text-[#92400e]"
                : "bg-white border-[#d1d5db] text-[#6b7280] hover:border-[#f59e0b] hover:text-[#92400e]"
            }`}
            title="Toggle to show only attributes and products with AI confidence below 90%"
          >
            <span
              className={`w-3 h-3 rounded-full border-2 transition-colors ${
                showLowConfidenceOnly ? "bg-[#f59e0b] border-[#f59e0b]" : "bg-transparent border-[#9ca3af]"
              }`}
              aria-hidden="true"
            />
            Low Confidence Only (&lt;90%)
          </button>
        </div>
      </div>

      {/* Stats — Change 1: Products instead of GTINs, removed Products Enriched chip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-[#d1d5db] rounded p-4">
          <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Total Products</p>
          <p className="text-[24px] font-bold text-[#1a1f2e] mt-1">{totalProducts}</p>
        </div>
        <div className="bg-white border border-[#d1d5db] rounded p-4">
          <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Total Attributes</p>
              <p className="text-[24px] font-bold text-[#1a1f2e] mt-1">{totalAttributePairs}</p>
        </div>
        <div className="bg-white border border-[#d1d5db] rounded p-4">
          <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Confirmed</p>
          <p className="text-[24px] font-bold text-[#1a5fa6] mt-1">{confirmedPercentage}%</p>
        </div>
      </div>

      {pendingAttributes > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded border bg-[#fef3c7] border-[#fcd34d] text-[#92400e]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-[13px] font-medium">
            {pendingAttributes} attributes pending — expand rows to review
          </span>
        </div>
      )}

      {/* Attribute Groups Table */}
      <div className="bg-white border border-[#d1d5db] rounded overflow-hidden">
        <table className="w-full text-[13px] table-fixed border-collapse">
          <colgroup>
            <col style={{ width: "40px" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "45%" }} />
          </colgroup>
          <thead className="bg-[#f7f8fa] border-b border-[#d1d5db]">
            <tr>
              <th className="px-3 py-2.5"></th>
              <th className="px-3 py-2.5 text-left font-semibold text-[#374151] uppercase text-[11px] tracking-wide">
                <span className="inline-flex items-center gap-1">
                  Attribute
                  <Info
                    className="w-3 h-3 text-[#9ca3af] cursor-help"
                    aria-label="The data field being enriched. We show only attributes that apply to this product category."
                  >
                    <title>The data field being enriched. We show only attributes that apply to this product category.</title>
                  </Info>
                </span>
              </th>
              <th className="px-3 py-2.5 text-center font-semibold text-[#374151] uppercase text-[11px] tracking-wide">
                <span className="inline-flex items-center gap-1 justify-center">
                  Products Enriched
                  <Info
                    className="w-3 h-3 text-[#9ca3af] cursor-help"
                    aria-label="Confirmed out of applicable products. Some attributes don't apply to every product — those aren't counted."
                  >
                    <title>Confirmed out of applicable products. Some attributes don&apos;t apply to every product — those aren&apos;t counted.</title>
                  </Info>
                </span>
              </th>
              <th className="px-3 py-2.5 text-center font-semibold text-[#374151] uppercase text-[11px] tracking-wide">
                <span className="inline-flex items-center gap-1 justify-center">
                  Avg Confidence
                  <Info
                    className="w-3 h-3 text-[#9ca3af] cursor-help"
                    aria-label="Average AI confidence across GTINs. Green ≥90, amber 80–89, red below 80."
                  >
                    <title>Average AI confidence across GTINs. Green ≥90, amber 80–89, red below 80.</title>
                  </Info>
                </span>
              </th>
              <th className="px-3 py-2.5 text-center font-semibold text-[#374151] uppercase text-[11px] tracking-wide">
                <span className="inline-flex items-center gap-1 justify-center">
                  Actions
                  <Info
                    className="w-3 h-3 text-[#9ca3af] cursor-help"
                    aria-label="Bulk operations for this attribute. Expand a row to edit individual GTIN suggestions."
                  >
                    <title>Bulk operations for this attribute. Expand a row to edit individual GTIN suggestions.</title>
                  </Info>
                </span>
              </th>
            </tr>
          </thead>
          {attributeGroups
            // Low Confidence filter: show only attributes where avgConfidence < 90%
            // (i.e., the attribute has at least one product suggestion below 90%).
            .filter((group) => {
              if (!showLowConfidenceOnly) return true
              const attrDef = ATTRIBUTES.find((a) => a.name === group.attributeName)
              return attrDef ? attrDef.avgConfidence < 0.90 : false
            })
            .map((group) => {
              const isExpanded = expandedAttributes.has(group.attributeName)
              // Use the actual GTIN count from the generated data (not ATTRIBUTES.productsApplicable)
              const attrDef = ATTRIBUTES.find((a) => a.name === group.attributeName)
              const totalProductsForAttr = group.gtins.length
              // Count GTINs that are confirmed or batch-selected for this attribute
              const confirmedProductCount = group.gtins.filter((g) => {
                const s = productStates[`${group.attributeName}|${g.productDescription}`] || "pending"
                return s === "confirmed" || s === "batch-selected"
              }).length
              // Use the ATTRIBUTES definition's avgConfidence (not GTIN average) so the
              // "needs review" badge and confidence bar reflect per-attribute design data
              const avgConfidence = attrDef
                ? Math.round(attrDef.avgConfidence * 100)
                : Math.round(group.gtins.reduce((sum, g) => sum + g.confidence, 0) / group.gtins.length)
              // Row is fully confirmed when all above-threshold GTINs are confirmed/batch-selected
              const eligibleGtins = group.gtins.filter((g) => Math.round(g.confidence) >= 60)
              const allConfirmed = eligibleGtins.length > 0 && eligibleGtins.every((g) => {
                const s = productStates[`${group.attributeName}|${g.productDescription}`] || "pending"
                return s === "confirmed" || s === "batch-selected"
              })

              return (
                <tbody key={group.attributeName} id={`attr-row-${group.attributeName.replace(/\s+/g, "-").toLowerCase()}`}>
                  {/* Main attribute row */}
                  <tr
                    className={`border-b border-[#e5e7eb] hover:bg-[#f9fafb] transition-colors cursor-pointer ${
                      allConfirmed ? "bg-[#f0fdf4]" : ""
                    }`}
                    onClick={() => toggleExpand(group.attributeName)}
                  >
                    <td className="px-3 py-3">
                      <button className="p-0.5 hover:bg-[#e5e7eb] rounded transition-colors">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[#374151]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[#374151]" />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#1a1f2e]">{group.attributeName}</span>
                        {(() => {
                          // Rule (a): attribute has no suggested value
                          const hasNoValue = attrDef?.minProductConfidence === null
                          // Rule (b): VALUE confidence is orange/red (< 90%)
                          const valueIsLow = attrDef?.minProductConfidence != null && attrDef.minProductConfidence < 0.90
                          // Rule (c): avg confidence is orange/red (< 90%)
                          const avgIsLow = avgConfidence < 90
                          const showNeedsReview = !allConfirmed && (hasNoValue || valueIsLow || avgIsLow)
                          if (allConfirmed) {
                            return <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#dcfce7] text-[#166534]">Confirmed</span>
                          }
                          if (showNeedsReview) {
                            return <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#fed7aa] text-[#b45309]">Needs review</span>
                          }
                          return null
                        })()}
                      </div>
                      {!hasExpandedOnce && group.attributeName === attributeGroups[0]?.attributeName && (
                        <p className="text-[10px] text-[#9ca3af] mt-0.5 italic">Click to expand and review</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`font-semibold ${allConfirmed ? "text-[#166534]" : "text-[#1a5fa6]"}`}>
                        {confirmedProductCount}/{totalProductsForAttr}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-14 h-2 rounded-full bg-[#e5e7eb] overflow-hidden">
                          <div
                            className={`h-full transition-all ${avgConfidence >= 90 ? "bg-[#2e7d32]" : avgConfidence >= 80 ? "bg-[#f59e0b]" : "bg-[#dc2626]"}`}
                            style={{ width: `${avgConfidence}%` }}
                          />
                        </div>
                        <span className="text-[12px] font-semibold text-[#374151]">{avgConfidence}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        {allConfirmed ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded bg-[#dcfce7] text-[#166534]">
                              <Check className="w-3.5 h-3.5" />
                              Confirmed
                            </span>
                            <button
                              onClick={() => undoAllForAttribute(group.attributeName)}
                              className="px-2 py-1.5 text-[12px] font-medium border border-[#d1d5db] rounded bg-white text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#374151] transition-colors whitespace-nowrap"
                              title="Undo all confirmations for this attribute"
                            >
                              Undo
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => confirmAllProducts(group.attributeName)}
                            className="px-3 py-1.5 text-[12px] font-semibold text-white rounded bg-[#1a5fa6] hover:bg-[#1a4f8c] transition-colors whitespace-nowrap"
                          >
                            Confirm All ({totalProductsForAttr - confirmedProductCount})
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Fix 1B: Expanded Product rows with "View GTINs" sub-expansion */}
                  {isExpanded && (
                    <>
                      {/* Product-level header row */}
                      <tr className="border-b border-[#e5e7eb] bg-[#f7f8fa]">
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2 text-[11px] font-semibold text-[#374151] uppercase tracking-wide">Product</td>
                        <td className="px-3 py-2 text-[11px] font-semibold text-[#374151] uppercase tracking-wide text-center">Suggested Value</td>
                        <td className="px-3 py-2 text-[11px] font-semibold text-[#374151] uppercase tracking-wide text-center">Confidence</td>
                        <td className="px-3 py-2 text-[11px] font-semibold text-[#374151] uppercase tracking-wide text-center">Actions</td>
                      </tr>
                      
                      {/* Product rows from per-attribute GTINs - filtered when Low Confidence toggle is active */}
                      {group.gtins
                        .filter((gtin) => {
                          // When low confidence filter is active, only show GTINs with confidence < 90%
                          if (!showLowConfidenceOnly) return true
                          return gtin.confidence < 90 // confidence is already 0-100
                        })
                        .map((gtin) => {
                        const confidencePercent = Math.round(gtin.confidence) // confidence is already 0-100
                        const isBelowThreshold = confidencePercent < 60
                        const isProductGtinsExpanded = expandedProductGtins.has(gtin.productDescription)
                        const productKey = `${group.attributeName}|${gtin.productDescription}`
                        const productState = productStates[productKey] || "pending"
                        const isEditing = editingProduct?.attribute === group.attributeName && editingProduct?.product === gtin.productDescription
                        const isConfirmed = productState === "confirmed"
                        const isBatchSelected = productState === "batch-selected"
                        const isRejected = productState === "rejected"
                        
                        return (
                          <>
                            {/* Product row */}
                            <tr
                              key={`${group.attributeName}-${gtin.gtin}`}
                              className={`border-b ${
                                isConfirmed
                                  ? "border-[#bbf7d0] bg-[#f0fdf4]"
                                  : isBatchSelected
                                  ? "border-[#bfdbfe] bg-[#eff6ff]"
                                  : isRejected
                                  ? "border-[#fecaca] bg-[#fef2f2]"
                                  : isBelowThreshold
                                  ? "border-[#fecaca] bg-[#fff5f5]"
                                  : "border-[#f3f4f6] bg-[#fafbfc]"
                              }`}
                            >
                              <td className="px-3 py-2.5"></td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[12px] text-[#1a1f2e] font-medium">{gtin.productDescription}</span>
                                  <button
                                    onClick={() => toggleProductGtins(gtin.productDescription)}
                                    className="text-[10px] text-[#6b7280] hover:text-[#1a5fa6] hover:underline text-left w-fit"
                                  >
                                    {isProductGtinsExpanded ? "Hide GTINs" : "View GTINs"}
                                  </button>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {/* Show inline combobox when editing */}
                                {isEditing ? (
                                  <div className="w-full max-w-[200px] mx-auto">
                                    <AttributeValueCombobox
                                      attributeName={group.attributeName}
                                      value={editProductValue}
                                      onChange={setEditProductValue}
                                      onSave={() => saveProductEdit(group.attributeName, gtin.productDescription)}
                                      onCancel={cancelProductEdit}
                                    />
                                  </div>
                                ) : isBelowThreshold ? (
                                  <span className="text-[12px] font-semibold text-[#9ca3af] italic">N/A</span>
                                ) : (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-[12px] font-semibold text-[#1a1f2e]">{gtin.aiSuggestion}</span>
                                    {gtin.aiReasoning && (
                                      <span className="text-[10px] text-[#6b7280] italic">{gtin.aiReasoning}</span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {/* Fix 1B: When confidence < 60%, do NOT render the confidence bar — just empty cell */}
                                {!isBelowThreshold && !isEditing && (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <div className="w-10 h-1.5 rounded-full bg-[#e5e7eb] overflow-hidden">
                                      <div
                                        className={`h-full ${confidencePercent >= 90 ? "bg-[#2e7d32]" : confidencePercent >= 80 ? "bg-[#f59e0b]" : "bg-[#dc2626]"}`}
                                        style={{ width: `${confidencePercent}%` }}
                                      />
                                    </div>
                                    <span className={`text-[11px] font-medium ${confidencePercent >= 90 ? "text-[#6b7280]" : confidencePercent >= 80 ? "text-[#b45309]" : "text-[#dc2626]"}`}>
                                      {confidencePercent}%
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {isConfirmed ? (
                                    <>
                                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#dcfce7] text-[#166534]">
                                        <Check className="w-3.5 h-3.5" /> Confirmed
                                      </span>
                                      <button
                                        onClick={() => undoProduct(group.attributeName, gtin.productDescription)}
                                        className="px-2 py-1 text-[11px] font-medium text-[#6b7280] hover:text-[#1a5fa6] hover:underline"
                                      >
                                        Undo
                                      </button>
                                    </>
                                  ) : isBatchSelected ? (
                                    <>
                                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#dbeafe] text-[#1e40af] border border-[#93c5fd]">
                                        Batch-confirmed
                                      </span>
                                      <button
                                        onClick={() => undoProduct(group.attributeName, gtin.productDescription)}
                                        className="px-2 py-1 text-[11px] font-medium text-[#6b7280] hover:text-[#1a5fa6] hover:underline"
                                      >
                                        Undo
                                      </button>
                                    </>
                                  ) : isRejected ? (
                                    <>
                                      <span className="flex items-center gap-1 text-[11px] font-semibold text-[#dc2626]">
                                        <X className="w-3.5 h-3.5" /> Rejected
                                      </span>
                                      <button
                                        onClick={() => undoProduct(group.attributeName, gtin.productDescription)}
                                        className="px-2 py-1 text-[11px] font-medium text-[#6b7280] hover:text-[#1a5fa6] hover:underline"
                                      >
                                        Undo
                                      </button>
                                    </>
                                  ) : isEditing ? (
                                    <>
                                      <button
                                        onClick={() => saveProductEdit(group.attributeName, gtin.productDescription)}
                                        className="px-2.5 py-1 text-[11px] font-semibold text-white rounded bg-[#2e7d32] hover:bg-[#1b5e20] transition-colors"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={cancelProductEdit}
                                        className="px-2 py-1 text-[11px] font-medium text-[#6b7280] hover:text-[#dc2626]"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      {/* Fix 1B: When confidence < 60%, hide Confirm, show only Edit and Reject */}
                                      {!isBelowThreshold && (
                                        <button
                                          onClick={() => confirmProduct(group.attributeName, gtin.productDescription)}
                                          className="px-2.5 py-1 text-[11px] font-semibold text-white rounded bg-[#2e7d32] hover:bg-[#1b5e20] transition-colors"
                                        >
                                          Confirm
                                        </button>
                                      )}
                                      <button
                                        onClick={() => startProductEdit(group.attributeName, gtin.productDescription, gtin.aiSuggestion || "")}
                                        className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                                          isBelowThreshold
                                            ? "border border-[#1a5fa6] text-[#1a5fa6] bg-white hover:bg-[#eff6ff] font-semibold"
                                            : "border border-[#6b7280] text-[#374151] hover:bg-[#f3f4f6]"
                                        }`}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => rejectProduct(group.attributeName, gtin.productDescription)}
                                        className="px-2 py-1 text-[11px] font-medium border border-[#dc2626] text-[#dc2626] rounded hover:bg-[#fee2e2] transition-colors"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                            
                            {/* GTIN sub-table when expanded - shows this single GTIN's details */}
                            {isProductGtinsExpanded && (
                              <tr key={`${group.attributeName}-${gtin.productDescription}-gtins`}>
                                <td colSpan={5} className="p-0">
                                  <div className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                                    <table className="w-full text-[11px]">
                                      <thead>
                                        <tr className="border-b border-[#e5e7eb]">
                                          <th className="text-left px-8 py-1.5 font-medium text-[#6b7280] w-40">GTIN</th>
                                          <th className="text-left px-3 py-1.5 font-medium text-[#6b7280]">AI Suggestion</th>
                                          <th className="text-left px-3 py-1.5 font-medium text-[#6b7280]">Confidence</th>
                                          <th className="text-left px-3 py-1.5 font-medium text-[#6b7280]">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr className="border-b border-[#f3f4f6] last:border-0">
                                          <td className="px-8 py-1.5 font-mono text-[10px] text-[#374151]">{gtin.gtin}</td>
                                          <td className="px-3 py-1.5 text-[#374151]">{gtin.aiSuggestion || "—"}</td>
                                          <td className="px-3 py-1.5 text-[#374151]">{confidencePercent}%</td>
                                          <td className="px-3 py-1.5 text-[#374151] capitalize">{productState}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        )
                      })}
                    </>
                  )}
                </tbody>
              )
          })}
        </table>
      </div>

      {/* Low-confidence attributes inline panel — visible before user clicks Complete Enrichment */}
      {attributesWithLowConfidence.length > 0 && (
        <div className="rounded border border-[#fed7aa] bg-[#fef5e7] px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#d97706] shrink-0" aria-hidden="true" />
            <span className="text-[13px] font-semibold text-[#b45309]">
              {attributesWithLowConfidence.length} attribute{attributesWithLowConfidence.length > 1 ? "s" : ""} need review
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {attributesWithLowConfidence.map((row) => (
              <button
                key={row.attributeName}
                onClick={() => jumpToAttribute(row.attributeName)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] rounded border border-[#fed7aa] bg-white text-[#b45309] hover:bg-[#fffbf0] transition-colors"
                title={`${row.lowConfidenceCount} items need review`}
              >
                <span className="font-medium">{row.attributeName}</span>
                <span className="text-[11px] text-[#d97706] bg-[#fef5e7] px-1.5 py-0.5 rounded-full">
                  {row.lowConfidenceCount}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#b45309]">
            All other attributes are confirmed. Click any above to jump directly to items needing review.
          </p>
        </div>
      )}

      {/* Sticky Footer with progress visibility */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-[#d1d5db] px-4 py-3 -mx-4 mt-4 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#6b7280]">Progress:</span>
              <div className="w-24 h-2 rounded-full bg-[#e5e7eb] overflow-hidden">
                <div
                  className="h-full bg-[#1a5fa6] transition-all duration-300"
                  style={{ width: `${attributeReviewPercent}%` }}
                />
              </div>
              <span className="text-[12px] font-semibold text-[#374151]">{reviewedAttributeRows}/{totalAttributeRows} attributes</span>
            </div>
            <span className="text-[12px] text-[#6b7280]">|</span>
            <span className="text-[12px] text-[#6b7280]">
              {gtinsEnriched} of {totalProducts} products enriched ({enrichedGtinPercent}%)
            </span>
          </div>
          <button
            onClick={handleCompleteClick}
            disabled={!canComplete}
            className="px-4 py-2 text-[13px] font-semibold text-white rounded bg-[#2e7d32] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Complete Enrichment
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-[#e5e7eb]">
              <h3 id="confirm-dialog-title" className="text-[16px] font-semibold text-[#1a1f2e]">Complete Enrichment?</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Summary — Change 6: Use "products" instead of "GTINs" */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[13px] text-[#374151]">
                  <CheckCircle2 className="w-4 h-4 text-[#2e7d32] shrink-0" />
                  <span><strong>{gtinsEnriched}</strong> of {totalProducts} products enriched</span>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-[#374151]">
                  <CheckCircle2 className="w-4 h-4 text-[#2e7d32] shrink-0" />
                  <span><strong>{reviewedAttributeRows}</strong> of {totalAttributeRows} attributes reviewed</span>
                </div>
              </div>
              {/* Change 6: Note about unreviewed attributes */}
              {reviewedAttributeRows < totalAttributeRows && (
                <p className="text-[12px] text-[#6b7280] italic">
                  Unreviewed attributes will not be saved. You can return to enrich more later.
                </p>
              )}

              {/* Low-confidence attributes — named with breakdown */}
              {attributesWithLowConfidence.length > 0 && (
                <div className="rounded border border-[#fed7aa] bg-[#fef5e7] px-3 py-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-[#d97706] shrink-0" />
                    <span className="text-[12px] font-semibold text-[#b45309]">
                      {attributesWithLowConfidence.length} attribute{attributesWithLowConfidence.length > 1 ? "s" : ""} need review:
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {attributesWithLowConfidence.map((row) => (
                      <li key={row.attributeName} className="flex items-center justify-between text-[12px] px-2 py-1 rounded bg-white">
                        <span className="text-[#374151] font-medium">{row.attributeName}</span>
                        <span className="text-[11px] text-[#b45309]">{row.lowConfidenceCount} items</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={handleCancelComplete}
                    className="text-[12px] font-medium text-[#1a5fa6] underline underline-offset-2 hover:text-[#1a4f8c] transition-colors"
                  >
                    Go back and review
                  </button>
                </div>
              )}

            </div>
            <div className="px-6 py-4 bg-[#f9fafb] border-t border-[#e5e7eb] flex items-center justify-between gap-3">
              <button
                onClick={handleCancelComplete}
                className="px-4 py-2 text-[13px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmComplete}
                className="px-4 py-2 text-[13px] font-semibold text-white rounded bg-[#2e7d32] hover:opacity-90 transition-opacity"
              >
                Complete Enrichment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
