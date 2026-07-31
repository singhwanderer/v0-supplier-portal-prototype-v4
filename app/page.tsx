"use client"

import { useState } from "react"
import { AppShell } from "@/components/app-shell"
import { Screen1Upload } from "@/components/screen1-upload"
import { ScreenBrickConfirmation } from "@/components/screen-brick-confirmation"
import { ScreenBrickGtinList } from "@/components/screen-brick-gtin-list"
import { Screen2Summary } from "@/components/screen2-summary"
import { Screen3Review } from "@/components/screen3-review"
import { Screen4Submission } from "@/components/screen4-submission"
import { ScreenEnrichmentPreview } from "@/components/screen-enrichment-preview"
import { ScreenSelectionCode } from "@/components/screen-selection-code"
import { ScreenSelectionCodeList } from "@/components/screen-selection-code-list"
import { ScreenAIEnrichmentReview } from "@/components/screen-ai-enrichment-review"
import { ScreenCategoryFallback } from "@/components/screen-category-fallback"
import {
  ScreenIndividualAssignment,
  ALL_CATEGORY_OPTIONS,
  type AssignableProduct,
  type CategoryAssignment,
} from "@/components/screen-individual-assignment"
import { ScreenCategoryCoverage } from "@/components/screen-category-coverage"
import { ScreenProductList, type DrillDownProduct } from "@/components/screen-product-list"
import { ScreenGtinList } from "@/components/screen-gtin-list"
import { ScreenSleepwearBrickConfirmation } from "@/components/screen-sleepwear-brick-confirmation"
import { ScreenSleepwearBrickGtinList } from "@/components/screen-sleepwear-brick-gtin-list"
import { ScreenSleepwearEnrichmentReview } from "@/components/screen-sleepwear-enrichment-review"
import {
  ScreenProductCategoryAssignment,
  type CategorizableProduct,
} from "@/components/screen-product-category-assignment"
import { SLEEPWEAR_CATEGORY_OPTIONS, SLEEPWEAR_SELECTION_CODE } from "@/lib/sleepwear-catalog"
import { getBricksForSelectionCode } from "@/lib/category-attributes"
import { mergeEnrichmentResults, type ProductEnrichmentResult } from "@/lib/enrichment-results"
import { ScreenProductEnrichmentDetail } from "@/components/screen-product-enrichment-detail"

export interface ConfirmedCategory {
  id: string
  name: string
  productCount: number  // Change 1: Primary unit is now products
  gtinCount: number     // GTINs shown for reference
  confidence: number
  // Which GS1 brick this category maps to — decides the attribute set shown at review.
  brickCode?: string
}

export type EnrichmentStatus = "ai-enriched" | "in-progress" | "needs-enrichment" | "categories-assigned"

export interface SelectionCodeMetadata {
  gtins: number
  products: number
  description: string
  categoriesAssigned: number
  // Carried from the list row so downstream handlers can preserve — rather than
  // reset — a code's real status and enrichment history.
  status?: EnrichmentStatus
  lastEnrichedDate?: string
}

type Screen = "upload" | "selection-code-list" | "ai-enrichment-review" | "brick-confirmation" | "brick-gtin-list" | "summary" | "review" | "submission" | "enrichment-preview" | "selection-code" | "category-fallback" | "individual-assignment" | "category-coverage" | "product-list" | "gtin-list" | "product-category-assignment" | "product-enrichment-detail"

// Category assignment upgrades a code that had nothing, but never downgrades one
// that is already being enriched.
const statusAfterCategoryAssignment = (current?: EnrichmentStatus): EnrichmentStatus =>
  current === "ai-enriched" || current === "in-progress" ? current : "categories-assigned"

