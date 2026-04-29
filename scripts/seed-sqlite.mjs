import { SqliteRegistryStore } from '../lib/registry/sqlite-store.js';

await SqliteRegistryStore.seedFromJson();
console.log('Seeded SQLite from JSON data.');
