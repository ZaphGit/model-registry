# Model Registry — Development Summary

## Version

Current working version: **v0.2**

## Product name

**Model Registry**

## Product boundary

This first beta is the **registry only**.

### In scope
- structured cloud-model registry
- normalised data model
- JSON-backed canonical storage
- simple unauthenticated web UI
- manual + AI-assisted data collection workflow
- pricing data
- capabilities data
- suitability / skills-to-model mapping
- integration metadata sufficient for future config generation

### Out of scope
- runtime routing
- context compiler
- live spend telemetry
- auth
- live connectors/config writers
- local model support (later)

---

## Core decisions captured

### 1. Registry must be system-agnostic
Do **not** make this OpenClaw-specific.

It should support future integration with:
- OpenClaw
- NemoClaw
- NanoClaw
- others

Store sufficient mapping data, but let the integration layer generate config later.

### 2. Use a normalised model
Current preferred entities:
- providers
- models
- modelRoutes
- pricingRecords
- capabilityProfiles
- suitabilityProfiles
- integrationMetadata

### 3. Spend telemetry is out of scope for now
No live billing/credit/quota integration in beta 1.

### 4. Suitability mapping is important
Need extensible support for:
- skills → model score
- tasks → model score
- agent type → model score

### 5. Web UI should be simple
No auth.
Internal-only starter UI.
Enough to:
- browse
- search/filter
- inspect records
- edit/update records

---

## Recommended folder structure

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
    architecture-guide.md
    collection-workflow.md
    development-summary.md
  ui/
```

---

## Seed scope

Start with cloud providers only:
- Anthropic
- OpenAI
- Google
- Groq
- OpenRouter

Populate a first pass of representative models.

---

## MVP screens

### 1. Model list
- provider
- name
- tier
- family
- price
- context window
- key capabilities
- status

### 2. Model detail
- identity
- route(s)
- pricing
- capabilities
- suitability scores
- integration metadata
- notes/sources

### 3. Optional provider view
- provider details
- associated models

---

## Immediate next deliverables for coding agent

1. JSON schema drafts
2. empty canonical data files
3. seed provider records
4. seed model records
5. minimal file-backed UI/API
6. simple list/detail/edit views

---

## One-sentence thesis

The Model Registry is the structured, system-agnostic source of truth about available models, their capabilities, pricing, and future integration metadata — not the router, not the compiler, and not the live telemetry engine.
