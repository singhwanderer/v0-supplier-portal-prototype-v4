# Phase 2 Requirements — Selection Code 002 Onward

This document records the requirements behind the **Phase 2** flow prototyped in this
repo, starting at Selection Code **002 (Sleepwear)**. It is a documentation-only
record — nothing here changes app behavior. As with the other root-level summary
docs, treat this as a snapshot of intent and rationale; **the code is the source of
truth for current behavior.**

**Scope boundary:** the codebase itself marks Phase 2 surfaces in code, not just in
this doc — `components/phase-tag.tsx` renders deliberately off-design-system orange
`PhaseTag`/`PhaseBanner` markers over exactly the screens and columns PM has flagged as
Phase 2 (`grep -rn "PhaseTag\|PhaseBanner" components/` lists them). Treat that
annotation layer as the authoritative scope boundary; extend it rather than
re-litigating scope in prose when new Phase 2 work lands.

See `PHASE_2_GAP_ANALYSIS.md` for the full review of where an earlier draft of this
document had drifted from the code, and `PHASE_2_USER_STORIES.md` for the story set
written against the corrected requirements below.

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

- **Deterministic confidence badge state** — every category's review screen must
  exercise all four confidence badge states (green, low average, low value, no
  value) so the demo reliably shows each state to stakeholders. The badge state
  itself is deterministic, driven by fixed per-attribute tuning in
  `lib/category-attributes.ts`. The individual row confidence *numbers* shown inside
  an expanded attribute are generated with `Math.random()` at mount and are **not**
  deterministic — they can differ between visits to the same screen. (Corrected from
  an earlier draft that claimed the numbers themselves were bounded/deterministic;
  only the badge state is.)

- **Cross-screen data consistency** — coverage numbers must stay in agreement across
  `screen-selection-code-list.tsx`, `screen-category-coverage.tsx`, and
  `screen-product-list.tsx`. Changing one requires updating the others, or the demo
  visibly contradicts itself. The same contract extends to `screen-product-list.tsx`'s
  per-product Attributes column and `screen-product-enrichment-detail.tsx`'s header
  count — both are computed by the same shared helpers
  (`summarizeEnrichment`/`unenrichedAttributesFor` in `lib/enrichment-results.ts`) so a
  row reading "7/16" is guaranteed to open on "7/16".

- **Enrichment write-back model** — what an enrichment run actually wrote is retained
  per product for the session (`ProductEnrichmentResult` in
  `lib/enrichment-results.ts`): value, GS1 code when the value came from a code list,
  `source` (`ai-confirmed` vs. `user-edited`), and confidence. Before this existed,
  both review screens held decisions in local state and discarded them on unmount.
  Later confirmations win per attribute across repeated passes over the same product;
  an attribute only ever touched in an earlier pass survives untouched
  (`mergeEnrichmentResults`) — this is the actual mechanism behind "resumable," not
  just a coverage count going up.

- **Three distinct reasons an attribute has no value** — `no-suggestion` (AI never
  proposed anything), `rejected` (supplier turned an AI proposal down), and `pending`
  (AI proposed something, never actioned). These are deliberately not collapsed into
  one "missing" bucket, since a supplier needs a different follow-up for each.

- **Enrichment Detail read-back screen** — a dedicated screen
  (`ScreenProductEnrichmentDetail`) shows what was written for a product and what
  wasn't, with the reason. It also offers an in-line **add-missing-attributes** form,
  backed by the same GS1 code-list combobox (`AttributeValueCombobox`) used for inline
  edits during review, so a supplier can close a `no-suggestion` gap without
  re-entering the review flow. Values added this way are always `source:
  "user-edited"`, `confidence: 100`.

- **Enrichment eligibility gate** — a product cannot be selected or enriched if its
  create date is older than one year before today (`getEnrichmentCutoffDate` in
  `lib/date-utils.ts`). Product List and GTIN List both expose an adjustable cutoff
  date picker, but it can only be moved back to one year, never further — there is no
  in-app way to enrich something older than that window.

- **Per-product status and attribute coverage on Product List** — independent of the
  code-level status badge, each product row shows its own enrichment status
  (`needs-enrichment` / `in-progress` / `ai-enriched`) and an `{enriched}/{total}`
  attribute count, so a supplier can gauge individual products without opening each
  one.

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

10. **Enrichment Detail** (`ScreenProductEnrichmentDetail`,
    `components/screen-product-enrichment-detail.tsx`) — reachable from the Product
    List's Attributes column, the GTIN List's "View enrichment" button, or the
    completion summary's per-product links, this screen reads back exactly what a
    run wrote and what it didn't, with the reason, and lets the supplier fill any
    still-missing attribute directly.

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
| Enrichment Detail | `ScreenProductEnrichmentDetail` | `components/screen-product-enrichment-detail.tsx` | Read-back of what a run wrote per product, what didn't get written and why, plus an add-missing-attributes form |

Cross-screen state and routing for all of the above live in `app/page.tsx`; screens
themselves stay presentational, taking data through props as described in
`CLAUDE.md`.

## Note

This file documents behavior that is **already prototyped in the codebase** — it is
not a spec for new work. No application code was changed in producing it.

This revision folds in findings from `PHASE_2_GAP_ANALYSIS.md`: added the capabilities
that had shipped in code but were previously undocumented here (write-back model,
Enrichment Detail, add-missing-attributes, eligibility gate, per-product coverage),
and corrected the confidence-determinism claim to describe badge state rather than
the underlying row numbers. See that document for the full review, including known
interaction-level defects (e.g. no override control on AI-suggested category cards)
and open questions the prototype has no screen for (fee triggers, access levels, AI
failure handling, audit trail, concurrency) that were deliberately left out of both
this document and `PHASE_2_USER_STORIES.md`.
