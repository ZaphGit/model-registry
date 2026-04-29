# Model Registry — Design and Architecture Guide

## Status

Draft v0.2  
Audience: Job, coding agent, architecture/review agents  
Scope: **Model Registry only** — not routing, not context compiler, not spend telemetry runtime, not system-specific config automation.

---

## 1. Purpose

The **Model Registry** is a system-agnostic catalog of AI models and model-access routes, designed to support:

1. a simple web UI for browsing, reviewing, filtering, and editing model data,
2. structured storage of provider/model metadata,
3. future integration layers that can configure models in OpenClaw, NemoClaw, NanoClaw, and other agentic systems,
4. future model selection logic by exposing structured capability and suitability data.

This first beta is intentionally narrow:

- **in scope**: registry, schema, collection workflow, UI, structured metadata
- **out of scope**: authentication, runtime spend tracking, routing engine, compiler/context orchestration, live connectors

---

## 2. Key design decisions from discussion

### 2.1 Registry must be system-agnostic
The registry should **not** be OpenClaw-specific.

It should store sufficient information so that an **integration layer** can later map records into:
- OpenClaw config
- NemoClaw config
- NanoClaw config
- other future systems

So the registry stores:
- model facts
- capability data
- pricing data
- route/auth metadata
- suitability / skills / mapping guidance

But it does **not** directly own platform-specific config generation in v1.

---

### 2.2 Runtime spend telemetry is out of scope for now
Although spend visibility matters long-term, live telemetry is not part of the first beta.

That means:
- no balance polling
- no quota polling
- no usage API syncing
- no account dashboards

However, the schema should leave room for telemetry metadata later.

---

### 2.3 Capability and suitability should be extensible
A major requirement is to support not only static capabilities, but also heuristic mappings like:
- skill → model suitability
- task type → model suitability
- use case → recommended model class

This should be stored in an extensible way, not hardcoded into UI logic.

---

### 2.4 Routing is out of scope, but registry must support it later
The registry will not decide which model to use in v1.

But it **should** store the structured information a future router could query.

---

### 2.5 Use a normalised model now
The registry should be normalised enough to avoid duplication and support future growth, even if we do not fully exploit that complexity yet.

That means avoiding one giant flat record where possible.

---

### 2.6 Store sufficient data to configure, but don’t configure
The registry should hold enough information that an integration layer can later generate config.

But the actual config-writing behaviour belongs elsewhere.

---

## 3. Product boundary

### In scope for Beta 1
- canonical data model
- cloud provider/model registry
- simple structured storage
- data collection workflow
- manual and AI-assisted editing
- simple unauthenticated web UI
- capability and suitability data
- future-facing integration metadata

### Out of scope for Beta 1
- auth and permissions
- live provider telemetry
- billing sync
- runtime routing
- automatic config updates to external systems
- local model support (can be added later)
- benchmark engine

---

## 4. High-level architecture

The product should be thought of as four layers:

1. **Registry data layer**  
   Canonical storage for providers, models, routes, capabilities, pricing, and metadata.

2. **Collection / curation layer**  
   Human + AI-assisted workflow for populating and updating records.

3. **Application layer**  
   CRUD-ish API or direct file-backed service for reading/writing records.

4. **Web UI layer**  
   Simple interface for browsing, filtering, reviewing, and editing records.

---

## 5. Core domain model

To keep the registry system-agnostic and extensible, the data should be split into a few normalised entities.

## 5.1 Provider
Represents an upstream source of models.

Examples:
- Anthropic
- OpenAI
- Google
- Groq
- OpenRouter

### Provider fields
- `id`
- `name`
- `type` (`cloud` for now)
- `websiteUrl`
- `docsUrl`
- `status`
- `notes`

---

## 5.2 Model
Represents the abstract model identity.

Examples:
- Claude Sonnet 4.6
- GPT-5.4
- Gemini 2.5 Pro

A model is not the same thing as an access route.

### Model fields
- `id`
- `providerId`
- `displayName`
- `apiModelId`
- `family`
- `tier`
- `status`
- `releaseStage` (`preview`, `active`, `deprecated`, etc.)
- `description`
- `notes`
- `releasedAt`
- `deprecatedAt` (optional)

---

## 5.3 Model Route
Represents a specific way to access or use a model.

This is important because the same model may be available:
- directly from a provider
- via OpenRouter
- via an internal proxy
- via an OpenAI-compatible endpoint

