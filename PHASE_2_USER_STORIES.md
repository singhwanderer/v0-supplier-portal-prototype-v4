# Phase 2 User Stories — Selection Code 002 Onward

Story set for the coverage-aware, product-level, resumable enrichment flow prototyped
for Selection Code **002 (Sleepwear)**. Written against the running code, not the
original `PHASE_2_REQUIREMENTS.md` draft — see `PHASE_2_GAP_ANALYSIS.md` for the full
review of where that draft had drifted from what's actually built.

## Scope

**In scope** — every screen the codebase marks Phase 2 via its `PhaseTag`/`PhaseBanner`
annotation layer, plus the per-product enrichment write-back model that layer doesn't
visually flag but which the same flow depends on end to end:

Selection Code List → Category Coverage → Product List → GTIN List → Product Category
Assignment → Individual Assignment → Brick Confirmation (sleepwear) → Brick GTIN List
(sleepwear) → AI Enrichment Review (sleepwear) → Enrichment Detail.

**Out of scope**, not covered by any story below: the Text File Upload tail
(`Screen1Upload` through `Screen4Submission`), the whole-code footwear brick
confirmation (`ScreenBrickConfirmation`/`ScreenAIEnrichmentReview`, Selection Code 001's
Phase 1 path), `ScreenCategoryFallback` (manual escape from a failed upload
classification), `ScreenEnrichmentPreview`, and `ScreenSelectionCode`. These are real,
routed screens — they are simply Phase 1, not part of this feature.

**Not storied at all**, per an explicit scoping decision made before drafting: the
commercial/fee model, access-level enforcement, AI failure/timeout handling, audit
trail, concurrency, and scale beyond mock-data volumes. The prototype has no screen or
state covering any of these — writing stories against them would mean inventing
screens. They are recorded as open questions in `PHASE_2_GAP_ANALYSIS.md` Category D
for product/engineering to scope separately.

**Flagged, not resolved:** `PHASE_2_GAP_ANALYSIS.md` Category C notes that the
confidence-driven badge/threshold system this whole flow runs on is in direct tension
with `AGENTIC_ENRICHMENT.md`'s stated guardrail against ranking on self-reported model
confidence. The stories below describe what the badges and thresholds *do*, as built;
they take no position on whether that mechanism should change.

**No persistence exists.** Per `CLAUDE.md`: no backend, no database, no `fetch`, no
`localStorage`. Every "Persist" hint below reads "none — session only" for exactly that
reason — it is not an omission, it is the whole prototype's architecture. Session
lifecycle criteria describe what survives in-session navigation, not what survives a
page reload (nothing does).

### AI task vocabulary

Used in the AI line of task-hints, matching the actual functions in `lib/`:

- **T1 — Category classification** (`suggestCategory`, `lib/category-suggestion.ts`):
  given a product description and an optional allowed-brick list, returns a GS1 brick
  code + name, a 0–100 confidence score, and an evidence string — or `null` if no
  keyword rule matched.
- **T2 — Attribute value suggestion** (`getSuggestionsFor`, `lib/category-attributes.ts`):
  for one attribute on one product, returns a suggested value drawn from the
  attribute's GS1 code list (or a free-text pool for the handful of attributes with no
  code list) and a confidence score.
- **T3 — Reasoning/evidence string** (`getReasoningFor` and the category-suggestion
  evidence strings): a short natural-language justification for T1 or T2's output —
  e.g. `"cotton" found in description` or `Requires fiber content from the supplier`.

Application code renders T1/T2/T3 output as computed; per the "confirm-not-autofill"
model stated on the AI Attribute Enrichment roadmap item, nothing produced by T1–T3 is
ever written or treated as confirmed until the supplier takes an explicit UI action.

T1 and T2 use different confidence scales and different governing thresholds — a
percentage badge on a category card (P2-013, P2-018) and a percentage badge on an
attribute row (P2-025) are never the same threshold even when both render amber. Don't
conflate the 70% brick-suggestion threshold with the 90% attribute-review threshold
just because both use the same bar-and-badge visual language.

### Persona

Every story below uses **Supplier data manager** — "manages product data on behalf of
a supplier, uploads GTINs, fills in attributes, responds to errors." This flow is
UI-driven category and attribute work, not upload- or integration-specific, which is
what distinguishes this persona from Manual supplier (CSV/UI upload) or Integrated
supplier (EDI/API) in the persona list.

### Story count note

This set runs to 40 stories across 10 screens plus 4 cross-cutting stories — high for
a single feature, but proportionate to what's actually built: a 10-screen drill-down
ending in a 1,256-line review screen with four confidence-badge states, three
independent decision actions (confirm/edit/reject) each with undo, a separate batch
path, and a dedicated read-back screen. Candidates most worth consolidating further in
refinement: **P2-013/014/015** (Product Category Assignment) could merge into two
stories instead of three, and **P2-018/019/020** (Brick Confirmation) likewise — both
noted inline below.

---

## Screen / flow inventory

| # | Screen / flow | Component |
|---|---|---|
| 1 | Selection Code List | `ScreenSelectionCodeList` |
| 2 | Category Coverage | `ScreenCategoryCoverage` |
| 3 | Product List | `ScreenProductList` |
| 4 | GTIN List | `ScreenGtinList` |
| 5 | Product Category Assignment | `ScreenProductCategoryAssignment` |
| 6 | Individual Assignment | `ScreenIndividualAssignment` |
| 7 | Brick Confirmation (sleepwear) | `ScreenSleepwearBrickConfirmation` |
| 8 | Brick GTIN List (sleepwear) | `ScreenSleepwearBrickGtinList` |
| 9 | AI Enrichment Review (sleepwear) | `ScreenSleepwearEnrichmentReview` |
| 10 | Enrichment Detail | `ScreenProductEnrichmentDetail` |
| 11 | Cross-cutting: resumable scoped enrichment | spans `app/page.tsx` state + screens 1–10 |

---

## 1. Selection Code List

### P2-001

**Screen / Flow:** Selection Code List
**Story ID:** P2-001

**User story**
As a Supplier data manager, I want to see each selection code's category-assignment
coverage and enrichment status at a glance, so that I know which codes need work
before I open any of them.

**Acceptance criteria**

- Given the Selection Code List loads, when I look at the Product Categories column,
  then I see a badge reading `{categoriesAssigned}/{products} assigned` in amber for a
  partially-covered code, `All assigned ({n}/{n})` in green for a fully-covered code,
  or `0/{n} assigned` in grey for a code with no categories assigned.
  - UI: badge component keyed off `categoriesAssigned >= products` / `> 0` / `= 0`, per `screen-selection-code-list.tsx:397-411`
  - Fetch: none — already loaded (constant mock array)
  - State: none — read-only render of `effectiveCodesMetadata`
  - Persist: none — session only
- Given the Status column, when a code has never been touched, then it shows a grey
  dot "Needs Enrichment"; when categorized but not enriched, a blue "Categories
  Assigned – Not Enriched"; when partway through enrichment, an amber dot "In
  Progress"; when every product is enriched, a green "AI Enriched".
  - UI: status badge switch, `screen-selection-code-list.tsx:421-445`
  - Fetch: none — already loaded
  - State: reads `EnrichmentStatus` from `enrichmentUpdates` overlay or base mock row
  - Persist: none — session only
- Given no row is selected, when I read the helper line under the action bar, then it
  reads "Select a selection code to see what AI enrichment will do."
  - UI: `role="status"` helper text, `screen-selection-code-list.tsx:152-158`
  - Fetch: none
  - State: derived from `selectedRows`
  - Persist: none
- Given I select Selection Code 002 (38/52 assigned), when I read the helper line,
  then it reads "Next: 38 of 52 products already have categories — you'll assign the
  remaining 14 with AI before attribute enrichment."
  - UI: same helper text, code-specific branch for the partial-coverage case
  - Fetch: none
  - State: derived from selected row's `categoriesAssigned` vs `products`
  - Persist: none
- Given I select Selection Code 001 (0/52 assigned), when I read the helper line, then
  it reads "Next: AI will group these 52 products into categories for your
  confirmation, then suggest attribute values for review."
  - UI: same helper text, zero-coverage branch
  - Fetch: none
  - State: derived
  - Persist: none
- Given I select Selection Code 003 (44/44 assigned), when I read the helper line,
  then it reads "Next: all 44 products have categories — AI will suggest attribute
  values for your review. Nothing is submitted without your confirmation."
  - UI: same helper text, full-coverage branch
  - Fetch: none
  - State: derived
  - Persist: none

**Anti-criteria**
- Given Selection Code 002 shows `38/52 assigned`, when the page re-renders without any
  user action, then the count must NOT change — it is not recomputed from randomness.

---

### P2-002

**Screen / Flow:** Selection Code List
**Story ID:** P2-002

**User story**
As a Supplier data manager, I want to open the product-level drill-down for any
selection code from more than one place on the row, so that I can get to product
detail however I naturally click.

**Acceptance criteria**

- Given the Selection Code List, when I click the Selection Code link on the 002 row,
  then I land on the Product List for 002.
  - UI: clickable code cell, `screen-selection-code-list.tsx:359-371`
  - Fetch: none
  - State: sets `drillDownCode`/`drillDownCodeMeta` in `app/page.tsx`; does not set `selectedSelectionCodes`
  - Persist: none — session only
- Given the same row, when I click the Products count cell instead, then I land on the
  same Product List for 002 — both are the same underlying route.
  - UI: clickable products-count cell, `screen-selection-code-list.tsx:387-395`
  - Fetch: none
  - State: identical `onOpenProductList` call
  - Persist: none
- Given the 002 row specifically, when I click "Open 002 Product List →" inside the
  orange Phase 2 banner, then I land on the same Product List.
  - UI: `PhaseBanner` action button, `screen-selection-code-list.tsx:193-211`
  - Fetch: none
  - State: identical `onOpenProductList` call
  - Persist: none
- Given a non-002 row (001 or 003), when I click its Selection Code link or Products
  count, then I still land on that code's Product List — the route is not 002-specific
  even though only 002 is visually flagged as Phase 2.
  - UI: same cells, any row
  - Fetch: none
  - State: identical
  - Persist: none

**Anti-criteria**
- Given I open the Product List for 001 or 003, when the screen renders, then it must
  NOT show the orange Phase 2 banner or scope chip — those render only when the
  underlying data carries the 002 demo-row marker.

---

## 2. Category Coverage

### P2-003

**Screen / Flow:** Category Coverage
**Story ID:** P2-003

**User story**
As a Supplier data manager, I want to see which of a code's products already have
categories and which don't, so that I understand what AI assignment will and won't
touch.

**Acceptance criteria**

