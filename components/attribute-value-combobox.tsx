"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { getCodeListValues } from "@/lib/gs1-code-lists"

/**
 * Inline combo-box for a single attribute value: shows the GS1 code list as a
 * searchable dropdown when the attribute has one, and always allows free text
 * (Brand Name, Country of Origin and Pattern have no code list).
 *
 * Shared by both enrichment review screens and the add-missing-attributes form,
 * so GS1 lookup behaves identically wherever a value gets typed.
 */
export function AttributeValueCombobox({
  attributeName,
  codeList,
  value,
  onChange,
  onSave,
  onCancel,
  autoFocus = true,
}: {
  attributeName: string
  codeList?: string
  value: string
  onChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
  autoFocus?: boolean
}) {
  const options = getCodeListValues(codeList)
  const hasCodeList = options.length > 0
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync query when value changes externally
  useEffect(() => {
    setQuery(value)
  }, [value])

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
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.code.toLowerCase().includes(q))
  }, [options, query])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    onChange(e.target.value)
    if (hasCodeList) setOpen(true)
  }

  const selectOption = (opt: { label: string; code: string }) => {
    setQuery(opt.label)
    onChange(opt.label)
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
          autoFocus={autoFocus}
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