The route can affect:
- auth method
- pricing
- compatibility
- integration approach
- observability

### Model Route fields
- `id`
- `modelId`
- `providerId`
- `routeType` (`direct`, `proxy`, `aggregator`, etc.)
- `label`
- `baseUrl`
- `authMethod`
- `requiredSecrets`
- `supportsStreaming`
- `supportsTools`
- `supportsStructuredOutput`
- `supportsReasoningMode`
- `status`
- `notes`

This route concept allows the registry to stay flexible without becoming connector-specific.

---

## 5.4 Pricing Record
Pricing should be separated so it can evolve independently.

### Pricing Record fields
- `id`
- `modelRouteId`
- `currency`
- `billingUnit` (e.g. `per_1m_tokens`)
- `inputPrice`
- `outputPrice`
- `cachedInputPrice` (optional)
- `imagePrice` (optional)
- `audioPrice` (optional)
- `effectiveFrom`
- `effectiveTo` (optional)
- `sourceUrl`
- `lastVerifiedAt`
- `notes`

This supports future pricing history without changing the core model record.

---

## 5.5 Capability Profile
This stores objective and semi-objective information about what the model can do.

### Capability Profile fields
#### Modalities
- `textIn`
- `textOut`
- `imageIn`
- `imageOut`
- `audioIn`
- `audioOut`
- `videoIn`

#### Features
- `toolCalling`
- `structuredOutput`
- `streaming`
- `systemPrompt`
- `reasoningMode`
- `longContext`

#### Limits
- `contextWindow`
- `maxOutputTokens`

#### Operational classes
- `latencyClass`
- `costClass`
- `qualityClass`

This should be queryable by UI and later by routing systems.

---

## 5.6 Suitability Profile
This is the extensible answer to “skills, score to model.”

It should capture heuristic guidance about what the model is good for.

### Suitability Profile fields
- `modelId`
- `skillScores`
- `taskScores`
- `agentTypeScores`
- `recommendedFor`
- `avoidFor`
- `strengthNotes`
- `weaknessNotes`
- `confidence`
- `lastReviewedAt`

### Example `skillScores`
```json
{
  "coding": 0.92,
  "reasoning": 0.95,
  "writing": 0.90,
  "classification": 0.75,
  "multimodal": 0.70,
  "tool_use": 0.88,
  "low_latency_chat": 0.50
}
```

### Why this matters
This gives future systems enough structured data to ask:
- Which models are best for coding?
- Which models are good for long-form reasoning?
- Which models fit an orchestrator agent?
- Which models are weak for low-cost bulk tasks?

This should be intentionally extensible — new skills and task types can be added without redesigning the registry.

---

## 5.7 Integration Metadata
The registry should store enough information that an external integration layer can later configure systems.

But to preserve system-agnostic boundaries, this should be stored as **mapping metadata**, not config automation.

### Integration Metadata fields
- `modelRouteId`
- `integrationTarget` (e.g. `openclaw`, `nemoclaw`, `nanoclaw`)
- `providerModelString`
- `suggestedAlias`
- `configHints`
- `compatibilityNotes`
- `requiredFields`
- `supportsFallbackRole`

Example:
```json
{
  "integrationTarget": "openclaw",
  "providerModelString": "anthropic/claude-sonnet-4-6",
  "suggestedAlias": "sonnet",
  "configHints": {
    "requiresRegistryEntry": true
  }
}
```

That is enough for a future integration layer to generate config, without the registry itself becoming tightly coupled to any one system.

---

## 6. Normalised storage structure

Recommended normalised storage entities:

- `providers`
- `models`
- `modelRoutes`
- `pricingRecords`
- `capabilityProfiles`
- `suitabilityProfiles`
- `integrationMetadata`

This is more future-proof than a single flattened list of models.

### Why normalise now?
Because otherwise we will duplicate:
- provider info across many models
- route-specific pricing on model records
- integration data across systems
- suitability data in ad hoc fields

Normalisation now prevents a later painful migration.

---

## 7. Storage format recommendation

For Beta 1, use **JSON files** as canonical storage.

### Why JSON?
- easy for code generation
- easy to validate with JSON Schema
- easy for a UI/backend to consume
- easy for coding agents to manipulate safely

### Suggested structure
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
    collection-workflow.md
    development-summary.md
    architecture-guide.md
  ui/
    ...future app files...
