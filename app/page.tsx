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

export interface ConfirmedCategory {
  id: string
  name: string
  gtinCount: number
  confidence: number
}

type EnrichmentStatus = "ai-enriched" | "in-progress" | "needs-enrichment"
type Screen = "upload" | "selection-code-list" | "ai-enrichment-review" | "brick-confirmation" | "brick-gtin-list" | "summary" | "review" | "submission" | "enrichment-preview" | "selection-code" | "category-fallback"

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
  const [selectedCodesMetadata, setSelectedCodesMetadata] = useState<Record<string, { gtins: number; description: string }>>({})
  const [enrichmentUpdates, setEnrichmentUpdates] = useState<Record<string, { status: EnrichmentStatus; lastEnrichedDate: string }>>({})
  // Tracks which entry point took the user into Brick Confirmation so we can adapt copy and routing
  const [brickConfirmationSource, setBrickConfirmationSource] = useState<"upload" | "selection-code">("upload")

  const goHome = () => {
    setScreen("upload")
    setConfirmedCategories([])
    setSelectedBrickCategoryId("")
    setSelectedBrickCategoryName("")
    setSelectedBrickCode("")
    setReviewCategoryKey("")
    setSelectedSelectionCodes([])
  }

  const shellScreen: "upload" | "summary" | "review" | "submission" | "selection-code-list" =
    screen === "upload"               ? "upload" :
    screen === "selection-code-list"  ? "selection-code-list" :
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

  return (
    <AppShell onHome={goHome} onSelectionCodeList={() => setScreen("selection-code-list")} activeScreen={shellScreen}>
      {screen === "upload" && (
        <Screen1Upload
          onEnrichmentComplete={(fileName, gtinCount) => {
            setUploadedFileName(fileName)
            setUploadedGtinCount(gtinCount)
            setBrickConfirmationSource("upload")
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
            // Route through Brick Confirmation first so the supplier can categorize
            // heterogeneous GTINs in the Selection Code before attributes are suggested.
            setBrickConfirmationSource("selection-code")
            setScreen("brick-confirmation")
          }}
          enrichmentUpdates={enrichmentUpdates}
        />
      )}

      {screen === "ai-enrichment-review" && (
        <ScreenAIEnrichmentReview
          selectedCodes={selectedSelectionCodes}
          codesMetadata={selectedCodesMetadata}
          onBack={() => setScreen("selection-code-list")}
          onComplete={(enrichedGtinPercent, codes) => {
            // Map GTIN enrichment coverage to a three-tier status.
            //   ≥ 50%  → AI Enriched
            //   > 0%   → In Progress (user did partial work; flag it, don't bury it)
            //   0%     → Needs Enrichment (no change, but shouldn't normally reach here because Complete is disabled)
            const nextStatus: EnrichmentStatus =
              enrichedGtinPercent >= 50 ? "ai-enriched" : enrichedGtinPercent > 0 ? "in-progress" : "needs-enrichment"
            const today = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
            const newUpdates: Record<string, { status: EnrichmentStatus; lastEnrichedDate: string }> = { ...enrichmentUpdates }
            codes.forEach((code) => {
              newUpdates[code] = { status: nextStatus, lastEnrichedDate: today }
            })
            setEnrichmentUpdates(newUpdates)
            setScreen("selection-code-list")
          }}
        />
      )}

      {screen === "brick-confirmation" && (
        <ScreenBrickConfirmation
          fileName={uploadedFileName}
          totalGtinCount={
            brickConfirmationSource === "selection-code"
              ? selectedSelectionCodes.reduce((sum, code) => sum + (selectedCodesMetadata[code]?.gtins ?? 0), 0)
              : uploadedGtinCount
          }
          sourceContext={
            brickConfirmationSource === "selection-code"
              ? { type: "selection-code", codes: selectedSelectionCodes, metadata: selectedCodesMetadata }
              : { type: "upload", fileName: uploadedFileName }
          }
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
              setScreen("ai-enrichment-review")
            } else {
              setScreen("summary")
            }
          }}
          onBack={() => {
            if (brickConfirmationSource === "selection-code") {
              setScreen("selection-code-list")
            } else {
              goHome()
            }
          }}
          onSkipToSelectionCodeList={() => setScreen("selection-code-list")}
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
            setSelectedSelectionCodes([syntheticCode])
            setSelectedCodesMetadata({
              [syntheticCode]: {
                gtins: uploadedGtinCount,
                description: `${categoryLabel} — ${subLabel} (${brickCode})`,
              },
            })
            setScreen("ai-enrichment-review")
          }}
        />
      )}
    </AppShell>
  )
}
