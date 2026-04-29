import { RegistryStore } from './store';
import { getDb, initDb } from './db';
import type { CapabilityProfile, IntegrationMetadata, Model, ModelRoute, PricingRecord, Provider, RegistrySnapshot, SuitabilityProfile } from './types';

type Row = { id: string; payload: string };

function parseRows<T>(rows: Row[]): T[] {
  return rows.map((row) => JSON.parse(row.payload) as T);
}

export class SqliteRegistryStore {
  static seedFromJson() {
    const snapshotPromise = RegistryStore.readSnapshot();
    return snapshotPromise.then((snapshot) => {
      const db = initDb();
      const tx = db.transaction((data: RegistrySnapshot) => {
        db.exec(`
          DELETE FROM integration_metadata;
          DELETE FROM pricing_records;
          DELETE FROM suitability_profiles;
          DELETE FROM capability_profiles;
          DELETE FROM model_routes;
          DELETE FROM models;
          DELETE FROM providers;
        `);

        const insertProvider = db.prepare('INSERT INTO providers (id, payload) VALUES (?, ?)');
        const insertModel = db.prepare('INSERT INTO models (id, provider_id, payload) VALUES (?, ?, ?)');
        const insertRoute = db.prepare('INSERT INTO model_routes (id, model_id, provider_id, payload) VALUES (?, ?, ?, ?)');
        const insertPricing = db.prepare('INSERT INTO pricing_records (id, model_route_id, payload) VALUES (?, ?, ?)');
        const insertCapability = db.prepare('INSERT INTO capability_profiles (id, model_id, payload) VALUES (?, ?, ?)');
        const insertSuitability = db.prepare('INSERT INTO suitability_profiles (id, model_id, payload) VALUES (?, ?, ?)');
        const insertIntegration = db.prepare('INSERT INTO integration_metadata (id, model_route_id, payload) VALUES (?, ?, ?)');

        for (const record of data.providers) insertProvider.run(record.id, JSON.stringify(record));
        for (const record of data.models) insertModel.run(record.id, record.providerId, JSON.stringify(record));
        for (const record of data.modelRoutes) insertRoute.run(record.id, record.modelId, record.providerId, JSON.stringify(record));
        for (const record of data.pricingRecords) insertPricing.run(record.id, record.modelRouteId, JSON.stringify(record));
        for (const record of data.capabilityProfiles) insertCapability.run(record.id, record.modelId, JSON.stringify(record));
        for (const record of data.suitabilityProfiles) insertSuitability.run(record.id, record.modelId, JSON.stringify(record));
        for (const record of data.integrationMetadata) insertIntegration.run(record.id, record.modelRouteId, JSON.stringify(record));
      });

      tx(snapshot);
      return snapshot;
    });
  }

  static readSnapshot(): RegistrySnapshot {
    const db = initDb();

    const providers = parseRows<Provider>(db.prepare('SELECT id, payload FROM providers ORDER BY id').all() as Row[]);
    const models = parseRows<Model>(db.prepare('SELECT id, payload FROM models ORDER BY id').all() as Row[]);
    const modelRoutes = parseRows<ModelRoute>(db.prepare('SELECT id, payload FROM model_routes ORDER BY id').all() as Row[]);
    const pricingRecords = parseRows<PricingRecord>(db.prepare('SELECT id, payload FROM pricing_records ORDER BY id').all() as Row[]);
    const capabilityProfiles = parseRows<CapabilityProfile>(db.prepare('SELECT id, payload FROM capability_profiles ORDER BY id').all() as Row[]);
    const suitabilityProfiles = parseRows<SuitabilityProfile>(db.prepare('SELECT id, payload FROM suitability_profiles ORDER BY id').all() as Row[]);
    const integrationMetadata = parseRows<IntegrationMetadata>(db.prepare('SELECT id, payload FROM integration_metadata ORDER BY id').all() as Row[]);

    return { providers, models, modelRoutes, pricingRecords, capabilityProfiles, suitabilityProfiles, integrationMetadata };
  }

  static getDb() {
    return getDb();
  }
}
