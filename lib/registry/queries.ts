import { SqliteRegistryStore } from './sqlite-store';
import type { CapabilityProfile, IntegrationMetadata, Model, ModelRoute, PricingRecord, Provider, SuitabilityProfile } from './types';

export interface ModelListRow {
  modelId: string;
  displayName: string;
  providerName: string;
  family: string;
  tier: string;
  status: string;
  routeLabel: string | null;
  routeType: string | null;
  inputPrice: number | null;
  outputPrice: number | null;
  contextWindow: number | null;
  supportsTools: boolean | null;
  qualityClass: string | null;
  integrationTargets: string[];
  suitabilityKeywords: string[];
}

export interface ModelDetailRecord {
  model: Model;
  provider: Provider | null;
  routes: ModelRoute[];
  pricingRecords: PricingRecord[];
  capabilityProfile: CapabilityProfile | null;
  suitabilityProfile: SuitabilityProfile | null;
  integrationMetadata: IntegrationMetadata[];
}

type PayloadRow = { payload: string };

function parsePayloadRows<T>(rows: PayloadRow[]): T[] {
  return rows.map((row) => JSON.parse(row.payload) as T);
}

export function getModelListRows(): ModelListRow[] {
  const snapshot = SqliteRegistryStore.readSnapshot();

  return snapshot.models.map((model) => {
    const provider = snapshot.providers.find((item) => item.id === model.providerId) ?? null;
    const routes = snapshot.modelRoutes.filter((item) => item.modelId === model.id);
    const primaryRoute = routes[0] ?? null;
    const primaryPricing = primaryRoute ? snapshot.pricingRecords.find((item) => item.modelRouteId === primaryRoute.id) ?? null : null;
    const capability = snapshot.capabilityProfiles.find((item) => item.modelId === model.id) ?? null;
    const suitability = snapshot.suitabilityProfiles.find((item) => item.modelId === model.id) ?? null;
    const integrationTargets = snapshot.integrationMetadata
      .filter((item) => routes.some((route) => route.id === item.modelRouteId))
      .map((item) => item.integrationTarget);

    const suitabilityKeywords = [
      ...Object.keys(suitability?.skillScores ?? {}),
      ...Object.keys(suitability?.taskScores ?? {}),
      ...Object.keys(suitability?.agentTypeScores ?? {}),
      ...(suitability?.recommendedFor ?? []),
    ];

    return {
      modelId: model.id,
      displayName: model.displayName,
      providerName: provider?.name ?? 'Unknown provider',
      family: model.family,
      tier: model.tier,
      status: model.status,
      routeLabel: primaryRoute?.label ?? null,
      routeType: primaryRoute?.routeType ?? null,
      inputPrice: primaryPricing?.inputPrice ?? null,
      outputPrice: primaryPricing?.outputPrice ?? null,
      contextWindow: capability?.limits?.contextWindow ?? null,
      supportsTools: primaryRoute?.supportsTools ?? null,
      qualityClass: capability?.operationalClasses?.qualityClass ?? null,
      integrationTargets,
      suitabilityKeywords,
    };
  });
}

export function getModelDetailRecord(modelId: string): ModelDetailRecord | null {
  const db = SqliteRegistryStore.getDb();

  const modelRow = db.prepare('SELECT payload FROM models WHERE id = ?').get(modelId) as PayloadRow | undefined;
  if (!modelRow) return null;

  const model = JSON.parse(modelRow.payload) as Model;

  const providerRow = db.prepare('SELECT payload FROM providers WHERE id = ?').get(model.providerId) as PayloadRow | undefined;
  const routeRows = db.prepare('SELECT payload FROM model_routes WHERE model_id = ? ORDER BY id').all(modelId) as PayloadRow[];
  const routes = parsePayloadRows<ModelRoute>(routeRows);
  const routeIds = routes.map((route) => route.id);

  const pricingRecords = routeIds.length
    ? parsePayloadRows<PricingRecord>(
        db.prepare(`SELECT payload FROM pricing_records WHERE model_route_id IN (${routeIds.map(() => '?').join(', ')}) ORDER BY id`).all(...routeIds) as PayloadRow[],
      )
    : [];

  const capabilityRow = db.prepare('SELECT payload FROM capability_profiles WHERE model_id = ? LIMIT 1').get(modelId) as PayloadRow | undefined;
  const suitabilityRow = db.prepare('SELECT payload FROM suitability_profiles WHERE model_id = ? LIMIT 1').get(modelId) as PayloadRow | undefined;

  const integrationMetadata = routeIds.length
    ? parsePayloadRows<IntegrationMetadata>(
        db.prepare(`SELECT payload FROM integration_metadata WHERE model_route_id IN (${routeIds.map(() => '?').join(', ')}) ORDER BY id`).all(...routeIds) as PayloadRow[],
      )
    : [];

  return {
    model,
    provider: providerRow ? (JSON.parse(providerRow.payload) as Provider) : null,
    routes,
    pricingRecords,
    capabilityProfile: capabilityRow ? (JSON.parse(capabilityRow.payload) as CapabilityProfile) : null,
    suitabilityProfile: suitabilityRow ? (JSON.parse(suitabilityRow.payload) as SuitabilityProfile) : null,
    integrationMetadata,
  };
}
