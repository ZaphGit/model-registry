'use server';

import { revalidatePath } from 'next/cache';
import { createIntegrationRecord, createModelRecord, createPricingRecord, createRouteRecord, updateCapabilityRecord, updateIntegrationRecord, updateModelRecord, updatePricingRecord, updateRouteRecord, updateSuitabilityRecord } from '@/lib/registry/update';
import type { CapabilityProfile, IntegrationMetadata, Model, ModelRoute, PricingRecord } from '@/lib/registry/types';

function asModelStatus(value: string): Model['status'] {
  if (value === 'active' || value === 'preview' || value === 'deprecated' || value === 'experimental' || value === 'disabled') return value;
  return 'active';
}

function asIntegrationTarget(value: string): IntegrationMetadata['integrationTarget'] {
  if (value === 'openclaw' || value === 'nemoclaw' || value === 'nanoclaw' || value === 'other') return value;
  return 'openclaw';
}

function asRouteType(value: string): ModelRoute['routeType'] {
  if (value === 'direct' || value === 'proxy' || value === 'aggregator' || value === 'internal') return value;
  return 'direct';
}

function asPricingUnit(value: string): PricingRecord['billingUnit'] {
  if (value === 'per_1m_tokens' || value === 'per_1k_tokens' || value === 'per_image' || value === 'per_second' || value === 'custom') return value;
  return 'per_1m_tokens';
}

function asQualityClass(value: string): NonNullable<CapabilityProfile['operationalClasses']>['qualityClass'] | undefined {
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'frontier') return value;
  return undefined;
}

function asClass(value: string): 'low' | 'medium' | 'high' | undefined {
  if (value === 'low' || value === 'medium' || value === 'high') return value;
  return undefined;
}

function parseCsv(value: FormDataEntryValue | null): string[] {
  return String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean);
}

function parseScoreMap(value: FormDataEntryValue | null): Record<string, number> {
  const text = String(value ?? '').trim();
  if (!text) return {};
  return Object.fromEntries(text.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const [key, raw] = line.split('=').map((part) => part.trim());
    return [key, Number(raw)];
  }).filter(([key, raw]) => key && Number.isFinite(raw)));
}

function parseOptionalNumber(value: FormDataEntryValue | null): number | undefined {
  const text = String(value ?? '').trim();
  if (!text) return undefined;
  const number = Number(text);
  return Number.isFinite(number) ? number : undefined;
}

function parseRequiredNumber(value: FormDataEntryValue | null, fieldName: string): number {
  const number = parseOptionalNumber(value);
  if (number == null) throw new Error(`${fieldName} is required and must be numeric.`);
  return number;
}

function parseBoolean(value: FormDataEntryValue | null): boolean {
  return String(value ?? '') === 'true';
}

export async function createModelAction(formData: FormData) {
  const providerId = String(formData.get('providerId') ?? '').trim();
  const displayName = String(formData.get('displayName') ?? '').trim();
  const apiModelId = String(formData.get('apiModelId') ?? '').trim();
  const family = String(formData.get('family') ?? '').trim();
  const tier = String(formData.get('tier') ?? '').trim();
  const status = asModelStatus(String(formData.get('status') ?? 'active'));
  const integrationTarget = asIntegrationTarget(String(formData.get('integrationTarget') ?? 'openclaw'));

  if (!providerId || !displayName || !apiModelId || !family || !tier) throw new Error('Provider, display name, API model id, family, and tier are required.');
  createModelRecord({ providerId, displayName, apiModelId, family, tier, status, integrationTarget });
  revalidatePath('/models');
}

export async function createRouteAction(formData: FormData) {
  const modelId = String(formData.get('modelId') ?? '');
  const providerId = String(formData.get('providerId') ?? '');
  const label = String(formData.get('label') ?? '').trim();
  if (!modelId || !providerId || !label) throw new Error('Model id, provider id, and route label are required.');

  createRouteRecord({
    modelId,
    providerId,
    label,
    baseUrl: String(formData.get('baseUrl') ?? '').trim(),
    routeType: asRouteType(String(formData.get('routeType') ?? 'direct')),
    supportsTools: parseBoolean(formData.get('supportsTools')),
    supportsStreaming: parseBoolean(formData.get('supportsStreaming')),
    supportsStructuredOutput: parseBoolean(formData.get('supportsStructuredOutput')),
    supportsReasoningMode: parseBoolean(formData.get('supportsReasoningMode')),
  });

  revalidatePath('/models');
}

export async function saveRouteAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const label = String(formData.get('label') ?? '').trim();
  if (!id || !label) throw new Error('Route id and label are required.');

  updateRouteRecord({
    id,
    label,
    baseUrl: String(formData.get('baseUrl') ?? '').trim(),
    routeType: asRouteType(String(formData.get('routeType') ?? 'direct')),
    supportsTools: parseBoolean(formData.get('supportsTools')),
    supportsStreaming: parseBoolean(formData.get('supportsStreaming')),
    supportsStructuredOutput: parseBoolean(formData.get('supportsStructuredOutput')),
    supportsReasoningMode: parseBoolean(formData.get('supportsReasoningMode')),
  });

  revalidatePath('/models');
}