- Given I open Category Coverage for 002, when the screen loads, then I see a coverage
  card reading "38 products already have categories — only 14 left to assign", a
  two-tone progress bar, and "73% covered."
  - UI: coverage summary card, `screen-category-coverage.tsx:123-133`
  - Fetch: none — already loaded
  - State: computed from the code's `categoriesAssigned`/`products`
  - Persist: none
- Given the same screen, when I look at the assigned section, then I see the 38
  already-assigned products grouped into read-only cards by category: Night
  Dresses/Shirts (18), Dressing Gowns (12), Sleep Trousers/Shorts (8), each captioned
  "These products keep their existing categories — no AI is involved."
  - UI: assigned-products section, `screen-category-coverage.tsx:137-161`
  - Fetch: none
  - State: static per-code grouping data
  - Persist: none
- Given the same screen, when I look at the unassigned section, then I see an amber
  dashed panel "14 products don't have a category yet" with a sample table of 6
  products and an "…and 8 more" line, captioned "Attributes can only be enriched once
  a product has a category."
  - UI: unassigned-products panel, `screen-category-coverage.tsx:164-199`
  - Fetch: none
  - State: static sample data
  - Persist: none
- Given I instead open Category Coverage for 003 (44/44 assigned), when the screen
  loads, then I see a green banner "All 44 products already have categories — no AI
  category assignment needed" and no unassigned panel at all.
  - UI: full-coverage banner branch, `screen-category-coverage.tsx:111-121`
  - Fetch: none
  - State: derived from 0 unassigned
  - Persist: none

**Anti-criteria**
- Given the unassigned-products table on this screen, when I look for a way to assign
  a category directly from this table, then no such control must exist — this screen
  is read-only; assignment only happens via "Assign with AI" or the drill-down.

---

### P2-004

**Screen / Flow:** Category Coverage
**Story ID:** P2-004

**User story**
As a Supplier data manager, I want to launch AI category assignment for only the
products that don't have one yet, so that I don't re-touch categories I've already
confirmed.

**Acceptance criteria**

- Given Category Coverage for 002 showing 14 unassigned products, when I click "Assign
  with AI", then I'm taken to Brick Confirmation scoped to only those 14 products, not
  the whole code.
  - AI: T1 will run against the 14 unassigned products' descriptions on the next screen; this click does not itself invoke T1
  - UI: primary CTA, `screen-category-coverage.tsx:203-210`; sub-caption "AI suggests a category for each product; you confirm before anything is saved."
  - Fetch: none
  - State: `app/page.tsx` sets `brickConfirmationScope = "unassigned-only"`, navigates to `brick-confirmation`
  - Persist: none — session only
- Given the same click, when Brick Confirmation renders, then its header reflects the
  scoped count: "Assigning categories for the 14 unassigned products in Selection Code
  002 Sleepwear (42 GTINs)".
  - UI: scope banner, `screen-sleepwear-brick-confirmation.tsx:155-181`
  - Fetch: none
  - State: GTIN estimate computed via `estimateGtins`, `lib/sleepwear-catalog.ts:98-100`
  - Persist: none

**Anti-criteria**
- Given I click "Assign with AI" on Category Coverage, when the next screen loads,
  then the 38 already-assigned products must NOT reappear as candidates for AI
  category suggestion.

---

### P2-005

**Screen / Flow:** Category Coverage
**Story ID:** P2-005

**User story**
As a Supplier data manager, I want to proceed straight to attribute enrichment for the
products that are already categorized, so that I'm not forced to resolve every
uncategorized product first.

**Acceptance criteria**

- Given Category Coverage for 002 with 38 of 52 assigned, when I click "Continue to
  Attribute Enrichment (38 products)", then I'm taken directly to the AI Enrichment
  Review scoped to those 38 products.
  - UI: primary CTA, `screen-category-coverage.tsx:245-253`
  - Fetch: none
  - State: `app/page.tsx` sets `screen = "ai-enrichment-review"` for the covered scope
  - Persist: none
- Given the same action, when the button is visible, then a warning line beside it
  reads "14 products without categories will be skipped and stay flagged as needing a
  category."
  - UI: warning text, `screen-category-coverage.tsx:239-244`
  - Fetch: none
  - State: derived from `unassignedCount`
  - Persist: none
- Given a code with zero assigned products (hypothetically, `assignedCount === 0`),
  when I look at this button, then it is disabled — there is nothing to proceed to
  enrichment with yet.
  - UI: `disabled` state, `screen-category-coverage.tsx:245`
  - Fetch: none
  - State: `assignedCount === 0`
  - Persist: none

**Anti-criteria**
- Given I proceed to enrichment for the 38 assigned products, when the review screen
  loads, then the 14 unassigned products must NOT appear anywhere in its attribute
  table — they were explicitly skipped, not silently included.

---

### P2-006

**Screen / Flow:** Category Coverage
**Story ID:** P2-006

**User story**
As a Supplier data manager, I want to leave the Category Coverage screen without
making any changes, so that I can inspect a code before committing to work on it.

**Acceptance criteria**

- Given I'm viewing Category Coverage for any code, when I click "← Back", then I
  return to wherever I came from without any coverage numbers changing.
  - UI: back link, `screen-category-coverage.tsx:221-226`
  - Fetch: none
  - State: no mutation of `enrichmentUpdates`/`addCoverage`
  - Persist: none — nothing was ever staged to persist
- Given the same screen, when I click "Exit to Selection Code List" (rendered only
  when that handler is supplied), then I return to the list with the code's coverage
  and status exactly as they were before I opened this screen.
  - UI: exit link, `screen-category-coverage.tsx:229-236`
  - Fetch: none
  - State: no mutation
  - Persist: none

**Anti-criteria**
- Given I open Category Coverage and immediately exit without clicking "Assign with
  AI" or "Continue to Attribute Enrichment", when I return to the Selection Code List,
  then that code's `categoriesAssigned` and status must NOT have changed in any way.

---

## 3. Product List

### P2-007

**Screen / Flow:** Product List
**Story ID:** P2-007

**User story**
As a Supplier data manager, I want to see each product's category, enrichment status,
and attribute coverage in one table, so that I can decide what to work on without
opening each product individually.

**Acceptance criteria**

- Given I open the Product List for 002, when it loads, then each row shows the
  product's Category (name + brick code, or "Not assigned"), an Enrichment status
  badge (Needs Enrichment / In Progress / AI Enriched), and an Attributes cell.
  - UI: table columns, `screen-product-list.tsx:256-281`
  - Fetch: none — already loaded
  - State: reads `PRODUCTS_BY_CODE["002"]` overlaid with `productCategoryUpdates`/`productEnrichmentUpdates`
  - Persist: none
- Given a product that has been through at least one enrichment run, when I look at
  its Attributes cell, then it shows `{enriched}/{total}` as a clickable link — e.g.
  "7/16" for a Night Dresses/Shirts product with 7 of its 16 attributes filled.
  - UI: `summarizeEnrichment` output rendered as a link, `screen-product-list.tsx:336-349`
  - Fetch: none
  - State: reads `enrichedAttributes[productKey]` via `summarizeEnrichment`, `lib/enrichment-results.ts:166-178`
  - Persist: none
- Given a product with no category yet (e.g. S22044), when I look at its Attributes
  cell, then it shows an em dash, not a count — there is no attribute set to measure
  against without a category.
  - UI: em-dash fallback, `screen-product-list.tsx:336-349`
  - Fetch: none
  - State: `categoryAttributeNames` empty when `product.category` is null
  - Persist: none
- Given a product that has never been enriched but does have a category, when I look
  at its Attributes cell, then it shows "0/{n}" where n is that category's full
  attribute count (16 for Night Dresses/Shirts, 15 for Dressing Gowns or Sleep
  Trousers/Shorts, 10 for Variety Packs).
  - UI: zero-state count, `screen-product-list.tsx:336-349`
  - Fetch: none
  - State: `summarizeEnrichment` with `hasRun: false`
  - Persist: none

**Anti-criteria**
- Given the Attributes column on this screen and the "attributes enriched" figure on
  Enrichment Detail for the same product, when I compare the two numbers, then they
  must NOT disagree — both are computed by the same `summarizeEnrichment` /
  `unenrichedAttributesFor` helpers (`lib/enrichment-results.ts:139-178`).

---

### P2-008

**Screen / Flow:** Product List
**Story ID:** P2-008

**User story**
As a Supplier data manager, I want to be stopped from selecting a product that's too
old to enrich, with a clear reason and a way to adjust the cutoff, so that I don't try
to enrich something the system won't let me.

**Acceptance criteria**

- Given the Product List for 002, when I look at "Enrichment eligible from" in the
  action bar, then I see a date picker defaulted to exactly one year before today.
  - UI: `DatePicker`, `screen-product-list.tsx:228-231`
  - Fetch: none
  - State: `cutoffDate` initialized from `getEnrichmentCutoffDate()`, `lib/date-utils.ts:13-17`
  - Persist: none — resets to the one-year default on next visit
- Given a product created before the cutoff date (e.g. S22011, created 04/07/2021),
  when I look at its row, then it renders at reduced opacity, its checkbox is
  disabled, and its per-row "Enrich" button is disabled with the title "Products
  created before {cutoff} can't be enriched."
  - UI: ineligible-row treatment, `screen-product-list.tsx:98-106,305,359-361`
  - Fetch: none
  - State: `isRowEligible` compares `createDate` to `cutoffDate`
  - Persist: none
- Given the same ineligible row, when I try to check its checkbox, then nothing
  happens — the control is disabled, not merely styled to look disabled.
  - UI: `disabled` checkbox attribute
  - Fetch: none
  - State: same eligibility check
  - Persist: none
- Given the date picker, when I move the cutoff earlier, then it can go back at most
  one year from today and no further — the earliest selectable date is clamped.
  - UI: `DatePicker` min/max clamp, `components/ui/date-picker.tsx:20-33,53`
  - Fetch: none
  - State: `cutoffDate` updates within the clamped range
  - Persist: none

**Anti-criteria**
- Given a product row is ineligible, when I attempt to select it via "select all
  eligible" or any bulk control, then it must NOT be included — `toggleSelectAll`
  operates over eligible rows only (`screen-product-list.tsx:117-121`).

---

### P2-009

**Screen / Flow:** Product List
**Story ID:** P2-009

**User story**
As a Supplier data manager, I want to select one or many eligible products and start
AI enrichment for just those, so that I can work through a code in batches that make
sense to me.

**Acceptance criteria**

- Given at least one eligible product row, when I check its box, then the row is
  added to my selection and "Enrich Selected Products with AI" becomes enabled.
  - UI: row checkbox, `screen-product-list.tsx:108-115,234-242`
  - Fetch: none
  - State: `selectedIds` set updates
  - Persist: none
