# CLAUDE.md

Guidance for AI assistants working in this repository.

## What this is

A **clickable demo prototype** of the OpenText Trading Grid Catalogue (TGC) supplier
portal, focused on **AI-assisted bulk attribute enrichment**. A supplier picks a
selection code (or uploads a catalog file), AI proposes GS1 product categories and
attribute values, and the supplier confirms, edits or rejects them.

It was bootstrapped with [v0](https://v0.app) and deploys to Vercel on merge to `main`.

**This is a prototype, not a product.** Internalize what that implies:

- **There is no backend.** No API routes, no database, no `fetch`, no `localStorage`.
  Every number on screen comes from a hardcoded array or is derived from one.
- **All state is React state in `app/page.tsx`** and is lost on refresh. "Persistence"
  means lifting state up, nothing more.
- **All data is mock data.** A fixed `<Watermark />` reading *"Mock Data for
  illustrative and demo purposes only"* overlays every screen at `z-index: 9999`.
  Do not remove it.
- **Determinism matters more than realism.** The demo is walked through live in front
  of stakeholders. Where randomness exists (confidence jitter in the review screens),
  it is deliberately bounded. Prefer deterministic logic — `lib/category-suggestion.ts`
  documents this explicitly.
- The point of a change is usually *how the flow reads to a supplier*, not code
  elegance. Copy, ordering and the story a screen tells are load-bearing.

## Commands

```bash
pnpm install          # pnpm is the package manager (pnpm-lock.yaml is committed)
pnpm dev              # next dev on http://localhost:3000
pnpm build            # next build — verified working
npx tsc --noEmit      # the real type check; use this before committing
```

**Verification notes:**

- `pnpm lint` is **broken** — the script is `eslint .` but there is no ESLint config
  and no `eslint` dependency. It exits 2. Don't use it as a gate; don't "fix" it
  unless asked.
- `next.config.mjs` sets `typescript.ignoreBuildErrors: true`, so **`pnpm build`
  succeeding does not mean the types are clean.** Run `npx tsc --noEmit` separately —
  it currently passes with zero errors, and it should stay that way.
- There are no tests and no test framework. Verify by building, type-checking, and
  clicking through the affected flow in `pnpm dev`.

## Architecture

### One route, one state machine

`app/page.tsx` is the entire application: a single client component holding ~20
`useState` hooks and a `Screen` union type. Every screen is a sibling component in
`components/`, rendered conditionally and wired together by callbacks passed down
from `Home`. There is no router, no context, no state library.

```
app/
  layout.tsx        Root layout — Inter font, metadata, Vercel Analytics
  page.tsx          THE state machine + all cross-screen state and routing
  global-error.tsx  v0-generated error boundary
  globals.css       The active stylesheet (Tailwind v4 + OpenText tokens)
components/
  app-shell.tsx     Chrome: OT header, blue title bar, grey toolbar, gear menu
  ot-header.tsx     OpenText logo bar
  watermark.tsx     Fixed "mock data" diagonal overlay — keep it
  screen-*.tsx      One file per screen (see map below)
  screen{1..4}-*    Original upload-driven flow, named before the convention settled
  ui/               shadcn/ui — GENERATED, UNUSED by any screen (see below)
lib/                Demo data + domain logic
hooks/              use-toast, use-mobile — both unused by screens
scripts/            GS1 code-list generator + its source CSV
styles/globals.css  ORPHANED duplicate — nothing imports it; edit app/globals.css
```

**When adding cross-screen behavior, it belongs in `app/page.tsx`.** Screens are
presentational and take everything they need through props. Keep them that way.

### Screen map

`Screen` values in `app/page.tsx:58`, mapped to components:

| Screen key | Component | Role |
|---|---|---|
| `selection-code-list` | `ScreenSelectionCodeList` | **Default entry point.** The three demo codes |
| `category-coverage` | `ScreenCategoryCoverage` | Shown when a code already has category assignments |
| `product-list` | `ScreenProductList` | Drill-down: products within a code |
| `gtin-list` | `ScreenGtinList` | Drill-down: GTINs within a product |
| `product-category-assignment` | `ScreenProductCategoryAssignment` | AI proposes categories for uncategorized products |
| `brick-confirmation` | `ScreenBrickConfirmation` / `ScreenSleepwearBrickConfirmation` | Confirm AI's proposed GS1 bricks |
| `brick-gtin-list` | `ScreenBrickGtinList` / `ScreenSleepwearBrickGtinList` | Products behind one proposed category |
| `individual-assignment` | `ScreenIndividualAssignment` | Per-product category picker |
| `ai-enrichment-review` | `ScreenAIEnrichmentReview` / `ScreenSleepwearEnrichmentReview` | **The core screen** — attribute-by-attribute review |
| `upload` | `Screen1Upload` | Legacy text-file upload entry, hidden behind the gear menu |
| `category-fallback` | `ScreenCategoryFallback` | Manual category pick when AI can't classify |
| `summary` / `review` / `submission` | `Screen2Summary` / `Screen3Review` / `Screen4Submission` | Original upload-flow tail |
| `enrichment-preview` | `ScreenEnrichmentPreview` | Post-submission preview |
| `selection-code` | `ScreenSelectionCode` | Alternate submission tail |

`AppShell` takes a coarser `activeScreen` (`upload` | `selection-code-list` | `summary`
| `review` | `submission`); `app/page.tsx:129` maps the fine-grained screen onto it to
drive the title bar and breadcrumb.

### The three demo selection codes

Defined in `components/screen-selection-code-list.tsx` and referenced everywhere:

| Code | Description | Demo role |
|---|---|---|
| **001** | Footwear | The **original flow**: no categories assigned → brick confirmation → enrichment |
| **002** | Sleepwear | The **new product-level flow**: 38/52 categorized → coverage → drill-down → scoped enrichment |
| **003** | Jewellery & Watches | Already fully enriched; illustrates the finished state |

**002 is the important one.** It has its own parallel screen set
(`screen-sleepwear-*.tsx`), selected by `isSleepwearFlow` (`app/page.tsx:105`,
comparing against `SLEEPWEAR_SELECTION_CODE`). The sleepwear enrichment review is the
newer, better implementation — one attribute table rather than two parallel ones,
attribute counts derived from the real brick mapping rather than a module constant.
When the two diverge, **the sleepwear version is the intended direction**.

### Data layer (`lib/`)

- **`gs1-code-lists.ts`** — **GENERATED. Do not hand-edit.** 40 GS1 code lists / 881
  values extracted from `scripts/gs1_extended_attribute_master_code_list.csv`.
  Regenerate with `node scripts/build-gs1-code-lists.mjs`. To add a code list, add its
  name to `WANTED` in that script and re-run. The generator also normalizes two
  upstream data-quality bugs (Greek/Cyrillic homoglyphs in codes; a `0`-for-`O` typo)
  and reports each fix on stdout — keep that visible rather than baking fixes in
  silently.
- **`category-attributes.ts`** — the hand-authored **GS1 brick → attribute list**
  mapping (`BRICK_ATTRIBUTE_NAMES`), plus `BRICKS_BY_SELECTION_CODE`, the AI
  "reasoning" copy, and suggested values. The GS1 master file supplies code lists but
  no brick-to-attribute mapping, so that part lives here. An attribute's name *is* its
  code-list name *is* its UI label — keep those aligned.
  It also owns the **confidence choreography** (`CONFIDENCE` / `GREEN` maps): confidence
  numbers are assigned per attribute name so that every category's review screen
  exercises all four badge states — green, low average, low value, and no value.
  Changing these numbers changes what a stakeholder sees in the demo.
- **`category-suggestion.ts`** — deterministic keyword rules mapping a product
  description to a GS1 brick + confidence + evidence string. First strong match wins,
  so specific rules must precede generic ones. `LOW_CONFIDENCE_THRESHOLD = 70`.
- **`sleepwear-catalog.ts`** — categories and sample products for code 002. Attributes
  are deliberately *not* here; they resolve per brick via `category-attributes.ts`.
- **`utils.ts`** — just `cn()` (clsx + tailwind-merge).

**Brick codes are the join key across the whole app** (`10001339` Night
Dresses/Shirts, `10001077` Shoes - General Purpose, etc.). A category is only real if
its brick code matches the ones in `BRICK_ATTRIBUTE_NAMES`; otherwise the review
screen falls back to `DEFAULT_ATTRIBUTE_NAMES`.

### Key state concepts in `app/page.tsx`

- **Products, not GTINs, are the primary unit of account.** GTIN counts appear as a
  secondary reference in parentheses. Where products must be estimated from GTINs, the
  ratio is `/ 2.3`.
- **`enrichmentProductScope`** — non-null when enrichment was launched for specific
  products from the drill-down rather than a whole selection code. Nearly every count,
  back-navigation target and brick resolution branches on it.
- **`enrichmentUpdates`** — per-code status overrides that flow back into the selection
  code list, so the demo shows progress accumulating.
- **Coverage bookkeeping** — `addCoverage()` *increments*, `setFullCoverage()` sets a
  code to fully categorized. Use `addCoverage` for scoped work; using `setFullCoverage`
  there would wipe out counts the code already had.
- **Status never downgrades.** `statusAfterCategoryAssignment` deliberately refuses to
  move an `ai-enriched` or `in-progress` code back to `categories-assigned`. Preserve
  that when touching status transitions.
- **A partially enriched code only reaches `ai-enriched`** once every one of its
  products has been enriched — tracked in `enrichedProductsByCode`.
- **Brick resolution for the review screen** is most-specific-first: products in scope
  → confirmed categories → `getBricksForSelectionCode()` (`app/page.tsx:326`).

## Conventions

- **`"use client"` at the top of every component.** There are no server components in
  practice despite `rsc: true` in `components.json`.
- **Styling is Tailwind v4 utilities with hardcoded hex values**, not design tokens:
  `#1a5fa6` (OpenText header blue), `#374151`/`#6b7280` (text), `#2e7d32` (success),
  `#f59e0b` (warning), `#dc2626` (error), `#d1d5db` (borders). CSS variables exist in
  `app/globals.css` (`--ot-navy`, `--ot-green`, …) but components mostly ignore them.
  **Match the surrounding file** rather than introducing a token system.
- **`components/ui/` (shadcn/ui) is generated scaffolding and is not used by a single
  screen.** Neither are `hooks/`, `theme-provider.tsx`, or `styles/globals.css`. Don't
  refactor screens onto shadcn primitives unless asked; don't assume a `ui/` component
  is wired to anything.
- **Icons come from `lucide-react`**, imported individually.
- Mock data lives in a `const` at the top of the screen that renders it, with a comment
  explaining what scenario it represents and which other screens it must stay coherent
  with. Coverage numbers are cross-referenced between
  `screen-selection-code-list.tsx`, `screen-category-coverage.tsx` and
  `screen-product-list.tsx` — **change one and the others must follow**, or the demo
  contradicts itself on screen.
- Comments explain *why a demo behaves this way* (which scenario it serves, what would
  otherwise break), not what the code does. Follow that register.
- Screen components are long (the two review screens are 1,300–1,450 lines) and
  self-contained. That's the existing shape; keeping a change local to one screen is
  usually right.

## Repo docs

Four markdown files at the root record previous change batches:
`IMPLEMENTATION_SUMMARY.md`, `BUG_3_IMPLEMENTATION_SUMMARY.md`,
`FIX_PROMPT_3_SUMMARY.md` (feature/bugfix logs with the assumptions behind each
decision), and `AGENTIC_ENRICHMENT.md` (a product strategy memo arguing where an agent
beats a screen for TGC — useful background on where this prototype is headed).

They are historical records — **they describe past states and may be stale.** Read them
for intent and rationale; trust the code for current behavior.

## Working in this repo

- Branch, commit and push per the instructions in the session prompt; open PRs as
  drafts. There is no PR template in this repo.
- Before committing: `pnpm build` **and** `npx tsc --noEmit`, then click through the
  affected flow.
- v0 also pushes commits directly to this repo, so expect the working tree to move
  under you; rebase rather than assume.
