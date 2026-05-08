"use client"

import { useState, useRef } from "react"
import { CheckCircle2, Clock, Loader2, X, Info, ExternalLink } from "lucide-react"

interface Screen1Props {
  onEnrichmentComplete: (fileName: string, gtinCount: number) => void
  onCategoryResolutionFailed?: () => void
}

// Simulated check for enriched file (in real app, would parse file headers)
const isEnrichedFile = (fileName: string): boolean => {
  // Check if filename contains markers indicating it was previously enriched
  const enrichedPatterns = ["_enriched", "_processed", "enriched_", "export_"]
  return enrichedPatterns.some((pattern) => fileName.toLowerCase().includes(pattern))
}

export function Screen1Upload({ onEnrichmentComplete, onCategoryResolutionFailed }: Screen1Props) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [phase, setPhase] = useState<"idle" | "analyzing" | "done">("idle")
  const [progress, setProgress] = useState(0)
  const [uploadBannerVisible, setUploadBannerVisible] = useState(false)
  const [isAlreadyEnriched, setIsAlreadyEnriched] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
      // Check if this is a previously enriched file
      setIsAlreadyEnriched(isEnrichedFile(file.name))
      // Reset states when new file is selected
      setPhase("idle")
      setProgress(0)
      setUploadBannerVisible(false)
    }
  }

  const handleChooseFile = () => {
    fileInputRef.current?.click()
  }

  const handleProcess = () => {
    if (phase !== "idle") return
    setUploadBannerVisible(true)
    setPhase("analyzing")
    setProgress(0)

    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          setPhase("done")
          setTimeout(() => onEnrichmentComplete(fileName ?? "catalog.csv", 1024), 900)
          return 100
        }
        return p + 1
      })
    }, 80)
  }

  const secondsLeft = Math.max(0, Math.round(((100 - progress) / 33) * 20))

  return (
    <div className="space-y-3">
      {/* Upload Type + file input */}
      <div className="space-y-3 pb-3 border-b border-[#d1d5db]">
        <div>
          <p className="text-[13px] font-medium text-[#1a1f2e] mb-1">Upload Type</p>
          <label className="flex items-center gap-1.5 cursor-pointer w-fit">
            <input type="radio" defaultChecked name="upload-type" className="accent-[#1a5fa6]" />
            <span className="text-[13px] text-[#1a1f2e]">Item</span>
          </label>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[13px] font-medium text-[#1a1f2e] w-20">Text File:</span>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Hidden real file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.tsv"
              className="sr-only"
              aria-label="Choose text file"
              onChange={handleFileChange}
            />
            {/* Visible styled button */}
            <button
              type="button"
              onClick={handleChooseFile}
              disabled={phase === "analyzing"}
              className="px-3 py-1 text-[13px] bg-[#e8eaed] border border-[#b0b8c4] rounded text-[#374151] hover:bg-[#dde2e9] disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
            >
              Choose File
            </button>
            <span className="text-[13px] text-[#6b7280]">
              {fileName ?? "No file chosen"}
            </span>
            {/* Process button — disabled until a file is chosen and not already processing */}
            <button
              type="button"
              onClick={handleProcess}
              disabled={!fileName || phase !== "idle" || isAlreadyEnriched}
              className="px-4 py-1 text-[13px] font-semibold text-white rounded transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
              style={{ backgroundColor: "#1a5fa6" }}
            >
              Process
            </button>
          </div>
        </div>
      </div>

      {/* Already enriched file warning */}
      {isAlreadyEnriched && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded border"
          style={{ backgroundColor: "#fffbeb", borderColor: "#fcd34d", color: "#92400e" }}
          role="alert"
        >
          <Info className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#f59e0b" }} aria-hidden="true" />
          <div className="space-y-2">
            <div>
              <p className="text-[13px] font-semibold">No attributes to be enriched</p>
              <p className="text-[12px] mt-1">
                This file appears to have been previously enriched. All AI-suggested attributes have already been applied.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="#"
                className="flex items-center gap-1 text-[12px] font-medium text-[#1a5fa6] hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Go to portal for manual edits
              </a>
              <span className="text-[11px] text-[#9ca3af]">or</span>
              <button
                onClick={() => {
                  setFileName(null)
                  setIsAlreadyEnriched(false)
                  if (fileInputRef.current) fileInputRef.current.value = ""
                }}
                className="text-[12px] font-medium text-[#6b7280] hover:text-[#374151] hover:underline"
              >
                Choose a different file
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload success banner — only after Process is clicked */}
      {uploadBannerVisible && !isAlreadyEnriched && (
        <div
          className="flex items-center justify-between px-3 py-2 rounded border text-[13px]"
          style={{ backgroundColor: "#e8f5e9", borderColor: "#a5d6a7", color: "#1b5e20" }}
          role="status"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#2e7d32" }} aria-hidden="true" />
            <span className="text-[13px] text-[#1a1f2e]">
              <strong>Upload complete</strong> —{" "}
              {fileName ?? "J_Renee_Spring26.csv"}{" "}
              <span className="font-normal">1,024 GTINs across 6 Selection Codes successfully loaded</span>
            </span>
          </span>
          <button
            onClick={() => setUploadBannerVisible(false)}
            className="ml-4 hover:opacity-70 transition-opacity focus:outline-none"
            aria-label="Dismiss upload notification"
          >
            <X className="w-3.5 h-3.5" style={{ color: "#2e7d32" }} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Enrichment analysis card — only shown after Process is clicked */}
      {(phase === "analyzing" || phase === "done") && (
        <div
          className="rounded border p-4 space-y-3"
          style={{ borderColor: "#1a1f5e", borderLeftWidth: 3, backgroundColor: "#fff" }}
          role="status"
          aria-live="polite"
          aria-label="AI enrichment progress"
        >
          <div className="flex items-center gap-2">
            {phase === "analyzing" ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#1a5fa6] shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#2e7d32] shrink-0" aria-hidden="true" />
            )}
            <p className="text-[13px] font-semibold text-[#1a1f2e]">
              {phase === "analyzing"
                ? "AI is resolving product categories for your GTINs"
                : "Category resolution complete — please confirm categories"}
            </p>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex-1 h-2 rounded-full bg-[#e8eaed] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-150"
                  style={{ width: `${progress}%`, backgroundColor: "#1a5fa6" }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <span className="ml-3 text-[12px] font-semibold text-[#1a1f2e] w-10 text-right">
                {progress}%
              </span>
            </div>
          </div>

          {/* Step checklist */}
          <ul className="space-y-1.5" aria-label="Enrichment steps">
            <li className="flex items-center gap-2 text-[13px]">
              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#2e7d32" }} aria-hidden="true" />
              <span>File parsed — 1,024 GTINs across 6 Selection Codes loaded</span>
            </li>
            <li className="flex items-center gap-2 text-[13px]">
              {phase === "analyzing" && progress < 50 ? (
                <>
                  <Clock className="w-4 h-4 shrink-0 text-[#f59e0b]" aria-hidden="true" />
                  <span className="text-[#92400e]">AI is assigning each GTIN to a product category...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#2e7d32" }} aria-hidden="true" />
                  <span>Product categories assigned for all GTINs</span>
                </>
              )}
            </li>
            <li className="flex items-center gap-2 text-[13px]">
              {phase === "analyzing" ? (
                <>
                  <Clock className="w-4 h-4 shrink-0 text-[#f59e0b]" aria-hidden="true" />
                  <span className="text-[#92400e]">
                    Almost done — about {secondsLeft} second{secondsLeft !== 1 ? "s" : ""} remaining
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#2e7d32" }} aria-hidden="true" />
                  <span>Ready to review and enrich attributes</span>
                </>
              )}
            </li>
            <li className="flex items-center gap-2 text-[13px]">
              {phase === "analyzing" && progress < 50 ? (
                <>
                  <Clock className="w-4 h-4 shrink-0 text-[#f59e0b]" aria-hidden="true" />
                  <span className="text-[#92400e]">AI is grouping your GTINs by product category...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#2e7d32" }} aria-hidden="true" />
                  <span>Product categories identified for all GTINs</span>
                </>
              )}
            </li>
            <li className="flex items-center gap-2 text-[13px]">
              {phase === "analyzing" ? (
                <>
                  <Clock className="w-4 h-4 shrink-0 text-[#f59e0b]" aria-hidden="true" />
                  <span className="text-[#92400e]">
                    Almost done — about {secondsLeft} second{secondsLeft !== 1 ? "s" : ""} remaining
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#2e7d32" }} aria-hidden="true" />
                  <span>Ready for category confirmation</span>
                </>
              )}
            </li>
          </ul>

          {/* Fallback entry — only after processing completes. In a real build this would surface
              only when AI confidence for one or more GTINs is below threshold. */}
          {phase === "done" && onCategoryResolutionFailed && (
            <div className="pt-2 mt-2 border-t border-[#e5e7eb] flex items-center justify-between gap-3 flex-wrap">
              <span className="text-[12px] text-[#6b7280]">
                Some items couldn&apos;t be confidently matched to a product type.
              </span>
              <button
                onClick={onCategoryResolutionFailed}
                className="text-[12px] font-medium text-[#1a5fa6] hover:underline focus:outline-none"
              >
                Help us confirm the product type →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
