import { SqliteRegistryStore } from './sqlite-store';
import type { Model } from './types';

export interface UpdateModelInput {
  id: string;
  displayName: string;
  family: string;
  tier: string;
  status: Model['status'];
  description?: string;
  notes?: string;
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
