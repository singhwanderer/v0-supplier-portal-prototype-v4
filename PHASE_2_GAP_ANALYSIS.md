# Phase 2 Gap Analysis — Selection Code 002 Onward

This document reviews the draft `PHASE_2_REQUIREMENTS.md` against what is actually
built and answers one question: **does the requirements doc still describe the code?**
As with the other root-level summary docs, this is a snapshot — **the code is the
source of truth for current behavior**, this doc just records where the two currently
disagree and what to do about it.

## Why this exists

`PHASE_2_REQUIREMENTS.md` was written at commit `7afb1d3` ("Document Phase 2
requirements and user flow for Selection Code 002 onward"). Six commits have landed on
`main` since, adding a capability the doc never mentions — a per-product enrichment
write-back model, a screen that reads it back, an add-missing-attributes form, and a
12-month enrichment eligibility gate. The doc's own traceability table lists 9 screens;
`app/page.tsx` currently routes 17. This gap analysis is what closes that distance
before `PHASE_2_USER_STORIES.md` is written against it.

## How this was produced

Read directly from the prototype: `app/page.tsx` (the state machine), every screen
component the Phase 2 flow touches, the `lib/` data layer, and the four historical
root-level implementation-summary docs. Cross-referenced against Notion's canonical
**Product Context** page and the **AI Attribute Enrichment** roadmap item (26.4, In
Build — GS1 Essential Attributes only, confirm-not-autofill, never framed as
retailer-specific). No application code was read from memory or assumed from a prior
description — every finding below cites a file and line.

---

## Category A — capability shipped in code, absent from the doc

The requirements doc undersells what Phase 2 actually does. These are real,
working features that a story set must cover and a stakeholder demo can rely on —
they are simply not written down anywhere yet.

| # | Gap | Evidence | Recommendation |
|---|---|---|---|
| A1 | **Enrichment write-back model.** A shared shape (`ProductEnrichmentResult`) records what a run actually wrote per product — value, GS1 code (when the value came from a code list), `source` (`ai-confirmed` \| `user-edited`), and confidence. Before this, both review screens held decisions in local state and discarded them on unmount; `onComplete` only reported a percentage. | `lib/enrichment-results.ts:1-44` | Add as a New Requirement: "Enrichment results are retained per product for the session, not discarded on screen exit." |
| A2 | **Three distinct reasons an attribute has no value** — `rejected`, `pending`, `no-suggestion` — each with its own copy, deliberately not collapsed into one "missing" bucket. | `lib/enrichment-results.ts:20-33`; `components/screen-product-enrichment-detail.tsx:24-40` | Add as a New Requirement; name the three reasons explicitly so QA can test each. |
| A3 | **Enrichment Detail screen** (`ScreenProductEnrichmentDetail`) is missing from the doc's traceability table entirely, despite being a fully built, routed screen reachable from three places (Product List, GTIN List, the review screen's completion summary). | `components/screen-product-enrichment-detail.tsx`; routed at `app/page.tsx:60` as `product-enrichment-detail` | Add a traceability row. |
| A4 | **Add-missing-attributes form** — on the Enrichment Detail screen, a supplier can manually fill any attribute the AI never proposed a value for. Saved with `source: "user-edited"`, `confidence: 100`. | `screen-product-enrichment-detail.tsx:92-107` | Add as a New Requirement; it is the only way to close a `no-suggestion` gap in this flow. |
| A5 | **GS1 code-list combobox** (`AttributeValueCombobox`) — shared by both the review screen's inline edit and the add-missing-attributes form. Shows a searchable dropdown when the attribute's GS1 code list has values, always allows free text, and explicitly surfaces "value will be saved as free text" when nothing matches. | `components/attribute-value-combobox.tsx` | Add as a New Requirement — this is the actual mechanism behind "supplier confirms, edits or rejects" for any attribute with a GS1 code list. |
| A6 | **Merge semantics across enrichment passes.** A later confirmation wins per-attribute; an attribute only ever set in an earlier pass survives untouched. This *is* what makes multi-pass enrichment resumable — the doc only says "coverage accumulates," which describes the count, not the underlying data behavior. | `lib/enrichment-results.ts:181-208` | Rewrite the "Scoped, resumable enrichment" requirement to describe merge-by-attribute, not just coverage counting. |
| A7 | **12-month enrichment eligibility rule.** Records with a create date older than exactly one year cannot be selected or enriched. A date picker on Product List and GTIN List lets the supplier move the cutoff, but only back to one year — never further. | `lib/date-utils.ts:11-23`; `screen-product-list.tsx:228-231`; `screen-gtin-list.tsx:83-88` | Add as a New Requirement. This is not cosmetic — see Category E6 for its effect on today's demo data. |
| A8 | **Per-product enrichment status and attribute coverage** (`n/m` attributes filled) on the Product List, independent of the code-level status the doc describes. | `screen-product-list.tsx:158-176,336-349` | Add as a New Requirement — the doc's "coverage-aware entry point" bullet only describes the Selection Code list, not this row-level view. |
| A9 | **Phase annotation layer** (`PhaseTag` / `PhaseBanner`) — deliberately off-design-system orange markers (`#ea580c`) that mark exactly which surfaces PM has flagged as Phase 2, distinct from anything else on screen. This layer *is* the authoritative scope boundary and the doc never mentions it exists. | `components/phase-tag.tsx:1-16`; used at `screen-product-list.tsx:187`, `screen-selection-code-list.tsx:194,210,305`, `screen-product-category-assignment.tsx:143`, `screen-gtin-list.tsx:103` | Add a "Scope boundary" note pointing at this layer; future Phase 2 work should extend it rather than re-litigate scope in prose. |
| A10 | **Coverage counters are contractually kept in agreement** between the Product List row and Enrichment Detail via one shared helper, so a row reading "7/16" is guaranteed to open on "7/16". | `lib/enrichment-results.ts:139-154` | Note this as the implementation of the "cross-screen data consistency" requirement the doc already states in principle — cite the actual mechanism. |

