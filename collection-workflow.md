# Model Registry — Collection Workflow

## Purpose

Define a practical process for collecting, reviewing, and maintaining model registry data for the **Model Registry** product.

This workflow is designed for:
- human curation,
- AI-assisted research,
- repeatable data updates,
- and future automation.

---

## Goals

The collection workflow should:

1. populate registry records quickly,
2. keep data structured and machine-usable,
3. preserve provenance,
4. support ongoing updates,
5. clearly separate facts from heuristics.

---

## Principles

### 1. Structured first
Important facts should be stored in explicit fields, not buried in notes.

### 2. Source everything important
Pricing, limits, release state, and integration-relevant facts should carry source links and verification dates.

### 3. Separate fact from judgment
Examples:
- **Fact:** context window = X
- **Judgment:** model is good for architecture tasks

These should not be mixed together.

### 4. Make updates cheap
The workflow should be easy enough that updating records is not a pain in the arse.

### 5. AI helps, human verifies
Use a search-capable/cloud model to gather and structure information, but keep a human review pass before treating data as trusted.

---

## What gets collected

For each provider/model/route, collect data in these buckets:

### A. Provider data
- name
- docs URL
- website
- provider type
- notes

### B. Model identity data
- display name
- exact API model ID
- family
- tier
- status
- release stage
- release date if available
- short description

### C. Route/access data
- direct vs proxy vs aggregator
- base URL
- auth method
- required secret names
- route status
- route-specific notes

### D. Pricing data
- input price
- output price
- cached input price if relevant
- billing unit
- currency
- source URL
- last verified date

### E. Capability data
- modalities
- tools/function calling
- structured output support
- streaming support
- reasoning mode support
- context window
- output token limits
- operational classes (latency/cost/quality)

### F. Suitability data
- skills → score
- tasks → score
- agent types → score
- recommended for
- avoid for
- strengths / weaknesses notes

### G. Integration metadata
- target system
- provider/model string for that system
- suggested alias
- config hints
- compatibility notes

---

## Sources of truth

### Preferred source order

1. **Official provider docs**
2. **Official pricing pages**
3. **Official release notes / API docs**
4. **Provider dashboards / console docs**
5. **Trusted platform docs (e.g. OpenRouter route docs)**
6. **Manual operational notes**

### Avoid treating these as primary facts
- random blog posts
- benchmarks with unclear methodology
- community forum rumours
- AI-generated claims without source links

---

## Collection modes

## Mode 1 — Manual curation
Best for:
- high-confidence updates
- initial schema validation
- pricing verification
- integration metadata

Flow:
1. open provider docs
2. extract required fields
3. enter into registry
4. record source URLs
5. set `lastVerifiedAt`

---

## Mode 2 — AI-assisted collection
Best for:
- speeding up initial population
- gathering model summaries
- extracting structured data from docs
- drafting suitability notes

Flow:
1. give the cloud search model a collection template
2. ask it to gather and structure data from official sources
3. review the output manually
4. convert to canonical JSON
5. verify important facts before merging

### AI-assisted prompt pattern
Suggested prompt structure:

> Gather structured information for the following model from official sources only. Return: provider data, model identity data, route data, pricing, capabilities, and notes. Include source URLs and mark any uncertain fields clearly.

This should ideally output into the registry schema shape.

---

## Collection stages

## Stage 1 — Provider seeding
Create base provider records first.

Example providers:
- Anthropic
- OpenAI
- Google
- Groq
- OpenRouter

These records are fairly stable.

---

## Stage 2 — Initial model seeding
Add representative models from each provider.

For each model, collect at least:
- model identity
- one route
- one pricing record
- one capability profile
- one suitability profile draft

---

## Stage 3 — Route enrichment
Some models will have multiple access routes.

Examples:
- direct provider route
- OpenRouter route
- internal proxy route later

Add route-specific records rather than duplicating model records.

---

## Stage 4 — Suitability enrichment
Once core facts are present, add heuristic profiles:
- skill scores
- task scores
- agent-type scores
- recommended / avoid lists

These are expected to evolve and should be treated as editable internal judgment.

---

## Stage 5 — Integration metadata enrichment
Add the future-facing mappings needed by integration layers.

Examples:
- OpenClaw provider/model string
- suggested alias
- compatibility notes
- route-specific config hints

---

## Fact vs heuristic guidance

### Facts
Store as structured fields.
Examples:
- context window
- price
- supports tool calling
- base URL
- auth method

### Heuristics
Store in suitability profiles.
Examples:
- good for coding
- weak for bulk classification
- excellent orchestrator candidate
- not ideal for low-latency chat

### Notes
Store in notes fields.
Examples:
- pricing changed recently
- docs are ambiguous on output token limit
- route supports tools but only through provider-specific format

---

## Provenance requirements

At minimum, important records should include:
- `sourceUrl`
- `lastVerifiedAt`
- `verifiedBy` (optional in Beta 1)
- `confidence` (optional in Beta 1)

### Minimum provenance rule
For Beta 1, every pricing record and major capability profile should include:
- source URL
- last verified date

---

## Review workflow

### Suggested review states
- `draft`
- `reviewed`
- `verified`
- `stale`
- `deprecated`

### Suggested rule
- New AI-generated records start as `draft`
- Human-reviewed records become `reviewed`
- High-confidence records based on official docs become `verified`
- Old records past a freshness window can become `stale`

---

## Freshness and maintenance

### Suggested review cadence
- pricing: monthly or when provider announces changes
- capabilities: quarterly or on major release
- suitability scores: whenever practical usage suggests updates
- integration metadata: whenever target systems change

### Staleness triggers
- provider announces new release
- pricing page changes
- model renamed/deprecated
- route removed or changed

---

## Recommended collection order per model

1. Create `model` record
2. Create at least one `modelRoute`
3. Add `pricingRecord`
4. Add `capabilityProfile`
5. Add `suitabilityProfile`
6. Add `integrationMetadata`
7. Review in UI

---

## Example human workflow

### Add a new model
1. pick provider/model
2. read official docs + pricing page
3. create base model record
4. create route record
5. create pricing record
6. create capability profile
7. draft suitability profile
8. add source URLs + verification date
9. review in UI
10. mark as reviewed

---

## Example AI-assisted workflow

1. use cloud search model to gather official-source facts
2. request output in structured registry shape
3. check model id / pricing / capability claims manually
4. paste into canonical JSON files
5. validate against schema
6. review in UI
7. mark status appropriately

---

## Schema validation step

Every change should ideally pass schema validation before being treated as canonical.

This avoids malformed records and creeping nonsense.

---

## Beta 1 practical rule

For speed, do not wait for perfection.

A useful rule:
- **identity + route + pricing + core capabilities** must be reasonably accurate
- **suitability** can start rough and improve over time

That gets the registry useful quickly.

---

## Deliverables from this workflow

The collection workflow should produce:
- canonical JSON records
- provenance-aware data
- reviewed seed dataset
- enough content for list/detail UI
- enough structure for later integration layers

---

## Summary

The collection workflow is:
- source-led,
- schema-backed,
- AI-assisted,
- human-reviewed,
- and designed to grow into a trustworthy model catalog rather than a pile of half-remembered notes.
