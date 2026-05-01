import { getDb } from '../lib/registry/db';

const db = getDb();

const testModelIds = ['openai-gpt-5-4-test', 'openai-gpt-5-4-api-test'];

for (const id of testModelIds) {
  const routes = db.prepare('SELECT id FROM model_routes WHERE model_id = ?').all(id) as { id: string }[];
  for (const route of routes) {
    db.prepare('DELETE FROM integration_metadata WHERE model_route_id = ?').run(route.id);
    db.prepare('DELETE FROM pricing_records WHERE model_route_id = ?').run(route.id);
  }
  db.prepare('DELETE FROM model_routes WHERE model_id = ?').run(id);
  db.prepare('DELETE FROM capability_profiles WHERE model_id = ?').run(id);
  db.prepare('DELETE FROM suitability_profiles WHERE model_id = ?').run(id);
  db.prepare('DELETE FROM models WHERE id = ?').run(id);
  console.log(`Removed test artifact: ${id}`);
}

const count = (db.prepare('SELECT COUNT(*) as c FROM models').get() as { c: number }).c;
console.log(`Done. Model count now: ${count}`);
