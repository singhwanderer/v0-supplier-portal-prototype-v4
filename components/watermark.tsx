"use client"

export function Watermark() {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 9999 }}
      aria-hidden="true"
    >
      {/* Single diagonal watermark text spanning corner to corner */}
      <div
        className="absolute"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(-35deg)",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "clamp(24px, 4vw, 48px)",
            fontWeight: 500,
            color: "#808080",
            opacity: 0.4,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Mock Data for illustrative and demo purposes only.
        </span>
      </div>
    </div>
  )
}
