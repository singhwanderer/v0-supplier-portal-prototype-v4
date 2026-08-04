# Phase 2 Requirements — Selection Code 002 Onward

This document records the requirements behind the **Phase 2** flow prototyped in this
repo, starting at Selection Code **002 (Sleepwear)**. It is a documentation-only
record — nothing here changes app behavior. As with the other root-level summary
docs, treat this as a snapshot of intent and rationale; **the code is the source of
truth for current behavior.**

## Overview

Phase 1 is the original flow, exercised by Selection Code **001 (Footwear)**: a code
starts with zero categories assigned, and the supplier runs one whole-code pass —
AI proposes brick categories, the supplier confirms them in a single brick
confirmation step, then enrichment runs across the entire code at once.

Phase 2, introduced for Selection Code **002 (Sleepwear)**, replaces that single-shot
model with a **coverage-aware, product-level, resumable flow**. A code can be
partially categorized (002 starts at 38/52 products), and the supplier works through
it incrementally: inspect coverage, drill into specific products, assign categories
only to what's missing, and enrich in scoped batches — with progress persisting
across passes instead of resetting. Selection Code 003 (Jewellery & Watches)
illustrates the flow's end state: fully categorized and fully enriched.

## New Requirements

- **Coverage-aware entry point** — the Selection Code list shows partial coverage
  (`categoriesAssigned` out of total products), not a binary enriched/not-enriched
  flag. Status only ever moves forward — `needs-enrichment` → `categories-assigned`
  → `in-progress` → `ai-enriched` — and never downgrades once advanced.

- **Drill-down navigation** — a supplier can inspect a code before committing to
  work on it: Category Coverage → Product List → GTIN List, each screen narrowing
  from code-level to product-level to GTIN-level detail.

- **Products as the primary unit of account** — coverage, counts and navigation are
  all expressed in products, not GTINs. GTIN counts appear only as a secondary
  reference, estimated from products at a ratio of **products × 2.3**.

- **Scoped, resumable enrichment** — AI category assignment and enrichment can
  target a specific subset of products selected in the drill-down, rather than
  forcing a whole-code pass. Scoped work *adds* to a code's coverage
  (`addCoverage`) instead of overwriting it (`setFullCoverage`), so multiple passes
  accumulate correctly. A code only reaches full `ai-enriched` status once every one
  of its products has been enriched, tracked per-product.

- **Per-product AI category assignment** — AI proposes a GS1 brick category for each
  currently-uncategorized product. The supplier can confirm the proposed brick
  groupings in bulk, or override individual products one at a time.

- **Most-specific-first brick resolution** — when resolving which attributes to show
  for enrichment, the app prefers (in order): products currently in scope →
  categories the supplier has confirmed → the selection code's full brick list.

- **Unified attribute review screen** — a single attribute table replaces the
  original flow's two parallel tables. Attribute counts are derived from the real
  GS1 brick → attribute mapping rather than a hardcoded constant, so the table
  reflects what a given category actually requires.

- **Deterministic confidence coverage** — every category's review screen must
  exercise all four confidence badge states (green, low average, low value, no
  value) so the demo reliably shows each state to stakeholders, without relying on
  unbounded randomness.

- **Cross-screen data consistency** — coverage numbers must stay in agreement across
  `screen-selection-code-list.tsx`, `screen-category-coverage.tsx`, and
  `screen-product-list.tsx`. Changing one requires updating the others, or the demo
  visibly contradicts itself.

## User Flow

1. **Selection Code list** (`ScreenSelectionCodeList`,
   `components/screen-selection-code-list.tsx`) — the supplier sees Code 002 with
   partial coverage (38/52 products categorized) and status `in-progress`, distinct
   from Code 001's `needs-enrichment` and Code 003's `ai-enriched`.

2. **Category Coverage** (`ScreenCategoryCoverage`,
   `components/screen-category-coverage.tsx`) — opening Code 002 shows the
   categorized-vs-uncategorized product split for the whole code.

3. **Product List** (`ScreenProductList`, `components/screen-product-list.tsx`) —
   drilling in, the supplier browses products within the code and selects a subset
   of uncategorized products to work on (this selection becomes
   `enrichmentProductScope`).

4. **GTIN List** (`ScreenGtinList`, `components/screen-gtin-list.tsx`) — optionally,
   the supplier can drill further into the GTINs behind a given product before
   deciding what to enrich.

5. **Product Category Assignment** (`ScreenProductCategoryAssignment`,
   `components/screen-product-category-assignment.tsx`) — AI proposes a GS1
   category for each selected uncategorized product.

6. **Brick Confirmation** (`ScreenSleepwearBrickConfirmation`,
   `components/screen-sleepwear-brick-confirmation.tsx`) — the supplier confirms
   the AI's proposed brick groupings in bulk, or opens **Individual Assignment**
   (`ScreenIndividualAssignment`, `components/screen-individual-assignment.tsx`) to
   override specific products one at a time.

7. **Brick GTIN List** (`ScreenSleepwearBrickGtinList`,
   `components/screen-sleepwear-brick-gtin-list.tsx`) — the supplier reviews which
   products sit behind a given confirmed brick before enriching it.

8. **AI Enrichment Review** (`ScreenSleepwearEnrichmentReview`,
   `components/screen-sleepwear-enrichment-review.tsx`) — the core screen: the
   supplier works through the unified attribute table, reviewing AI-suggested
   values with confidence badges, and edits, accepts, or rejects each one.

9. **Confirm and return** — on confirmation, coverage increments for the code
   (`addCoverage`), status advances according to the forward-only rules, and the
   supplier lands back on the Selection Code list, which now reflects the updated
   progress. If not every product in the code has been enriched yet, status stays
   `in-progress`; once the last product is enriched, the code advances to
   `ai-enriched`.

## Traceability

| Screen | Component | File | Responsibility |
|---|---|---|---|
| Selection Code list | `ScreenSelectionCodeList` | `components/screen-selection-code-list.tsx` | Entry point; shows per-code coverage and status |
| Category Coverage | `ScreenCategoryCoverage` | `components/screen-category-coverage.tsx` | Categorized vs uncategorized split for a code |
| Product List | `ScreenProductList` | `components/screen-product-list.tsx` | Product-level drill-down and scope selection |
| GTIN List | `ScreenGtinList` | `components/screen-gtin-list.tsx` | GTIN-level drill-down within a product |
| Product Category Assignment | `ScreenProductCategoryAssignment` | `components/screen-product-category-assignment.tsx` | AI proposes categories for uncategorized products |
| Brick Confirmation | `ScreenSleepwearBrickConfirmation` | `components/screen-sleepwear-brick-confirmation.tsx` | Bulk confirmation of proposed brick groupings |
| Individual Assignment | `ScreenIndividualAssignment` | `components/screen-individual-assignment.tsx` | Per-product category override |
| Brick GTIN List | `ScreenSleepwearBrickGtinList` | `components/screen-sleepwear-brick-gtin-list.tsx` | Products behind one confirmed brick |
| AI Enrichment Review | `ScreenSleepwearEnrichmentReview` | `components/screen-sleepwear-enrichment-review.tsx` | Attribute-by-attribute review, the core screen |

Cross-screen state and routing for all of the above live in `app/page.tsx`; screens
themselves stay presentational, taking data through props as described in
`CLAUDE.md`.

## Note

This file documents behavior that is **already prototyped in the codebase** — it is
not a spec for new work. No application code was changed in producing it.
