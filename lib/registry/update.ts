import { SqliteRegistryStore } from './sqlite-store';
import type { ModelBundleImport } from './import';
import type { CapabilityProfile, IntegrationMetadata, Model, ModelRoute, PricingRecord, SuitabilityProfile } from './types';

export interface UpdateModelInput {
  id: string;
  displayName: string;
  family: string;
  tier: string;
  status: Model['status'];
  description?: string;
  notes?: string;
}

export interface CreateModelInput {
  providerId: string;
  displayName: string;
  apiModelId: string;
  family: string;
  tier: string;
  status: Model['status'];
  integrationTarget: IntegrationMetadata['integrationTarget'];
}

export interface UpdateRouteInput {
  id: string;
  label: string;
  baseUrl?: string;
  routeType: ModelRoute['routeType'];
  supportsTools?: boolean;
  supportsStreaming?: boolean;
  supportsStructuredOutput?: boolean;
  supportsReasoningMode?: boolean;
}

export interface CreateRouteInput {
  modelId: string;
  providerId: string;
  label: string;
  baseUrl?: string;
  routeType: ModelRoute['routeType'];
  supportsTools?: boolean;
  supportsStreaming?: boolean;
  supportsStructuredOutput?: boolean;
  supportsReasoningMode?: boolean;
}

export interface UpdateCapabilityInput {
  modelId: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  toolCalling?: boolean;
  structuredOutput?: boolean;
  streaming?: boolean;
  reasoningMode?: boolean;
  qualityClass?: NonNullable<CapabilityProfile['operationalClasses']>['qualityClass'];
  costClass?: NonNullable<CapabilityProfile['operationalClasses']>['costClass'];
  latencyClass?: NonNullable<CapabilityProfile['operationalClasses']>['latencyClass'];
}

export interface UpdatePricingInput {
  id: string;
  billingUnit: PricingRecord['billingUnit'];
  currency: string;
  inputPrice: number;
  outputPrice: number;
  cachedInputPrice?: number;
  notes?: string;
}

export interface CreatePricingInput {
  modelRouteId: string;
  billingUnit: PricingRecord['billingUnit'];
  currency: string;
  inputPrice: number;
  outputPrice: number;
  cachedInputPrice?: number;
  notes?: string;
}

export interface UpdateSuitabilityInput {
  modelId: string;
  strengthNotes?: string;
  weaknessNotes?: string;
  recommendedFor?: string[];
  avoidFor?: string[];
  skillScores?: Record<string, number>;
  taskScores?: Record<string, number>;
  agentTypeScores?: Record<string, number>;
}

export interface UpdateIntegrationInput {
  id: string;
  suggestedAlias?: string;
  providerModelString?: string;
  compatibilityNotes?: string;
  requiredFields?: string[];
  supportsFallbackRole?: boolean;
}

