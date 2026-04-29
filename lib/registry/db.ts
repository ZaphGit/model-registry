import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT_DIR } from './constants';

const DB_DIR = path.join(ROOT_DIR, 'desktop');
export const DB_PATH = path.join(DB_DIR, 'model-registry.sqlite');

let dbInstance: Database.Database | null = null;

export function getDb() {
  if (!dbInstance) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
  }

  return dbInstance;
}

export function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      FOREIGN KEY(provider_id) REFERENCES providers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS model_routes (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      FOREIGN KEY(model_id) REFERENCES models(id) ON DELETE CASCADE,
      FOREIGN KEY(provider_id) REFERENCES providers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pricing_records (
      id TEXT PRIMARY KEY,
      model_route_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      FOREIGN KEY(model_route_id) REFERENCES model_routes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS capability_profiles (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      FOREIGN KEY(model_id) REFERENCES models(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS suitability_profiles (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      FOREIGN KEY(model_id) REFERENCES models(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS integration_metadata (
      id TEXT PRIMARY KEY,
      model_route_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      FOREIGN KEY(model_route_id) REFERENCES model_routes(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_models_provider_id ON models(provider_id);
    CREATE INDEX IF NOT EXISTS idx_model_routes_model_id ON model_routes(model_id);
    CREATE INDEX IF NOT EXISTS idx_model_routes_provider_id ON model_routes(provider_id);
    CREATE INDEX IF NOT EXISTS idx_pricing_records_model_route_id ON pricing_records(model_route_id);
    CREATE INDEX IF NOT EXISTS idx_capability_profiles_model_id ON capability_profiles(model_id);
    CREATE INDEX IF NOT EXISTS idx_suitability_profiles_model_id ON suitability_profiles(model_id);
    CREATE INDEX IF NOT EXISTS idx_integration_metadata_model_route_id ON integration_metadata(model_route_id);
  `);

  return db;
}
