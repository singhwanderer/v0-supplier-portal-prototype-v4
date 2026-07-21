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
import { ScreenIndividualAssignment } from "@/components/screen-individual-assignment"
import { ScreenCategoryCoverage } from "@/components/screen-category-coverage"
import { ScreenProductList, type DrillDownProduct } from "@/components/screen-product-list"
import { ScreenGtinList } from "@/components/screen-gtin-list"

export interface ConfirmedCategory {
  id: string
  name: string
  productCount: number  // Change 1: Primary unit is now products
  gtinCount: number     // GTINs shown for reference
  confidence: number
}

export interface SelectionCodeMetadata {
  gtins: number
  products: number
  description: string
  categoriesAssigned: number
}

type EnrichmentStatus = "ai-enriched" | "in-progress" | "needs-enrichment" | "categories-assigned"
type Screen = "upload" | "selection-code-list" | "ai-enrichment-review" | "brick-confirmation" | "brick-gtin-list" | "summary" | "review" | "submission" | "enrichment-preview" | "selection-code" | "category-fallback" | "individual-assignment" | "category-coverage" | "product-list" | "gtin-list"

export default function Home() {
  const [screen, setScreen] = useState<Screen>("upload")
  const [uploadedFileName, setUploadedFileName] = useState<string>("")
  const [uploadedGtinCount, setUploadedGtinCount] = useState<number>(1024)
  const [confirmedCategories, setConfirmedCategories] = useState<ConfirmedCategory[]>([])
  const [selectedBrickCategoryId, setSelectedBrickCategoryId] = useState<string>("")
  const [selectedBrickCategoryName, setSelectedBrickCategoryName] = useState<string>("")
  const [selectedBrickCode, setSelectedBrickCode] = useState<string>("")
  const [reviewCategoryKey, setReviewCategoryKey] = useState<string>("")
  const [selectedSelectionCodes, setSelectedSelectionCodes] = useState<string[]>([])
  const [selectedCodesMetadata, setSelectedCodesMetadata] = useState<Record<string, SelectionCodeMetadata>>({})
  const [enrichmentUpdates, setEnrichmentUpdates] = useState<Record<string, { status: EnrichmentStatus; lastEnrichedDate: string; categoriesAssigned?: number }>>({})
  // Tracks which entry point took the user into Brick Confirmation so we can adapt copy and routing
  const [brickConfirmationSource, setBrickConfirmationSource] = useState<"upload" | "selection-code">("upload")
  // When entered from the Category Coverage screen, brick confirmation only covers the unassigned subset
  const [brickConfirmationScope, setBrickConfirmationScope] = useState<"all" | "unassigned-only">("all")
  // Bug 3 fix: Track individual assignment scope
  const [individualAssignmentScope, setIndividualAssignmentScope] = useState<"unclassified" | "all-low-confidence" | "coverage-unassigned">("unclassified")
  // Individual assignment now has two entry points, so track where "back" should land
  const [individualAssignmentReturn, setIndividualAssignmentReturn] = useState<"brick-confirmation" | "category-coverage">("brick-confirmation")
  // Product-level drill-down state (Selection Code List → Product List → GTIN List)
  const [drillDownCode, setDrillDownCode] = useState<string>("")
  const [drillDownCodeMeta, setDrillDownCodeMeta] = useState<SelectionCodeMetadata | null>(null)
  const [drillDownProduct, setDrillDownProduct] = useState<DrillDownProduct | null>(null)
  // Products can't hold the "categories-assigned" code-level status — only enrichment states
  const [productEnrichmentUpdates, setProductEnrichmentUpdates] = useState<Record<string, "ai-enriched" | "in-progress" | "needs-enrichment">>({})
  // When enrichment runs for specific products (not a whole selection code), track the scope
  const [enrichmentProductScope, setEnrichmentProductScope] = useState<string[] | null>(null)
  const [enrichmentScopeLabel, setEnrichmentScopeLabel] = useState<string | null>(null)

  const goHome = () => {
    setScreen("upload")
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

  // Scenario 3: persist category-assignment work and return to the Selection Code List.
  // Rows keep their enrichment history; codes that were never enriched show the new
  // "Categories Assigned – Not Enriched" status so users can come back and enrich later.
  const handleSaveCategoriesAndExit = (assignedProductCount: number) => {
    if (selectedSelectionCodes.length > 0 && assignedProductCount > 0) {
      const next = { ...enrichmentUpdates }
      selectedSelectionCodes.forEach((code) => {
        const meta = selectedCodesMetadata[code]
        if (!meta) return
        const prev = enrichmentUpdates[code]
        const prevAssigned = prev?.categoriesAssigned ?? meta.categoriesAssigned ?? 0
        next[code] = {
          status: prev?.status === "ai-enriched" || prev?.status === "in-progress" ? prev.status : "categories-assigned",
          lastEnrichedDate: prev?.lastEnrichedDate ?? "TBD",
          categoriesAssigned: Math.min(meta.products, prevAssigned + assignedProductCount),
        }
      })
      setEnrichmentUpdates(next)
    }
    setScreen("selection-code-list")
  }

  // Scenario 2: enrichment scoped to specific products from the Product/GTIN drill-down
  const startProductScopedEnrichment = (products: DrillDownProduct[]) => {
    const allHaveCategories = products.every((p) => p.category !== null)
    const code = drillDownCode
    setSelectedSelectionCodes([code])
    setSelectedCodesMetadata({
      [code]: {
        gtins: products.reduce((s, p) => s + p.gtins, 0),
        products: products.length,
        description: drillDownCodeMeta?.description ?? "",
        categoriesAssigned: products.filter((p) => p.category !== null).length,
      },
    })
    setEnrichmentProductScope(products.map((p) => p.id))
    setEnrichmentScopeLabel(
      products.length === 1
        ? `Product ${products[0].id} — ${products[0].description}`
        : `${products.length} selected products`
    )
    setBrickConfirmationSource("selection-code")
    setBrickConfirmationScope("all")
    setScreen(allHaveCategories ? "ai-enrichment-review" : "category-coverage")
  }

  return (
    <AppShell onHome={goHome} onSelectionCodeList={() => setScreen("selection-code-list")} activeScreen={shellScreen}>
      {screen === "upload" && (
        <Screen1Upload
          onEnrichmentComplete={(fileName, gtinCount) => {
            setUploadedFileName(fileName)
            setUploadedGtinCount(gtinCount)
            setBrickConfirmationSource("upload")
            setBrickConfirmationScope("all")
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
            // Route through the Category Coverage step first so the supplier sees exactly
            // which products already have categories before any AI assignment happens.
            setScreen("category-coverage")
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
          onAssignIndividually={() => {
            setIndividualAssignmentScope("coverage-unassigned")
            setIndividualAssignmentReturn("category-coverage")
            setScreen("individual-assignment")
          }}
          onProceedToEnrichment={() => setScreen("ai-enrichment-review")}
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
          onBack={() => setScreen("selection-code-list")}
          onOpenGtinList={(product) => {
            setDrillDownProduct(product)
            setScreen("gtin-list")
          }}
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
          onEnrich={() => startProductScopedEnrichment([drillDownProduct])}
        />
      )}

      {screen === "ai-enrichment-review" && (
        <ScreenAIEnrichmentReview
          selectedCodes={selectedSelectionCodes}
          codesMetadata={selectedCodesMetadata}
          scopeLabel={enrichmentScopeLabel ?? undefined}
          onBack={() => setScreen(enrichmentProductScope ? "product-list" : "selection-code-list")}
          onComplete={(confirmedPercentage, codes) => {
            // Map confirmed percentage to a three-tier status.
            //   ≥ 50%  → AI Enriched
            //   > 0%   → In Progress
            //   0%     → Needs Enrichment
            const nextStatus: "ai-enriched" | "in-progress" | "needs-enrichment" =
              confirmedPercentage >= 50 ? "ai-enriched"
              : confirmedPercentage > 0 ? "in-progress"
              : "needs-enrichment"
            const today = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
            const newUpdates: Record<string, { status: EnrichmentStatus; lastEnrichedDate: string; categoriesAssigned?: number }> = { ...enrichmentUpdates }
            codes.forEach((code) => {
              const prev = enrichmentUpdates[code]
              if (enrichmentProductScope) {
                // Product-scoped run: only part of the code was enriched, so don't claim
                // full coverage — the code moves to In Progress unless already fully enriched.
                newUpdates[code] = {
                  status: prev?.status === "ai-enriched" ? "ai-enriched" : "in-progress",
                  lastEnrichedDate: today,
                  categoriesAssigned: prev?.categoriesAssigned,
                }
              } else {
                // Enriching a whole code implies its categories were all confirmed en route
                newUpdates[code] = { status: nextStatus, lastEnrichedDate: today, categoriesAssigned: selectedCodesMetadata[code]?.products }
              }
            })
            setEnrichmentUpdates(newUpdates)
            if (enrichmentProductScope) {
              setProductEnrichmentUpdates((prevMap) => {
                const next = { ...prevMap }
                enrichmentProductScope.forEach((id) => { next[id] = nextStatus })
                return next
              })
            }
            // Stay on the review screen — the completed summary view renders inline
          }}
        />
      )}

      {screen === "brick-confirmation" && (
        <ScreenBrickConfirmation
          fileName={uploadedFileName}
          totalGtinCount={
            brickConfirmationSource === "selection-code"
              ? selectedSelectionCodes.reduce((sum, code) => {
                  const meta = effectiveCodesMetadata[code]
                  if (!meta) return sum
                  if (brickConfirmationScope === "unassigned-only" && meta.products > 0) {
                    // Proportional GTIN share of the unassigned products
                    return sum + Math.round((meta.gtins * (meta.products - meta.categoriesAssigned)) / meta.products)
                  }
                  return sum + meta.gtins
                }, 0)
              : uploadedGtinCount
          }
          totalProductCount={
            brickConfirmationSource === "selection-code"
              ? selectedSelectionCodes.reduce((sum, code) => {
                  const meta = effectiveCodesMetadata[code]
                  if (!meta) return sum
                  return sum + (brickConfirmationScope === "unassigned-only" ? meta.products - meta.categoriesAssigned : meta.products)
                }, 0)
              : Math.ceil(uploadedGtinCount / 2.3) // Estimate products from GTINs
          }
          sourceContext={
            brickConfirmationSource === "selection-code"
              ? { type: "selection-code", codes: selectedSelectionCodes, metadata: selectedCodesMetadata }
              : { type: "upload", fileName: uploadedFileName }
          }
          coverageScope={brickConfirmationScope}
          onViewGtins={(categoryId, categoryName, brickCode) => {
            setSelectedBrickCategoryId(categoryId)
            setSelectedBrickCategoryName(categoryName)
            setSelectedBrickCode(brickCode)
            setScreen("brick-gtin-list")
          }}
          onProceedToEnrichment={(categories) => {
            setConfirmedCategories(categories)
            // From Selection Code List → go directly to attribute review.
            // From upload → go to the traditional post-confirmation summary.
            if (brickConfirmationSource === "selection-code") {
              // Confirming categories en route to enrichment completes the code's coverage
              const next = { ...enrichmentUpdates }
              selectedSelectionCodes.forEach((code) => {
                const meta = selectedCodesMetadata[code]
                if (!meta) return
                const prev = enrichmentUpdates[code]
                next[code] = {
                  status: prev?.status ?? "categories-assigned",
                  lastEnrichedDate: prev?.lastEnrichedDate ?? "TBD",
                  categoriesAssigned: meta.products,
                }
              })
              setEnrichmentUpdates(next)
              setScreen("ai-enrichment-review")
            } else {
              setScreen("summary")
            }
          }}
          onBack={() => {
            if (brickConfirmationScope === "unassigned-only") {
              setScreen("category-coverage")
            } else if (brickConfirmationSource === "selection-code") {
              setScreen("selection-code-list")
            } else {
              goHome()
            }
          }}
          onSaveAndExit={(categories) => {
            if (categories.length > 0) {
              setConfirmedCategories(categories)
            }
            handleSaveCategoriesAndExit(categories.reduce((sum, c) => sum + c.productCount, 0))
          }}
          onAssignIndividually={(scope) => {
            setIndividualAssignmentScope(scope)
            setIndividualAssignmentReturn("brick-confirmation")
            setScreen("individual-assignment")
          }}
        />
      )}

      {screen === "individual-assignment" && (
        <ScreenIndividualAssignment
          scope={individualAssignmentScope}
          onBack={() => setScreen(individualAssignmentReturn)}
          onDone={() => {
            if (individualAssignmentReturn === "category-coverage") {
              // "Done" only fires once every product is assigned — coverage is now complete
              const next = { ...enrichmentUpdates }
              selectedSelectionCodes.forEach((code) => {
                const meta = selectedCodesMetadata[code]
                if (!meta) return
                const prev = enrichmentUpdates[code]
                next[code] = {
                  status: prev?.status === "ai-enriched" || prev?.status === "in-progress" ? prev.status : "categories-assigned",
                  lastEnrichedDate: prev?.lastEnrichedDate ?? "TBD",
                  categoriesAssigned: meta.products,
                }
              })
              setEnrichmentUpdates(next)
            }
            setScreen(individualAssignmentReturn)
          }}
          onSaveAndExit={(assignedCount) => handleSaveCategoriesAndExit(assignedCount)}
        />
      )}

      {screen === "brick-gtin-list" && (
        <ScreenBrickGtinList
          categoryId={selectedBrickCategoryId}
          categoryName={selectedBrickCategoryName}
          brickCode={selectedBrickCode}
          onBack={() => setScreen("brick-confirmation")}
        />
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
            setSelectedSelectionCodes([syntheticCode])
            setSelectedCodesMetadata({
              [syntheticCode]: {
                gtins: uploadedGtinCount,
                products: estimatedProducts,
                description: `${categoryLabel} — ${subLabel} (${brickCode})`,
                categoriesAssigned: estimatedProducts,
              },
            })
            setScreen("ai-enrichment-review")
          }}
        />
      )}
    </AppShell>
  )
}