export interface CreateIntegrationInput {
  modelRouteId: string;
  integrationTarget: IntegrationMetadata['integrationTarget'];
  suggestedAlias?: string;
  providerModelString?: string;
  compatibilityNotes?: string;
  requiredFields?: string[];
  supportsFallbackRole?: boolean;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function modelIdFor(providerId: string, apiModelId: string) {
  return `${providerId}-${slugify(apiModelId)}`;
}

function routeIdFor(modelId: string, label: string) {
  return `route-${modelId}-${slugify(label)}`;
}

function pricingIdFor(routeId: string, billingUnit: PricingRecord['billingUnit']) {
  return `price-${routeId}-${slugify(billingUnit)}`;
}

function integrationIdFor(modelId: string, integrationTarget: IntegrationMetadata['integrationTarget'], routeId: string) {
  return `int-${modelId}-${slugify(routeId)}-${integrationTarget}`;
}

export function createModelRecord(input: CreateModelInput) {
  const db = SqliteRegistryStore.getDb();
  const modelId = modelIdFor(input.providerId, input.apiModelId);
  const routeId = `route-${modelId}-direct`;
  const suitabilityId = `suit-${modelId}`;
  const capabilityId = `cap-${modelId}`;
  const integrationId = `int-${modelId}-${input.integrationTarget}`;

  const existing = db.prepare('SELECT 1 FROM models WHERE id = ?').get(modelId);
  if (existing) throw new Error(`Model already exists: ${modelId}`);

  const today = todayString();

  const model: Model = { id: modelId, providerId: input.providerId, displayName: input.displayName, apiModelId: input.apiModelId, family: input.family, tier: input.tier, status: input.status, releaseStage: 'active', recordStatus: 'draft', description: '', aliases: [], sourceUrls: [], lastVerifiedAt: today };
  const route: ModelRoute = { id: routeId, modelId, providerId: input.providerId, routeType: 'direct', label: `${input.displayName} direct route`, authMethod: 'api-key', requiredSecrets: [], supportsStreaming: true, supportsTools: true, supportsStructuredOutput: true, supportsReasoningMode: false, status: 'active', recordStatus: 'draft', lastVerifiedAt: today };
  const suitability: SuitabilityProfile = { id: suitabilityId, modelId, recordStatus: 'draft', confidence: 0.5, lastReviewedAt: today, skillScores: {}, taskScores: {}, agentTypeScores: {}, recommendedFor: [], avoidFor: [] };
  const capability: CapabilityProfile = { id: capabilityId, modelId, recordStatus: 'draft', sourceUrl: '', lastVerifiedAt: today, modalities: { textIn: true, textOut: true }, features: { toolCalling: true, structuredOutput: true, streaming: true, systemPrompt: true }, limits: {}, operationalClasses: {} };
  const integration: IntegrationMetadata = { id: integrationId, modelRouteId: routeId, integrationTarget: input.integrationTarget, providerModelString: `${input.providerId}/${input.apiModelId}`, suggestedAlias: slugify(input.displayName), requiredFields: ['apiKey'], supportsFallbackRole: true, recordStatus: 'draft' };

  const tx = db.transaction(() => {
    db.prepare('INSERT INTO models (id, provider_id, payload) VALUES (?, ?, ?)').run(model.id, model.providerId, JSON.stringify(model));
    db.prepare('INSERT INTO model_routes (id, model_id, provider_id, payload) VALUES (?, ?, ?, ?)').run(route.id, route.modelId, route.providerId, JSON.stringify(route));
    db.prepare('INSERT INTO suitability_profiles (id, model_id, payload) VALUES (?, ?, ?)').run(suitability.id, suitability.modelId, JSON.stringify(suitability));
    db.prepare('INSERT INTO capability_profiles (id, model_id, payload) VALUES (?, ?, ?)').run(capability.id, capability.modelId, JSON.stringify(capability));
    db.prepare('INSERT INTO integration_metadata (id, model_route_id, payload) VALUES (?, ?, ?)').run(integration.id, integration.modelRouteId, JSON.stringify(integration));
  });

  tx();
  return { model, route, suitability, capability, integration };
}

export function upsertModelBundle(bundle: ModelBundleImport) {
  const db = SqliteRegistryStore.getDb();
  const modelId = modelIdFor(bundle.model.providerId, bundle.model.apiModelId);
  const today = todayString();

  const tx = db.transaction(() => {
    const existingModelRow = db.prepare('SELECT payload FROM models WHERE id = ?').get(modelId) as { payload: string } | undefined;
    const model: Model = existingModelRow
      ? {
          ...(JSON.parse(existingModelRow.payload) as Model),
          displayName: bundle.model.displayName,
          family: bundle.model.family,
          tier: bundle.model.tier,
          status: bundle.model.status,
          description: bundle.model.description,
          notes: bundle.model.notes,
          lastVerifiedAt: today,
        }
      : {
          id: modelId,
          providerId: bundle.model.providerId,
          displayName: bundle.model.displayName,
          apiModelId: bundle.model.apiModelId,
          family: bundle.model.family,
          tier: bundle.model.tier,
          status: bundle.model.status,
          releaseStage: 'active',
          recordStatus: 'draft',
          description: bundle.model.description,
          notes: bundle.model.notes,
          aliases: [],
          sourceUrls: [],
          lastVerifiedAt: today,
        };

    if (existingModelRow) {
      db.prepare('UPDATE models SET payload = ? WHERE id = ?').run(JSON.stringify(model), modelId);
    } else {
      db.prepare('INSERT INTO models (id, provider_id, payload) VALUES (?, ?, ?)').run(model.id, model.providerId, JSON.stringify(model));
    }

    const capabilityId = `cap-${modelId}`;
    const capabilityRow = db.prepare('SELECT payload FROM capability_profiles WHERE model_id = ? LIMIT 1').get(modelId) as { payload: string } | undefined;
    const capability: CapabilityProfile = {
      ...(capabilityRow ? (JSON.parse(capabilityRow.payload) as CapabilityProfile) : { id: capabilityId, modelId, recordStatus: 'draft', sourceUrl: '', lastVerifiedAt: today, modalities: { textIn: true, textOut: true }, features: {}, limits: {}, operationalClasses: {} }),
      lastVerifiedAt: today,
      notes: bundle.capability?.notes,
      features: {
        ...(capabilityRow ? (JSON.parse(capabilityRow.payload) as CapabilityProfile).features : {}),
        toolCalling: bundle.capability?.toolCalling,
        structuredOutput: bundle.capability?.structuredOutput,
        streaming: bundle.capability?.streaming,
        reasoningMode: bundle.capability?.reasoningMode,
      },
      limits: {
        ...(capabilityRow ? (JSON.parse(capabilityRow.payload) as CapabilityProfile).limits : {}),
        contextWindow: bundle.capability?.contextWindow,
        maxOutputTokens: bundle.capability?.maxOutputTokens,
      },
      operationalClasses: {
        ...(capabilityRow ? (JSON.parse(capabilityRow.payload) as CapabilityProfile).operationalClasses : {}),
        qualityClass: bundle.capability?.qualityClass,
        costClass: bundle.capability?.costClass,
        latencyClass: bundle.capability?.latencyClass,
      },
    };

    if (capabilityRow) {
      db.prepare('UPDATE capability_profiles SET payload = ? WHERE model_id = ?').run(JSON.stringify(capability), modelId);
    } else {
      db.prepare('INSERT INTO capability_profiles (id, model_id, payload) VALUES (?, ?, ?)').run(capability.id, capability.modelId, JSON.stringify(capability));
    }

    const suitabilityId = `suit-${modelId}`;
    const suitabilityRow = db.prepare('SELECT payload FROM suitability_profiles WHERE model_id = ? LIMIT 1').get(modelId) as { payload: string } | undefined;
    const suitability: SuitabilityProfile = {
      ...(suitabilityRow ? (JSON.parse(suitabilityRow.payload) as SuitabilityProfile) : { id: suitabilityId, modelId, recordStatus: 'draft', confidence: 0.5, lastReviewedAt: today, skillScores: {}, taskScores: {}, agentTypeScores: {}, recommendedFor: [], avoidFor: [] }),
      strengthNotes: bundle.suitability?.strengthNotes,
      weaknessNotes: bundle.suitability?.weaknessNotes,
      recommendedFor: bundle.suitability?.recommendedFor ?? [],
      avoidFor: bundle.suitability?.avoidFor ?? [],
      skillScores: bundle.suitability?.skillScores ?? {},
      taskScores: bundle.suitability?.taskScores ?? {},
      agentTypeScores: bundle.suitability?.agentTypeScores ?? {},
      lastReviewedAt: today,
    };

    if (suitabilityRow) {
      db.prepare('UPDATE suitability_profiles SET payload = ? WHERE model_id = ?').run(JSON.stringify(suitability), modelId);
    } else {
      db.prepare('INSERT INTO suitability_profiles (id, model_id, payload) VALUES (?, ?, ?)').run(suitability.id, suitability.modelId, JSON.stringify(suitability));
    }

    for (const routeInput of bundle.routes) {
      const routeId = routeIdFor(modelId, routeInput.label);
      const routeRow = db.prepare('SELECT payload FROM model_routes WHERE id = ?').get(routeId) as { payload: string } | undefined;
      const route: ModelRoute = routeRow
        ? {
            ...(JSON.parse(routeRow.payload) as ModelRoute),
            label: routeInput.label,
            routeType: routeInput.routeType,
            baseUrl: routeInput.baseUrl,
            supportsTools: routeInput.supportsTools,
            supportsStreaming: routeInput.supportsStreaming,
            supportsStructuredOutput: routeInput.supportsStructuredOutput,
            supportsReasoningMode: routeInput.supportsReasoningMode,
            lastVerifiedAt: today,
          }
        : {
            id: routeId,
            modelId,
            providerId: bundle.model.providerId,
            routeType: routeInput.routeType,
            label: routeInput.label,
            baseUrl: routeInput.baseUrl,
            authMethod: 'api-key',
            requiredSecrets: [],
            supportsStreaming: routeInput.supportsStreaming,
            supportsTools: routeInput.supportsTools,
            supportsStructuredOutput: routeInput.supportsStructuredOutput,
            supportsReasoningMode: routeInput.supportsReasoningMode,
            status: 'active',
            recordStatus: 'draft',
            lastVerifiedAt: today,
          };

      if (routeRow) {
        db.prepare('UPDATE model_routes SET payload = ? WHERE id = ?').run(JSON.stringify(route), routeId);
      } else {
        db.prepare('INSERT INTO model_routes (id, model_id, provider_id, payload) VALUES (?, ?, ?, ?)').run(route.id, route.modelId, route.providerId, JSON.stringify(route));
      }

      for (const pricingInput of routeInput.pricing ?? []) {
        const pricingId = pricingIdFor(routeId, pricingInput.billingUnit);
        const pricingRow = db.prepare('SELECT payload FROM pricing_records WHERE id = ?').get(pricingId) as { payload: string } | undefined;
        const pricing: PricingRecord = pricingRow
          ? {
              ...(JSON.parse(pricingRow.payload) as PricingRecord),
              currency: pricingInput.currency,
              billingUnit: pricingInput.billingUnit,
              inputPrice: pricingInput.inputPrice,
              outputPrice: pricingInput.outputPrice,
              cachedInputPrice: pricingInput.cachedInputPrice,
              notes: pricingInput.notes,
              lastVerifiedAt: today,
            }
          : {
              id: pricingId,
              modelRouteId: routeId,
              currency: pricingInput.currency,
              billingUnit: pricingInput.billingUnit,
              inputPrice: pricingInput.inputPrice,
              outputPrice: pricingInput.outputPrice,
              cachedInputPrice: pricingInput.cachedInputPrice,
              recordStatus: 'draft',
              sourceUrl: '',
              lastVerifiedAt: today,
              notes: pricingInput.notes,
            };

        if (pricingRow) {
          db.prepare('UPDATE pricing_records SET payload = ? WHERE id = ?').run(JSON.stringify(pricing), pricingId);
        } else {
          db.prepare('INSERT INTO pricing_records (id, model_route_id, payload) VALUES (?, ?, ?)').run(pricing.id, pricing.modelRouteId, JSON.stringify(pricing));
        }
      }

      for (const integrationInput of routeInput.integrations ?? []) {
        const integrationId = integrationIdFor(modelId, integrationInput.integrationTarget, routeId);
        const integrationRow = db.prepare('SELECT payload FROM integration_metadata WHERE id = ?').get(integrationId) as { payload: string } | undefined;
        const integration: IntegrationMetadata = integrationRow
          ? {
              ...(JSON.parse(integrationRow.payload) as IntegrationMetadata),
              suggestedAlias: integrationInput.suggestedAlias,
              providerModelString: integrationInput.providerModelString,
              compatibilityNotes: integrationInput.compatibilityNotes,
              requiredFields: integrationInput.requiredFields ?? [],
              supportsFallbackRole: integrationInput.supportsFallbackRole,
            }
          : {
              id: integrationId,
              modelRouteId: routeId,
              integrationTarget: integrationInput.integrationTarget,
              suggestedAlias: integrationInput.suggestedAlias,
              providerModelString: integrationInput.providerModelString,
              compatibilityNotes: integrationInput.compatibilityNotes,
              requiredFields: integrationInput.requiredFields ?? [],
              supportsFallbackRole: integrationInput.supportsFallbackRole,
              recordStatus: 'draft',
            };

        if (integrationRow) {
          db.prepare('UPDATE integration_metadata SET payload = ? WHERE id = ?').run(JSON.stringify(integration), integrationId);
        } else {
          db.prepare('INSERT INTO integration_metadata (id, model_route_id, payload) VALUES (?, ?, ?)').run(integration.id, integration.modelRouteId, JSON.stringify(integration));
        }
      }
    }
  });

  tx();
  return { modelId };
}

export function createRouteRecord(input: CreateRouteInput) {
  const db = SqliteRegistryStore.getDb();
  const modelRow = db.prepare('SELECT payload FROM models WHERE id = ?').get(input.modelId) as { payload: string } | undefined;
  if (!modelRow) throw new Error(`Model not found for route creation: ${input.modelId}`);

  const routeId = `route-${input.modelId}-${slugify(input.label)}-${Date.now()}`;
  const route: ModelRoute = {
    id: routeId,
    modelId: input.modelId,
    providerId: input.providerId,
    routeType: input.routeType,
    label: input.label,
    baseUrl: input.baseUrl?.trim() || undefined,
    authMethod: 'api-key',
    requiredSecrets: [],
    supportsStreaming: input.supportsStreaming,
    supportsTools: input.supportsTools,
    supportsStructuredOutput: input.supportsStructuredOutput,
    supportsReasoningMode: input.supportsReasoningMode,
    status: 'active',
    recordStatus: 'draft',
    lastVerifiedAt: todayString(),
  };

  db.prepare('INSERT INTO model_routes (id, model_id, provider_id, payload) VALUES (?, ?, ?, ?)').run(route.id, route.modelId, route.providerId, JSON.stringify(route));
  return route;
}

export function updateRouteRecord(input: UpdateRouteInput) {
  const db = SqliteRegistryStore.getDb();
  const row = db.prepare('SELECT payload FROM model_routes WHERE id = ?').get(input.id) as { payload: string } | undefined;
  if (!row) throw new Error(`Route not found: ${input.id}`);

  const existing = JSON.parse(row.payload) as ModelRoute;
  const updated: ModelRoute = {
    ...existing,
    label: input.label,
    baseUrl: input.baseUrl?.trim() || undefined,
    routeType: input.routeType,
    supportsTools: input.supportsTools,
    supportsStreaming: input.supportsStreaming,
    supportsStructuredOutput: input.supportsStructuredOutput,
    supportsReasoningMode: input.supportsReasoningMode,
  };

  db.prepare('UPDATE model_routes SET payload = ? WHERE id = ?').run(JSON.stringify(updated), input.id);
  return updated;
}

export function updateCapabilityRecord(input: UpdateCapabilityInput) {
  const db = SqliteRegistryStore.getDb();
  const row = db.prepare('SELECT id, payload FROM capability_profiles WHERE model_id = ? LIMIT 1').get(input.modelId) as { id: string; payload: string } | undefined;
  if (!row) throw new Error(`Capability profile not found for model: ${input.modelId}`);

  const existing = JSON.parse(row.payload) as CapabilityProfile;
  const updated: CapabilityProfile = {
    ...existing,
    limits: {
      ...existing.limits,
      contextWindow: input.contextWindow,
      maxOutputTokens: input.maxOutputTokens,
    },
    features: {
      ...existing.features,
      toolCalling: input.toolCalling,
      structuredOutput: input.structuredOutput,
      streaming: input.streaming,
      reasoningMode: input.reasoningMode,
    },
    operationalClasses: {
      ...existing.operationalClasses,
      qualityClass: input.qualityClass,
      costClass: input.costClass,
      latencyClass: input.latencyClass,
    },
  };

  db.prepare('UPDATE capability_profiles SET payload = ? WHERE id = ?').run(JSON.stringify(updated), row.id);
  return updated;
}

export function updatePricingRecord(input: UpdatePricingInput) {
  const db = SqliteRegistryStore.getDb();
  const row = db.prepare('SELECT payload FROM pricing_records WHERE id = ?').get(input.id) as { payload: string } | undefined;
  if (!row) throw new Error(`Pricing record not found: ${input.id}`);

  const existing = JSON.parse(row.payload) as PricingRecord;
  const updated: PricingRecord = {
    ...existing,
    billingUnit: input.billingUnit,
    currency: input.currency,
    inputPrice: input.inputPrice,
    outputPrice: input.outputPrice,
    cachedInputPrice: input.cachedInputPrice,
    notes: input.notes?.trim() || undefined,
  };

  db.prepare('UPDATE pricing_records SET payload = ? WHERE id = ?').run(JSON.stringify(updated), input.id);
  return updated;
}

export function createPricingRecord(input: CreatePricingInput) {
  const db = SqliteRegistryStore.getDb();
  const routeRow = db.prepare('SELECT payload FROM model_routes WHERE id = ?').get(input.modelRouteId) as { payload: string } | undefined;
  if (!routeRow) throw new Error(`Route not found for pricing record: ${input.modelRouteId}`);

  const route = JSON.parse(routeRow.payload) as ModelRoute;
  const today = todayString();
  const pricingId = `price-${route.modelId}-${slugify(input.billingUnit)}-${Date.now()}`;

  const pricing: PricingRecord = {
    id: pricingId,
    modelRouteId: input.modelRouteId,
    currency: input.currency,
    billingUnit: input.billingUnit,
    inputPrice: input.inputPrice,
    outputPrice: input.outputPrice,
    cachedInputPrice: input.cachedInputPrice,
    recordStatus: 'draft',
    sourceUrl: '',
    lastVerifiedAt: today,
    notes: input.notes?.trim() || undefined,
  };

  db.prepare('INSERT INTO pricing_records (id, model_route_id, payload) VALUES (?, ?, ?)').run(pricing.id, pricing.modelRouteId, JSON.stringify(pricing));
  return pricing;
}

export function updateModelRecord(input: UpdateModelInput) {
  const db = SqliteRegistryStore.getDb();
  const row = db.prepare('SELECT payload FROM models WHERE id = ?').get(input.id) as { payload: string } | undefined;
  if (!row) throw new Error(`Model not found: ${input.id}`);

  const existing = JSON.parse(row.payload) as Model;
  const updated: Model = { ...existing, displayName: input.displayName, family: input.family, tier: input.tier, status: input.status, description: input.description?.trim() || undefined, notes: input.notes?.trim() || undefined };
  db.prepare('UPDATE models SET payload = ? WHERE id = ?').run(JSON.stringify(updated), input.id);
  return updated;
}

export function updateSuitabilityRecord(input: UpdateSuitabilityInput) {
  const db = SqliteRegistryStore.getDb();
  const row = db.prepare('SELECT id, payload FROM suitability_profiles WHERE model_id = ? LIMIT 1').get(input.modelId) as { id: string; payload: string } | undefined;
  if (!row) throw new Error(`Suitability profile not found for model: ${input.modelId}`);

  const existing = JSON.parse(row.payload) as SuitabilityProfile;
  const updated: SuitabilityProfile = { ...existing, strengthNotes: input.strengthNotes?.trim() || undefined, weaknessNotes: input.weaknessNotes?.trim() || undefined, recommendedFor: input.recommendedFor?.filter(Boolean) ?? existing.recommendedFor, avoidFor: input.avoidFor?.filter(Boolean) ?? existing.avoidFor, skillScores: input.skillScores ?? existing.skillScores, taskScores: input.taskScores ?? existing.taskScores, agentTypeScores: input.agentTypeScores ?? existing.agentTypeScores };
  db.prepare('UPDATE suitability_profiles SET payload = ? WHERE id = ?').run(JSON.stringify(updated), row.id);
  return updated;
}

export function createIntegrationRecord(input: CreateIntegrationInput) {
  const db = SqliteRegistryStore.getDb();
  const routeRow = db.prepare('SELECT payload FROM model_routes WHERE id = ?').get(input.modelRouteId) as { payload: string } | undefined;
  if (!routeRow) throw new Error(`Route not found for integration metadata: ${input.modelRouteId}`);

  const existingRows = db.prepare('SELECT payload FROM integration_metadata WHERE model_route_id = ?').all(input.modelRouteId) as { payload: string }[];
  const existing = existingRows.map((row) => JSON.parse(row.payload) as IntegrationMetadata);
  if (existing.some((item) => item.integrationTarget === input.integrationTarget)) {
    throw new Error(`Integration target already exists for route: ${input.integrationTarget}`);
  }

  const route = JSON.parse(routeRow.payload) as ModelRoute;
  const integrationId = `int-${route.modelId}-${input.integrationTarget}-${Date.now()}`;
  const integration: IntegrationMetadata = {
    id: integrationId,
    modelRouteId: input.modelRouteId,
    integrationTarget: input.integrationTarget,
    providerModelString: input.providerModelString?.trim() || undefined,
    suggestedAlias: input.suggestedAlias?.trim() || undefined,
    compatibilityNotes: input.compatibilityNotes?.trim() || undefined,
    requiredFields: input.requiredFields?.filter(Boolean) ?? [],
    supportsFallbackRole: input.supportsFallbackRole ?? true,
    recordStatus: 'draft',
  };

  db.prepare('INSERT INTO integration_metadata (id, model_route_id, payload) VALUES (?, ?, ?)').run(integration.id, integration.modelRouteId, JSON.stringify(integration));
  return integration;
}

export function updateIntegrationRecord(input: UpdateIntegrationInput) {
  const db = SqliteRegistryStore.getDb();
  const row = db.prepare('SELECT payload FROM integration_metadata WHERE id = ?').get(input.id) as { payload: string } | undefined;
  if (!row) throw new Error(`Integration metadata not found: ${input.id}`);

  const existing = JSON.parse(row.payload) as IntegrationMetadata;
  const updated: IntegrationMetadata = { ...existing, suggestedAlias: input.suggestedAlias?.trim() || undefined, providerModelString: input.providerModelString?.trim() || undefined, compatibilityNotes: input.compatibilityNotes?.trim() || undefined, requiredFields: input.requiredFields?.filter(Boolean) ?? existing.requiredFields, supportsFallbackRole: input.supportsFallbackRole ?? existing.supportsFallbackRole };
  db.prepare('UPDATE integration_metadata SET payload = ? WHERE id = ?').run(JSON.stringify(updated), input.id);
  return updated;
}
