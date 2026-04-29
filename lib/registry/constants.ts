import path from 'node:path';
import type { RegistryCollection } from './types';

export const ROOT_DIR = process.cwd();
export const DATA_DIR = path.join(ROOT_DIR, 'data');
export const SCHEMA_DIR = path.join(ROOT_DIR, 'schema');

export const COLLECTION_FILES: Record<RegistryCollection, string> = {
  providers: 'providers.json',
  models: 'models.json',
  modelRoutes: 'model-routes.json',
  pricingRecords: 'pricing-records.json',
  capabilityProfiles: 'capability-profiles.json',
  suitabilityProfiles: 'suitability-profiles.json',
  integrationMetadata: 'integration-metadata.json',
};

export const COLLECTION_SCHEMA_FILES: Record<RegistryCollection, string> = {
  providers: 'provider.schema.json',
  models: 'model.schema.json',
  modelRoutes: 'model-route.schema.json',
  pricingRecords: 'pricing-record.schema.json',
  capabilityProfiles: 'capability-profile.schema.json',
  suitabilityProfiles: 'suitability-profile.schema.json',
  integrationMetadata: 'integration-metadata.schema.json',
};