- Given I select the header checkbox, when I click it, then every eligible row is
  selected (ineligible rows are skipped) — clicking again clears the selection.
  - UI: `toggleSelectAll`, `screen-product-list.tsx:117-121,262-266`
  - Fetch: none
  - State: `selectedIds` set to/from the full eligible set
  - Persist: none
- Given a selection of one or more products, when I click "Enrich Selected Products
  with AI", then I'm taken into scoped enrichment (`startProductScopedEnrichment`) for
  exactly those products — uncategorized ones go through Product Category Assignment
  first, categorized ones go straight to attribute review.
  - AI: T1 will run for any selected product that has no category yet, on the next screen
  - UI: bulk CTA, `screen-product-list.tsx:234-242`
  - Fetch: none
  - State: `app/page.tsx:220-246` sets `enrichmentProductScope`, `enrichmentScopeLabel`, routes accordingly
  - Persist: none
- Given a single eligible product row, when I click its per-row "Enrich" action
  instead of using bulk selection, then the same scoped-enrichment flow starts for
  that one product.
  - UI: per-row action, `screen-product-list.tsx:356-370`
  - Fetch: none
  - State: same `startProductScopedEnrichment` call with a one-item array
  - Persist: none
- Given my current selection is empty, mixed (some already categorized, some not), or
  all-categorized, when I read the helper line under the action bar, then its copy
  matches: "Select products to enrich…", "Next: AI will suggest a category for 2
  uncategorized products… the other 1 keep the categories they have…", or "Next: AI
  will suggest attribute values for the N selected products…" respectively.
  - UI: `role="status"` helper text, `screen-product-list.tsx:130-134`
  - Fetch: none
  - State: derived from selected rows' category presence
  - Persist: none

**Anti-criteria**
- Given I have zero products selected, when I look at "Enrich Selected Products with
  AI", then it must be disabled — it must NOT be possible to launch enrichment with no
  scope.

---

### P2-010

**Screen / Flow:** Product List
**Story ID:** P2-010

**User story**
As a Supplier data manager, I want to jump from a product row straight into its GTIN
detail or its enrichment history, so that I can inspect one product without going
through the whole flow.

**Acceptance criteria**

- Given any product row, when I click its Product id, then I'm taken to the GTIN List
  for that product.
  - UI: product-id link, `screen-product-list.tsx:312-318`
  - Fetch: none
  - State: `app/page.tsx` sets `drillDownProduct`, navigates to `gtin-list`
  - Persist: none
- Given a product row with `summary.total > 0` (has a category, so has an attribute
  set to measure), when I click "View enrichment" (eye icon), then I'm taken to
  Enrichment Detail for that product.
  - UI: view-enrichment action, `screen-product-list.tsx:373-381`
  - Fetch: none
  - State: `app/page.tsx` records `detailReturnScreen = "product-list"`
  - Persist: none
- Given a product row with no category (`summary.total === 0`, e.g. S22044), when I
  look at "View enrichment", then it is disabled — there's nothing to show.
  - UI: `disabled` state, `screen-product-list.tsx:373-381`
  - Fetch: none
  - State: `summary.total === 0`
  - Persist: none

**Anti-criteria**
- Given I open Enrichment Detail from a Product List row, when I click its back
  breadcrumb, then it must return me to Product List (not GTIN List or the selection
  code list) — the return target is recorded per-entry, not hardcoded.

---

## 4. GTIN List

### P2-011

**Screen / Flow:** GTIN List
**Story ID:** P2-011

**User story**
As a Supplier data manager, I want to see every GTIN behind one product and start AI
enrichment for that product directly, so that I don't have to go back to the product
list to act on what I'm already looking at.

**Acceptance criteria**

- Given I open the GTIN List for a product (e.g. S22011), when it loads, then I see
  every GTIN with its type, pack, color, size, cost, retail price, and dates in a
  table, plus the product's category (name + brick code, or a grey "Not assigned"
  badge) in the header block.
  - UI: header block + GTIN table, `screen-gtin-list.tsx:107-184,187-237`
  - Fetch: none — already loaded
  - State: reads `GTINS_BY_PRODUCT[productId]` or synthesizes fallback rows
  - Persist: none
- Given the same screen, when I look at "Enrichment eligible from", then I see the
  same adjustable date-picker cutoff as the Product List, applied at this product's
  grain.
  - UI: `DatePicker`, `screen-gtin-list.tsx:107-184`
  - Fetch: none
  - State: local `cutoffDate`, same clamp rules as Product List
  - Persist: none
- Given the product's create date is before the cutoff (S22011 is, at 04/07/2021),
  when I look at "Enrich Attributes with AI", then it is disabled by default, and the
  caption below it reads "S22011 was created before {cutoff} and can't be enriched."
  - UI: disabled CTA + caption, `screen-gtin-list.tsx:83-88,148-149,156-162`
  - Fetch: none
  - State: same eligibility rule as Product List, evaluated per-product
  - Persist: none
- Given an eligible product, when I click "Enrich Attributes with AI", then I enter
  scoped enrichment for that single product — the same `startProductScopedEnrichment`
  flow the Product List's per-row Enrich uses.
  - AI: T1 runs first if the product is uncategorized
  - UI: primary CTA, `screen-gtin-list.tsx:146-155`
  - Fetch: none
  - State: `enrichmentProductScope = [thisProduct]`
  - Persist: none

**Anti-criteria**
- Given this screen has no per-GTIN selection or bulk actions, when I look for a way
  to enrich a subset of this product's GTINs, then no such control must exist —
  enrichment here is strictly product-level, matching the Product List's grain.

---

### P2-012

**Screen / Flow:** GTIN List
**Story ID:** P2-012

**User story**
As a Supplier data manager, I want to open a product's enrichment history from its
GTIN List, so that I can check what's already been captured before deciding to enrich
again.

**Acceptance criteria**

- Given a product that has been through at least one enrichment run, when I click
  "View enrichment {n}/{m}" (rendered only when `summary.total > 0`), then I'm taken to
  Enrichment Detail for that product.
  - UI: conditional secondary button, `screen-gtin-list.tsx:165-181`
  - Fetch: none
  - State: `app/page.tsx` records `detailReturnScreen = "gtin-list"`
  - Persist: none
- Given I return from Enrichment Detail via its back link, when the app navigates,
  then I land back on this GTIN List, not the Product List — the return target
  matches where I actually came from.
  - UI: breadcrumb/back button honoring `detailReturnScreen`
  - Fetch: none
  - State: `app/page.tsx:504-505`
  - Persist: none

**Anti-criteria**
- Given a product with no prior enrichment run, when I look for "View enrichment" on
  this screen, then the button must NOT render at all — not a disabled state, an
  absent one, since `summary.total === 0` for a never-enriched product with no
  category, and even a categorized-but-unenriched product renders it as absent per
  the `summary.total > 0` gate.

---

## 5. Product Category Assignment

### P2-013

**Screen / Flow:** Product Category Assignment
**Story ID:** P2-013

**User story**
As a Supplier data manager, I want AI to propose a category for every uncategorized
product in my current scope, with its confidence and the evidence behind it, so that I
can judge each suggestion instead of trusting it blindly.

**Acceptance criteria**

- Given I enter this screen with N uncategorized products in scope, when it loads,
  then every product has been run through T1 and sorted into one of three groups:
  confident (≥70% confidence), uncertain (<70%), or unclassified (T1 returned no
  match at all).
  - AI: T1 (`suggestCategory`) runs once per product against its description, constrained to the current selection code's allowed bricks; application code only buckets and displays the result, it does not alter the score
  - UI: three-group layout, `screen-product-category-assignment.tsx:61-83,175-262`
  - Fetch: none — already loaded
  - State: `toAssign` computed from `products.filter(p => !p.category)`
  - Persist: none
- Given a confident-bucket product (e.g. S22044 "Flannel pajama top", matched on
  "pajama top"), when I look at its card, then I see the suggested category name, its
  mono-font brick code, a color-coded confidence bar (green ≥90%, amber ≥70%, red
  below), and the numeric percentage.
  - AI: T1 output rendered as-is (90–94% for this strong match); no client-side recomputation
  - UI: `ProductCategoryCard`, `screen-product-category-assignment.tsx:323-440`
  - Fetch: none
  - State: none beyond the initial suggestion
  - Persist: none
- Given products already carrying a category coming into this scope, when I look at
  the "Already categorized — kept as they are" section, then I see them listed
  read-only with a green check, their category name, and brick code — no suggestion
  ran against them.
  - UI: `alreadyCategorized` list, `screen-product-category-assignment.tsx:175-200`
  - Fetch: none
  - State: `products.filter(p => p.category)`
  - Persist: none

**Anti-criteria**
- Given T1 returns a confidence score for a product, when the card renders, then the
  application must NOT recompute, round differently, or otherwise alter that score —
  it is rendered as T1 produced it.

*(Refinement note: could merge with P2-014 into a single "view and confirm" story if
the team prefers fewer, larger stories for this screen.)*

---

### P2-014

**Screen / Flow:** Product Category Assignment
**Story ID:** P2-014

**User story**
As a Supplier data manager, I want to confirm an AI-suggested category or manually
assign one to a product AI couldn't classify, so that every product in scope ends up
with a category I've explicitly signed off on.

**Acceptance criteria**

- Given a confident- or uncertain-bucket card, when I click "Confirm Category", then
  the card turns green, shows a check and "Confirmed", and the counter "{x} of {n}
  confirmed" increments.
  - UI: confirm action, `screen-product-category-assignment.tsx:394-400`
  - Fetch: none
  - State: local `assignments` array gains an entry for this product
  - Persist: none — session only until Save & Exit or Continue
- Given a confirmed card, when I click "Undo Confirm", then it reverts to its
  unconfirmed suggestion state and the counter decrements.
  - UI: undo action, same card
  - Fetch: none
  - State: entry removed from `assignments`
  - Persist: none
- Given an unclassified (red-card) product, when I click "Choose Category →", then a
  grouped dropdown of parent categories and their bricks opens, restricted to
  `SLEEPWEAR_CATEGORY_OPTIONS` for the 002 flow.
  - UI: `UnclassifiedProductCard` picker, `screen-product-category-assignment.tsx:454-537`
  - Fetch: none
  - State: opens local picker state for that card
  - Persist: none
- Given that dropdown, when I pick a category, then the card flips to the same green
  confirmed treatment as an AI-suggested confirm, with a grey "You changed this" chip.
  - UI: confirmed-and-overridden treatment, `screen-product-category-assignment.tsx:394-400`
  - Fetch: none
  - State: entry added to `assignments` with an override flag
  - Persist: none

