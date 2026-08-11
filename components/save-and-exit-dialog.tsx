"use client"

// Shown when a supplier exits the category-confirmation flow after confirming at
// least one category, so "Save & Return to List" reads as a real save rather than
// a bare navigation away. Shared across every screen that offers that exit path
// (brick confirmation, category coverage, product/individual assignment) so the
// copy and behavior can't drift between them.

interface SaveAndExitDialogProps {
  productCount: number
  onCancel: () => void
  onConfirm: () => void
}

export function SaveAndExitDialog({ productCount, onCancel, onConfirm }: SaveAndExitDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-and-exit-dialog-title"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-5 border-b border-[#e5e7eb]">
          <h3 id="save-and-exit-dialog-title" className="text-[16px] font-semibold text-[#1a1f2e]">
            Save categories and exit?
          </h3>
        </div>
        <div className="px-6 py-5">
          <p className="text-[13px] text-[#374151]">
            {productCount} {productCount === 1 ? "product's" : "products'"} confirmed categories are sent to the
            catalogue as GPC classification. You can pick up attribute enrichment anytime — the categorization will
            still be here.
          </p>
        </div>
        <div className="px-6 py-4 bg-[#f9fafb] border-t border-[#e5e7eb] flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-[13px] font-medium border border-[#d1d5db] rounded bg-white text-[#374151] hover:bg-[#f3f4f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
          >
            Continue Enrichment
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-[13px] font-semibold text-white rounded transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6]"
            style={{ backgroundColor: "#1a5fa6" }}
          >
            Save & Exit
          </button>
        </div>
      </div>
    </div>
  )
}
