# Phase 2 User Stories — Selection Code 002 Onward

Story set for the coverage-aware, product-level, resumable enrichment flow prototyped
for Selection Code **002 (Sleepwear)**. Written against the running prototype, not the
original `PHASE_2_REQUIREMENTS.md` draft — see `PHASE_2_GAP_ANALYSIS.md` for the full
review of where that draft had drifted from what's actually built.

These stories describe **user-facing behavior only**. Anyone building the real,
production version of this feature will not have this prototype's source open next to
them, so nothing here points at a file, a component, or a line of code — every
acceptance criterion is written the way a supplier or a QA engineer would observe it,
from the screen.

## Scope

**In scope** — the full coverage-aware flow: Selection Code List → Category Coverage →
Product List → GTIN List → Product Category Assignment → Individual Assignment → Brick
Confirmation → Brick GTIN List → AI Enrichment Review → Enrichment Detail.

**Out of scope**, not covered by any story below: the original text-file upload tail,
the older whole-code footwear flow that Selection Code 001 still uses, the manual
category-fallback screen for a failed upload classification, and two other legacy
submission screens. These are real, reachable parts of the app — they simply predate
this feature and aren't part of it.

**Not storied at all**, per an explicit scoping decision: the commercial/fee model,
access-level enforcement, AI failure/timeout handling, audit trail, and concurrency or
scale beyond what a demo needs. The prototype has no screen or behavior covering any of
these — writing stories against them would mean inventing screens that don't exist. They
are recorded as open questions in `PHASE_2_GAP_ANALYSIS.md` for product/engineering to
scope separately.

**Flagged, not resolved:** the confidence-driven badge and threshold system this whole
flow runs on is in tension with this product's own stated guardrail against ranking on
self-reported model confidence (see `AGENTIC_ENRICHMENT.md`). The stories below describe
what the badges and thresholds *do*, as built; they take no position on whether that
mechanism should change.

**Nothing here persists.** This prototype has no backend and no saved state outside the
current browser session — reloading the page resets everything to its starting point.
Every acceptance criterion below describes what happens while navigating around within
one session; none of them describe what survives a page reload, because nothing does.
This is stated once here rather than repeated on every story.

### Built vs. intended

Most criteria below describe behavior the prototype already has, so they can be verified
by clicking through it. Some describe behavior the product *should* have that the
prototype does not implement — these are marked **[intended — not in the prototype]** on
the criterion or criteria group they apply to.

The distinction matters because it changes what the criterion is for: an unmarked
criterion can be checked against the running demo, while a marked one is a build
instruction with nothing to check it against yet. Anything marked is a genuine product
requirement, not a nice-to-have — it is marked only to stop a reader from assuming the
demo already demonstrates it.

Three areas carry these markings: the review screen's handling of unclassified products
(P2-002, P2-009), classification as an attribute in its own right (P2-003, P2-004,
P2-011, P2-013), and GTIN-level attribute storage (P2-004, P2-015).

### How AI shows up in this flow

Three distinct AI behaviors run through these stories:

- **Category suggestion** — given a product's description, AI proposes a GS1 product
  category (a "brick"), a confidence score, and a short reason. If nothing matches well
  enough, it proposes nothing at all rather than guessing.
