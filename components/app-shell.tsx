"use client"

import { ReactNode, useState, useRef, useEffect } from "react"
import { OTHeader } from "./ot-header"
import { Watermark } from "./watermark"
import { Home, Settings, Check } from "lucide-react"

interface AppShellProps {
  children: ReactNode
  onHome: () => void
  onSelectionCodeList?: () => void
  onTextFileUpload?: () => void
  activeScreen?: "upload" | "summary" | "review" | "submission" | "selection-code-list"
}

export function AppShell({ children, onHome, onSelectionCodeList, onTextFileUpload, activeScreen = "upload" }: AppShellProps) {
  const isHome = activeScreen === "upload"
  const isSelectionCodeList = activeScreen === "selection-code-list"

  // Discreet setting: the Text File Upload nav entry is hidden by default —
  // Selection Code List is the recommended entry point. The gear menu reveals it.
  // Persists within the session so the choice survives navigation.
  const [showTextFileUpload, setShowTextFileUpload] = useState<boolean>(false)
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!settingsOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [settingsOpen])

  return (
    <div className="min-h-screen flex flex-col relative" style={{ fontFamily: "Inter, sans-serif" }}>
      <Watermark />
      <OTHeader onHome={onHome} />

      {/* Page title bar matching screenshot */}
      <div
        className="flex items-center px-4 py-2"
        style={{ backgroundColor: "#1a5fa6" }}
      >
        <h1 className="text-white font-semibold text-sm">
          {activeScreen === "upload"              && "Text File Upload"}
          {activeScreen === "selection-code-list" && "Selection Code List"}
          {activeScreen === "summary"             && "AI Attribute Enrichment"}
          {activeScreen === "review"              && "AI Attribute Enrichment"}
          {activeScreen === "submission"          && "AI Attribute Enrichment"}
        </h1>
      </div>

      {/* Toolbar row matching screenshot — grey bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#e8eaed] border-b border-[#c8cace]">
        {/* The styled icon button (matches screenshot exactly) */}
        {(isHome || isSelectionCodeList) ? (
          <div
            className="flex items-center justify-center w-7 h-7 border border-[#b0b8c4] rounded"
            style={{ background: "linear-gradient(135deg, #1a5fa6 50%, #e8eaed 50%)" }}
            aria-hidden="true"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4 3l3 3-3 3M8 3l-3 3 3 3" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
        ) : (
          <>
            {/* Back chevron button */}
            <button
              onClick={onHome}
              className="flex items-center justify-center w-7 h-7 border border-[#b0b8c4] rounded bg-white hover:bg-[#dde2e9] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
              aria-label="Back to Home"
              title="Back to Home"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M9 3L5 7L9 11" stroke="#1a5fa6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {/* Explicit Home button */}
            <button
              onClick={onHome}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium border border-[#b0b8c4] rounded bg-white text-[#1a5fa6] hover:bg-[#dde2e9] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
              aria-label="Home"
            >
              <Home className="w-3.5 h-3.5" aria-hidden="true" />
              Home
            </button>
          </>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1">
        {/* Left nav */}
        <nav
          className="w-48 shrink-0 border-r border-[#d1d5db]"
          style={{ backgroundColor: "#f7f8fa" }}
          aria-label="Section navigation"
        >
          <div className="py-3">
            <div className="flex items-center justify-between px-4 py-1">
              <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">
                Data Management
              </p>
              <div className="relative" ref={settingsRef}>
                <button
                  onClick={() => setSettingsOpen((v) => !v)}
                  className="p-0.5 rounded text-[#9ca3af] hover:text-[#374151] hover:bg-[#eef0f4] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
                  aria-label="Navigation settings"
                  aria-expanded={settingsOpen}
                  title="Customize this menu"
                >
                  <Settings className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                {settingsOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 z-10 w-56 bg-white border border-[#d1d5db] rounded shadow-lg py-1"
                    role="menu"
                  >
                    <p className="px-3 py-1.5 text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wide border-b border-[#f3f4f6]">
                      Customize menu
                    </p>
                    <button
                      onClick={() => {
                        // Prevent hiding the active page from under the user
                        if (isHome && showTextFileUpload) {
                          onSelectionCodeList?.()
                        }
                        setShowTextFileUpload((v) => !v)
                        setSettingsOpen(false)
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-[12px] text-[#374151] hover:bg-[#f9fafb] transition-colors"
                      role="menuitemcheckbox"
                      aria-checked={showTextFileUpload}
                    >
                      <span>Show Text File Upload</span>
                      {showTextFileUpload && <Check className="w-3.5 h-3.5 text-[#1a5fa6]" aria-hidden="true" />}
                    </button>
                    <p className="px-3 py-1 text-[10px] text-[#9ca3af] border-t border-[#f3f4f6]">
                      Selection Code List is the recommended entry point.
                    </p>
                  </div>
                )}
              </div>
            </div>
            {showTextFileUpload && (
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); (onTextFileUpload ?? onHome)() }}
                className={`block px-4 py-1.5 text-[13px] ${
                  isHome
                    ? "text-[#1a5fa6] font-semibold bg-[#e5edf7] border-l-2 border-[#1a5fa6]"
                    : "text-[#374151] hover:bg-[#eef0f4]"
                }`}
                aria-current={isHome ? "page" : undefined}
              >
                Text File Upload
              </a>
            )}
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); onSelectionCodeList?.() }}
              className={`block px-4 py-1.5 text-[13px] ${
                isSelectionCodeList
                  ? "text-[#1a5fa6] font-semibold bg-[#e5edf7] border-l-2 border-[#1a5fa6]"
                  : "text-[#374151] hover:bg-[#eef0f4]"
              }`}
              aria-current={isSelectionCodeList ? "page" : undefined}
            >
              Selection Code List
            </a>
          </div>
        </nav>

        {/* Content area */}
        <main className="flex-1 p-5 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
