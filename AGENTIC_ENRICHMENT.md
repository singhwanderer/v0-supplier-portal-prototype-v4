# Where an Agent Beats a Screen: Agentic Attribute Enrichment for TGC

**From:** [Lead AI PM, Trading Grid Catalogue]
**Re:** Why "agentic attribute enrichment" should mean more than AI-assisted form-filling

## The problem with the current framing

We call the supplier enrichment flow "agentic," but today it's a suggestion engine inside a
spreadsheet: the AI proposes a value per cell, a human confirms per cell. That's a legitimate
UI pattern — but it isn't a reason to reach for an agent. An agent earns its place when the
question a user has can't be answered by a screen, no matter how well built. We have three
places in TGC where that's true, and one of them is a stronger bet than the other two combined.

## Where an agent adds value the UI structurally cannot

**1. Portfolio Q&A ("what's enriched, where are the gaps") — real, but modest.**
The enrichment portal today has no filter, no cross-product search, no dashboard — every
aggregate question a supplier has is currently unanswerable. An agent fixes that. But scoped
to this repo alone, that's honestly a filter bar I could ship as UI. It's useful; it isn't
differentiated.

**2. Pre-submit audit as a gate — a real save, not a real bet.**
Suppliers can click "Complete Enrichment" with a single confirmed attribute and silently drop
the rest. An agent that states the consequence before submit ("you're saving 612 of 9,002
pairs; 3 required attributes are untouched") is a clear improvement. Deterministic counting
stays in code; the agent prioritizes and explains what to fix first.

**3. Multi-retailer compliance — the strongest case, and it isn't really about this repo.**
We're separately building supplier compliance status against more than one retailer — and
suppliers reportedly don't know their own status today. That reframes everything: the
supplier's real question is "what should I enrich next?", and answering it requires **joining**
enrichment state (this portal) with per-retailer requirements and gaps (the compliance
product). Two separate surfaces means the supplier is holding that join in their head today.
No UI on either side can answer it alone — that's a genuine agent justification, not a
convenience one.

The scale makes the point concrete: at ~150 products × 14 attributes × 5+ retailers, that's a
matrix in the tens of thousands of cells. It doesn't render as a table a human can read. It
renders as one sentence: *"Enrich Upper Material next — it's the last mandatory gap blocking
three retailer relationships."* That's a ranked recommendation, not a gap list, and it's the
sharpest output in the whole space because it requires the join *and* an impact calculation —
things a static UI can't produce even in principle.

**4. Proactive push — changes supplier behavior, not just answers them.**
If suppliers don't know where they stand, an agent that waits to be asked is the wrong shape.
The valuable version triggers on retailer-side change: *"Dillard's made Upper Material
required Tuesday — 340 of your GTINs just went non-compliant; here's the fix."* This is the
version that moves a supplier from reactive to informed, and it's naturally asynchronous and
cross-surface — exactly what a chat box bolted onto one screen can't do.

## The strategic fork: internal agent vs. external agent

This is two different bets with different economics, worth keeping separate:

- **Internal agent (build into the portal):** makes our own UI smarter. High control, but the
  supplier still has to come to us and re-enter data that may already live in their PIM/ERP.
- **External agent (expose TGC as MCP tools — requirements, validation, submission,
  compliance status):** lets the supplier's *own* agent do enrichment where their data already
  lives. For the long tail of ~3,700 supplier spokes who will never fund an EDI-style
  integration, this is a near-zero-cost integration path we don't otherwise have.

**Internal agent = a better portal. External agent = the portal becomes optional for our
highest-volume suppliers.** We should build the internal version first — it's where the
deterministic engine (coverage, gaps, ranking) has to live regardless — but frame it from day
one as the substrate an external MCP surface would sit on top of, not a dead end.

## Non-negotiable guardrails

- The agent proposes; the human click writes. No auto-confirm, no auto-publish.
- Never rank or route on a model's self-reported confidence — it isn't calibrated to accuracy.
  Rank on real signals: does the value match the GS1 code list, does the retailer actually
  require it, how many relationships does closing this gap unblock.
- Counting and requirement-matching stay deterministic code. The agent's job is prioritization
  and explanation, not arithmetic — this is what lets a customer verify our numbers by hand
  instead of trusting the model.

## Recommendation

Prioritize the multi-retailer join (#3) over generic portfolio Q&A (#1) — it's the one use
case a screen genuinely cannot deliver, and it's the natural home for the proactive-push
capability (#4) once built. Treat the pre-submit audit (#2) as a near-term, low-cost
improvement to the flow we already ship. Carry the external-MCP framing (internal vs.
external) into any roadmap conversation now, before the internal build locks in assumptions
that make the external surface harder to bolt on later.