## Category B — doc claims contradicted by code

These are places where the historical docs (Phase 2 requirements or the three fix
summaries it inherited from) assert something the code does not do. Left uncorrected,
a story set drafted from the doc would encode the wrong behavior.

| # | Claim | Reality | Recommendation |
|---|---|---|---|
| B1 | "Deterministic confidence coverage … without relying on unbounded randomness" (Phase 2 doc, New Requirements) | Only the **badge state** (green / low-average / low-value / no-value) is deterministic — it's driven by fixed `AttributeDef` values per attribute name. The individual row confidence *numbers* shown under an expanded attribute use `Math.random()` and differ between mounts of the same screen. | Narrow the requirement's wording to "badge state is deterministic," not the numbers underneath it. Flag to product: if a stakeholder refreshes mid-demo, the numbers will visibly shift even though the badge won't. |
| B2 | `FIX_PROMPT_3_SUMMARY.md` Fix E documents the Low Confidence filter at `<85%` | Code uses `<90%` in both review screens. | Correct the historical doc's claim is out of scope (retrospective log); note the discrepancy here so nobody re-derives `<85%` from it. |
| B3 | `IMPLEMENTATION_SUMMARY.md` describes a low-confidence tier of "60 ≤ confidence < 70" | The sleepwear low-confidence category cards actually run 45–54; nothing in the sleepwear data lands in the documented 60–70 band. | Same as B2 — flag, don't silently fix the historical doc. |
| B4 | `LOW_CONFIDENCE_THRESHOLD = 70` (`lib/category-suggestion.ts:19`) reads as the governing threshold for per-product category suggestions | The actual suggestion bands are 90–94 (strong keyword match) and 54–58 (weak match) — by construction, nothing ever scores near 70. The constant is real but sits in a gap no suggestion occupies. | Flag to product/eng: either the constant is vestigial or the band generation should be revisited so the threshold is meaningful. |
| B5 | Confidence is treated as one comparable scale across the app | Three incompatible scales coexist: the attribute badge system (0–1, 0.90 cutoff), the per-product category suggestion (0–100, various cutoffs), and `lib/sleepwear-catalog.ts` which mixes both (bricks 0–100, products 0–1) with nothing enforcing correspondence between them. | Flag as a data-model cleanup candidate; out of scope for this story set but worth its own ticket. |
| B6 | — | `ScreenEnrichmentPreview` (Phase 1 tail, not in this story set's scope) derives its status from a 50% GTIN rule that exists nowhere else in the app, and its hardcoded row descriptions (001 = dresses, 002 = tops, 003 = jeans) directly contradict the Phase 2 mapping (001 = Footwear, 002 = Sleepwear, 003 = Jewellery & Watches). | Not storied — out of this doc's scope per the confirmed boundary — but flagged because it is a screen a developer could stumble into and get confused by mid-implementation. |

## Category C — a strategic contradiction worth escalating, not silently resolving

`AGENTIC_ENRICHMENT.md` (the product-strategy memo, not an implementation log) states
a guardrail for any future agentic work: **"Never rank or route on a model's
self-reported confidence — it isn't calibrated to accuracy."**
(`AGENTIC_ENRICHMENT.md:68-75`)

The entire confidence mechanism Phase 2 is built on — the `CONFIDENCE`/`GREEN` maps in
`lib/category-attributes.ts`, every badge state, the 95/90/80 batch-confirm
thresholds, and the Low Confidence Only filter — does exactly what that guardrail
warns against: it ranks and gates supplier-facing decisions on a self-reported
confidence number.

This is not a bug to fix in this pass. It is a real tension between what shipped in
26.4 and where the product strategy says agentic work should go next. It belongs in
this gap analysis as a flagged conflict for product to resolve deliberately, not
something a story set should paper over.

## Category E — interaction-level defects found in the code

These are not documentation gaps — they are places where the running prototype's own
copy promises one thing and the code does another, or where implemented logic is
unreachable. A story set written against actual behavior must describe what these
screens really do today; each is also carried into `PHASE_2_USER_STORIES.md` as an
anti-criterion or an explicit known-limitation note, so engineering doesn't mistake
current behavior for the intended spec.

| # | Defect | Evidence | Note |
|---|---|---|---|
| E1 | **No override control on AI-suggested category cards.** The screen's own sub-copy says "Change any suggestion," but the picker dropdown JSX inside the confirmed/unconfirmed card is unreferenced dead code (`onOpenPicker` is destructured and never called). Only the red "could not classify" card has a working picker. | `screen-product-category-assignment.tsx:329,416` | Once a product gets an AI-suggested category in this flow, a supplier can confirm it or leave it — not change it to something else — despite the on-screen promise. |
| E2 | **No "accept all confident" bulk action** on Product Category Assignment, despite the state and handlers (`pendingConfident`, `acceptAllConfident`, `undoBatch`) being fully implemented and simply never rendered. | `screen-product-category-assignment.tsx:88,106-123,284-285` | Every confident suggestion must be confirmed one card at a time. |
| E3 | **"Enrich This Category" navigates immediately** on the sleepwear brick confirmation screen, so the button's toggle/"Unselect" state is unreachable dead code. | `screen-sleepwear-brick-confirmation.tsx:139-146` | Cosmetic only — the click still does the right thing, it just never shows the alternate state. |
| E4 | **Individual Assignment shows the wrong mock catalog when reached from the 002 flow.** Footwear and jewellery sample products render under a sleepwear-only category picker; `SLEEPWEAR_UNCLASSIFIED_PRODUCTS` exists in `lib/sleepwear-catalog.ts` but is never wired into this path. | `app/page.tsx:627,686`; `lib/sleepwear-catalog.ts:212-217` | A live demo bug — the product names on screen won't be sleepwear even though every category choice offered is. |
| E5 | **Shell title-bar gap.** `product-category-assignment` and `individual-assignment` are unmapped in `shellScreen`, so both silently render the "AI Attribute Enrichment" chrome that belongs to the `submission` screen. | `app/page.tsx:137-154` | Minor, but worth a ticket — the title bar doesn't match either screen's actual content. |
| E6 | **The enrichment eligibility gate (A7) blocks most of today's 002 demo data.** The cutoff is exactly one year before "now." Nine of the twelve mocked 002 products carry `createDate 04/07/2021` and are therefore permanently ineligible; the GTIN List's primary "Enrich Attributes with AI" button is **disabled by default** for the flagship demo product, S22011. The date picker can only relax the cutoff back to one year — never further — so there is no in-app way to make these nine eligible again. | `lib/date-utils.ts:11-23`; `screen-product-list.tsx:98-106`; `screen-gtin-list.tsx:83-88` | **Demo risk, not just a doc gap.** Worth flagging to product before the next stakeholder walkthrough — only 3 of 12 mocked 002 products (S22041, S22044, S22047, all dated 05/28/2026) are currently enrichable. |
| E7 | **Batch selection is an intention, not a write.** Clicking a 95/90/80 threshold marks matching rows `batch-selected`; nothing is actually written until "Complete Enrichment" promotes those rows to `confirmed`. | `screen-sleepwear-enrichment-review.tsx:228-274,348-373` | Must be modeled as a distinct state in any story about batch confirm, not treated as equivalent to Confirm. |
| E8 | **"Confirm All" silently skips sub-60% rows.** Those rows stay pending and require an explicit Edit or Reject; an attribute's badge cannot read "Confirmed" until every one of its below-threshold rows is individually resolved. | `screen-sleepwear-enrichment-review.tsx:228-242,895` | Not a bug — matches the intended "N/A, Confirm hidden" treatment for sub-60% rows — but easy to miss when writing the "Confirm All" story. |
| E9 | **Two structurally different paths into the same code's enrichment.** Bulk "Enrich Selection Code with AI" from the Selection Code List routes through Category Coverage as a whole-code run (`setFullCoverage`); the drill-down's scoped enrichment routes through Product List (`addCoverage`). Same underlying code, different step-chip counts, different back targets, different coverage arithmetic. | `app/page.tsx:423-446,605-609` | Both are legitimate, intentional flows — but a story set must cover them as two distinct entry stories, not one, or an engineer will build only the more obvious path. |

## Category D — open questions, deliberately not turned into stories

Per an explicit scoping decision made with product before drafting stories: these are
real requirements implied by the broader TGC product context, but the prototype has
**no** screen, state, or mock data covering them. Writing stories against them would
mean inventing screens the skill's own rules forbid ("No invented screens"). They are
listed here as open questions for product/engineering to scope separately — not
folded into `PHASE_2_USER_STORIES.md`.

1. **Per-GTIN-per-session fee trigger.** TGC's commercial model is priced per GTIN per
   trading-partner session, firing on INSERT/UPDATE (not DELETE). Nothing in Phase 2
   specifies when an enrichment write becomes a billable event, or whether a
   multi-pass scoped enrichment against the same product charges once or per pass.
   Commercially blocking before this ships beyond prototype.
2. **Access levels.** TGC's three access levels (Unrestricted / Selection Code /
   Product Code) govern data visibility. The Phase 2 drill-down exposes product- and
   GTIN-level detail with no stated interaction with access level.
