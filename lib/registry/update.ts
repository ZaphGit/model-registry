import { SqliteRegistryStore } from './sqlite-store';
import type { IntegrationMetadata, Model, SuitabilityProfile } from './types';

export interface UpdateModelInput {
  id: string;
  displayName: string;
  family: string;
  tier: string;
  status: Model['status'];
  description?: string;
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

export function updateModelRecord(input: UpdateModelInput) {
  const db = SqliteRegistryStore.getDb();
  const row = db.prepare('SELECT payload FROM models WHERE id = ?').get(input.id) as { payload: string } | undefined;

  if (!row) {
    throw new Error(`Model not found: ${input.id}`);
  }

  const existing = JSON.parse(row.payload) as Model;
  const updated: Model = {
    ...existing,
    displayName: input.displayName,
    family: input.family,
    tier: input.tier,
    status: input.status,
    description: input.description?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
  };

  db.prepare('UPDATE models SET payload = ? WHERE id = ?').run(JSON.stringify(updated), input.id);
  return updated;
}

export function updateSuitabilityRecord(input: UpdateSuitabilityInput) {
  const db = SqliteRegistryStore.getDb();
  const row = db.prepare('SELECT id, payload FROM suitability_profiles WHERE model_id = ? LIMIT 1').get(input.modelId) as { id: string; payload: string } | undefined;

  if (!row) {
    throw new Error(`Suitability profile not found for model: ${input.modelId}`);
  }

  const existing = JSON.parse(row.payload) as SuitabilityProfile;
  const updated: SuitabilityProfile = {
    ...existing,
    strengthNotes: input.strengthNotes?.trim() || undefined,
    weaknessNotes: input.weaknessNotes?.trim() || undefined,
    recommendedFor: input.recommendedFor?.filter(Boolean) ?? existing.recommendedFor,
    avoidFor: input.avoidFor?.filter(Boolean) ?? existing.avoidFor,
    skillScores: input.skillScores ?? existing.skillScores,
    taskScores: input.taskScores ?? existing.taskScores,
    agentTypeScores: input.agentTypeScores ?? existing.agentTypeScores,
  };

  db.prepare('UPDATE suitability_profiles SET payload = ? WHERE id = ?').run(JSON.stringify(updated), row.id);
  return updated;
}

export function updateIntegrationRecord(input: UpdateIntegrationInput) {
  const db = SqliteRegistryStore.getDb();
  const row = db.prepare('SELECT payload FROM integration_metadata WHERE id = ?').get(input.id) as { payload: string } | undefined;

  if (!row) {
    throw new Error(`Integration metadata not found: ${input.id}`);
  }

  const existing = JSON.parse(row.payload) as IntegrationMetadata;
  const updated: IntegrationMetadata = {
    ...existing,
    suggestedAlias: input.suggestedAlias?.trim() || undefined,
    providerModelString: input.providerModelString?.trim() || undefined,
    compatibilityNotes: input.compatibilityNotes?.trim() || undefined,
    requiredFields: input.requiredFields?.filter(Boolean) ?? existing.requiredFields,
    supportsFallbackRole: input.supportsFallbackRole ?? existing.supportsFallbackRole,
  };

  db.prepare('UPDATE integration_metadata SET payload = ? WHERE id = ?').run(JSON.stringify(updated), input.id);
  return updated;
}
