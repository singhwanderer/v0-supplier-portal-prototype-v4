"use client"

interface OTHeaderProps {
  onHome: () => void
}

export function OTHeader({ onHome }: OTHeaderProps) {
  return (
    <header
      className="flex items-center px-4 py-2 border-b border-[#1a1f5e]/20"
      style={{ backgroundColor: "#ffffff" }}
    >
      <button
        onClick={onHome}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5fa6] rounded"
        aria-label="Go to home screen"
        title="Return to Text File Upload"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-T6K2zlyCc2xLZSLwCZqpp4EBH0pr3g.png"
          alt="OpenText logo"
          className="h-8 w-auto"
        />
      </button>
    </header>
  )
}