**Anti-criteria**
- Given a confident- or uncertain-bucket card (AI already proposed something), when I
  look for a way to change the suggestion to a different category, then no such
  control must be reachable — the picker dropdown exists in the component but is not
  wired to any trigger on these cards (`screen-product-category-assignment.tsx:329,416`).
  This is documented current behavior, not the intended design — the on-screen copy at
  `:161-162` promises "Change any suggestion," which this contradicts. See
  `PHASE_2_GAP_ANALYSIS.md` E1.

---

### P2-015

**Screen / Flow:** Product Category Assignment
**Story ID:** P2-015

**User story**
As a Supplier data manager, I want to save partial category-assignment progress or
continue to attribute enrichment once everything is resolved, so that I control when I
move to the next step.

**Acceptance criteria**

- Given I've confirmed at least one product, when I click "Save & Return to List",
  then my confirmed assignments are applied to coverage and I return to the Product
  List — unconfirmed products in this scope are left uncategorized.
  - UI: secondary CTA, `screen-product-category-assignment.tsx:265-303`
  - Fetch: none
  - State: `app/page.tsx` calls `applyScopedAssignments`, which updates `productCategoryUpdates` and calls `addCoverage`
  - Persist: none — session only
- Given zero products confirmed, when I look at "Save & Return to List", then it is
  disabled — there's nothing to save.
  - UI: `disabled` state
  - Fetch: none
  - State: `assignments.length === 0`
  - Persist: none
- Given every product in scope is resolved (confirmed or was already categorized),
  when I look at "Continue to Attribute Enrichment →", then it's enabled, and clicking
  it takes me to the review screen for this scope's resolved bricks.
  - UI: primary CTA, `screen-product-category-assignment.tsx:296-300`
  - Fetch: none
  - State: `allResolved` gate; true even when `rows.length === 0` (everything was already categorized)
  - Persist: none
- Given at least one product in scope is still unresolved, when I look at "Continue to
  Attribute Enrichment →", then it's disabled, with "{n} still to confirm." beneath it.
  - UI: disabled state + count, `screen-product-category-assignment.tsx:296-300`
  - Fetch: none
  - State: `!allResolved`
  - Persist: none

**Anti-criteria**
- Given I click "Continue to Attribute Enrichment →" with everything resolved, when
  the review screen loads, then a product I left uncategorized in a *previous*,
  separate pass must NOT silently appear in this run's scope — scope is exactly the
  products this navigation carried forward.

---

## 6. Individual Assignment

### P2-016

**Screen / Flow:** Individual Assignment
**Story ID:** P2-016

**User story**
As a Supplier data manager, I want to assign categories to a batch of unclassified or
low-confidence products either all at once or one at a time, so that I can clear a
backlog efficiently or handle exceptions individually.

**Acceptance criteria**

- Given this screen with multiple unresolved rows, when I select several via their
  checkboxes and pick a category from the bulk dropdown, then clicking "Apply to
  selected ({n})" assigns that category to every selected row at once.
  - UI: bulk bar, `screen-individual-assignment.tsx:220-250`
  - Fetch: none
  - State: `applyBulkCategory`, `screen-individual-assignment.tsx:183-191`, writes to every selected row
  - Persist: none — session only
- Given no category is chosen in the bulk dropdown, or no rows are selected, when I
  look at "Apply to selected", then it's disabled.
  - UI: `disabled` gate, `screen-individual-assignment.tsx:238`
  - Fetch: none
  - State: requires both a category and a non-empty selection
  - Persist: none
- Given a single unresolved row, when I open its own category dropdown and pick a
  value, then that row alone is assigned — its background turns green and shows the
  category with a check.
  - UI: per-row picker, `screen-individual-assignment.tsx:302-330`
  - Fetch: none
  - State: single-row assignment write
  - Persist: none
- Given the header checkbox, when I click it, then every row on the screen is
  selected, regardless of assignment state.
  - UI: `toggleSelectAll`, `screen-individual-assignment.tsx:163-169`
  - Fetch: none
  - State: full-selection toggle
  - Persist: none

**Anti-criteria**
- Given this screen reached from the 002 flow, when I look at the product names
  listed, then per current code they show footwear/jewellery sample names (Vintage
  pocket watch, Suede Chelsea Boot, etc.) under a sleepwear-only category picker — a
  known mismatch, not something a story should paper over. See
  `PHASE_2_GAP_ANALYSIS.md` E4. A fix would wire in `SLEEPWEAR_UNCLASSIFIED_PRODUCTS`
  (`lib/sleepwear-catalog.ts:212-217`), but that is out of scope for this
  documentation pass.

---

### P2-017

**Screen / Flow:** Individual Assignment
**Story ID:** P2-017

**User story**
As a Supplier data manager, I want to save whatever I've assigned so far or be
stopped from continuing until everything is resolved, so that partial work isn't lost
and incomplete scopes don't silently proceed.

**Acceptance criteria**

- Given I've assigned at least one product, when I click "Save & Return to List", then
  my assignments are kept and I return to the Product List; a line beneath the button
  reads "{n} products will stay flagged as needing a category" for anything still
  unresolved.
  - UI: save action + caption, `screen-individual-assignment.tsx:341-384`
  - Fetch: none
  - State: `app/page.tsx` routes to `handleScopedAssignments` (drill-down mode) or `handleSaveCategoriesAndExit` otherwise
  - Persist: none — session only
- Given zero products assigned, when I look at "Save & Return to List", then it's
  disabled.
  - UI: `disabled` gate
  - Fetch: none
  - State: `assignedCount === 0`
  - Persist: none
- Given this screen was reached with a `onProceed` handler supplied (i.e. it's feeding
  directly into enrichment) and at least one product remains unassigned, when I look
  at "Continue to Enrichment", then it's disabled with the title "Assign a category to
  every product first."
  - UI: `disabled` CTA, `screen-individual-assignment.tsx:341-384`
  - Fetch: none
  - State: `remainingCount > 0`
  - Persist: none
- Given every product on screen is now assigned, when I look at "Continue to
  Enrichment ({n} products)" (or "Done — Return to Quick Pick" when no `onProceed` was
  supplied), then it's enabled and takes me to the next step.
  - UI: enabled CTA
  - Fetch: none
  - State: `remainingCount === 0`
  - Persist: none

**Anti-criteria**
- Given I have unresolved products remaining, when I attempt to click "Continue to
  Enrichment" via any means, then enrichment must NOT start for a scope that still
  contains uncategorized products — the button is disabled, not merely warned-against.

---

## 7. Brick Confirmation (sleepwear)

### P2-018

**Screen / Flow:** Brick Confirmation (sleepwear)
**Story ID:** P2-018

**User story**
As a Supplier data manager, I want to see AI's category groupings for my products with
their confidence and the evidence behind each grouping, so that I can judge whether to
trust each group before enriching it.

**Acceptance criteria**

- Given I enter this screen for a whole-code or unassigned-only run, when it loads,
  then products are distributed across sleepwear categories by weight (Night
  Dresses/Shirts 30%, Dressing Gowns 22%, Sleep Trousers/Shorts 20%, Variety Packs
  10%, plus three low-confidence variants and one "Could not classify" bucket at 4%),
  using a largest-remainder split so the parts always sum to the scoped total.
  - AI: category weighting and confidence values are fixed per `lib/sleepwear-catalog.ts:34-55`, not recomputed from T1 per-product in this aggregate view
  - UI: category cards, `screen-sleepwear-brick-confirmation.tsx:220-307,311-431`
  - Fetch: none — already loaded
  - State: `distributeProducts`, `lib/sleepwear-catalog.ts:76-95`
  - Persist: none
- Given a high-confidence card (e.g. Night Dresses/Shirts, 95%), when I look at it,
  then I see its name, mono brick code, "{n} Products ({m} GTINs)", a confidence bar,
  the numeric %, and an italic evidence line — `"nightgown", "sleep shirt" and
  "chemise" matched…`.
  - AI: T3 evidence string rendered verbatim
  - UI: card layout, `screen-sleepwear-brick-confirmation.tsx:220-307`
  - Fetch: none
  - State: none
  - Persist: none
- Given the "Could not classify" card (0% confidence), when I look at it, then it's
  styled in red with its own evidence line (`No garment type could be read…`) and the
  caption "These products could not be automatically categorized. Please assign them
  individually."
  - UI: unclassifiable card, `screen-sleepwear-brick-confirmation.tsx:391-417`
  - Fetch: none
  - State: `confidence === 0` bucket
  - Persist: none

**Anti-criteria**
- Given the confidence bucket boundaries (≥70% high-confidence, <70% low-confidence,
  0% unclassifiable), when a low-confidence card is displayed (e.g. 54%, 48%, 45%),
  then it must NOT be placed in the high-confidence section — bucketing is strict.

---

### P2-019

**Screen / Flow:** Brick Confirmation (sleepwear)
**Story ID:** P2-019

**User story**
As a Supplier data manager, I want to confirm one category at a time or confirm every
qualifying category in bulk, with the ability to undo, so that I can move fast on
groupings I trust and stay deliberate about the rest.

**Acceptance criteria**

- Given an unconfirmed category card, when I click "Confirm Category", then it turns
  green with a checkmark and the header counter "{x} of {n} categories confirmed"
  increments.
  - UI: per-card confirm, `screen-sleepwear-brick-confirmation.tsx:220-307`
  - Fetch: none
  - State: card added to confirmed set
  - Persist: none — session only
- Given a confirmed card, when I click "Undo Confirm" on it, then it reverts to
  unconfirmed and the counter decrements.
  - UI: per-card undo
  - Fetch: none
  - State: card removed from confirmed set
  - Persist: none
- Given multiple unconfirmed cards with mixed confidence, when I click "Confirm All
  Categories", then every card with confidence ≥70% is confirmed in one action — cards
  below 70% (including the 0% unclassifiable card) are left untouched and still need
  individual assignment.
  - UI: bulk confirm, `screen-sleepwear-brick-confirmation.tsx:472-479`; handler `screen-sleepwear-brick-confirmation.tsx:116-121`
  - Fetch: none
  - State: snapshots prior confirmed set before applying the bulk change
  - Persist: none
- Given I just used "Confirm All Categories", when I look at the button, then it has
  swapped to a red-outlined "Undo Confirm All", which restores exactly the
  pre-bulk-confirm snapshot if clicked.
  - UI: swapped button + restore, `screen-sleepwear-brick-confirmation.tsx:464-471,123-128`
  - Fetch: none
  - State: snapshot restore
  - Persist: none
- Given every category is now confirmed, when I look for either bulk-confirm button,
  then neither renders — there's nothing left to bulk-act on.
  - UI: conditional rendering
  - Fetch: none
  - State: `confirmedCount === totalCount`
  - Persist: none

**Anti-criteria**
- Given "Confirm All Categories" is clicked, when I check the low-confidence and
  unclassifiable cards afterward, then they must NOT show as confirmed — only
  ≥70%-confidence cards are affected by the bulk action.