export async function saveCapabilityAction(formData: FormData) {
  const modelId = String(formData.get('modelId') ?? '');
  if (!modelId) throw new Error('Model id is required for capability update.');

  updateCapabilityRecord({
    modelId,
    contextWindow: parseOptionalNumber(formData.get('contextWindow')),
    maxOutputTokens: parseOptionalNumber(formData.get('maxOutputTokens')),
    toolCalling: parseBoolean(formData.get('toolCalling')),
    structuredOutput: parseBoolean(formData.get('structuredOutput')),
    streaming: parseBoolean(formData.get('streaming')),
    reasoningMode: parseBoolean(formData.get('reasoningMode')),
    qualityClass: asQualityClass(String(formData.get('qualityClass') ?? '')),
    costClass: asClass(String(formData.get('costClass') ?? '')),
    latencyClass: asClass(String(formData.get('latencyClass') ?? '')),
  });

  revalidatePath('/models');
}

export async function savePricingAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Pricing record id is required.');

  updatePricingRecord({
    id,
    billingUnit: asPricingUnit(String(formData.get('billingUnit') ?? 'per_1m_tokens')),
    currency: String(formData.get('currency') ?? 'USD').trim() || 'USD',
    inputPrice: parseRequiredNumber(formData.get('inputPrice'), 'Input price'),
    outputPrice: parseRequiredNumber(formData.get('outputPrice'), 'Output price'),
    cachedInputPrice: parseOptionalNumber(formData.get('cachedInputPrice')),
    notes: String(formData.get('notes') ?? '').trim(),
  });

  revalidatePath('/models');
}

export async function createPricingAction(formData: FormData) {
  const modelRouteId = String(formData.get('modelRouteId') ?? '');
  if (!modelRouteId) throw new Error('Model route id is required for pricing creation.');

  createPricingRecord({
    modelRouteId,
    billingUnit: asPricingUnit(String(formData.get('billingUnit') ?? 'per_1m_tokens')),
    currency: String(formData.get('currency') ?? 'USD').trim() || 'USD',
    inputPrice: parseRequiredNumber(formData.get('inputPrice'), 'Input price'),
    outputPrice: parseRequiredNumber(formData.get('outputPrice'), 'Output price'),
    cachedInputPrice: parseOptionalNumber(formData.get('cachedInputPrice')),
    notes: String(formData.get('notes') ?? '').trim(),
  });

  revalidatePath('/models');
}

export async function saveModelAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const displayName = String(formData.get('displayName') ?? '').trim();
  const family = String(formData.get('family') ?? '').trim();
  const tier = String(formData.get('tier') ?? '').trim();
  const status = asModelStatus(String(formData.get('status') ?? 'active'));
  const description = String(formData.get('description') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();

  if (!id || !displayName || !family || !tier) throw new Error('Model id, display name, family, and tier are required.');
  updateModelRecord({ id, displayName, family, tier, status, description, notes });
  revalidatePath('/models');
}

export async function saveSuitabilityAction(formData: FormData) {
  const modelId = String(formData.get('modelId') ?? '');
  if (!modelId) throw new Error('Model id is required for suitability update.');

  updateSuitabilityRecord({ modelId, strengthNotes: String(formData.get('strengthNotes') ?? '').trim(), weaknessNotes: String(formData.get('weaknessNotes') ?? '').trim(), recommendedFor: parseCsv(formData.get('recommendedFor')), avoidFor: parseCsv(formData.get('avoidFor')), skillScores: parseScoreMap(formData.get('skillScores')), taskScores: parseScoreMap(formData.get('taskScores')), agentTypeScores: parseScoreMap(formData.get('agentTypeScores')) });
  revalidatePath('/models');
}

export async function createIntegrationAction(formData: FormData) {
  const modelRouteId = String(formData.get('modelRouteId') ?? '');
  if (!modelRouteId) throw new Error('Model route id is required for integration creation.');

  createIntegrationRecord({
    modelRouteId,
    integrationTarget: asIntegrationTarget(String(formData.get('integrationTarget') ?? 'openclaw')),
    suggestedAlias: String(formData.get('suggestedAlias') ?? '').trim(),
    providerModelString: String(formData.get('providerModelString') ?? '').trim(),
    compatibilityNotes: String(formData.get('compatibilityNotes') ?? '').trim(),
    requiredFields: parseCsv(formData.get('requiredFields')),
    supportsFallbackRole: parseBoolean(formData.get('supportsFallbackRole')),
  });

  revalidatePath('/models');
}

export async function saveIntegrationAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Integration metadata id is required.');

  updateIntegrationRecord({ id, suggestedAlias: String(formData.get('suggestedAlias') ?? '').trim(), providerModelString: String(formData.get('providerModelString') ?? '').trim(), compatibilityNotes: String(formData.get('compatibilityNotes') ?? '').trim(), requiredFields: parseCsv(formData.get('requiredFields')), supportsFallbackRole: parseBoolean(formData.get('supportsFallbackRole')) });
  revalidatePath('/models');
}