- **Attribute value suggestion** — for one attribute on one product (e.g. "Fiber
  Content" on a pajama top), AI proposes a value and a confidence score.
- **Reasoning** — a short, plain-language justification shown alongside a suggestion,
  e.g. *"cotton" found in description* or *Requires fiber content from the supplier*.

### Classification is attribute #1

A product's **classification** — its GS1 category — is not a separate precondition
sitting outside the attribute model. It is itself an attribute, and the first one. Two
consequences run through the stories below:

- **A product missing its classification is not enriched**, however many other attribute
  values it happens to carry. It can have attributes; it cannot be complete without this
  one.
- **A missing classification blocks AI from generating the rest.** Which attributes a
  product even requires is determined by its category, so until classification is
  settled, AI has nothing to suggest values against. This is why classification is
  sequenced first rather than merely listed first.

This reframes the categorized/uncategorized split that runs through the flow. The
difference between a code's 38 categorized and 14 uncategorized products is **where each
product is in the sequence**, not whether it is eligible to be worked on. Both halves are
in scope for enrichment; the uncategorized half simply has attribute #1 outstanding.

**[intended — not in the prototype]** The prototype has no notion of classification as an
attribute. Products are category-or-nothing, and a product without a category is treated
as having no attribute story at all.

Everything AI proposes is shown as a suggestion, never written to the product, until the
supplier takes an explicit confirming action. Category suggestions and attribute-value
suggestions are scored on **different scales with different thresholds** — a confidence
badge on a category card and a confidence badge on an attribute row are governed by
different cutoffs even when both render as the same amber color. Don't assume a
70%-badge on one screen means the same thing as a 70%-badge on another.

### Persona

Every story below uses **Supplier data manager** — manages product data on behalf of a
supplier, uploads GTINs, fills in attributes, responds to errors. This flow is
UI-driven category and attribute work, which is what distinguishes this persona from a
manual (file-upload) or integrated (system-to-system) supplier elsewhere in the product.

### How this set is organized

15 stories, one per screen (two for the largest screen, which has enough independent
behavior to warrant a split), plus four cross-cutting stories describing behavior that
spans the whole flow rather than living on one screen. Each story bundles everything a
supplier can *do* on that screen into grouped acceptance criteria, rather than splitting
every individual button into its own story — the goal is a set a developer or QA
engineer can hold in their head as "what this screen does," not an atomized checklist.

---

## Screen inventory

| # | Screen | Role |
|---|---|---|
| 1 | Selection Code List | Entry point — every selection code's coverage and status |
| 2 | Category Coverage | Categorized vs. uncategorized split for one code |
| 3 | Product List | Product-level detail, eligibility, and scope selection |
| 4 | GTIN List | GTIN-level detail within one product |
| 5 | Product Category Assignment | AI proposes categories for uncategorized products |
| 6 | Individual Assignment | Manual category assignment, bulk or one at a time |
| 7 | Brick Confirmation | Confirm AI's proposed category groupings |
| 8 | Brick GTIN List | Products behind one confirmed category |
| 9 | AI Enrichment Review | Attribute-by-attribute review — reviewing suggestions |
| 10 | AI Enrichment Review | Attribute-by-attribute review — completing and resuming |
| 11 | Enrichment Detail | Read-back of what was written per product, and what wasn't |
| — | Cross-cutting | Entry-path tracking, resumable coverage, session behavior, late-added GTINs |

---

## 1. Selection Code List

### P2-001 — See coverage and status at a glance, open a code from anywhere on its row

**User story**
As a Supplier data manager, I want to see each selection code's category-assignment
coverage and enrichment status at a glance, and open its product-level detail from
wherever I naturally click on the row, so that I know what needs work and can get to it
without hunting for the right link.

**Acceptance criteria**

*Viewing coverage and status*
- Given the list loads, when I look at the Product Categories column, then a
  partially-covered code shows an amber badge like "38/52 assigned", a fully-covered
  code shows a green "All assigned (44/44)", and a code with nothing assigned shows a
  grey "0/{n} assigned".
- Given the Status column, then a code that's never been touched shows a grey "Needs
  Enrichment" dot; one that's categorized but not yet enriched shows a blue "Categories
  Assigned – Not Enriched"; one partway through enrichment shows an amber "In Progress";
  one fully enriched shows a green "AI Enriched".
- Given no row is selected, when I read the helper line under the action bar, then it
  invites me to select a code to see what AI enrichment will do.
- Given I select a partially-covered code (e.g. 38 of 52 products already categorized),
  when I read the helper line, then it tells me the remaining uncategorized products will
  need AI category assignment before attribute enrichment.
- Given I select a code with nothing assigned yet, when I read the helper line, then it
  tells me AI will group the products into categories for my confirmation, then suggest
  attribute values for review.
- Given I select a fully-categorized code, when I read the helper line, then it tells me
  AI will suggest attribute values directly, and nothing is submitted without my
  confirmation.

*Opening a code*
- Given any row, when I click the selection code itself, its product count, or (where
  shown) a banner shortcut for that code, then all three take me to the same
  product-level detail for that code — they are different doors into the same room, not
  different destinations.

**Anti-criteria**
- Given a code shows a coverage count like "38/52 assigned", when the screen re-renders
  without me doing anything, then that count must not change on its own — coverage only
  moves as a result of a supplier action elsewhere in the flow.

---

## 2. Category Coverage

### P2-002 — See the categorized/uncategorized split, act on either half separately

**User story**
As a Supplier data manager, I want to see which of a code's products already have
categories and which don't, launch AI category assignment for just the gap, or proceed
straight to attribute enrichment without resolving that gap first, so that I can choose
where to focus without redoing settled work or being blocked by the products that aren't
ready yet.

**Acceptance criteria**

*Viewing the split*
- Given I open Category Coverage for a partially-covered code, when it loads, then I see
  a summary card with the categorized and uncategorized counts, a two-tone progress bar,
  and a percentage covered.
- Given the same screen, when I look at the assigned section, then the already-assigned
  products are grouped into cards by category, each captioned as keeping its existing
  category with no AI involved. The cards are a read-only summary *on this screen* — they
  group and count, they don't offer editing here.
- Given those cards, when I consider what they imply about the products in them, then
  nothing about them is locked: a product's attribute values remain editable at any time
  through the normal enrichment and detail screens, and its category can still be
  changed. The "no AI involved" caption describes how these products got their category,
  not a restriction on what can be done to them afterward.
- Given the same screen, when I look at the unassigned section, then I see a distinct
  panel naming how many products don't have a category yet, a sample of them, and a
  note that attributes can only be enriched once a product has a category.
- Given I instead open Category Coverage for a fully-covered code, when it loads, then I
  see a confirmation that every product already has a category and no unassigned section
  at all.

*Assigning the gap*
- Given a code with some products still uncategorized, when I click "Assign with AI",
  then I'm taken into AI category assignment scoped to only those uncategorized
  products — the already-assigned ones are not re-suggested or touched.

*Proceeding to enrichment*
- Given a code with, say, 38 of 52 products categorized, when I click "Continue to
  Attribute Enrichment (38 products)", then I'm taken into attribute review and **all 52
  products appear there**. The button's count names how many products have their
  classification settled and can therefore receive attribute suggestions — it is not a
  count of how many products the screen will show.
- Given I read that button before clicking it, then it's clear that I am not required to
  resolve the remaining 14 first. **Categorized** (classification settled) and
  **enriched** (remaining attribute values filled in) are sequential steps; this action
  only requires the first to have happened for *some* products, not all.
- Given a code with zero categorized products, when I look at this button, then it's
  disabled — there's nothing yet to proceed to enrichment with.

*How the review screen splits the two halves* **[intended — not in the prototype]**
- Given I continue to enrichment from a partially-covered code, when the review screen
  loads, then the 38 classified products and the 14 unclassified ones appear in **two
  distinct sections**, so I can see at a glance which half is which.
- Given the classified section, then those products receive AI attribute suggestions
  across their category's full attribute set, exactly as they would on a fully-covered
  code.
- Given the unclassified section, then each product shows a **proposed classification I
  can change inline** — I don't have to leave this screen and run a separate category
  assignment pass to resolve them.
- Given a product in the unclassified section, when I look at its other attributes, then
  none are suggested yet: until its classification is settled, AI has no attribute set to
  suggest against. Resolving the classification is what unblocks the rest.
- Given I settle a product's classification here, when it's confirmed, then that product
  joins the classified half and its remaining attributes become available to review in
  the same run.
- Given a classified product that has never been enriched, when I look at it, then it
  shows its category's full attribute set at zero filled — ready to enrich, not an error
  state.

*Leaving without changing anything*
- Given I'm viewing this screen, when I click Back or Exit, then I return to wherever I
  came from with the code's coverage and status exactly as they were.

**Anti-criteria**
- Given I proceed to enrichment from a partially-covered code, when the review screen
  loads, then the unclassified products must not be hidden from it. They are at an
  earlier point in the same sequence, not excluded from the run.
- Given those unclassified products are on screen, then they must not receive AI
  suggestions for anything beyond their classification, and must not count toward
  "products enriched" until their classification is settled — visible is not the same as
  processed.
- Given I open this screen and leave without clicking either action, when I return to
  the Selection Code List, then that code's coverage and status must not have changed at
  all.

---

## 3. Product List

### P2-003 — See per-product status, respect the eligibility cutoff, select and enrich

**User story**
As a Supplier data manager, I want to see each product's category, enrichment status,
and attribute coverage in one table, be stopped from working on products too old to
enrich, and select one or many eligible products to enrich together, so that I can work
through a code in batches that make sense to me.

**Acceptance criteria**

*Viewing product-level detail*
- Given I open the Product List for a code, when it loads, then each row shows the
  product's category (name and code, or "Not assigned"), an enrichment status badge, and
  an attributes cell.
- Given a product that has a category and has been through at least one enrichment run,
  when I look at its attributes cell, then it shows an "{enriched}/{total}" count as a
  clickable link — e.g. "7/16" for a product with 7 of its 16 required attributes filled.
- Given a product that has a category but has never been enriched, when I look at its
  attributes cell, then it shows "0/{n}", where n is however many attributes that
  category requires.
- Given a product with no attribute values and no classification, when I look at its
  attributes cell, then it shows a dash — there is genuinely nothing to count.
- **[intended — not in the prototype]** Given a product that has attribute values but no
  classification — values added manually rather than through an enrichment run — when I
  look at its attributes cell, then it shows its filled count rather than a dash. Having
  values without a classification is a real state, and the row must not present it as an
  empty product.
- **[intended — not in the prototype]** Given that same product, when I look at its
  status, then it does not read as enriched: classification is itself a required
  attribute, and it's outstanding.

*Respecting the eligibility cutoff*
- Given the Product List, when I look at "Enrichment eligible from" in the action bar,
  then I see a date picker defaulted to exactly one year before today.
- Given a product created before that cutoff, when I look at its row, then it's shown
  dimmed, its checkbox is disabled, and its own "Enrich" action is disabled with an
  explanation that products created before the cutoff can't be enriched.
- Given that same ineligible row, when I look at what remains available on it, then its
  product id link, its GTIN drill-down, and its "View enrichment" action all still work.
  The cutoff gates *enrichment*, not *inspection* — I can always read what a product
  already carries, however old it is.
- Given the dimming applied to an ineligible row, when I read the row, then the visual
  treatment communicates "can't be enriched", not "row disabled" — the parts of the row I
  can still use must not look inert.
- Given the date picker, when I try to move the cutoff earlier, then it can go back at
  most one year from today — there's no way to widen eligibility further than that.

*Selecting and launching enrichment*
- Given at least one eligible row, when I check its box, then it's added to my
  selection and "Enrich Selected Products with AI" becomes available.
- Given the header checkbox, when I click it, then every eligible row is selected (and
  ineligible rows are skipped); clicking again clears the selection.
- Given a selection of one or more products, when I click "Enrich Selected Products with
  AI", then I enter enrichment scoped to exactly those products — any that are still
  uncategorized go through category assignment first, and categorized ones go straight
  to attribute review.
- Given a single eligible row, when I use its own "Enrich" action instead of the bulk
  control, then the same flow starts for just that one product.
- Given my current selection is empty, mixed (some categorized, some not), or entirely
  categorized, when I read the helper line under the action bar, then its wording
  matches what will actually happen for that selection.

*Drilling further*
- Given any product row, when I click its product id, then I'm taken to the GTIN list
  for that product.
- Given a product row with a category, when I click "View enrichment", then I'm taken to
  its Enrichment Detail.
- Given a product with neither a category nor any attribute values, when I look at "View
  enrichment", then it's disabled — there is genuinely nothing to show.
- **[intended — not in the prototype]** Given a product with attribute values but no
  classification, when I look at "View enrichment", then it's available: there are values
  to read back, and viewing them doesn't require a classification.

**Anti-criteria**
- Given I have nothing selected, when I look at "Enrich Selected Products with AI", then
  it must be disabled — enrichment can't launch with no scope.
- Given an ineligible product row, when I try to select it via any bulk "select all"
  control, then it must not be included.
- Given an ineligible product, when I try to reach its GTINs or its enrichment detail,
  then it must not be unreachable or unreadable. Age blocks enrichment, never inspection
  — a product I can't enrich is still a product I can look at.
- Given the attributes count on this screen and the same product's count on Enrichment
  Detail, when I compare them, then they must never disagree — they describe the same
  thing.
- Given I open Enrichment Detail from a Product List row and click its back link, then it
  must return me to the Product List, not somewhere else.

---

## 4. GTIN List

### P2-004 — See a product's GTINs, act on that product directly

**User story**
As a Supplier data manager, I want to see every GTIN behind one product and start AI
enrichment or view its enrichment history directly from here, so that I don't have to go
back to the product list to act on what I'm already looking at.

**Acceptance criteria**

*Viewing GTIN-level detail*
- Given I open the GTIN List for a product, when it loads, then I see every GTIN with
  its type, pack, color, size, cost, retail price and dates, plus the product's category
  (or "Not assigned") in the header.

*Where attribute values actually live* **[intended — not in the prototype]**
- Given this screen, when I consider where a confirmed attribute value is stored, then it
  belongs to **the GTIN, not the product**. This is existing product behavior across TGC,
  unchanged by this feature — suppliers add attributes at GTIN level.
- Given a product's "{enriched}/{total}" count shown elsewhere in the flow, then it is an
  **aggregate over that product's GTINs**. A product reading fully enriched means every
  one of its GTINs is fully enriched.
- Given a product whose GTINs don't all carry the same values, when I look at this
  screen, then each GTIN shows its own values and its own enrichment status — the product
  row's single figure is a rollup of these, not a value in its own right.

*Eligibility*
- Given the same screen, when I look at "Enrichment eligible from", then I see the same
  adjustable cutoff date picker as the Product List, applied to this one product.
- Given the product was created before that cutoff, when I look at "Enrich Attributes
  with AI", then it's disabled with a caption explaining why.
- Given that same ineligible product, when I look at the rest of the screen, then the
  full GTIN table still renders and remains readable. Only the enrich action is gated.
- Given an eligible product, when I click "Enrich Attributes with AI", then I enter
  enrichment scoped to this single product — the same flow the Product List's per-row
  Enrich uses.
*Acting on the product*
- Given a product that's been through at least one enrichment run, when I click "View
  enrichment", then I'm taken to its Enrichment Detail; for a product never enriched,
  this action doesn't appear at all.
- Given I return from Enrichment Detail via its back link, when the app navigates, then
  I land back on this GTIN List, not the Product List — wherever I actually came from.

**Anti-criteria**
- Given this screen has no per-GTIN selection, when I look for a way to enrich only some
  of a product's GTINs, then no such control exists — launching enrichment is
  product-level, even though the values it writes land per GTIN.
- **[intended — not in the prototype]** Given a product whose GTINs are not all in the
  same state, when I look at this screen, then it must not show one product-level status
  repeated identically against every GTIN — that would hide exactly the difference this
  screen exists to show.

---

## 5. Product Category Assignment

### P2-005 — Review AI's category proposals, confirm or resolve each one, save or continue

**User story**
As a Supplier data manager, I want AI to propose a category for every uncategorized
product in my current scope, with its confidence and the reasoning behind it, confirm or
resolve each one, and save partial progress or continue once everything's resolved, so
that every product ends up with a category I've explicitly signed off on.

**Acceptance criteria**

*AI's proposals*
- Given I enter this screen with a set of uncategorized products, when it loads, then
  every product has been sorted into one of three groups: confident (70% confidence or
  higher), uncertain (below 70%), or unclassified (AI found no match at all).
- Given a confident-bucket product, when I look at its card, then I see the suggested
  category, its code, a color-coded confidence bar (green at 90%+, amber at 70%+, red
  below), and the percentage.
- Given products that already carried a category into this scope, when I look at the
  "already categorized" section, then they're listed read-only with their existing
  category — no AI suggestion ran against them.

*Confirming or resolving*
- Given a confident- or uncertain-bucket card, when I click "Confirm Category", then it
  turns green with a confirmed marker, and a running "{x} of {n} confirmed" count
  increments; clicking "Undo" reverts it.
- Given an unclassified card, when I click "Choose Category", then a category picker
  opens; picking a value confirms that product with a marker showing I chose it manually.

*Saving or continuing*
- Given I've confirmed at least one product, when I click "Save & Return to List", then
  my confirmed assignments are kept and I return to the Product List, with anything
  unconfirmed left uncategorized; with nothing confirmed, this action is disabled.
- Given every product in scope is resolved (confirmed, or was already categorized), when
  I look at "Continue to Attribute Enrichment", then it's enabled; with anything still
  unresolved, it's disabled and shows how many remain.

**Anti-criteria**
- Given a confident- or uncertain-bucket card where AI already proposed something, when I
  look for a way to change that proposal to a different category, then no such control is
  currently reachable — only accepting or leaving it is possible on this screen; changing
  a category freely is only possible on Individual Assignment. This is worth confirming
  as an intentional limitation before it ships, since the on-screen copy currently implies
  any suggestion can be changed here.
- Given I continue to attribute enrichment with everything in this run resolved, when
  the review screen loads, then a product left unresolved in an earlier, separate pass
  must not silently appear in this run's scope.

---

## 6. Individual Assignment

### P2-006 — Assign categories manually, in bulk or one at a time, save or be blocked until resolved

**User story**
As a Supplier data manager, I want to assign categories to a batch of unclassified or
low-confidence products either all at once or one at a time, save whatever I've done so
far, and be stopped from continuing until everything's resolved, so that I can clear a
backlog efficiently without losing partial work or accidentally proceeding with gaps.

**Acceptance criteria**

*Assigning*
- Given several unresolved rows, when I select them and pick a category from a bulk
  dropdown, then applying it assigns that category to every selected row at once; the
  bulk action is disabled until both a category and a selection are present.
- Given a single unresolved row, when I open its own category picker and choose a value,
  then that row alone is assigned and shown as resolved.
- Given the header checkbox, when I click it, then every row is selected regardless of
  its current state.

*Saving or continuing*
- Given I've assigned at least one product, when I click "Save & Return to List", then
  my assignments are kept and I return to the Product List, with a note stating how many
  products remain unresolved and stay flagged as needing a category; with nothing
  assigned, this action is disabled.
- Given this screen was reached as a step feeding directly into enrichment, when
  anything remains unassigned, then "Continue to Enrichment" is disabled with an
  explanation; once every product is assigned, it becomes available.

**Anti-criteria**
- Given products remain unresolved, when I try to continue into enrichment by any means,
  then enrichment must not start for a scope that still contains uncategorized
  products — the control stays disabled, not merely discouraged.

---

## 7. Brick Confirmation

### P2-007 — Review AI's category groupings, confirm them, enrich early, or hand off low-confidence groups

**User story**
As a Supplier data manager, I want to see AI's category groupings for my products with
their confidence and reasoning, confirm them individually or in bulk with the ability to
undo, jump straight into enriching one confirmed category, use an explicit escape hatch
for low-confidence or unclassified groupings, and save what I've confirmed before
attribute work, so that nothing gets stuck and I control the pace.

**Acceptance criteria**

*Viewing groupings*
- Given I enter this screen, when it loads, then products are distributed across
  category cards, each showing its product/GTIN counts, a confidence bar and
  percentage, and a short evidence line explaining the grouping.
- Given a card where AI could not classify the products at all (0% confidence), when I
  look at it, then it's visually distinct from the rest and includes a note to assign
  those products individually.

*Confirming*
- Given an unconfirmed card, when I click "Confirm Category", then it turns green with a
  confirmed marker and a running "{x} of {n} categories confirmed" count increments;
  "Undo" reverts it.
- Given multiple unconfirmed cards with mixed confidence, when I click "Confirm All
  Categories", then every card at 70% confidence or above is confirmed at once, while
  lower-confidence and unclassified cards are left untouched and still need individual
  attention.
- Given I just used "Confirm All Categories", when I look for a way to undo it, then a
  matching bulk-undo action restores exactly the state from before I clicked it.
- Given every category is already confirmed, when I look for either bulk-confirm
  control, then neither is shown — there's nothing left to act on in bulk.

*Enriching one category early*
- Given a confirmed card, when I click "Enrich This Category", then I'm taken directly
  into attribute review scoped to just that category's products, without needing to
  confirm or resolve any other card first.
- Given I return from that single-category run, when I land back on Brick Confirmation,
  then every category I hadn't touched is exactly as I left it.

*Escape hatch for low confidence*
- Given the unclassified card, when I use its "assign individually" action, then I'm
  taken to Individual Assignment scoped to just that unclassified group.
- Given a link to review all low-confidence products individually, when I click it, then
  I'm taken to Individual Assignment scoped to every card below 70% confidence, not just
  the unclassified one.
- Given either escape hatch, when Individual Assignment loads, then high-confidence
  products from this run are not part of its scope.

*Saving and exiting*
- Given I've confirmed at least one category, when I click the exit action, then it's
  labeled "Save & Return to List" and keeps the confirmed categories — the next time I
  view this code's coverage, those products show up as newly covered, added on top of
  whatever coverage already existed, not replacing it.
- Given I've confirmed nothing, when I click the same exit action, then it's labeled
  "Exit to Selection Code List" and makes no coverage change.

**Anti-criteria**
- Given I save with only some categories confirmed, when I check this code's coverage
  afterward, then the untouched categories' products must not appear as assigned —
  only what I actually confirmed counts.

---

## 8. Brick GTIN List

### P2-008 — Inspect and adjust the products behind one confirmed category

**User story**
As a Supplier data manager, I want to view and search the products sitting behind one
confirmed category, move a product to a different category, or decline it from this
pass, so that I can correct a grouping mistake or opt a product out before committing to
enrich it.

**Acceptance criteria**

*Viewing and searching*
- Given I open the product list behind one confirmed category, when it loads, then I
  see every product in that category with its GTIN count, confidence, and category
  name.
- Given a search box, when I type a product name or GTIN, then the list filters to
  matches only.
- Given a product row, when I expand it, then I see its individual child GTINs.
- Given more than 25 products in this category, when I look at the footer, then I see
  paging controls; with 25 or fewer, no paging is shown at all.

*Correcting*
- Given a product row, when I click "Move", then a picker of the other available
  categories opens (excluding its current one); confirming requires a category to be
  picked first.
- Given I confirm a move, when the row updates, then it now shows the new category for
  this session.
- Given a product row, when I click "Decline", then it's removed from this category's
  active list and count.

**Anti-criteria**
- Given I decline a product, when I look for a way to undo that, then none currently
  exists — decline is a one-way removal in the current build, worth confirming as
  intended rather than assumed.

---

## 9. AI Enrichment Review — reviewing suggestions

### P2-009 — See confidence states clearly, review AI's reasoning per product, decide row by row

**User story**
As a Supplier data manager, I want the attribute table to show me every confidence state
an attribute can be in, let me expand an attribute to see AI's suggestion and reasoning
for every product, and let me confirm, edit, reject, or undo each one — with AI
withholding a suggestion it isn't confident enough in rather than showing me something
misleadingly specific — so that I know what needs my attention and stay in control of
every value.

**Acceptance criteria**

*Confidence badge states*
- Given I enter the review screen for a category, when the attribute table renders, then
  every attribute that category requires appears as its own row, with a count of how
  many products have been reviewed and an average-confidence bar.
- Given an attribute shows a "Needs review" badge, then that can mean one of three
  different things: AI has no confident value at all for some products, one specific
  product's suggestion falls below the review threshold even though the category's
  average looks fine, or the whole category's average confidence is weak. All three
  currently render as the same amber badge, without distinguishing which one applies —
  worth flagging, since a supplier reading only the badge can't tell which situation
  they're in.
- Given every row under an attribute is confirmed, when I look at its badge, then it
  shows green as complete.
- Given a badge's state, when the screen re-renders without me doing anything, then that
  state doesn't change on its own.

*Products whose classification isn't settled yet* **[intended — not in the prototype]**
- Given I entered this screen from a partially-covered code, when it renders, then
  products without a settled classification appear in their own section, visually
  separate from the products AI is suggesting attribute values for.
- Given that section, when I look at a product in it, then it shows a proposed
  classification with the same confirm/edit/reject actions every other suggestion gets —
  classification is reviewed here as an attribute, not as a detour to another screen.
- Given a product in that section, when I look for its other attributes, then there are
  none to review yet: its attribute set isn't known until its category is. The section
  makes that dependency visible rather than leaving the products looking merely empty.
- Given I confirm a product's classification, when the screen updates, then that product
  moves into the main section and its remaining attributes become reviewable in this same
  run, without restarting.

*Reviewing per-product detail*
- Given a collapsed attribute row, when I click it, then it expands into one row per
  product, showing the suggested value, a confidence bar, a short reasoning line, and
  confirm/edit/reject actions.
- Given a product row, when I click "View GTINs", then I see that product's individual
  GTINs with their own suggestion, confidence, and status.

*Deciding per row*
- Given a pending row, when I click "Confirm", then it turns green, shows a confirmed
  marker, and offers "Undo".
- Given a pending row, when I click "Edit", then a value picker opens — a searchable list
  of valid values where the attribute has one, free text otherwise; saving a typed value
  both overwrites the suggestion and confirms the row in the same action.
- Given a pending row, when I click "Reject", then it turns red, shows a rejected
  marker, and offers "Undo" — no value is retained for that attribute on that product.
- Given any confirmed, edited, or rejected row, when I click "Undo", then it reverts to
  pending (and any typed edit is cleared).

*Suggestions AI withholds*
- Given a product row where AI's confidence is below a low floor (60%), when I look at
  its suggested value, then it reads "N/A" instead of a value, with no confidence bar
  shown, and only Edit and Reject are offered — Confirm isn't available for this row.
- Given a bulk "Confirm All" action on that attribute, when it runs, then rows below
  that floor are skipped and must be resolved individually via Edit or Reject.

*Filtering*
- Given a "Low Confidence Only" toggle, when I turn it on, then the table narrows to
  only attributes (and, once expanded, only rows) below the review threshold; turning it
  off shows everything again.

**Anti-criteria**
- Given I reject a suggestion, when I later view that product's Enrichment Detail, then
  it must show up as not enriched with the reason "you rejected AI's suggestion,"
  showing AI's original value — not silently omitted as if AI never suggested anything.
- Given a row below the low-confidence floor, when a bulk "Confirm All" runs on its
  attribute, then that row must not be marked confirmed as a side effect — it requires
  an explicit Edit or Reject from the supplier.

---

## 10. AI Enrichment Review — completing and resuming

### P2-010 — Batch-select by confidence, complete a run, resume it later, jump to product detail

**User story**
As a Supplier data manager, I want to select every row above a confidence threshold in
one action, complete an enrichment run whether or not everything's been reviewed and be
clearly told what will and won't be saved, come back later to finish what's pending, and
jump from the completion summary straight into a specific product's detail, so that I
can spread a large enrichment job across more than one sitting without losing or
duplicating decisions.

**Acceptance criteria**

*Batch selection*
- Given a set of confidence-threshold options, when I click one, then every still-pending
  row across the whole table at or above that confidence is marked as batch-selected — a
  distinct state from confirmed, not yet saved.
- Given rows are batch-selected, when I click "Clear selection" or the same threshold
  again, then they revert to pending.
- Given rows are already batch-selected at one threshold, when I pick a different
  threshold, then the previous selection is replaced — only one threshold is active at a
  time.
- Given any batch-selected rows, when I read the note beside the control, then it makes
  clear that batch selection only sets my intention, and nothing is saved until I
  complete the run.

*Completing*
- Given at least one row is confirmed or batch-selected, when I click "Complete
  Enrichment", then a summary opens showing how many products and how many attributes
  were reviewed.
- Given nothing is confirmed or batch-selected, when I look at "Complete Enrichment",
  then it's disabled.
- Given the summary is open and something remains pending, when I read it, then it
  warns that unreviewed attributes won't be saved and that I can return to enrich more
  later, listing what's still outstanding.
- Given I confirm completion, when it processes, then every batch-selected row is
  promoted and saved alongside everything I confirmed individually, and I land on a
  completed view.
- Given the summary shows outstanding items, when I click "Go Back" instead of
  confirming, then nothing is written — I return to reviewing with every row exactly as
  it was.

*Resuming*
- Given I completed a run with some rows still pending, when I land on the completed
  view, then a banner names how many suggestions across how many attributes are still
  outstanding.
- Given that completed view, when I click "Continue Enrichment", then I return to
  reviewing with every earlier decision intact — nothing already decided is reset.
- Given I resolve more rows and complete the run again, when it saves, then it combines
  with the earlier pass — later decisions win per attribute, and anything only touched
  in the earlier pass survives untouched.

*Jumping to product detail*
- Given a completed run scoped to specific products, when I look at the summary, then I
  see a "View enrichment" link per product into its Enrichment Detail; a whole-code run
  has no such per-product list.

**Anti-criteria**
- Given rows are batch-selected but I haven't completed the run, when I check that
  product's Enrichment Detail, then the attribute must not show as enriched yet.
- Given a second enrichment pass over the same product, when it merges with the first,
  then an attribute confirmed in the first pass and never touched in the second must not
  be lost.

---

## 11. Enrichment Detail

### P2-011 — See what was written, see what's missing and why, fill a gap directly

**User story**
As a Supplier data manager, I want to see exactly what values a product now carries and
where each came from, see every attribute that's still missing a value along with the
specific reason it's missing, and fill in a missing value directly from this screen, so
that I can trust what's on the product and close gaps without re-entering the full
review flow.

**Acceptance criteria**

*What was written*
- Given I open Enrichment Detail for a product with confirmed values, when the written
  table renders, then each row shows the attribute, its value, the underlying code (or
  "free text" where there isn't one), where it came from, and AI's confidence.
- Given a value I confirmed as AI suggested it, when I look at its source, then it reads
  "AI confirmed"; given a value I edited before confirming, it reads "you edited".
- Given the header, when I look at the count shown, then it reads "{written}/{total}",
  and this figure always matches what the Product List showed for this same product.
- Given a product that's never been through a run, when I open its detail, then a banner
  explains nothing has been written yet, and everything the category requires is listed
  as not enriched.

*What's missing and why*
- Given an attribute AI never proposed a value for, when I look at its row in the
  missing table, then the reason reads "AI had no suggestion".
- Given an attribute I explicitly rejected during review, when I look at its row, then
  the reason reads "you rejected AI's suggestion", showing the rejected value and its
  confidence.
- Given an attribute AI suggested a value for that I never actioned, when I look at its
  row, then the reason reads "left pending", showing the same struck-through value and
  confidence.
- **[intended — not in the prototype]** Given a product with no settled classification,
  when I look at the missing table, then **Classification appears as a missing attribute
  in its own right**, with its own distinct reason: it blocks AI from generating the
  rest of this product's attributes. This is a fourth reason, separate from the three
  above — those describe an attribute AI couldn't or didn't fill, while this one explains
  why the remaining attributes aren't even determined yet.
- **[intended — not in the prototype]** Given that same product, when I look at the rest
  of the missing table, then it doesn't claim a specific list of outstanding attributes
  it can't yet know — the required set follows from the category, which isn't settled.
- Given a product with every required attribute filled, when I look at the missing
  section, then it confirms there's nothing outstanding, with zero rows.

*Filling a gap*
- Given at least one missing attribute, when I click "Add missing attributes", then an
  inline form opens with one input per missing attribute, each labeled with its reason.
- Given I fill in one or more of those fields and save, then only the fields I actually
  filled are saved — empty ones are dropped, not saved as blank.
- Given a value I save this way, when I check its source and confidence afterward, then
  it's attributed to me at full confidence, never to AI.
- Given I click "Cancel" instead of saving, then nothing I typed is retained.

**Anti-criteria**
- Given the count on this screen and the count on the Product List row I came from, when
  I compare them, then they must never differ.
- Given an attribute I rejected during review, when I look at its reason here, then it
  must not be collapsed into the same generic "missing" label as an attribute AI never
  touched — the distinction is the point.
- Given I save a value for a previously "no suggestion" attribute, when I return to this
  screen, then it must move into the written table, not remain listed as missing.

---

## 12. Cross-cutting: entering enrichment and knowing where you are

### P2-012 — Track whether I entered enrichment for a whole code or a specific selection

**User story**
As a Supplier data manager, I want the app to correctly track whether I entered
enrichment via the whole-code path or by selecting specific products in the drill-down,
so that step counts and back navigation match what I actually did.

**Acceptance criteria**
- Given I enter enrichment for a code via its whole-code action on the Selection Code
  List, when I check the step indicator through the flow, then it counts three steps —
  category coverage, category confirmation, attribute review.
- Given I instead enter enrichment via a specific product selection from the Product
  List drill-down, when I check the step indicator, then it counts two steps — category
  assignment, attribute review — since the scoped path skips the coverage screen
  entirely.
- Given the whole-code path, when I click Back partway through, then I return toward
  Category Coverage or the Selection Code List; given the scoped path, when I click Back,
  then I return toward the Product List — the two paths never share a back target at the
  same step.

**Anti-criteria**
- Given I took the scoped (drill-down) path, when I reach the review screen, then it must
  not claim a step count that implies a coverage step it never had.

---

## 13. Cross-cutting: resumable coverage and forward-only status

### P2-013 — Repeated passes add to progress; status only ever moves forward

**User story**
As a Supplier data manager, I want a second pass over a code to add to its existing
progress rather than reset it, and its status to only ever move forward, so that
resuming work never costs me progress I already made.

**Acceptance criteria**
- Given a code currently at 38 of 52 categorized, when I run a scoped category-assignment
  pass over 3 more products and save, then the code's coverage becomes 41 of 52 — the 38
  already there are untouched, and the 3 new ones are added on top.
- Given a code already at its full product count, when any further pass would push
  coverage past that count, then it's held at the code's total — coverage can never
  exceed the number of products the code actually has.
- Given a whole-code category confirmation instead of a scoped one, when it completes,
  then the code's coverage is set directly to its full product count, since a whole-code
  pass addresses everything at once.
- Given a code already at "In Progress" or "AI Enriched", when more **category work**
  happens on it afterward, then its status must not move backward to an earlier stage.
- Given a code with some but not all of its products enriched, when I check its status,
  then it must not yet read "AI Enriched" — that status is reserved for once every
  product in the code has actually been through enrichment, not most of them.
- **[intended — not in the prototype]** Given a product missing its classification, when
  I check whether it counts toward its code reaching "AI Enriched", then it doesn't —
  classification is a required attribute, so the product isn't enriched without it.

*What "forward-only" does and doesn't cover*
- Given the forward-only rule above, when I ask what it applies to, then it governs
  **category assignment specifically**: doing more category work on a code can never
  demote it. It is not a blanket guarantee that status never decreases for any reason.
- **[intended — not in the prototype]** Given new unenriched GTINs arriving on an already
  enriched product (see P2-015), when the status recalculates, then it *does* move back
  to "In Progress". This is a different trigger from category assignment and is a
  legitimate downgrade: the code genuinely has outstanding work again, and hiding that
  behind a forward-only rule would misreport it.

**Anti-criteria**
- Given a scoped pass adds 3 products to a code's coverage, when I check the result, then
  the code's coverage must not reset to just those 3 — additive passes never replace
  existing progress.
- **[intended — not in the prototype]** Given the forward-only rule, when new unenriched
  GTINs appear on an enriched product, then that rule must not be used to keep the code
  showing "AI Enriched" — forward-only protects category progress, it does not suppress
  genuine new work.

---

## 14. Cross-cutting: session behavior

### P2-014 — Know what's kept mid-session and what's lost on reload

**User story**
As a Supplier data manager, I want to know clearly what's kept when I navigate around
mid-task versus what's lost if I reload the page, so that I can work in short sessions
without fear of losing or duplicating decisions.

**Acceptance criteria**
- Given I'm mid-review with some rows confirmed and some still pending, when I navigate
  away without completing the run, then none of that pass's decisions are saved — they
  only get written once I click Complete Enrichment.
- Given I did complete a pass before leaving, when I return to that same product's
  Product List row or Enrichment Detail later in the same session, then it reflects
  exactly what that completed pass wrote — no more, no less.
- Given I reload the browser at any point, when the app comes back, then every screen
  returns to its starting state — this is a property of the whole prototype having no
  backend or saved state, not something specific to this flow.

**Anti-criteria**
- Given I abandon a review mid-session without completing it, when I check that
  product's coverage elsewhere in the same session, then it must not show as enriched —
  an abandoned, uncompleted pass leaves no trace.

---

## 15. Cross-cutting: GTINs added after an enrichment run

### P2-015 — See GTINs added after enrichment flagged as still needing work

**[intended — not in the prototype]** Every criterion in this story describes behavior
that does not exist yet. The prototype stores enrichment results per product, so a GTIN
added after a run is not representable — this story specifies what should happen once
values are stored per GTIN (P2-004).

**User story**
As a Supplier data manager, I want GTINs added to a product after its enrichment run to
be visibly flagged as still needing enrichment, so that a product marked enriched doesn't
quietly hide GTINs that were never covered.

**Why this happens**
Products accumulate GTINs over time — a new color, a new pack size. A run enriches the
GTINs that existed when it ran. Without this story, the product keeps whatever status
that run gave it, and the new GTIN's empty attributes are invisible behind a green badge.

**Acceptance criteria**

*Seeing the gap*
- Given a product fully enriched by an earlier run, when a new GTIN is added to it
  afterward, then that GTIN shows as unenriched on the GTIN List alongside its enriched
  siblings.
- Given that product's "{enriched}/{total}" count, when it recalculates, then it drops
  below full to reflect the new GTIN — e.g. a product that read 16/16 across 4 GTINs now
  reads short once a fifth GTIN arrives with nothing filled.
- Given I look at the product without opening its GTIN List, then the shortfall is
  visible from the count alone — I shouldn't have to drill in to discover there's
  outstanding work.

*Status*
- Given a product previously marked "AI Enriched", when a new unenriched GTIN is added,
  then its status **reverts to "In Progress"**.
- Given a selection code previously marked "AI Enriched", when one of its products
  reverts this way, then the code leaves "AI Enriched" too — it no longer meets the bar
  of every product being fully enriched.
- Given this reversion, when compared against the forward-only status rule in P2-013,
  then the two are consistent: forward-only governs category assignment, and this is new
  outstanding work rather than a repeat of settled work.

*Closing the gap*
- Given a product with some enriched and some unenriched GTINs, when I run enrichment on
  it again, then AI works on the outstanding GTINs only.
- Given that re-run, when it saves, then confirmed values on the already-enriched GTINs
  are left exactly as they were — a re-run to cover a new GTIN never re-opens or
  overwrites settled decisions on the others.
- Given every GTIN is covered after the re-run, when the status recalculates, then the
  product returns to "AI Enriched".

**Anti-criteria**
- Given a product whose GTIN count is short, when I look at it anywhere in the flow, then
  it must not present as complete with no indication of the gap — this is the whole point
  of the story.
- Given a re-run covering only new GTINs, when it completes, then it must not reset,
  re-prompt, or overwrite the attribute decisions already confirmed on the older GTINs.
- Given a new GTIN arrives, when the product's status changes, then its *category
  assignment* progress must not be disturbed — the product is still categorized; only its
  attribute enrichment is incomplete.

---

## Session lifecycle coverage summary

Addressed directly: P2-010 (completing with pending items, resuming a completed run),
P2-013 (multi-pass coverage accumulation, forward-only status), P2-014 (mid-session
abandonment, same-session return, and the reload boundary). No story in this set
requires surviving a reload, since the prototype has no persistence layer to survive
with — stated once here rather than repeated as a caveat on every story.

---

## Open questions these stories don't settle

Raised by the classification and GTIN-grain corrections, and left deliberately
unanswered rather than guessed at:

- **Where does a proposed classification come from for a product that already has
  attribute values?** These stories assume AI proposes it like any other suggestion. It
  may be better to infer it *from* the values already present, which is a different
  behavior with different confidence characteristics.
- **What does a product require before its classification is settled?** The required
  attribute set follows from the category, so an unclassified product has no defined
  denominator. The stories avoid claiming one; the real feature needs a rule.
- **How does a supplier add attributes to an unclassified product today, and does that
  path change?** Classification-blocks-generation constrains what *AI* can do; it isn't
  yet decided whether it should constrain manual entry the same way.
- **What counts as "the same" GTIN across re-runs?** P2-015 assumes new GTINs are
  distinguishable from existing ones. Whether that's by identifier alone, or needs a
  first-seen timestamp, is unspecified.

---

Stories are ready for refinement. Flag any that need splitting, descoping, or
additional criteria before engineering picks them up.

Note for planning: criteria marked **[intended — not in the prototype]** carry real
build cost and cannot be verified against the demo. They cluster into three pieces of
work — the two-section review screen, classification as an attribute, and GTIN-level
attribute storage — with the third being the largest, since it changes where values are
stored rather than how they're displayed.