*(Refinement note: could merge with P2-020 if the team wants fewer stories on this
screen — both describe actions available directly from the card grid.)*

---

### P2-020

**Screen / Flow:** Brick Confirmation (sleepwear)
**Story ID:** P2-020

**User story**
As a Supplier data manager, I want to jump straight into enriching one confirmed
category without waiting to resolve every other category first, so that I can start
producing value immediately.

**Acceptance criteria**

- Given a confirmed category card, when I click "Enrich This Category", then I'm
  taken directly into the AI Enrichment Review scoped to just that category's
  products — I do not need to confirm or resolve any other card first.
  - UI: per-card enrich action, `screen-sleepwear-brick-confirmation.tsx:281-301`; handler `screen-sleepwear-brick-confirmation.tsx:139-146`
  - Fetch: none
  - State: `onProceedToEnrichment([thatCategory])`
  - Persist: none — session only
- Given I return from that single-category enrichment run, when I land back on Brick
  Confirmation, then the categories I hadn't touched are exactly as I left them —
  still unconfirmed, still available to confirm or enrich separately.
  - UI: unchanged card states for untouched categories
  - Fetch: none
  - State: no cross-category mutation
  - Persist: none

**Anti-criteria**
- Given "Enrich This Category" navigates away immediately on click, when I look for a
  toggled "Enriching This Category (Unselect)" state on the button, then it must NOT
  be observable in normal use — the alternate state exists in code but is unreachable
  because the click always navigates first. See `PHASE_2_GAP_ANALYSIS.md` E3.

---

### P2-021

**Screen / Flow:** Brick Confirmation (sleepwear)
**Story ID:** P2-021

**User story**
As a Supplier data manager, I want an explicit escape hatch to manually assign
categories for products AI grouped with low confidence or couldn't classify at all, so
that nothing gets stuck.

**Acceptance criteria**

- Given the "Could not classify" red card, when I click its "Assign Individually"
  affordance, then I'm taken to Individual Assignment scoped to `"unclassified"`.
  - UI: red-card escape, `screen-sleepwear-brick-confirmation.tsx:391-417`
  - Fetch: none
  - State: `app/page.tsx:625-629` sets `individualAssignmentScope = "unclassified"`, nulls `assignmentProducts`
  - Persist: none
- Given the low-confidence panel's footer link "Review all {n} products individually
  →", when I click it, then I'm taken to Individual Assignment scoped to
  `"all-low-confidence"`, covering every card below 70% confidence, not just the
  unclassifiable one.
  - UI: panel-footer escape, `screen-sleepwear-brick-confirmation.tsx:420-429`
  - Fetch: none
  - State: `individualAssignmentScope = "all-low-confidence"`
  - Persist: none

**Anti-criteria**
- Given I take either escape hatch, when Individual Assignment loads, then
  high-confidence (≥70%) products from this run must NOT appear in its list — only the
  low-confidence/unclassifiable subset is in scope.

---

### P2-022

**Screen / Flow:** Brick Confirmation (sleepwear)
**Story ID:** P2-022

**User story**
As a Supplier data manager, I want to save the categories I've confirmed and exit
before doing any attribute enrichment, so that category work and attribute work can
happen in separate sessions.

**Acceptance criteria**

- Given I've confirmed at least one category, when I click the exit action, then its
  label reads "Save & Return to List" with the note "Confirmed categories are kept —
  this code will show 'Categories Assigned – Not Enriched'."
  - UI: exit CTA, `screen-sleepwear-brick-confirmation.tsx:443-453`
  - Fetch: none
  - State: `app/page.tsx` calls `handleSaveCategoriesAndExit`, which sums confirmed products and calls `addCoverage`
  - Persist: none — session only
- Given I've confirmed zero categories, when I click the same exit action, then its
  label reads "Exit to Selection Code List" with no coverage change.
  - UI: exit CTA, unconfirmed variant
  - Fetch: none
  - State: no `addCoverage` call
  - Persist: none
- Given I save with some categories confirmed and later return to this same code's
  Category Coverage, when I look at its numbers, then the confirmed categories'
  product counts show up as newly covered, added on top of whatever coverage existed
  before this run — not replacing it.
  - UI: coverage overlay reflects the addition
  - Fetch: none
  - State: `addCoverage(code, newlyAssigned)`, `app/page.tsx:177-193` — increments, clamped at the code's total
  - Persist: none

**Anti-criteria**
- Given I save-and-exit with 3 of 7 categories confirmed, when I check this code's
  coverage afterward, then the other 4 categories' products must NOT appear as
  assigned — only what I actually confirmed counts.

---

## 8. Brick GTIN List (sleepwear)

### P2-023

**Screen / Flow:** Brick GTIN List (sleepwear)
**Story ID:** P2-023

**User story**
As a Supplier data manager, I want to view and search the products sitting behind one
confirmed category, so that I can sanity-check the grouping before enriching it.

**Acceptance criteria**

- Given I click "View {n} Products" on a category card in Brick Confirmation, when the
  Brick GTIN List loads, then I see every product in that category with its GTIN
  count, the selection code, a confidence bar + %, and its category name.
  - UI: table, `screen-sleepwear-brick-gtin-list.tsx:117-267`
  - Fetch: none — already loaded, keyed by category id
  - State: reads `SLEEPWEAR_PRODUCTS_BY_CATEGORY[categoryId]`
  - Persist: none
- Given the same screen, when I type into "Search product or GTIN…", then the list
  filters to products whose name or any child GTIN contains my search text, and
  pagination resets to page 1.
  - UI: search box, `screen-sleepwear-brick-gtin-list.tsx:95-112`
  - Fetch: none
  - State: local filter state
  - Persist: none
- Given a product row, when I click its expand chevron, then I see its child GTINs
  (GTIN / Color Code / Size Code) in a nested table.
  - UI: expand/collapse, `screen-sleepwear-brick-gtin-list.tsx:237-262`
  - Fetch: none
  - State: local expanded-row set
  - Persist: none
- Given more than 25 products in this category, when I look at the footer, then I see
  "Showing 1–25 of {n} products" with prev/next controls; for 25 or fewer products, no
  pagination footer renders at all.
  - UI: conditional pagination, `screen-sleepwear-brick-gtin-list.tsx:270-298`
  - Fetch: none
  - State: `ITEMS_PER_PAGE = 25`
  - Persist: none

**Anti-criteria**
- Given I search for text matching nothing, when the list filters, then it must NOT
  throw or show stale rows — it renders an empty result set (though no dedicated
  empty-state message currently exists; a blank table is the actual behavior).

---

### P2-024

**Screen / Flow:** Brick GTIN List (sleepwear)
**Story ID:** P2-024

**User story**
As a Supplier data manager, I want to move a product to a different category or
decline it from this enrichment pass, so that I can correct a grouping mistake or opt
a product out before I've committed to enriching it.

**Acceptance criteria**