3. **AI failure and timeout.** `suggestCategory()` already returns `null` on no
   keyword match (handled — falls to the unclassified/manual path), but there is no
   path anywhere in Phase 2 for the classifier erroring, timing out, or the enrichment
   run itself failing partway through.
4. **Audit trail.** `source` (`ai-confirmed` vs `user-edited`) is recorded per value,
   but nothing records *who* confirmed a value or *when*, beyond the run-level
   `completedAt` timestamp.
5. **Concurrency.** Two suppliers (or two sessions) working the same selection code at
   once is undefined — state is local React state with no server, so this is a
   prototype limitation, not just a doc gap, but it will need an answer before
   production.
6. **Scale.** A typical TGC supplier carries ~5,000 GTINs across ~20 trading partners.
   Product List renders every row with no pagination or search — untested at anything
   beyond the 12–52 row mock datasets.
7. **GS1 Essential Attributes boundary.** The 26.4 roadmap scope is explicitly GS1
   Essential Attributes only. `BRICK_ATTRIBUTE_NAMES` in `lib/category-attributes.ts`
   is a hand-authored mapping with no flag distinguishing an Essential attribute from
   any other GS1 attribute — nothing enforces the boundary the roadmap item states.

---

## Net effect on `PHASE_2_USER_STORIES.md`

- Category A findings become new stories or new acceptance criteria on existing ones —
  the write-back model and Enrichment Detail screen are a first-class part of the flow,
  not an afterthought.
- Category B findings correct the language stories use (e.g., "badge state is
  deterministic," not "confidence is deterministic"; `<90%` not `<85%`).
- Category C is noted in the story set's scope-boundary section as a flagged product
  tension, not resolved by a story.
- Category E findings surface as anti-criteria or explicit "known limitation" notes on
  the affected stories, so a reader can't mistake today's dead-code gaps for the
  intended design.
- Category D stays here, as open questions, per the scoping decision — not turned into
  stories against screens that don't exist.
