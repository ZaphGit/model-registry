'use server';

import { revalidatePath } from 'next/cache';
import { createModelRecord, updateIntegrationRecord, updateModelRecord, updateSuitabilityRecord } from '@/lib/registry/update';
import type { IntegrationMetadata, Model } from '@/lib/registry/types';

function asModelStatus(value: string): Model['status'] {
  if (value === 'active' || value === 'preview' || value === 'deprecated' || value === 'experimental' || value === 'disabled') return value;
  return 'active';
}

function asIntegrationTarget(value: string): IntegrationMetadata['integrationTarget'] {
  if (value === 'openclaw' || value === 'nemoclaw' || value === 'nanoclaw' || value === 'other') return value;
  return 'openclaw';
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

export async function createModelAction(formData: FormData) {
  const providerId = String(formData.get('providerId') ?? '').trim();
  const displayName = String(formData.get('displayName') ?? '').trim();
  const apiModelId = String(formData.get('apiModelId') ?? '').trim();
  const family = String(formData.get('family') ?? '').trim();
  const tier = String(formData.get('tier') ?? '').trim();
  const status = asModelStatus(String(formData.get('status') ?? 'active'));
  const integrationTarget = asIntegrationTarget(String(formData.get('integrationTarget') ?? 'openclaw'));

  if (!providerId || !displayName || !apiModelId || !family || !tier) {
    throw new Error('Provider, display name, API model id, family, and tier are required.');
  }

  createModelRecord({ providerId, displayName, apiModelId, family, tier, status, integrationTarget });
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

  updateSuitabilityRecord({
    modelId,
    strengthNotes: String(formData.get('strengthNotes') ?? '').trim(),
    weaknessNotes: String(formData.get('weaknessNotes') ?? '').trim(),
    recommendedFor: parseCsv(formData.get('recommendedFor')),
    avoidFor: parseCsv(formData.get('avoidFor')),
    skillScores: parseScoreMap(formData.get('skillScores')),
    taskScores: parseScoreMap(formData.get('taskScores')),
    agentTypeScores: parseScoreMap(formData.get('agentTypeScores')),
  });

  revalidatePath('/models');
}

export async function saveIntegrationAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Integration metadata id is required.');

  updateIntegrationRecord({
    id,
    suggestedAlias: String(formData.get('suggestedAlias') ?? '').trim(),
    providerModelString: String(formData.get('providerModelString') ?? '').trim(),
    compatibilityNotes: String(formData.get('compatibilityNotes') ?? '').trim(),
    requiredFields: parseCsv(formData.get('requiredFields')),
    supportsFallbackRole: String(formData.get('supportsFallbackRole') ?? '') === 'true',
  });

  revalidatePath('/models');
}