- Given a product row, when I click "Move", then an inline dropdown of the other
  available sleepwear categories opens (excluding the product's current category).
  - UI: inline move control, `screen-sleepwear-brick-gtin-list.tsx:185-211,220-225`
  - Fetch: none
  - State: opens local picker state for that row
  - Persist: none
- Given the move dropdown is open with no category picked, when I look at "Confirm",
  then it's disabled until I pick one.
  - UI: `disabled` gate
  - Fetch: none
  - State: requires a selection
  - Persist: none
- Given I pick a category and click "Confirm", when the row updates, then it now shows
  the new category — this is a local-state change, scoped to this screen's session.
  - UI: row category update
  - Fetch: none
  - State: `handleMoveCategory`, `screen-sleepwear-brick-gtin-list.tsx:64-68`
  - Persist: none
- Given a product row, when I click "Decline", then it's removed from this category's
  active list and from the active count.
  - UI: decline action, `screen-sleepwear-brick-gtin-list.tsx:226-231`
  - Fetch: none
  - State: `handleDecline` sets `declined: true`
  - Persist: none

**Anti-criteria**
- Given I decline a product, when I look for an "Undo" affordance on that action, then
  none must exist — decline is a one-way removal from this list in the current
  implementation, and a story or QA pass should not assume an undo path that isn't
  there.

---

## 9. AI Enrichment Review (sleepwear)

### P2-025

**Screen / Flow:** AI Enrichment Review (sleepwear)
**Story ID:** P2-025

**User story**
As a Supplier data manager, I want the attribute table to show me every confidence
state an attribute can be in, so that I know at a glance which attributes need my
attention and which are safe to trust.

**Acceptance criteria**

- Given I enter the review screen for a Night Dresses/Shirts scope, when the attribute
  table renders, then I see all 16 of that brick's attributes, each as its own
  expandable row with a Products Enriched count and an Avg Confidence bar.
  - AI: T2 has already generated a suggested value + confidence for each product/attribute pair; this row is a rendering of that output, not a recomputation
  - UI: attribute table, `screen-sleepwear-enrichment-review.tsx:727-1109`
  - Fetch: none — already loaded
  - State: `attributeGroups` generated once at mount via `generateAttributeData`
  - Persist: none
- Given the attribute `Fiber` (tuned to `minProductConfidence: null`), when I look at
  its row, then its badge reads amber "Needs review" — this is the **no-value** state:
  AI has no confident value for this attribute at all for some products.
  - UI: badge logic, `screen-sleepwear-enrichment-review.tsx:801-821`
  - Fetch: none
  - State: `attrDef.minProductConfidence === null`
  - Persist: none
- Given the attribute `Closure` (tuned to `minProductConfidence: 0.79`, 4 low-confidence
  slots), when I look at its row, then its badge also reads amber "Needs review" — this
  is the **low-value** state: at least one specific product's suggestion sits below the
  90% cutoff even though the category average is fine.
  - UI: same badge logic, `minProductConfidence < 0.9` branch
  - Fetch: none
  - State: per-attribute tuning from `lib/category-attributes.ts:30-39`
  - Persist: none
- Given the attribute `Special Embellishment` (tuned to `avgConfidence: 0.67`), when I
  look at its row, then its badge reads amber "Needs review" — this is the
  **low-average** state: the whole category's confidence is weak, not just one
  product's.
  - UI: same badge logic, `avgConfidence < 90` branch (percent-scale comparison)
  - Fetch: none
  - State: tuning from `lib/category-attributes.ts:30-39`
  - Persist: none
- Given an untuned attribute like `Brand Name` (defaults to 0.92/0.90 via the fallback
  in `attr()`), when I look at its row, then no "Needs review" badge shows unless every
  row under it is confirmed, in which case a green "Confirmed"/"Completed" chip
  appears — this is the **green** state.
  - UI: same badge logic, all three conditions false
  - Fetch: none
  - State: `lib/category-attributes.ts:87-98`
  - Persist: none

**Anti-criteria**
- Given the badge state for an attribute (e.g. "Needs review" on Fiber), when the
  screen re-renders without any user action, then the badge state must NOT flip —
  it's driven by fixed per-attribute tuning, not the per-row random confidence
  numbers underneath it. (Those row numbers *do* vary between mounts — see P2-026's
  anti-criterion. The badge state is deterministic; the numbers under it are not.
  See `PHASE_2_GAP_ANALYSIS.md` B1.)

---

### P2-026

**Screen / Flow:** AI Enrichment Review (sleepwear)
**Story ID:** P2-026

**User story**
As a Supplier data manager, I want to expand an attribute to see AI's suggestion,
confidence, and reasoning for every product, so that I can make an informed decision
row by row.

**Acceptance criteria**

- Given a collapsed attribute row, when I click it, then it expands to show one row
  per product with its suggested value, a confidence bar, and confirm/edit/reject
  actions.
  - UI: expand toggle, `screen-sleepwear-enrichment-review.tsx:787,873-1104`
  - Fetch: none
  - State: `expandedAttributes` set gains this attribute
  - Persist: none
- Given an expanded product row at, say, 82% confidence, when I look at it, then I see
  the suggested value, an italic AI reasoning line (T3 output — e.g. `"drawstring"
  found in description` for Closure), and a green (≥90%) or amber (≥80%) confidence bar.
  - AI: T2 suggested value + T3 reasoning rendered as generated; not recomputed on expand
  - UI: expanded row, `screen-sleepwear-enrichment-review.tsx:895-1021`
  - Fetch: none
  - State: none — reads the pre-generated row data
  - Persist: none
- Given a product row, when I click "View GTINs", then a nested table opens showing
  that product's individual GTINs with their own AI Suggestion/Confidence/Status
  columns.
  - UI: nested GTIN table, `screen-sleepwear-enrichment-review.tsx:1067-1100`
  - Fetch: none
  - State: `expandedProductGtins` set
  - Persist: none

**Anti-criteria**
- Given the same attribute expanded twice in two different page sessions, when I
  compare the per-row confidence *numbers* shown (not the badge state), then they may
  legitimately differ between sessions — row confidence is generated with
  `Math.random()` at mount (`screen-sleepwear-enrichment-review.tsx:99-118`), which is
  documented current behavior contradicting the "deterministic confidence" language in
  the original Phase 2 draft. See `PHASE_2_GAP_ANALYSIS.md` B1. A story or test must
  NOT assert an exact row-level confidence number as a fixed expectation.

---

### P2-027

**Screen / Flow:** AI Enrichment Review (sleepwear)
**Story ID:** P2-027

**User story**
As a Supplier data manager, I want to confirm, edit, or reject each suggested value
individually, with the ability to undo my decision, so that I stay in control of every
value that ends up on my product.

**Acceptance criteria**

- Given a pending product row at ≥60% confidence, when I click "Confirm", then the row
  turns green, shows a "Confirmed" badge, and an "Undo" link appears.
  - UI: confirm action, `screen-sleepwear-enrichment-review.tsx:1022-1060`
  - Fetch: none
  - State: `productStates["{attribute}|{productKey}"] = "confirmed"`
  - Persist: none — session only until Complete Enrichment
- Given a pending product row, when I click "Edit", then an `AttributeValueCombobox`
  opens — a searchable GS1 code-list dropdown if the attribute has one, free text
  otherwise.
  - UI: inline edit, `components/attribute-value-combobox.tsx`
  - Fetch: none
  - State: local edit-draft state for that row
  - Persist: none
- Given the edit combobox is open, when I type a value and press Enter (or click
  save), then the row's value is overwritten with what I typed and the row
  auto-transitions to `confirmed` — editing is itself a confirming action.
  - UI: `saveProductEdit`, `screen-sleepwear-enrichment-review.tsx:290-306`
  - Fetch: none
  - State: `userValue` set, `productStates[...] = "confirmed"`
  - Persist: none
- Given a pending product row, when I click "Reject", then the row turns red, shows a
  "Rejected" badge, and an "Undo" link appears — no value is retained for this
  attribute/product pair.
  - UI: reject action, `screen-sleepwear-enrichment-review.tsx:1022-1060`
  - Fetch: none
  - State: `productStates[...] = "rejected"`
  - Persist: none
- Given any confirmed, edited, or rejected row, when I click its "Undo" link, then it
  reverts to `pending` — the confirmed/rejected/edited state is fully reversible until
  Complete Enrichment.
  - UI: undo action, `screen-sleepwear-enrichment-review.tsx:979-1004`
  - Fetch: none
  - State: `productStates[...] = "pending"`; if it was an edit, the typed value is also cleared
  - Persist: none

**Anti-criteria**
- Given I reject a suggestion, when I later view Enrichment Detail for this product,
  then it must appear under "Not enriched" with reason "You rejected AI's suggestion,"
  showing the AI's original (rejected) value struck through — not silently omitted as
  if AI never suggested anything.

---

### P2-028

**Screen / Flow:** AI Enrichment Review (sleepwear)
**Story ID:** P2-028

**User story**
As a Supplier data manager, I want to select every row above a confidence threshold in
one action, so that I don't have to click Confirm on dozens of high-confidence rows
individually.

**Acceptance criteria**

- Given the Batch Confirm bar showing 95% / 90% / 80% thresholds, when I click 90%,
  then every still-pending row across all expanded and collapsed attributes with
  confidence ≥90% is marked `batch-selected` — a distinct state from `confirmed`.
  - UI: batch threshold buttons, `screen-sleepwear-enrichment-review.tsx:645-701`
  - Fetch: none
  - State: `productStates[...] = "batch-selected"` for matching rows, `screen-sleepwear-enrichment-review.tsx:245-274`
  - Persist: none — batch selection is an intention, not a write; see P2-031/P2-032
- Given rows are batch-selected at 90%, when I click "Clear selection" or click the
  90% button again, then those rows revert to `pending`.
  - UI: clear/toggle, same control
  - Fetch: none
  - State: reverts `batch-selected` rows to `pending`
  - Persist: none
- Given rows are already batch-selected at one threshold, when I click a different
  threshold, then the previous selection is replaced — only one threshold is active at
  a time.
  - UI: single-active-threshold behavior
  - Fetch: none
  - State: prior `batch-selected` rows revert before the new threshold applies
  - Persist: none
- Given any batch-selected rows exist, when I read the note beside the batch bar, then
  it reads "Batch selection sets your intention — click 'Complete Enrichment' to save
  all changes."
  - UI: italic note, `screen-sleepwear-enrichment-review.tsx:645-701`
  - Fetch: none
  - State: none
  - Persist: none

**Anti-criteria**
- Given rows are batch-selected but I have not clicked "Complete Enrichment", when I
  check Enrichment Detail for one of those products, then the attribute must NOT show
  as enriched yet — `batch-selected` is a staged intention, and `buildEnrichmentResults`
  only treats `confirmed` and `batch-selected` as written *at the moment Complete
  Enrichment runs* (`lib/enrichment-results.ts:103`), not before.

---

### P2-029

**Screen / Flow:** AI Enrichment Review (sleepwear)
**Story ID:** P2-029

**User story**
As a Supplier data manager, I want to filter the attribute table down to only what
needs a closer look, so that I don't have to scroll past attributes I already trust.

**Acceptance criteria**

- Given the "Low Confidence Only (<90%)" toggle is off, when I look at the attribute
  table, then every attribute in scope is shown.
  - UI: filter toggle default state, `screen-sleepwear-enrichment-review.tsx:680-699`
  - Fetch: none
  - State: `showLowConfidenceOnly = false`
  - Persist: none
- Given I switch the toggle on, when the table re-renders, then only attributes with
  `avgConfidence < 90` remain visible at the group level, and within an expanded
  group, only rows with `confidence < 90` remain visible.
  - UI: filter applied, `screen-sleepwear-enrichment-review.tsx:753-758,892`
  - Fetch: none
  - State: `showLowConfidenceOnly = true`
  - Persist: none

**Anti-criteria**
- Given the filter is labeled "<90%", when I check what threshold the code actually
  applies, then it must be 90%, not 85% — the historical `FIX_PROMPT_3_SUMMARY.md`
  documents 85% for this same filter, which is stale relative to the code. See
  `PHASE_2_GAP_ANALYSIS.md` B2. A story or test asserting 85% would be wrong.

---

### P2-030

**Screen / Flow:** AI Enrichment Review (sleepwear)
**Story ID:** P2-030

**User story**
As a Supplier data manager, I want AI to withhold a suggestion it isn't confident
enough in rather than show me something misleadingly specific, so that I'm not asked
to "confirm" a value that isn't trustworthy.

**Acceptance criteria**

- Given a product row whose generated confidence is below 60%, when I look at its
  suggested-value cell, then it reads "N/A" in italics, not an actual value.
  - AI: T2 output is suppressed below this threshold by application logic, not by T2 itself declining to answer
  - UI: N/A rendering, `screen-sleepwear-enrichment-review.tsx:895`
  - Fetch: none
  - State: `isBelowThreshold = confidence < 60`
  - Persist: none
- Given the same row, when I look for a confidence bar, then none renders — it's
  hidden entirely below this threshold, not shown as a near-empty bar.
  - UI: conditional bar rendering
  - Fetch: none
  - State: same `isBelowThreshold` check
  - Persist: none
- Given the same row, when I look at the available actions, then only "Edit" (styled
  as the primary affordance) and "Reject" are offered — "Confirm" does not render at
  all for this row.
  - UI: action set, `screen-sleepwear-enrichment-review.tsx:1022-1060`
  - Fetch: none
  - State: same `isBelowThreshold` gate
  - Persist: none
- Given "Confirm All (N)" is clicked on this row's attribute, when the bulk confirm
  runs, then this specific row is skipped — it stays pending and must be resolved via
  Edit or Reject individually before the attribute can read "Confirmed".
  - UI: bulk-confirm skip, `screen-sleepwear-enrichment-review.tsx:228-242`
  - Fetch: none
  - State: `confirmAllProducts` excludes rows below 60%
  - Persist: none

**Anti-criteria**
- Given a sub-60% row, when "Confirm All" runs on its attribute, then that row must
  NOT be marked confirmed as a side effect — it requires an explicit Edit or Reject
  from the supplier.

---

### P2-031

**Screen / Flow:** AI Enrichment Review (sleepwear)
**Story ID:** P2-031

**User story**
As a Supplier data manager, I want to complete an enrichment run whether or not
everything has been reviewed, and be clearly told what will and won't be saved, so
that I can stop when I've done enough for now without losing what I've already
decided.

**Acceptance criteria**

- Given at least one row is confirmed or batch-selected, when I click "Complete
  Enrichment" in the sticky footer, then a confirmation modal opens showing "{m} of
  {p} products enriched" and "{x} of {n} attributes reviewed."
  - UI: sticky footer CTA + modal, `screen-sleepwear-enrichment-review.tsx:1143-1253`
  - Fetch: none
  - State: `canComplete` gate — requires ≥1 confirmed/batch-selected row
  - Persist: none until the modal is confirmed
- Given zero rows are confirmed or batch-selected, when I look at "Complete
  Enrichment", then it's disabled.
  - UI: `disabled` gate, `canComplete`
  - Fetch: none
  - State: same gate
  - Persist: none
- Given the modal is open and something is still pending, when I read it, then I see
  the caveat "Unreviewed attributes will not be saved. You can return to enrich more
  later." plus a list of low-confidence items with a "Go back and review" link.
  - UI: incomplete-state modal content, `screen-sleepwear-enrichment-review.tsx:1174-1253`
  - Fetch: none
  - State: derived from remaining pending rows
  - Persist: none
- Given I click "Complete Enrichment" inside the modal, when it processes, then every
  `batch-selected` row is promoted to `confirmed`, a `ProductEnrichmentResult` is built
  per product via `buildEnrichmentResults`, and I land on the Completed view.
  - AI: no further T1/T2/T3 calls happen here — this step only writes what was already decided
  - UI: modal confirm action → completed view, `screen-sleepwear-enrichment-review.tsx:348-373,425-594`
  - Fetch: none
  - State: `enrichedAttributes` merged via `mergeEnrichmentResults`; `enrichmentUpdates`/`enrichedProductsByCode`/`productEnrichmentUpdates` updated in `app/page.tsx:278-328`
  - Persist: none — session only; this is the "save" the prototype has

**Anti-criteria**
- Given the modal shows pending items and their caveat, when I click "Go Back" instead
  of "Complete Enrichment", then nothing must be written — I return to the review view
  with every row exactly as it was before I opened the modal.

---

### P2-032

**Screen / Flow:** AI Enrichment Review (sleepwear)
**Story ID:** P2-032

**User story**
As a Supplier data manager, I want to come back to a completed enrichment run and
finish reviewing whatever's still pending, so that I can spread a large enrichment
job across more than one sitting.

**Acceptance criteria**

- Given I completed a run with some rows still pending, when I land on the Completed
  view, then an amber banner reads "{n} suggestions are still pending across {m}
  attributes. Continue enrichment to action them."
  - UI: pending banner, `screen-sleepwear-enrichment-review.tsx:457-467`
  - Fetch: none
  - State: derived from rows that remain `pending`/`rejected`
  - Persist: none
- Given that Completed view, when I click "Continue Enrichment", then I return to the
  review view with all my previous confirm/edit/reject decisions intact — nothing I
  already decided is reset.
  - UI: continue action, `screen-sleepwear-enrichment-review.tsx:574-591`
  - Fetch: none
  - State: `isCompleted = false`; `productStates` unchanged
  - Persist: none — still session only
- Given I resolve more rows and click "Complete Enrichment" again, when the result
  merges, then it's combined with the prior run via `mergeEnrichmentResults` — later
  confirmations win per attribute, and attributes only set in the earlier pass survive
  untouched.
  - UI: same completion flow, second pass
  - Fetch: none
  - State: `lib/enrichment-results.ts:181-208`
  - Persist: none

**Anti-criteria**
- Given a second enrichment pass over the same product, when it merges with the first,
  then an attribute confirmed in the first pass and never touched in the second must
  NOT be lost — merge is additive per attribute, not a wholesale overwrite.

---

### P2-033

**Screen / Flow:** AI Enrichment Review (sleepwear)
**Story ID:** P2-033

**User story**
As a Supplier data manager, I want to jump from the completion summary straight into
what was written for a specific product, so that I can double-check the outcome
without navigating back through the product list.

**Acceptance criteria**

- Given the Completed view for a scoped run, when I look at "See what was written per
  product", then I see one row per scoped product with a "View enrichment" button —
  rendered only when the run was scoped to real products.
  - UI: per-product list, `screen-sleepwear-enrichment-review.tsx:491-516`
  - Fetch: none
  - State: reads `scopeProducts`
  - Persist: none
- Given I click "View enrichment" for one of those products, when the app navigates,
  then I land on Enrichment Detail for exactly that product.
  - UI: navigation, `app/page.tsx:540-543`
  - Fetch: none
  - State: `openEnrichmentDetail` resolves the product id
  - Persist: none

**Anti-criteria**
- Given a whole-code (not product-scoped) run, when I view its Completed screen, then
  the "See what was written per product" list must NOT render — it requires
  `scopeProducts`, which only exists for scoped runs.

---

## 10. Enrichment Detail

### P2-034

**Screen / Flow:** Enrichment Detail
**Story ID:** P2-034

**User story**
As a Supplier data manager, I want to see exactly what values a product now carries,
where each came from, and how confident AI was, so that I can trust what's on the
product without re-deriving it myself.

**Acceptance criteria**

- Given I open Enrichment Detail for a product with confirmed values, when the
  Enriched table renders, then each row shows the Attribute, Value, GS1 Code (mono, or
  italic "free text" when the attribute has no code list), Source, and Confidence %.
  - UI: enriched table, `screen-product-enrichment-detail.tsx:178-227`
  - Fetch: none — already loaded
  - State: reads `result.values` from `enrichedAttributes[productKey]`
  - Persist: none
- Given a value I confirmed without editing, when I look at its Source badge, then it
  reads green "AI confirmed" with a sparkle icon.
  - UI: source badge, `screen-product-enrichment-detail.tsx:207-219`
  - Fetch: none
  - State: `source === "ai-confirmed"`
  - Persist: none
- Given a value I edited before confirming, when I look at its Source badge, then it
  reads blue "You edited" with a pencil icon.
  - UI: source badge, edited variant
  - Fetch: none
  - State: `source === "user-edited"`
  - Persist: none
- Given the header block, when I look at the large count in the top right, then it
  reads `{values.length}/{totalAttributes}` — and this figure is exactly what the
  originating Product List row showed for this product's Attributes column, since both
  are computed by the same shared helper.
  - UI: header count, `screen-product-enrichment-detail.tsx:152-159`
  - Fetch: none
  - State: `summarizeEnrichment`, `lib/enrichment-results.ts:166-178`
  - Persist: none
- Given a product that has never been through a run, when I open its Enrichment
  Detail, then I see a blue info banner: "This product hasn't been through an
  enrichment run yet, so nothing has been written. Everything its category asks for is
  listed below as not enriched."
  - UI: empty-run banner, `screen-product-enrichment-detail.tsx:163-175`
  - Fetch: none
  - State: `!result`
  - Persist: none

**Anti-criteria**
- Given the count shown here and the count shown on the Product List row I clicked
  through from, when I compare them, then they must NOT differ — this is the explicit
  contract behind `unenrichedAttributesFor`/`summarizeEnrichment` existing as shared
  helpers rather than being recomputed independently per screen.

---

### P2-035

**Screen / Flow:** Enrichment Detail
**Story ID:** P2-035

**User story**
As a Supplier data manager, I want to see every attribute that's still missing a
value, with the specific reason it's missing, so that I know whether I need to act on
it or it was a deliberate rejection.

**Acceptance criteria**

- Given an attribute AI never proposed anything for, when I look at the Not Enriched
  table, then its reason reads grey "AI had no suggestion", with "AI had proposed"
  shown as an em dash.
  - UI: reason badge, `screen-product-enrichment-detail.tsx:24-40,313-341`
  - Fetch: none
  - State: `reason === "no-suggestion"`
  - Persist: none
- Given an attribute I explicitly rejected during review, when I look at its row, then
  the reason reads amber "You rejected AI's suggestion", with "AI had proposed" showing
  the rejected value struck through plus its confidence %.
  - UI: reason badge, rejected variant
  - Fetch: none
  - State: `reason === "rejected"`
  - Persist: none
- Given an attribute AI suggested a value for but I never confirmed, edited, or
  rejected, when I look at its row, then the reason reads amber "Left pending", with
  the same struck-through AI value and confidence.
  - UI: reason badge, pending variant
  - Fetch: none
  - State: `reason === "pending"`
  - Persist: none
- Given a product with every category attribute filled, when I look at the Not
  Enriched section, then it reads "Every attribute this category asks for has a
  value." with zero rows.
  - UI: empty state, `screen-product-enrichment-detail.tsx:249-252`
  - Fetch: none
  - State: `unenriched.length === 0`
  - Persist: none

**Anti-criteria**
- Given an attribute rejected during review, when I look at its Not Enriched reason,
  then it must NOT be collapsed into the same generic "missing" label as an attribute
  AI never suggested anything for — the three reasons are deliberately distinct so a
  supplier's own rejection reads differently from an AI gap.

---

### P2-036

**Screen / Flow:** Enrichment Detail
**Story ID:** P2-036

**User story**
As a Supplier data manager, I want to fill in a value for an attribute AI never
proposed anything for, directly from the read-back screen, so that I can close a gap
without going back through the full review flow.

**Acceptance criteria**

- Given at least one unenriched attribute, when I click "Add missing attributes", then
  an inline form opens with one `AttributeValueCombobox` per unenriched attribute,
  each labeled with its reason.
  - UI: add-missing form, `screen-product-enrichment-detail.tsx:253-301`
  - Fetch: none
  - State: opens local `draft` state
  - Persist: none until saved
- Given I type values into one or more of those fields and click "Save {n} values",
  then only the fields I actually filled are saved — empty fields are dropped, not
  saved as blank.
  - UI: save action, `screen-product-enrichment-detail.tsx:92-107`
  - Fetch: none
  - State: `handleSaveForm` filters to non-empty entries
  - Persist: none — session only, via `onAddValues` → `mergeEnrichmentResults`
- Given a saved value, when I check its Source and Confidence afterward, then it shows
  `source: "user-edited"` and `confidence: 100` — manually entered values are never
  attributed to AI.
  - UI: saved-value attribution, `screen-product-enrichment-detail.tsx:92-107`
  - Fetch: none
  - State: fixed values on manual save
  - Persist: none
- Given I click "Cancel" instead of saving, when the form closes, then nothing I typed
  is retained — the draft is discarded.
  - UI: cancel action, `screen-product-enrichment-detail.tsx:293-299`
  - Fetch: none
  - State: `draft` reset to empty
  - Persist: none

**Anti-criteria**
- Given I save a value for a previously "AI had no suggestion" attribute, when I
  return to this screen, then it must move from the Not Enriched table into the
  Enriched table — it cannot remain listed as unenriched after being saved.

---

## 11. Cross-cutting: resumable, scoped enrichment

### P2-037

**Screen / Flow:** Cross-cutting (Selection Code List → Category Coverage /
Product List)
**Story ID:** P2-037

**User story**
As a Supplier data manager, I want the app to correctly track whether I entered
enrichment via the whole-code path or the drill-down path, so that step counts and
back navigation match what I actually did.

**Acceptance criteria**

- Given I enter enrichment for 002 via "Enrich Selection Code with AI" on the
  Selection Code List (whole-code path), when I check the step indicator on Category
  Coverage, then it reads "Step 1 of 3" (since 002 already has coverage >0),
  continuing to "Step 2 of 3" on Brick Confirmation and "Step 3 of 3" on the review
  screen.
  - UI: step chip, `app/page.tsx:352-370`
  - Fetch: none
  - State: `hasCoverageStep` true for 002
  - Persist: none
- Given I instead enter enrichment via the Product List drill-down for a specific
  product selection (scoped path), when I check the step indicator, then it reads
  "Step 1 of 2" on Product Category Assignment and "Step 2 of 2" on the review screen
  — no coverage step, because the scoped path skips Category Coverage entirely.
  - UI: step chip, scoped variant
  - Fetch: none
  - State: `enrichmentProductScope` set, different `stepLabelFor` branch
  - Persist: none
- Given the whole-code path, when I click Back from Brick Confirmation, then I return
  to Category Coverage (or the Selection Code List, depending on entry); given the
  scoped path, when I click Back from Product Category Assignment, then I return to
  the Product List — the two paths never share a back target at the same step.
  - UI: per-screen back handlers, `app/page.tsx:460,613-618,669`
  - Fetch: none
  - State: branches on `enrichmentProductScope` presence
  - Persist: none

**Anti-criteria**
- Given I took the scoped (drill-down) path, when I reach the review screen, then it
  must NOT show a step chip claiming "Step 3 of 3" — that numbering belongs only to
  the whole-code path that actually has a coverage step.

---

### P2-038

**Screen / Flow:** Cross-cutting (any repeated pass over the same code)
**Story ID:** P2-038

**User story**
As a Supplier data manager, I want a second enrichment pass over a code to add to its
existing coverage rather than reset it, so that resuming work never costs me progress
I already made.

**Acceptance criteria**

- Given Selection Code 002 currently at 38/52 categories assigned, when I run a scoped
  category-assignment pass over 3 more products and save, then the code's coverage
  becomes 41/52 — the 38 already there are untouched, and the 3 new ones are added.
  - UI: updated badge on Selection Code List, `screen-selection-code-list.tsx:397-411`
  - Fetch: none
  - State: `addCoverage(code, 3)`, `app/page.tsx:177-193` — increments, does not overwrite
  - Persist: none — session only
- Given a code already at its full product count for coverage, when any further
  `addCoverage` call would push it past that count, then it's clamped at the code's
  total — coverage can never exceed the number of products the code has.
  - UI: same badge, clamped value
  - Fetch: none
  - State: `Math.min(meta.products, currentAssigned + newlyAssigned)`
  - Persist: none
- Given I run a whole-code category confirmation instead (not scoped), when it
  completes, then `setFullCoverage` is used instead of `addCoverage` — the code's
  `categoriesAssigned` is set directly to its full product count, since a whole-code
  confirmation implies everything was addressed at once.
  - UI: same badge, full-coverage path
  - Fetch: none
  - State: `setFullCoverage`, `app/page.tsx:196-211`
  - Persist: none

**Anti-criteria**
- Given a scoped pass adds 3 products to 002's coverage, when I check the result, then
  the code's coverage must NOT reset to just those 3 — `addCoverage` is additive by
  contract, never a replacement, which is precisely why it's a separate function from
  `setFullCoverage`.

---

### P2-039

**Screen / Flow:** Cross-cutting (status ladder)
**Story ID:** P2-039

**User story**
As a Supplier data manager, I want a code's status to only reach "AI Enriched" once
every one of its products has actually been enriched, so that the status badge never
overstates how much work is really done.

**Acceptance criteria**

- Given Selection Code 002 at "In Progress" with some products enriched and some not,
  when I enrich the remaining products across however many scoped passes it takes,
  then the code's status stays "In Progress" until `enrichedProductsByCode["002"]`
  covers every one of its 52 products.
  - UI: status badge, `screen-selection-code-list.tsx:421-445`
  - Fetch: none
  - State: `app/page.tsx:312-320` — `coversWholeCode = enrichedCount >= meta.products`
  - Persist: none
- Given the last unenriched product in 002 is finally enriched, when that scoped run
  completes, then the code's status flips to "AI Enriched" for the first time.
  - UI: status transition
  - Fetch: none
  - State: `coversWholeCode` becomes true
  - Persist: none
- Given a code already at "AI Enriched" or "In Progress", when any category-assignment
  work happens on it afterward, then its status must NOT move backward to "Categories
  Assigned – Not Enriched" — `statusAfterCategoryAssignment` explicitly refuses to
  downgrade either of those two states.
  - UI: status preserved, `app/page.tsx:64-65`
  - Fetch: none
  - State: forward-only status rule
  - Persist: none

**Anti-criteria**
- Given a code has 40 of 52 products enriched, when I check its status, then it must
  NOT read "AI Enriched" — that badge is reserved for the case where every product,
  not most, has been through a run.

---

### P2-040

**Screen / Flow:** Cross-cutting (session lifecycle)
**Story ID:** P2-040

**User story**
As a Supplier data manager, I want to leave an enrichment run partway through and come
back to a state that reflects exactly what I'd already confirmed, so that I can work
in short sessions without fear of losing or duplicating decisions.

**Acceptance criteria**

- Given I'm mid-review with some rows confirmed and some still pending, when I
  navigate away via Back (not Complete Enrichment), then nothing is written to
  `enrichedAttributes` — my in-progress confirm/edit/reject decisions on this visit are
  discarded, since they only get written at Complete Enrichment.
  - UI: back navigation, no completion side effects
  - Fetch: none
  - State: `productStates` for this mount is local and unmounts with the screen
  - Persist: none — nothing was staged for this attempt
- Given I *did* click Complete Enrichment on a prior pass before leaving, when I
  return to this same product's Product List row or Enrichment Detail later in the
  same session, then it reflects exactly what that completed pass wrote — no more, no
  less.
  - UI: Product List / Enrichment Detail reads, both screens
  - Fetch: none
  - State: `enrichedAttributes[productKey]` persists in `app/page.tsx` state across screen navigation within the session
  - Persist: none — this survives in-session navigation only, not a page reload
- Given I reload the browser tab at any point, when the app re-mounts, then every
  screen returns to its initial state — Selection Code List with the three
  hardcoded mock rows, zero enrichment history, zero coverage overrides. This is the
  entire prototype's architecture (no backend, no `fetch`, no `localStorage`), not a
  defect in this flow specifically.
  - UI: full reset on remount
  - Fetch: none — there was never anything to fetch
  - State: all `useState` hooks re-initialize to their defaults, `app/page.tsx:68-109`
  - Persist: none — by design, this prototype has none

**Anti-criteria**
- Given I abandon a review mid-session without completing it, when I check that
  product's coverage elsewhere in the same session, then it must NOT show as enriched
  — an abandoned, uncompleted pass leaves no trace, by design.

---

## Session lifecycle coverage summary

Addressed directly: P2-031/P2-032 (complete with pending items, resume a completed
run), P2-038 (multi-pass coverage accumulation), P2-040 (mid-review abandonment and
same-session return, plus the explicit no-persistence-across-reload boundary). No
story in this set requires reload survival, since the prototype has no persistence
layer to survive with — this is stated once here rather than repeated as a caveat on
every story.

## Reader test

Five questions a developer or QA engineer would reasonably ask, reading this story set
cold — answered strictly from the story text, no outside context.

> **Q1: What exactly does "scoped" enrichment mean, and how is it different from a
> whole-code run?**
> A: P2-009's AC3 defines it: selecting products on the Product List (or a single
> product's per-row Enrich, or the GTIN List's Enrich button) calls
> `startProductScopedEnrichment` for exactly those products. P2-037 spells out the
> observable difference — different step-chip counts and different back targets —
> versus the whole-code path entered from the Selection Code List's bulk action.
> Gap: none.

