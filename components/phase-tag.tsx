"use client"

import type { ReactNode } from "react"

/**
 * Phase markers are deliberately OFF the design system.
 *
 * Every real surface in this prototype is a pale tint on white — blue for
 * information, amber for needs-attention, green for confirmed, red for error.
 * These markers are solid saturated orange with a dashed outline, which matches
 * nothing else on screen. That is the point: a dev reading a screen should be
 * able to tell at a glance that the orange is a PM annotation *over* the
 * design, flagging a later-phase requirement — not a component to go and build.
 *
 * `grep -rn "PhaseTag\|PhaseBanner" components/` lists the Phase 2 surface area.
 */
const PHASE_ORANGE = "#ea580c"

const defaultNote = (phase: number) =>
  `Phase ${phase} — flagged by product management as a later-phase requirement. ` +
  `Not part of Phase 1 build scope; the orange styling is an annotation, not the intended design.`

export function PhaseTag({
  phase = 2,
  note,
  className = "",
}: {
  phase?: number
  note?: string
  className?: string
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white font-sans align-middle rounded-sm ${className}`}
      style={{ backgroundColor: PHASE_ORANGE, outline: `1px dashed ${PHASE_ORANGE}`, outlineOffset: "2px" }}
      title={note ?? defaultNote(phase)}
    >
      PHASE {phase}
    </span>
  )
}

/**
 * Full-width annotation strip. Used where a whole screen (rather than one
 * column) is later-phase scope.
 */
export function PhaseBanner({
  phase = 2,
  title,
  children,
  action,
}: {
  phase?: number
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded text-[13px] text-white"
      style={{ backgroundColor: PHASE_ORANGE, outline: `2px dashed ${PHASE_ORANGE}`, outlineOffset: "3px" }}
      role="status"
    >
      <span
        className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold tracking-wider rounded-sm"
        style={{ backgroundColor: "#ffffff", color: PHASE_ORANGE }}
      >
        PHASE {phase}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{title}</p>
        {children && <p className="text-[12px] mt-0.5 text-white/90">{children}</p>}
      </div>
      {action}
    </div>
  )
}

export { PHASE_ORANGE }
