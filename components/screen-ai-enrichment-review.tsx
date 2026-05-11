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
  "Toe Shape": [
    { label: "Almond",  code: "GM03TOEAL" },
    { label: "Pointed", code: "GM03TOEPO" },
    { label: "Round",   code: "GM03TOERO" },
    { label: "Square",  code: "GM03TOESQ" },
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
  codesMetadata: Record<string, { gtins: number; description: string }>
  onBack: () => void
  onComplete: (confirmedPercentage: number, codes: string[]) => void
}

interface GTINAttribute {
  gtin: string
  productDescription: string
  aiSuggestion: string
  aiReasoning: string
  confidence: number
  status: "pending" | "confirmed" | "edited" | "rejected"
  userValue?: string
}

interface AttributeGroup {
  attributeName: string
  gtins: GTINAttribute[]
}

// Reasoning patterns keyed to attribute names.
// User-facing: only the product category matters; the underlying taxonomy is not surfaced.
const reasoningPatterns: Record<string, (desc: string, gtin: string) => string> = {
  "Brand Name":              () => "Extracted from product title",
  "Advertised Origin":       () => "Inferred from supplier metadata",
  "Care Instructions Code":  () => "Matched to standard care label codes",
  "Closure":                 (desc) => desc.toLowerCase().includes("lace") ? '"lace-up" found in description' : "Common closure for this category",
  "Country of Origin":       () => "Sourced from product data",
  "Fabric or Material Code": (desc) => desc.toLowerCase().includes("suede") ? '"suede" detected in title' : "Inferred from product image analysis",
  "Faux Fur":                () => "No fur indicators in description",
  "Gender":                  () => "Inferred from product title and category",
  "Heel Height":             () => "Estimated from product measurements",
  "Lining Material":         () => "Inferred from category norms",
  "Open/Closed Toe":         (desc) => desc.toLowerCase().includes("sandal") ? "Open toe for sandals" : "Standard for this shoe type",
  "Shoe Type":               () => "Derived from product category",
  "Sole Type":               () => "Inferred from category and price tier",
  "Toe Shape":               () => "Matched to product image analysis",
  "Toe Style":               () => "Common style for this category",
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

const FOOTWEAR_ATTRIBUTES: FootwearAttributeDef[] = [
  { name: "Advertised Origin",                  suggestions: ["Imported", "Domestic"],                                    appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Brand Name",                         suggestions: ["Nike", "Adidas", "New Balance", "Clarks", "Timberland"],   appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Care Instructions Code",             suggestions: ["Wipe Clean", "Spot Clean", "Machine Wash", "Hand Wash"],   appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Closure",                            suggestions: ["Lace-up", "Zip", "Slip-on", "Velcro", "Buckle"],           appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Country of Origin",                  suggestions: ["China", "Vietnam", "India", "Indonesia"],                  appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Fabric or Material Code",            suggestions: ["Leather", "Suede", "Canvas", "Synthetic", "Textile"],      appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Faux Fur",                           suggestions: ["Yes", "No"],                                               appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Gender",                             suggestions: ["Men", "Women", "Unisex", "Boys", "Girls"],                 appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Heel Height",                        suggestions: ["Flat", "Low (<1in)", "Mid (1–2in)", "High (2–3in)"],       appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Lining Material",                    suggestions: ["Leather", "Textile", "Mesh", "Synthetic"],                 appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Open/Closed Toe",                    suggestions: ["Open Toe", "Closed Toe"],                                  appliesTo: ["10001077", "10001076"] },
  { name: "Shoe Type",                          suggestions: ["Sneaker", "Loafer", "Oxford", "Ankle Boot", "Running"],    appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Sole Type",                          suggestions: ["Rubber", "EVA", "PU", "Leather"],                          appliesTo: ["10001077", "10001076", "10001070"] },
  { name: "Toe Shape",                          suggestions: ["Round", "Square", "Pointed", "Almond"],                    appliesTo: ["10001077", "10001076"] },
  { name: "Toe Style",                          suggestions: ["Plain", "Cap Toe", "Wing Tip", "Moc Toe"],                 appliesTo: ["10001077", "10001076"] },
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

// Only these 3 attributes have any low-confidence GTINs — all others are fully auto-validated.
// This reflects a realistic, optimistic AI: the vast majority of suggestions are high confidence,
// and only a small number of attributes — where descriptions are ambiguous — surface edge cases.
const LOW_CONFIDENCE_ATTRIBUTES = new Set(["Toe Shape", "Closure", "Fabric or Material Code"])

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
      const isLowConfidenceGtin = index < lowConfidenceSlots
      const confidence = isLowConfidenceGtin
        ? Math.floor(52 + Math.random() * 16)   // 52–67 — genuinely uncertain
        : Math.floor(82 + Math.random() * 18)   // 82–99 — confidently validated

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
  
  const [attributeGroups, setAttributeGroups] = useState<AttributeGroup[]>(() =>
    generateAttributeData(code, metadata.gtins, metadata.description)
  )
  const [expandedAttributes, setExpandedAttributes] = useState<Set<string>>(new Set())
  const [editingGtin, setEditingGtin] = useState<{ attribute: string; gtin: string } | null>(null)
  const [editValue, setEditValue] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<"confidence" | "gtin" | "status">("confidence")
  const [showLowConfidenceOnly, setShowLowConfidenceOnly] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [hasExpandedOnce, setHasExpandedOnce] = useState(false)
  const itemsPerPage = 25

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

  const confirmAllForAttribute = (attrName: string) => {
    setAttributeGroups((prev) =>
      prev.map((group) =>
        group.attributeName === attrName
          ? {
              ...group,
              gtins: group.gtins.map((g) => (g.status === "pending" ? { ...g, status: "confirmed" } : g)),
            }
          : group
      )
    )
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

  const confirmByConfidenceThreshold = (threshold: number) => {
    setAttributeGroups((prev) =>
      prev.map((group) => ({
        ...group,
        gtins: group.gtins.map((g) =>
          g.status === "pending" && g.confidence >= threshold ? { ...g, status: "confirmed" } : g
        ),
      }))
    )
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
    setAttributeGroups((prev) =>
      prev.map((group) =>
        group.attributeName === attrName
          ? {
              ...group,
              gtins: group.gtins.map((g) =>
                g.status === "confirmed" || g.status === "edited"
                  ? { ...g, status: "pending", userValue: undefined }
                  : g
              ),
            }
          : group
      )
    )
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

  // Calculate stats
  const totalAttributes = attributeGroups.reduce((sum, g) => sum + g.gtins.length, 0)
  const confirmedAttributes = attributeGroups.reduce(
    (sum, g) => sum + g.gtins.filter((gt) => gt.status === "confirmed" || gt.status === "edited").length,
    0
  )
  const pendingAttributes = totalAttributes - confirmedAttributes
  const confirmedPercentage = Math.round((confirmedAttributes / totalAttributes) * 100)

  // Attribute-level review progress (for progress indicator in header)
  const totalAttributeRows = attributeGroups.length
  const reviewedAttributeRows = attributeGroups.filter(
    (g) => g.gtins.every((gt) => gt.status === "confirmed" || gt.status === "edited")
  ).length
  const attributeReviewPercent = Math.round((reviewedAttributeRows / totalAttributeRows) * 100)

  const gtinConfirmedMap: Record<string, number> = {}
  attributeGroups.forEach((group) => {
    group.gtins.forEach((gt) => {
      if (gt.status === "confirmed" || gt.status === "edited") {
        gtinConfirmedMap[gt.gtin] = (gtinConfirmedMap[gt.gtin] || 0) + 1
      }
    })
  })
  const gtinsEnriched = Object.keys(gtinConfirmedMap).length
  // % of GTINs that have at least one confirmed attribute. Drives "AI Enriched" status (≥ 50%).
  const enrichedGtinPercent = metadata.gtins > 0
    ? Math.round((gtinsEnriched / metadata.gtins) * 100)
    : 0
  // User can complete enrichment as soon as at least one attribute value has been confirmed.
  const canComplete = confirmedAttributes > 0

  // Filter and paginate GTINs for expanded view
  const getFilteredAndPaginatedGtins = (gtins: GTINAttribute[]) => {
    let filtered = gtins
    
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

  const handleConfirmComplete = () => {
    setShowConfirmDialog(false)
    onComplete(enrichedGtinPercent, [code])
  }

  const handleCancelComplete = () => {
    setShowConfirmDialog(false)
  }

  // Derive a list of ONLY attributes with low-confidence GTINs (< 70%) that are still PENDING.
  // Once reviewed (confirmed/edited/rejected), they no longer need attention.
  const attributesWithLowConfidence = attributeGroups
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

      {/* Batch Actions */}
      <div className="flex items-center gap-2 p-3 bg-[#f0f9ff] border border-[#bfdbfe] rounded">
        <span className="text-[12px] font-semibold text-[#1e40af]">Batch Confirm:</span>
        <button
          onClick={() => confirmByConfidenceThreshold(95)}
          className="px-2 py-1 text-[12px] bg-white border border-[#1e40af] text-[#1e40af] rounded hover:bg-[#eff6ff] transition-colors"
        >
          95%+
        </button>
        <button
          onClick={() => confirmByConfidenceThreshold(90)}
          className="px-2 py-1 text-[12px] bg-white border border-[#1e40af] text-[#1e40af] rounded hover:bg-[#eff6ff] transition-colors"
        >
          90%+
        </button>
        <button
          onClick={() => confirmByConfidenceThreshold(80)}
          className="px-2 py-1 text-[12px] bg-white border border-[#1e40af] text-[#1e40af] rounded hover:bg-[#eff6ff] transition-colors"
        >
          80%+
        </button>
        <label className="ml-auto flex items-center gap-2 text-[12px] text-[#374151]">
          <input
            type="checkbox"
            checked={showLowConfidenceOnly}
            onChange={(e) => {
              setShowLowConfidenceOnly(e.target.checked)
              setCurrentPage(1)
            }}
            className="w-3 h-3 rounded border-[#d1d5db]"
          />
          Show Low Confidence Only (&lt;85%)
        </label>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-[#d1d5db] rounded p-4">
          <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Total GTINs</p>
          <p className="text-[24px] font-bold text-[#1a1f2e] mt-1">{metadata.gtins}</p>
        </div>
        <div className="bg-white border border-[#d1d5db] rounded p-4">
          <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Total Attributes</p>
          <p className="text-[24px] font-bold text-[#1a1f2e] mt-1">{totalAttributes}</p>
        </div>
        <div className="bg-white border border-[#d1d5db] rounded p-4">
          <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">GTINs Enriched</p>
          <p className="text-[24px] font-bold text-[#2e7d32] mt-1">{gtinsEnriched}</p>
        </div>
        <div className="bg-white border border-[#d1d5db] rounded p-4">
          <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">Confirmed</p>
          <p className="text-[24px] font-bold text-[#1a5fa6] mt-1">{confirmedPercentage}%</p>
        </div>
      </div>

      {/* Progress indicator — reflects GTIN-level enrichment, which drives the Selection Code status */}
      {enrichedGtinPercent > 0 && enrichedGtinPercent < 50 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded border bg-[#fef3c7] border-[#fcd34d] text-[#92400e]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-[13px] font-medium">
            {gtinsEnriched} of {metadata.gtins} GTINs enriched ({enrichedGtinPercent}%) — reach 50% to mark this Selection Code as &quot;AI Enriched&quot;
          </span>
        </div>
      )}
      {enrichedGtinPercent >= 50 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded border bg-[#dcfce7] border-[#86efac] text-[#166534]">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="text-[13px] font-medium">
            {gtinsEnriched} of {metadata.gtins} GTINs enriched ({enrichedGtinPercent}%) — Status will update to &quot;AI Enriched&quot; on completion
          </span>
        </div>
      )}

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
                  GTINs Enriched
                  <Info
                    className="w-3 h-3 text-[#9ca3af] cursor-help"
                    aria-label="Confirmed out of applicable GTINs. Some attributes don't apply to every product — those GTINs aren't counted."
                  >
                    <title>Confirmed out of applicable GTINs. Some attributes don&apos;t apply to every product — those GTINs aren&apos;t counted.</title>
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
          {attributeGroups.map((group) => {
              const isExpanded = expandedAttributes.has(group.attributeName)
              const confirmedCount = group.gtins.filter((g) => g.status === "confirmed" || g.status === "edited").length
              const avgConfidence = Math.round(
                group.gtins.reduce((sum, g) => sum + g.confidence, 0) / group.gtins.length
              )
              const allConfirmed = confirmedCount === group.gtins.length

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
                        {allConfirmed ? (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#dcfce7] text-[#166534]">Confirmed</span>
                        ) : group.gtins.some((g) => g.confidence < 70) ? (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#fed7aa] text-[#b45309]">Needs review</span>
                        ) : null}
                      </div>
                      {!hasExpandedOnce && group.attributeName === attributeGroups[0]?.attributeName && (
                        <p className="text-[10px] text-[#9ca3af] mt-0.5 italic">Click to expand and review</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`font-semibold ${allConfirmed ? "text-[#166534]" : "text-[#1a5fa6]"}`}>
                        {confirmedCount}/{group.gtins.length}
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
                            onClick={() => confirmAllForAttribute(group.attributeName)}
                            className="px-3 py-1.5 text-[12px] font-semibold text-white rounded bg-[#1a5fa6] hover:bg-[#1a4f8c] transition-colors whitespace-nowrap"
                          >
                            Confirm All ({group.gtins.filter(g => g.status === "pending").length})
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded GTIN rows with pagination */}
                  {isExpanded && (() => {
                    const { items, total, totalPages } = getFilteredAndPaginatedGtins(group.gtins)
                    const lowConfidenceCount = group.gtins.filter((g) => g.confidence < 70).length
                    const autoValidatedCount = group.gtins.filter((g) => g.confidence >= 70).length
                    const showingLowConfidence = items.some((g) => g.confidence < 70)
                    const showingAutoValidated = items.some((g) => g.confidence >= 70)
                    
                    return (
                      <>
                        {/* Section header for low-confidence GTINs */}
                        {lowConfidenceCount > 0 && showingLowConfidence && (
                          <tr className="border-b border-[#fed7aa] bg-[#fef5e7]">
                            <td colSpan={6} className="px-3 py-2 text-[11px] font-semibold text-[#b45309]">
                              Items needing review ({items.filter((g) => g.confidence < 70).length} shown)
                            </td>
                          </tr>
                        )}
                        
                        {items.map((gtin) => {
                          const isEditing = editingGtin?.attribute === group.attributeName && editingGtin.gtin === gtin.gtin
                          const displayValue = gtin.status === "edited" ? gtin.userValue! : gtin.aiSuggestion
                          const isLowConfidence = gtin.confidence < 70

                          return (
                            <tr
                              key={`${group.attributeName}-${gtin.gtin}`}
                              className={`border-b ${
                                isLowConfidence 
                                  ? "border-[#fed7aa] bg-[#fef5e7]" 
                                  : "border-[#f3f4f6] bg-[#fafbfc]"
                              } ${
                                gtin.status === "confirmed" || gtin.status === "edited" ? "opacity-70" : ""
                              }`}
                            >
                              <td className="px-3 py-2.5"></td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-mono text-[11px] text-[#1a5fa6] font-medium">{gtin.gtin}</span>
                                  <span className="text-[10px] text-[#6b7280] truncate" title={gtin.productDescription}>{gtin.productDescription}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {isEditing ? (
                                  <AttributeValueCombobox
                                    attributeName={group.attributeName}
                                    value={editValue}
                                    onChange={setEditValue}
                                    onSave={saveEdit}
                                    onCancel={cancelEdit}
                                  />
                                ) : (
                                  <span className="text-[12px] font-semibold text-[#1a1f2e]">{displayValue}</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <div className="w-10 h-1.5 rounded-full bg-[#e5e7eb] overflow-hidden">
                                      <div
                                        className={`h-full transition-all ${gtin.confidence >= 90 ? "bg-[#2e7d32]" : gtin.confidence >= 80 ? "bg-[#f59e0b]" : "bg-[#dc2626]"}`}
                                        style={{ width: `${gtin.confidence}%` }}
                                      />
                                    </div>
                                    <span className="text-[11px] font-medium text-[#6b7280]">{gtin.confidence}%</span>
                                  </div>
                                  <p className="text-[9px] text-[#9ca3af] text-center italic truncate" title={gtin.aiReasoning}>{gtin.aiReasoning}</p>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={saveEdit}
                                        className="p-1 hover:bg-[#dcfce7] rounded transition-colors"
                                        title="Save"
                                      >
                                        <Check className="w-4 h-4 text-[#2e7d32]" />
                                      </button>
                                      <button
                                        onClick={cancelEdit}
                                        className="p-1 hover:bg-[#fee2e2] rounded transition-colors"
                                        title="Cancel"
                                      >
                                        <X className="w-4 h-4 text-[#dc2626]" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      {gtin.status === "pending" && (
                                        <div className="flex items-center justify-center gap-1.5">
                                          <button
                                            onClick={() => confirmSingleGtin(group.attributeName, gtin.gtin)}
                                            className="px-2.5 py-1 text-[11px] font-semibold text-white rounded bg-[#1a5fa6] hover:bg-[#1a4f8c] transition-colors"
                                          >
                                            Confirm
                                          </button>
                                          <button
                                            onClick={() => startEdit(group.attributeName, gtin.gtin, gtin.aiSuggestion)}
                                            className="px-2 py-1 text-[11px] font-medium border border-[#6b7280] text-[#374151] rounded hover:bg-[#f3f4f6] transition-colors"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => rejectGtin(group.attributeName, gtin.gtin)}
                                            className="px-2 py-1 text-[11px] font-medium border border-[#dc2626] text-[#dc2626] rounded hover:bg-[#fee2e2] transition-colors"
                                          >
                                            Reject
                                          </button>
                                        </div>
                                      )}
                                      {(gtin.status === "confirmed" || gtin.status === "edited") && (
                                        <div className="flex items-center gap-1.5">
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded bg-[#dcfce7] text-[#166534]">
                                            <Check className="w-3 h-3" />
                                            {gtin.status === "edited" ? "Edited" : "Confirmed"}
                                          </span>
                                          <button
                                            onClick={() => undoSingleGtin(group.attributeName, gtin.gtin)}
                                            className="px-2 py-1 text-[11px] font-medium border border-[#d1d5db] rounded bg-white text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#374151] transition-colors"
                                            title="Undo confirmation"
                                          >
                                            Undo
                                          </button>
                                        </div>
                                      )}
                                      {gtin.status === "rejected" && (
                                        <div className="flex items-center gap-1.5">
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded bg-[#fee2e2] text-[#dc2626]">
                                            <X className="w-3 h-3" />
                                            Rejected
                                          </span>
                                          <button
                                            onClick={() => undoRejectGtin(group.attributeName, gtin.gtin)}
                                            className="px-2 py-1 text-[11px] font-medium border border-[#d1d5db] rounded bg-white text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#374151] transition-colors"
                                            title="Undo rejection"
                                          >
                                            Undo
                                          </button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                        
                        {/* Summary of confirmed GTINs */}
                        {autoValidatedCount > items.filter((g) => g.confidence >= 70).length && (
                          <tr className="border-b border-[#d1fae5] bg-[#ecfdf5]">
                            <td colSpan={6} className="px-3 py-2 text-[11px] font-semibold text-[#047857]">
                              {autoValidatedCount - items.filter((g) => g.confidence >= 70).length} more items confirmed (high confidence)
                            </td>
                          </tr>
                        )}
                        
                        {/* Pagination */}
                        {totalPages > 1 && (
                          <tr className="border-b border-[#f3f4f6] bg-[#fafbfc]">
                            <td colSpan={5} className="px-6 py-3 flex items-center justify-center gap-2 text-[12px]">
                              <span className="text-[#6b7280]">
                                Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, total)} of {total}
                              </span>
                              <div className="flex gap-1">
                                {currentPage > 1 && (
                                  <button
                                    onClick={() => setCurrentPage(1)}
                                    className="px-2 py-1 text-[11px] border border-[#d1d5db] rounded hover:bg-[#e5e7eb]"
                                  >
                                    First
                                  </button>
                                )}
                                {currentPage > 1 && (
                                  <button
                                    onClick={() => setCurrentPage(currentPage - 1)}
                                    className="px-2 py-1 text-[11px] border border-[#d1d5db] rounded hover:bg-[#e5e7eb]"
                                  >
                                    Prev
                                  </button>
                                )}
                                {currentPage < totalPages && (
                                  <button
                                    onClick={() => setCurrentPage(currentPage + 1)}
                                    className="px-2 py-1 text-[11px] border border-[#d1d5db] rounded hover:bg-[#e5e7eb]"
                                  >
                                    Next
                                  </button>
                                )}
                                {currentPage < totalPages && (
                                  <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    className="px-2 py-1 text-[11px] border border-[#d1d5db] rounded hover:bg-[#e5e7eb]"
                                  >
                                    Last
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })()}
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
              {gtinsEnriched} of {metadata.gtins} GTINs enriched ({enrichedGtinPercent}%)
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
              {/* Summary — confirmed */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[13px] text-[#374151]">
                  <CheckCircle2 className="w-4 h-4 text-[#2e7d32] shrink-0" />
                  <span><strong>{gtinsEnriched}</strong> of {metadata.gtins} GTINs enriched</span>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-[#374151]">
                  <CheckCircle2 className="w-4 h-4 text-[#2e7d32] shrink-0" />
                  <span><strong>{reviewedAttributeRows}</strong> of {totalAttributeRows} attributes reviewed</span>
                </div>
              </div>

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