> **Q2: When a supplier clicks a 90% batch-confirm threshold, is that the same as
> clicking Confirm on every one of those rows?**
> A: No — P2-028 states explicitly that `batch-selected` is "a distinct state from
> `confirmed`," reversible via Clear Selection, and its anti-criterion states nothing
> is written to Enrichment Detail until Complete Enrichment runs. P2-031's AC4
> describes the promotion step. Gap: none.

> **Q3: What happens to a supplier's confirm/reject decisions if they navigate away
> without clicking Complete Enrichment?**
> A: P2-040's first AC states directly: nothing is written, the in-progress state is
> local to that mount and is discarded on navigation away via Back. Gap: none.

> **Q4: Can a supplier ever change an AI-suggested category once it's been proposed
> (not just accept or leave it)?**
> A: P2-014's anti-criterion states this directly: no, not on Product Category
> Assignment — the picker exists in code but isn't wired to a trigger for
> AI-suggested cards, contradicting the on-screen copy. Individual Assignment
> (P2-016/017) is the only screen where a category can be freely chosen or changed.
> Gap: none, but worth flagging that this reads as a real product decision to confirm,
> not just a build note — done via the anti-criterion + link to
> `PHASE_2_GAP_ANALYSIS.md` E1.

> **Q5: How does a developer know which attribute confidence threshold governs which
> UI behavior — there seem to be several numbers (60, 70, 80, 90, 95)?**
> A: Each threshold is scoped to what it gates in the story it appears in: 60% gates
> whether Confirm is even offered (P2-030); the Low Confidence filter and the
> attribute-average badge condition both use 90% (P2-025, P2-029); 70% is the
> confident/uncertain bucket boundary during category suggestion (P2-013,
> P2-018/P2-019) and separately the Confirm-All-Categories bulk qualifier (P2-019);
> 95/90/80 are the three batch-confirm buttons on the review screen (P2-028). No two
> stories use a number for a different purpose than its screen actually implements.
> Gap: none, but a developer reading fast could still conflate the 70% brick-suggestion
> threshold with the 90% attribute-review threshold since both render as amber bars —
> worth a one-line callout.

**Fix applied for Q5's residual gap:** the clarifying paragraph now sits directly under
the AI task vocabulary section at the top of this document, so a developer hits it
before reading any story rather than after.

**Reader test passed — all five questions answerable from the story text.**

---

Stories are ready for refinement. Flag any that need splitting, descoping, or
additional criteria before engineering picks them up.