export default function Home() {
  const [screen, setScreen] = useState<Screen>("selection-code-list")
  const [uploadedFileName, setUploadedFileName] = useState<string>("")
  const [uploadedGtinCount, setUploadedGtinCount] = useState<number>(1024)
  const [confirmedCategories, setConfirmedCategories] = useState<ConfirmedCategory[]>([])
  const [selectedBrickCategoryId, setSelectedBrickCategoryId] = useState<string>("")
  const [selectedBrickCategoryName, setSelectedBrickCategoryName] = useState<string>("")
  const [selectedBrickCode, setSelectedBrickCode] = useState<string>("")
  const [reviewCategoryKey, setReviewCategoryKey] = useState<string>("")
  const [selectedSelectionCodes, setSelectedSelectionCodes] = useState<string[]>([])
  // Always the code's own numbers. Scope-specific counts live in enrichmentProductScope.
  const [selectedCodesMetadata, setSelectedCodesMetadata] = useState<Record<string, SelectionCodeMetadata>>({})
  const [enrichmentUpdates, setEnrichmentUpdates] = useState<Record<string, { status: EnrichmentStatus; lastEnrichedDate: string; categoriesAssigned?: number }>>({})
  // Tracks which entry point took the user into Brick Confirmation so we can adapt copy and routing
  const [brickConfirmationSource, setBrickConfirmationSource] = useState<"upload" | "selection-code">("upload")
  // When entered from the Category Coverage screen, brick confirmation only covers the unassigned subset
  const [brickConfirmationScope, setBrickConfirmationScope] = useState<"all" | "unassigned-only">("all")
  // Bug 3 fix: Track individual assignment scope
  const [individualAssignmentScope, setIndividualAssignmentScope] = useState<"unclassified" | "all-low-confidence">("unclassified")
  // Product-level drill-down state (Selection Code List → Product List → GTIN List)
  const [drillDownCode, setDrillDownCode] = useState<string>("")
  const [drillDownCodeMeta, setDrillDownCodeMeta] = useState<SelectionCodeMetadata | null>(null)
  const [drillDownProduct, setDrillDownProduct] = useState<DrillDownProduct | null>(null)
  // Products can't hold the "categories-assigned" code-level status — only enrichment states
  const [productEnrichmentUpdates, setProductEnrichmentUpdates] = useState<Record<string, "ai-enriched" | "in-progress" | "needs-enrichment">>({})
  // Categories assigned to individual products during this session
  const [productCategoryUpdates, setProductCategoryUpdates] = useState<Record<string, { name: string; brickCode: string }>>({})
  // Which products of each code have been enriched, so a code can reach "AI Enriched"
  // by enriching its products one at a time.
  const [enrichedProductsByCode, setEnrichedProductsByCode] = useState<Record<string, string[]>>({})
  // When enrichment runs for specific products (not a whole selection code)
  const [enrichmentProductScope, setEnrichmentProductScope] = useState<DrillDownProduct[] | null>(null)
  const [enrichmentScopeLabel, setEnrichmentScopeLabel] = useState<string | null>(null)
  // Products handed to the individual-assignment screen by the product-level flow
  const [assignmentProducts, setAssignmentProducts] = useState<AssignableProduct[] | null>(null)
  // Uncategorized products awaiting AI's category proposal in the product-level flow
  const [categorizableProducts, setCategorizableProducts] = useState<CategorizableProduct[] | null>(null)
  // What each enrichment run actually wrote, keyed by the review screen's product
  // label. Survives the review screen so the detail view can read it back.
  const [enrichedAttributes, setEnrichedAttributes] = useState<Record<string, ProductEnrichmentResult>>({})
  // The product whose enrichment detail is open, and which list to return to.
  const [detailProduct, setDetailProduct] = useState<DrillDownProduct | null>(null)
  const [detailReturnScreen, setDetailReturnScreen] = useState<"product-list" | "gtin-list">("product-list")

  // The code the user is currently working in, whichever path they came through.
  const activeCode = selectedSelectionCodes[0] ?? drillDownCode
  const isSleepwearFlow = activeCode === SLEEPWEAR_SELECTION_CODE

  const metaForCode = (code: string): SelectionCodeMetadata | null =>
    selectedCodesMetadata[code] ?? (drillDownCode === code ? drillDownCodeMeta : null)

  const goHome = () => {
    // Selection Code List is the recommended entry point; Text File Upload is
    // hidden from the nav by default and reachable via the gear menu.
    setScreen("selection-code-list")
    setConfirmedCategories([])
    setSelectedBrickCategoryId("")
    setSelectedBrickCategoryName("")
    setSelectedBrickCode("")
    setReviewCategoryKey("")
    setSelectedSelectionCodes([])
    setDrillDownCode("")
    setDrillDownCodeMeta(null)
    setDrillDownProduct(null)
    setEnrichmentProductScope(null)
    setEnrichmentScopeLabel(null)
    setAssignmentProducts(null)
    setCategorizableProducts(null)
  }

  const shellScreen: "upload" | "summary" | "review" | "submission" | "selection-code-list" =
    screen === "upload"               ? "upload" :
    screen === "selection-code-list"  ? "selection-code-list" :
    screen === "category-coverage"    ? "selection-code-list" :
    screen === "product-list"         ? "selection-code-list" :
    screen === "gtin-list"            ? "selection-code-list" :
    screen === "ai-enrichment-review" ? "review" :
    screen === "category-fallback"    ? "summary" :
    screen === "brick-confirmation"   ? "summary" :
    screen === "brick-gtin-list"      ? "summary" :
    screen === "summary"              ? "summary" :
    screen === "review"               ? "review" :
    screen === "enrichment-preview"   ? "submission" :
    screen === "selection-code"       ? "submission" :
    "submission"

  // Derive the total GTIN count from confirmed categories (or all uploaded)
  const enrichmentGtinCount = confirmedCategories.length > 0
    ? confirmedCategories.reduce((sum, c) => sum + c.gtinCount, 0)
    : uploadedGtinCount

  // Coverage numbers can change after the list emitted its metadata (Save & Exit, completed
  // enrichment) — merge in any overrides so downstream screens always see current coverage.
  const effectiveCodesMetadata: Record<string, SelectionCodeMetadata> = Object.fromEntries(
    Object.entries(selectedCodesMetadata).map(([code, meta]) => [
      code,
      { ...meta, categoriesAssigned: enrichmentUpdates[code]?.categoriesAssigned ?? meta.categoriesAssigned },
    ])
  )

  // ── Coverage bookkeeping ────────────────────────────────────────────────────

  /**
   * Add newly categorized products to a code's coverage. Increments rather than
   * overwrites, so categorizing three products in a drill-down can't wipe out
   * the thirty-eight the code already had.
   */
  const addCoverage = (code: string, newlyAssigned: number) => {
    if (newlyAssigned <= 0) return
    const meta = metaForCode(code)
    if (!meta) return
    setEnrichmentUpdates((prev) => {
      const prevEntry = prev[code]
      const currentAssigned = prevEntry?.categoriesAssigned ?? meta.categoriesAssigned
      return {
        ...prev,
        [code]: {
          status: statusAfterCategoryAssignment(prevEntry?.status ?? meta.status),
          lastEnrichedDate: prevEntry?.lastEnrichedDate ?? meta.lastEnrichedDate ?? "TBD",
          categoriesAssigned: Math.min(meta.products, currentAssigned + newlyAssigned),
        },
      }
    })
  }

  /** Mark a code fully categorized — only correct for whole-code confirmations. */
  const setFullCoverage = (codes: string[]) => {
    setEnrichmentUpdates((prev) => {
      const next = { ...prev }
      codes.forEach((code) => {
        const meta = metaForCode(code)
        if (!meta) return
        const prevEntry = prev[code]
        next[code] = {
          status: statusAfterCategoryAssignment(prevEntry?.status ?? meta.status),
          lastEnrichedDate: prevEntry?.lastEnrichedDate ?? meta.lastEnrichedDate ?? "TBD",
          categoriesAssigned: meta.products,
        }
      })
      return next
    })
  }

  // Scenario 3: persist category-assignment work and return to the Selection Code List.
  const handleSaveCategoriesAndExit = (assignedProductCount: number) => {
    selectedSelectionCodes.forEach((code) => addCoverage(code, assignedProductCount))
    setScreen("selection-code-list")
  }

  // Scenario 2: enrichment scoped to specific products from the Product/GTIN drill-down
  const startProductScopedEnrichment = (products: DrillDownProduct[]) => {
    if (products.length === 0) return
    const code = drillDownCode
    const meta = drillDownCodeMeta
    setSelectedSelectionCodes([code])
    // Keep the code's own numbers here — the scope lives in enrichmentProductScope.
    if (meta) setSelectedCodesMetadata({ [code]: meta })
    setEnrichmentProductScope(products)
    setEnrichmentScopeLabel(
      products.length === 1
        ? `Product ${products[0].id} — ${products[0].description}`
        : `${products.length} selected products`
    )
    setBrickConfirmationSource("selection-code")
    setBrickConfirmationScope("all")

    // Products that already have a category keep it. For anything uncategorized,
    // AI proposes a category first and the user confirms — assigning the category
    // is part of enrichment, not something the supplier has to do beforehand.
    const uncategorized = products.filter((p) => p.category === null)
    if (uncategorized.length === 0) {
      setCategorizableProducts(null)
      setScreen("ai-enrichment-review")
      return
    }
    setCategorizableProducts(
      uncategorized.map((p) => ({ id: p.id, description: p.description, gtins: p.gtins }))
    )
    setScreen("product-category-assignment")
  }

  // Persist categories assigned to specific products in the drill-down flow.
  const applyScopedAssignments = (assignments: CategoryAssignment[]) => {
    if (assignments.length === 0) return
    setProductCategoryUpdates((prev) => {
      const next = { ...prev }
      assignments.forEach((a) => {
        next[a.id] = { name: a.category, brickCode: a.brickCode }
      })
      return next
    })
    addCoverage(activeCode, assignments.length)
    // Carry the freshly assigned categories into the enrichment scope.
    setEnrichmentProductScope((prev) =>
      prev
        ? prev.map((p) => {
            const match = assignments.find((a) => a.id === p.id)
            return match ? { ...p, category: { name: match.category, brickCode: match.brickCode } } : p
          })
        : prev
    )
  }

  // Assignments done, continue into attribute enrichment.
  const handleScopedAssignments = (assignments: CategoryAssignment[]) => {
    applyScopedAssignments(assignments)
    setAssignmentProducts(null)
    setScreen("ai-enrichment-review")
  }

  // Enrichment finished — update the code (and, for scoped runs, the products).
  const handleEnrichmentComplete = (
    confirmedPercentage: number,
    codes: string[],
    results: ProductEnrichmentResult[] = []
  ) => {
    // Hold what was actually written so the enrichment detail screen can show it.
    if (results.length > 0) setEnrichedAttributes((prev) => mergeEnrichmentResults(prev, results))
    const nextStatus: "ai-enriched" | "in-progress" | "needs-enrichment" =
      confirmedPercentage >= 50 ? "ai-enriched"
      : confirmedPercentage > 0 ? "in-progress"
      : "needs-enrichment"
    const today = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
    const scopeIds = enrichmentProductScope?.map((p) => p.id) ?? null

    // Track enriched products per code so enriching them one at a time can
    // eventually take the whole code to "AI Enriched".
    const enrichedByCode: Record<string, string[]> = { ...enrichedProductsByCode }
    if (scopeIds) {
      codes.forEach((code) => {
        enrichedByCode[code] = Array.from(new Set([...(enrichedByCode[code] ?? []), ...scopeIds]))
      })
      setEnrichedProductsByCode(enrichedByCode)
      setProductEnrichmentUpdates((prevMap) => {
        const next = { ...prevMap }
        scopeIds.forEach((id) => { next[id] = nextStatus })
        return next
      })
    }

    setEnrichmentUpdates((prev) => {
      const next = { ...prev }
      codes.forEach((code) => {
        const meta = metaForCode(code)
        const prevEntry = prev[code]
        if (scopeIds) {
          // Partial run: the code only reaches "AI Enriched" once every product has been.
          const enrichedCount = enrichedByCode[code]?.length ?? 0
          const coversWholeCode = meta ? enrichedCount >= meta.products : false
          next[code] = {
            status: coversWholeCode || prevEntry?.status === "ai-enriched" ? "ai-enriched" : "in-progress",
            lastEnrichedDate: today,
            categoriesAssigned: prevEntry?.categoriesAssigned ?? meta?.categoriesAssigned,
          }
        } else {
          // Enriching a whole code implies its categories were all confirmed en route
          next[code] = { status: nextStatus, lastEnrichedDate: today, categoriesAssigned: meta?.products }
        }
      })
      return next
    })
  }

  // Where "back" should land depends on whether the user came via a drill-down.
  const backFromEnrichment = () => setScreen(enrichmentProductScope ? "product-list" : "selection-code-list")

  // Enrichment results are keyed by the label the review screens build their
  // rows from, so the detail screen can find a product's run.
  const enrichmentKeyFor = (p: DrillDownProduct) => `${p.id} — ${p.description}`

  const openEnrichmentDetail = (product: DrillDownProduct) => {
    setDetailProduct(product)
    setDetailReturnScreen(screen === "gtin-list" ? "gtin-list" : "product-list")
    setScreen("product-enrichment-detail")
  }

  const scopeProductCount = enrichmentProductScope?.length ?? 0
  const scopeGtinCount = enrichmentProductScope?.reduce((s, p) => s + p.gtins, 0) ?? 0

  // ── Step indicators ─────────────────────────────────────────────────────────
  // Both flows are numbered the same way so neither reads as a different product.
  //   code-level with coverage (002):  Coverage 1/3 → Categories 2/3 → Attributes 3/3
  //   code-level without coverage:     Categories 1/2 → Attributes 2/2
  //   product-level, uncategorized:    Categories 1/2 → Attributes 2/2
  //   product-level, already categorized: single step, no indicator
  const stepLabelFor = (currentScreen: Screen): string | undefined => {
    if (enrichmentProductScope) {
      // A scoped run only has a category step when something needed one.
      if (!categorizableProducts && currentScreen === "ai-enrichment-review") return undefined
      if (currentScreen === "product-category-assignment") return "Step 1 of 2"
      if (currentScreen === "ai-enrichment-review") return "Step 2 of 2"
      return undefined
    }
    // Coverage only appears for codes that already had category assignments.
    const hasCoverageStep = selectedSelectionCodes.some((code) => {
      const meta = effectiveCodesMetadata[code]
      return meta ? meta.categoriesAssigned > 0 : false
    })
    const total = hasCoverageStep ? 3 : 2
    if (currentScreen === "category-coverage") return `Step 1 of ${total}`
    if (currentScreen === "brick-confirmation") return `Step ${hasCoverageStep ? 2 : 1} of ${total}`
    if (currentScreen === "ai-enrichment-review") return `Step ${total} of ${total}`
    return undefined
  }

  // Which GS1 bricks the review screen should ask attributes for, most specific
  // source first: the products actually in scope, then the categories the user
  // confirmed, then whatever the selection code covers.
  const uniq = (codes: (string | undefined)[]) => Array.from(new Set(codes.filter((c): c is string => !!c)))
  const scopeBrickCodes: string[] = (() => {
    if (enrichmentProductScope) {
      const fromProducts = uniq(enrichmentProductScope.map((p) => p.category?.brickCode))
      if (fromProducts.length > 0) return fromProducts
    }
    const fromConfirmed = uniq(confirmedCategories.map((c) => c.brickCode))
    if (fromConfirmed.length > 0) return fromConfirmed
    return getBricksForSelectionCode(activeCode)
  })()

  // The footwear review derives its totals from the metadata it's handed, so a
  // scoped run needs the scope's counts rather than the whole code's. (The
  // sleepwear review takes the scope directly and does this itself.)
  const reviewCodesMetadata: Record<string, SelectionCodeMetadata> = enrichmentProductScope
    ? Object.fromEntries(
        Object.entries(effectiveCodesMetadata).map(([code, meta]) => [
          code,
          { ...meta, products: scopeProductCount, gtins: scopeGtinCount },
        ])
      )
    : effectiveCodesMetadata

  return (
    <AppShell
      onHome={goHome}
      onSelectionCodeList={() => setScreen("selection-code-list")}
      onTextFileUpload={() => setScreen("upload")}
      activeScreen={shellScreen}
    >
      {screen === "upload" && (
        <Screen1Upload
          onEnrichmentComplete={(fileName, gtinCount) => {
            setUploadedFileName(fileName)
            setUploadedGtinCount(gtinCount)
            setBrickConfirmationSource("upload")
            setBrickConfirmationScope("all")
            setEnrichmentProductScope(null)
            setEnrichmentScopeLabel(null)
            setSelectedSelectionCodes([])
            setScreen("brick-confirmation")
          }}
          onCategoryResolutionFailed={() => setScreen("category-fallback")}
        />
      )}

      {screen === "selection-code-list" && (
        <ScreenSelectionCodeList
          onEnrichSelected={(codes, metadata) => {
            setSelectedSelectionCodes(codes)
            setSelectedCodesMetadata(metadata)
            setBrickConfirmationSource("selection-code")
            setBrickConfirmationScope("all")
            setEnrichmentProductScope(null)
            setEnrichmentScopeLabel(null)
            setAssignmentProducts(null)
            // Codes with existing category assignments go through the Category Coverage
            // view first; codes with none follow the original AI-classification flow.
            const hasAssignments = codes.some((code) => {
              const meta = metadata[code]
              if (!meta) return false
              return (enrichmentUpdates[code]?.categoriesAssigned ?? meta.categoriesAssigned) > 0
            })
            setScreen(hasAssignments ? "category-coverage" : "brick-confirmation")
          }}
          onOpenProductList={(code, metadata) => {
            setDrillDownCode(code)
            setDrillDownCodeMeta(metadata)
            setScreen("product-list")
          }}
          enrichmentUpdates={enrichmentUpdates}
        />
      )}

      {screen === "category-coverage" && (
        <ScreenCategoryCoverage
          selectedCodes={selectedSelectionCodes}
          codesMetadata={effectiveCodesMetadata}
          onAssignWithAI={() => {
            setBrickConfirmationScope("unassigned-only")
            setScreen("brick-confirmation")
          }}
          onProceedToEnrichment={() => setScreen("ai-enrichment-review")}
          onExit={() => setScreen("selection-code-list")}
          stepLabel={stepLabelFor("category-coverage")}
          onBack={() => setScreen(enrichmentProductScope ? "product-list" : "selection-code-list")}
        />
      )}

      {screen === "product-list" && drillDownCodeMeta && (
        <ScreenProductList
          code={drillDownCode}
          metadata={{
            ...drillDownCodeMeta,
            categoriesAssigned: enrichmentUpdates[drillDownCode]?.categoriesAssigned ?? drillDownCodeMeta.categoriesAssigned,
          }}
          productEnrichmentUpdates={productEnrichmentUpdates}
          productCategoryUpdates={productCategoryUpdates}
          onBack={() => setScreen("selection-code-list")}
          onOpenGtinList={(product) => {
            setDrillDownProduct(product)
            setScreen("gtin-list")
          }}
          onViewEnrichment={openEnrichmentDetail}
          onEnrichProducts={startProductScopedEnrichment}
        />
      )}

      {screen === "gtin-list" && drillDownProduct && (
        <ScreenGtinList
          code={drillDownCode}
          codeDescription={drillDownCodeMeta?.description ?? ""}
          product={drillDownProduct}
          onBack={() => setScreen("product-list")}
          onBackToSelectionCodes={() => setScreen("selection-code-list")}
          onViewEnrichment={() => openEnrichmentDetail(drillDownProduct)}
          onEnrich={() => startProductScopedEnrichment([drillDownProduct])}
        />
      )}

      {screen === "product-enrichment-detail" && detailProduct && (
        <ScreenProductEnrichmentDetail
          code={drillDownCode}
          codeDescription={drillDownCodeMeta?.description ?? ""}
          product={detailProduct}
          result={enrichedAttributes[enrichmentKeyFor(detailProduct)]}
          backLabel={detailReturnScreen === "gtin-list" ? "GTIN List" : "Product List"}
          onBack={() => setScreen(detailReturnScreen)}
          onBackToSelectionCodes={() => setScreen("selection-code-list")}
          onAddValues={(added) => {
            const key = enrichmentKeyFor(detailProduct)
            setEnrichedAttributes((prev) =>
              mergeEnrichmentResults(prev, [
                {
                  productKey: key,
                  productId: detailProduct.id,
                  description: detailProduct.description,
                  brickCode: detailProduct.category?.brickCode,
                  values: added,
                  unenriched: [],
                },
              ])
            )
          }}
        />
      )}

      {screen === "ai-enrichment-review" && (
        isSleepwearFlow ? (
          <ScreenSleepwearEnrichmentReview
            selectedCodes={selectedSelectionCodes}
            codesMetadata={effectiveCodesMetadata}
            scopeLabel={enrichmentScopeLabel ?? undefined}
            scopeProducts={enrichmentProductScope?.map((p) => ({
              id: p.id,
              description: p.description,
              gtins: p.gtins,
              brickCode: p.category?.brickCode,
            }))}
            brickCodes={scopeBrickCodes}
            stepLabel={stepLabelFor("ai-enrichment-review")}
            onBack={backFromEnrichment}
            onComplete={handleEnrichmentComplete}
            onViewProductEnrichment={(productId) => {
              const product = enrichmentProductScope?.find((p) => p.id === productId)
              if (product) openEnrichmentDetail(product)
            }}
          />
        ) : (
          <ScreenAIEnrichmentReview
            selectedCodes={selectedSelectionCodes}
            codesMetadata={reviewCodesMetadata}
            scopeLabel={enrichmentScopeLabel ?? undefined}
            brickCodes={scopeBrickCodes}
            stepLabel={stepLabelFor("ai-enrichment-review")}
            onBack={backFromEnrichment}
            onComplete={handleEnrichmentComplete}
          />
        )
      )}

      {screen === "brick-confirmation" && (() => {
        // Scoped runs count only the products in scope; whole-code runs count the code.
        const totalGtinCount =
          brickConfirmationSource !== "selection-code"
            ? uploadedGtinCount
            : enrichmentProductScope
              ? scopeGtinCount
              : selectedSelectionCodes.reduce((sum, code) => {
                  const meta = effectiveCodesMetadata[code]
                  if (!meta) return sum
                  if (brickConfirmationScope === "unassigned-only" && meta.products > 0) {
                    // Proportional GTIN share of the unassigned products
                    return sum + Math.round((meta.gtins * (meta.products - meta.categoriesAssigned)) / meta.products)
                  }
                  return sum + meta.gtins
                }, 0)

        const totalProductCount =
          brickConfirmationSource !== "selection-code"
            ? Math.ceil(uploadedGtinCount / 2.3) // Estimate products from GTINs
            : enrichmentProductScope
              ? scopeProductCount
              : selectedSelectionCodes.reduce((sum, code) => {
                  const meta = effectiveCodesMetadata[code]
                  if (!meta) return sum
                  return sum + (brickConfirmationScope === "unassigned-only" ? meta.products - meta.categoriesAssigned : meta.products)
                }, 0)

        const sourceContext = brickConfirmationSource === "selection-code"
          ? { type: "selection-code" as const, codes: selectedSelectionCodes, metadata: selectedCodesMetadata }
          : { type: "upload" as const, fileName: uploadedFileName }

        const handleViewGtins = (categoryId: string, categoryName: string, brickCode: string) => {
          setSelectedBrickCategoryId(categoryId)
          setSelectedBrickCategoryName(categoryName)
          setSelectedBrickCode(brickCode)
          setScreen("brick-gtin-list")
        }

        const handleProceed = (categories: ConfirmedCategory[]) => {
          setConfirmedCategories(categories)
          if (brickConfirmationSource !== "selection-code") {
            setScreen("summary")
            return
          }
          // Confirming categories for a whole code completes its coverage; a scoped
          // run only adds the products it actually covered.
          if (enrichmentProductScope) {
            addCoverage(activeCode, categories.reduce((sum, c) => sum + c.productCount, 0))
          } else {
            setFullCoverage(selectedSelectionCodes)
          }
          setScreen("ai-enrichment-review")
        }

        const handleBack = () => {
          if (enrichmentProductScope) setScreen("product-list")
          else if (brickConfirmationScope === "unassigned-only") setScreen("category-coverage")
          else if (brickConfirmationSource === "selection-code") setScreen("selection-code-list")
          else goHome()
        }

        const handleSaveAndExit = (categories: ConfirmedCategory[]) => {
          if (categories.length > 0) setConfirmedCategories(categories)
          handleSaveCategoriesAndExit(categories.reduce((sum, c) => sum + c.productCount, 0))
        }

        const handleAssignIndividually = (scope: "unclassified" | "all-low-confidence") => {
          setIndividualAssignmentScope(scope)
          setAssignmentProducts(null)
          setScreen("individual-assignment")
        }

        return isSleepwearFlow ? (
          <ScreenSleepwearBrickConfirmation
            totalGtinCount={totalGtinCount}
            totalProductCount={totalProductCount}
            sourceContext={sourceContext}
            coverageScope={brickConfirmationScope}
            scopeLabel={enrichmentScopeLabel ?? undefined}
            stepLabel={stepLabelFor("brick-confirmation")}
            onViewGtins={handleViewGtins}
            onProceedToEnrichment={handleProceed}
            onBack={handleBack}
            onSaveAndExit={handleSaveAndExit}
            onAssignIndividually={handleAssignIndividually}
          />
        ) : (
          <ScreenBrickConfirmation
            fileName={uploadedFileName}
            totalGtinCount={totalGtinCount}
            totalProductCount={totalProductCount}
            sourceContext={sourceContext}
            coverageScope={brickConfirmationScope}
            onViewGtins={handleViewGtins}
            onProceedToEnrichment={handleProceed}
            onBack={handleBack}
            onSaveAndExit={handleSaveAndExit}
            onAssignIndividually={handleAssignIndividually}
          />
        )
      })()}

      {screen === "product-category-assignment" && categorizableProducts && (
        <ScreenProductCategoryAssignment
          code={drillDownCode}
          codeDescription={drillDownCodeMeta?.description ?? ""}
          products={categorizableProducts}
          categoryOptions={isSleepwearFlow ? SLEEPWEAR_CATEGORY_OPTIONS : ALL_CATEGORY_OPTIONS}
          allowedBrickCodes={getBricksForSelectionCode(activeCode)}
          stepLabel={stepLabelFor("product-category-assignment")}
          onBack={() => setScreen("product-list")}
          onConfirm={(assignments) => {
            setCategorizableProducts(null)
            handleScopedAssignments(assignments)
          }}
          onSaveAndExit={(assignments) => {
            applyScopedAssignments(assignments)
            setCategorizableProducts(null)
            setScreen("product-list")
          }}
        />
      )}

      {screen === "individual-assignment" && (
        <ScreenIndividualAssignment
          scope={individualAssignmentScope}
          products={assignmentProducts ?? undefined}
          categoryOptions={isSleepwearFlow ? SLEEPWEAR_CATEGORY_OPTIONS : undefined}
          headline={
            assignmentProducts
              ? `Assign a category to ${assignmentProducts.length} product${assignmentProducts.length === 1 ? "" : "s"} before enriching`
              : undefined
          }
          onBack={() => setScreen(assignmentProducts ? "product-list" : "brick-confirmation")}
          onSaveAndExit={(assignedCount, _totalCount, assignments) => {
            if (assignmentProducts && assignments) {
              // Drill-down flow: persist onto the products and return to the list.
              handleScopedAssignments(assignments)
              setScreen("product-list")
              return
            }
            handleSaveCategoriesAndExit(assignedCount)
          }}
          onProceed={assignmentProducts ? handleScopedAssignments : undefined}
        />
      )}

      {screen === "brick-gtin-list" && (
        isSleepwearFlow ? (
          <ScreenSleepwearBrickGtinList
            categoryId={selectedBrickCategoryId}
            categoryName={selectedBrickCategoryName}
            code={activeCode}
            onBack={() => setScreen("brick-confirmation")}
          />
        ) : (
          <ScreenBrickGtinList
            categoryId={selectedBrickCategoryId}
            categoryName={selectedBrickCategoryName}
            brickCode={selectedBrickCode}
            onBack={() => setScreen("brick-confirmation")}
          />
        )
      )}

      {screen === "summary" && (
        <Screen2Summary
          fileName={uploadedFileName}
          gtinCount={enrichmentGtinCount}
          confirmedCategories={confirmedCategories}
          onReviewCategory={(catKey) => {
            setReviewCategoryKey(catKey)
            setScreen("review")
          }}
          onBack={() => setScreen("brick-confirmation")}
        />
      )}

      {screen === "review" && (
        <Screen3Review
          category={reviewCategoryKey}
          confirmedCategories={confirmedCategories}
          onBack={() => setScreen("summary")}
          onConfirmGroup={() => setScreen("submission")}
        />
      )}

      {screen === "submission" && (
        <Screen4Submission
          onBack={() => setScreen("review")}
          onHome={goHome}
          onProceedToEnrichmentPreview={() => setScreen("enrichment-preview")}
        />
      )}

      {screen === "enrichment-preview" && (
        <ScreenEnrichmentPreview
          fileName={uploadedFileName}
          confirmedCategories={confirmedCategories}
          onViewSelectionCodeList={() => setScreen("selection-code-list")}
          onUploadAnother={goHome}
        />
      )}

      {screen === "selection-code" && (
        <ScreenSelectionCode
          confirmedCategories={confirmedCategories}
          onComplete={goHome}
          onBack={() => setScreen("submission")}
        />
      )}

      {screen === "category-fallback" && (
        <ScreenCategoryFallback
          onBack={() => setScreen("upload")}
          onConfirm={({ categoryLabel, subLabel, brickCode }) => {
            // Once the supplier confirms, lock the brick for the session and jump
            // directly into the standard attribute review flow.
            const syntheticCode = "FALLBACK"
            const estimatedProducts = Math.ceil(uploadedGtinCount / 2.3)
            // Carry the confirmed brick so review asks for that category's attributes.
            setConfirmedCategories([{
              id: brickCode,
              name: subLabel,
              productCount: estimatedProducts,
              gtinCount: uploadedGtinCount,
              confidence: 100,
              brickCode,
            }])
            setSelectedSelectionCodes([syntheticCode])
            setSelectedCodesMetadata({
              [syntheticCode]: {
                gtins: uploadedGtinCount,
                products: estimatedProducts,
                description: `${categoryLabel} — ${subLabel} (${brickCode})`,
                categoriesAssigned: estimatedProducts,
              },
            })
            setEnrichmentProductScope(null)
            setEnrichmentScopeLabel(null)
            setScreen("ai-enrichment-review")
          }}
        />
      )}
    </AppShell>
  )
}
