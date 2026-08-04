"use client"

import { CalendarDays } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// Informational date display used for the fixed enrichment-eligibility cutoff on
// the Product List / GTIN List screens. It shows the date and lets a supplier open
// the calendar to see it in context — it does not report changes back, since the
// cutoff itself isn't adjustable.
interface DatePickerProps {
  date: Date
  label?: string
}

export function DatePicker({ date, label }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium text-[#374151] bg-white border border-[#d1d5db] rounded hover:bg-[#f3f4f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
          aria-label={label ?? "Show date"}
        >
          <CalendarDays className="w-3.5 h-3.5 text-[#6b7280]" aria-hidden="true" />
          {date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar mode="single" selected={date} defaultMonth={date} disabled />
      </PopoverContent>
    </Popover>
  )
}