```

---

## 8. Collection workflow

The collection workflow should support both manual curation and AI-assisted ingestion.

### 8.1 Collection principles
- source every important field
- capture last verified date
- keep editorial notes separate from structured facts
- distinguish documented facts from heuristic judgments

### 8.2 Initial collection method
Use a **cloud search model** to help populate records.

Typical workflow:
1. choose provider/model to add
2. collect provider docs, pricing page, release notes
3. use a search-capable model to extract structured facts
4. review manually
5. store in JSON
6. mark `lastVerifiedAt`
7. keep source URLs

### 8.3 Field provenance
Important fields should ideally carry provenance metadata such as:
- `sourceUrl`
- `lastVerifiedAt`
- `verifiedBy`
- `confidence`

This does not need to be attached to every tiny field in Beta 1, but it should at least exist at the record/block level.

---

## 9. Web UI scope

Simple, unauthenticated, internal-only UI.

### Core screens

## 9.1 Model list view
Columns might include:
- model name
- provider
- family
- tier
- price in/out
- context window
- core capabilities
- status

### Required actions
- search
- filter
- sort
- open model detail

---

## 9.2 Model detail view
Show:
- basic identity info
- route details
- pricing
- capabilities
- suitability scores
- integration metadata
- notes
- sources

### Required actions
- edit fields
- save
- view record provenance

---

## 9.3 Provider view
Optional for Beta 1, but useful.

Show:
- provider details
- all associated models
- docs/pricing links

---

## 9.4 Editing model data
For Beta 1, editing can be simple forms over JSON-backed records.

No auth required yet.
No complex workflow required.

---

## 10. Non-functional considerations

### 10.1 Simplicity first
Keep Beta 1 light enough to build quickly.

### 10.2 Validation
Use schemas early so the data doesn’t turn into chaos.

### 10.3 Portability
Keep data portable and system-agnostic.

### 10.4 Human-legible
The data should still make sense when viewed directly in files.

### 10.5 AI-friendly
The structure should be easy for an LLM/coding agent to read, generate, and update.

---

## 11. What this architecture deliberately does NOT do yet

It does **not**:
- decide which model to use at runtime
- watch spend or quota in real time
- automatically update OpenClaw config
- benchmark models live
- discover all models automatically
- manage secrets or credentials

Those are later layers.

---

## 12. Example conceptual flow

### Adding a new model
1. Add or confirm provider record
2. Add model record
3. Add one or more route records
4. Add pricing record(s)
5. Add capability profile
6. Add suitability profile
7. Add integration metadata
8. Review in UI

---

## 13. Example questions the registry should answer

### Human questions
- What models do we have available?
- Which are cheapest?
- Which support tools?
- Which are best for coding?
- Which have the largest context windows?
- How would this map into OpenClaw later?

### Future machine questions
- Which model routes support structured output?
- Which models fit a research agent best?
- Which models have high reasoning scores and medium cost?
- Which integration targets can use this model route?

---

## 14. Suggested implementation sequence for coding agent

### Phase 1 — data foundations
- define schemas
- create empty canonical JSON files
- populate providers
- populate a few seed models

### Phase 2 — minimal app
- file-backed API or direct file service
- model list page
- model detail page
- edit/save forms

### Phase 3 — enrichment
- add suitability scoring
- add integration metadata
- improve filtering and compare UX

### Phase 4 — future expansion
- local model support
- telemetry metadata
- export tooling for integration layers

---

## 15. Recommended seed providers

Start with:
- Anthropic
- OpenAI
- Google
- Groq
- OpenRouter

Then seed representative models under each.

---

## 16. Recommended seed focus for records

For each seeded model, capture at minimum:
- identity
- route
- pricing
- capabilities
- suitability
- integration metadata stub

That will be enough to validate the architecture and UI.

---

## 17. Condensed architectural thesis

The Model Registry should be:

- **system-agnostic**,
- **normalised enough to grow**,
- **simple enough to build now**,
- **structured enough to support future routing and integration**.

It is not the router.
It is not the compiler.
It is not the spend engine.

It is the **source-of-truth registry** those later systems will depend on.

---

## 18. Summary of agreed boundaries

### Keep
- registry
- schema
- structured metadata
- pricing records
- capability data
- suitability/skills mapping
- integration metadata
- simple UI

### Exclude for now
- live spend telemetry
- routing
- compiler
- auth
- runtime config writers

---

Prepared for handoff to coding agent as the design and architecture reference for the first-beta Model Registry product.
