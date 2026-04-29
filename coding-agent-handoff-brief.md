# Model Registry — Coding Agent Handoff Brief

## Project

Build the first beta of **Model Registry**.

## Product boundary

This is **registry only**.

### In scope
- structured registry for cloud models
- canonical JSON-backed data storage
- normalised data model
- simple unauthenticated internal web UI
- list/detail/edit flows
- support for pricing, capabilities, suitability, and integration metadata

### Out of scope
- runtime routing
- context compiler
- live spend telemetry
- auth
- live config automation into OpenClaw/NemoClaw/NanoClaw
- local model support for now

---

## Core architecture requirements

The registry must be **system-agnostic**.

It should not be OpenClaw-specific, though it should store enough metadata that a future integration layer could generate config for:
- OpenClaw
- NemoClaw
- NanoClaw
- other systems

---

## Recommended domain entities

Use a normalised model with these core entities:

- `providers`
- `models`
- `modelRoutes`
- `pricingRecords`
- `capabilityProfiles`
- `suitabilityProfiles`
- `integrationMetadata`

---

## Recommended storage

Canonical storage should be JSON files.

Suggested structure:

```text
Model Registry/
  data/
    providers.json
    models.json
    model-routes.json
    pricing-records.json
    capability-profiles.json
    suitability-profiles.json
    integration-metadata.json
  schema/
    provider.schema.json
    model.schema.json
    model-route.schema.json
    pricing-record.schema.json
    capability-profile.schema.json
    suitability-profile.schema.json
    integration-metadata.schema.json
  docs/
  ui/
```

---

## UI requirements

Minimal internal UI, no auth.

### Required views

#### 1. Model list
Must support:
- search
- filter
- sort
- open detail page

Suggested columns:
- display name
- provider
- family
- tier
- status
- key prices
- context window
- summary capabilities

#### 2. Model detail
Should show:
- base model info
- route(s)
- pricing
- capability profile
- suitability profile
- integration metadata
- notes/source links

#### 3. Editing
Simple edit/update path is enough for beta.

No workflow engine needed.
No auth needed.

---

## Critical schema expectations

### Model identity
Need stable support for:
- exact model ids
- display names
- family/tier/status
- release stage

### Route-specific data
A model may have multiple routes.

Do not collapse route-specific data into the model record if avoidable.

### Pricing
Should be route-aware and separable.
Support history later, even if not fully used now.

### Capability data
Needs structured booleans/limits/classes, not just notes.

### Suitability data
Must support extensible heuristics such as:
- skill → score
- task type → score
- agent type → score
- recommended / avoid

This is important.

### Integration metadata
Store enough data for future config generation, but do not build config automation in beta 1.

---

## Collection workflow assumptions

The data will be populated through a mix of:
- human curation
- AI-assisted collection using a cloud search model

So the system should support:
- source URLs
- last verified dates
- editable notes
- draft/reviewed style record maturity later if convenient

---

## Recommended build sequence

### Phase 1
- define schemas
- create data files
- create seed provider records
- create seed model records

### Phase 2
- build file-backed service/API
- build list and detail screens
- support editing and save

### Phase 3
- enrich filtering
- improve suitability display
- improve route/pricing handling

---

## Suggested seed providers

- Anthropic
- OpenAI
- Google
- Groq
- OpenRouter

Populate a few representative models from each.

---

## Suggested seed model content

Each seeded model should ideally have:
- one base model record
- one route record
- one pricing record
- one capability profile
- one suitability profile
- one integration metadata stub

---

## Important exclusions

Please do **not** expand beta scope into:
- routing engine
- context compiler
- account balance/usage telemetry
- auth
- provider connector runtime

Those are explicitly outside scope right now.

---

## Main thesis

This project is the **source-of-truth registry** for model metadata.

It is not yet the system that chooses models or configures them.

It should be built so those later systems can depend on it.

---

## Deliverables expected

1. canonical JSON data structure
2. schema files
3. seed records
4. simple internal web UI
5. clear folder structure
6. enough editability to support ongoing curation

---

## Reference docs in this folder

See also:
- `model-registry-design-and-architecture-guide.md`
- `development-summary.md`
- `collection-workflow.md`

These together define the current intent for beta 1.
