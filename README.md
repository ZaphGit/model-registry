# Model Registry

Model Registry is a **system-agnostic internal registry for AI models**.

It stores structured data about:
- providers
- models
- access routes
- pricing
- capabilities
- suitability / skill mappings
- future-facing integration metadata for systems like OpenClaw, NemoClaw, and NanoClaw

This repository is the **registry only**.
It is **not**:
- a router
- a context compiler
- a spend telemetry system
- an auth layer
- a live config writer

## Current MVP shape

- Next.js + TypeScript UI
- SQLite runtime storage
- JSON seed/reference files in `data/`
- modal-first editing on the main `/models` screen
- no auth

## Architecture notes

The original design pack used JSON as canonical storage. The current implementation keeps:
- `data/*.json` as seed/reference material
- SQLite as the runtime app store

This makes the MVP easier to query, edit, and run locally while preserving the system-agnostic entity model.

## Core entities

- `providers`
- `models`
- `modelRoutes`
- `pricingRecords`
- `capabilityProfiles`
- `suitabilityProfiles`
- `integrationMetadata`

## Current status

Implemented now:
- SQLite-backed model list
- seeded provider/model dataset
- modal-first inspect/edit interaction for model records
- joined display of routes, pricing, capabilities, suitability, and integration metadata
- basic model save path into SQLite

Still to deepen:
- richer editing for suitability score maps
- richer editing for integration metadata
- stronger filtering/search/sort
- broader create/add flows across related entities

## Local run (Ubuntu 24.04)

### 1. Install Node.js

Use Node 22 LTS or newer.

### 2. Clone the repo

```bash
git clone <repo-url>
cd model-registry
```

### 3. Install dependencies

```bash
npm install
```

### 4. Seed the SQLite database

```bash
npm run seed
```

This reads from the JSON seed/reference files in `data/` and populates the local SQLite database.

### 5. Start the dev server

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Then open:

```text
http://127.0.0.1:3000/models
```

If you are tunnelling over SSH:

```bash
ssh -L 3000:127.0.0.1:3000 <host>
```

### 6. Production-style run

```bash
npm run build
npm run start
```

## Project layout

```text
app/                  Next.js app routes and UI
lib/registry/         registry storage/query/update logic
scripts/              local helper scripts, including SQLite seeding
data/                 JSON seed/reference records
schema/               JSON schemas for registry entities
```

## Seed data note

Current seeded providers:
- Anthropic
- OpenAI
- Google
- Groq
- OpenRouter

The pricing/capability/suitability seed content is enough for MVP validation, but should still be treated as curation material rather than final truth.

## Product boundary

In scope:
- structured registry
- pricing metadata
- capability metadata
- suitability mappings
- integration metadata
- simple internal UI

Out of scope:
- runtime routing
- spend telemetry
- auth
- live config automation
- secret management

## Design pack references

This repo also contains the original planning pack:
- `model-registry-design-and-architecture-guide.md`
- `development-summary.md`
- `collection-workflow.md`
- `coding-agent-handoff-brief.md`

## Recommended next implementation steps

1. richer suitability editing and filtering
2. richer integration-target editing
3. route/pricing add/edit flows
4. stronger search/filter/sort
5. standalone GitHub repo and deployment polish
