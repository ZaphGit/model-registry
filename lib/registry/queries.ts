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
  const db = SqliteRegistryStore.getDb();

  const rows = db.prepare(`
    SELECT
      m.id AS modelId,
      json_extract(m.payload, '$.displayName') AS displayName,
      json_extract(p.payload, '$.name') AS providerName,
      json_extract(m.payload, '$.family') AS family,
      json_extract(m.payload, '$.tier') AS tier,
      json_extract(m.payload, '$.status') AS status,
      json_extract(r.payload, '$.label') AS routeLabel,
      json_extract(r.payload, '$.routeType') AS routeType,
      json_extract(pr.payload, '$.inputPrice') AS inputPrice,
      json_extract(pr.payload, '$.outputPrice') AS outputPrice,
      json_extract(cp.payload, '$.limits.contextWindow') AS contextWindow,
      json_extract(r.payload, '$.supportsTools') AS supportsTools,
      json_extract(cp.payload, '$.operationalClasses.qualityClass') AS qualityClass
    FROM models m
    INNER JOIN providers p ON p.id = m.provider_id
    LEFT JOIN model_routes r ON r.model_id = m.id
    LEFT JOIN pricing_records pr ON pr.model_route_id = r.id
    LEFT JOIN capability_profiles cp ON cp.model_id = m.id
    ORDER BY providerName, displayName
  `).all() as ModelListRow[];

  return rows;
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
