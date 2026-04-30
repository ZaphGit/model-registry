import { ModelEditor } from './ModelEditor';
import { getModelDetailRecord, getModelListRows } from '@/lib/registry/queries';
import { SqliteRegistryStore } from '@/lib/registry/sqlite-store';

export default async function ModelsPage() {
  let snapshot = SqliteRegistryStore.readSnapshot();

  if (snapshot.providers.length === 0 && snapshot.models.length === 0) {
    await SqliteRegistryStore.seedFromJson();
    snapshot = SqliteRegistryStore.readSnapshot();
  }

  const rows = getModelListRows();
  const details = rows.map((row) => getModelDetailRecord(row.modelId)).filter((detail): detail is NonNullable<typeof detail> => Boolean(detail));
  const providerOptions = snapshot.providers.map((provider) => ({ id: provider.id, name: provider.name }));

  return (
    <main style={{ padding: '32px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 8 }}>Model Registry</h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>SQLite-backed beta registry. Click a model row to inspect or edit it inline.</p>
      </div>

      <ModelEditor rows={rows} details={details} providerOptions={providerOptions} />

      <div style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
        Modal-first editing is now the default interaction model for the MVP.
      </div>
    </main>
  );
}
