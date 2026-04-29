import { promises as fs } from 'node:fs';
import path from 'node:path';
import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { COLLECTION_FILES, COLLECTION_SCHEMA_FILES, DATA_DIR, SCHEMA_DIR } from './constants';
import type { RegistryCollection, RegistrySnapshot } from './types';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validators = new Map<RegistryCollection, ValidateFunction>();

async function ensureArrayFile(filePath: string) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, '[]\n', 'utf8');
  }
}

async function loadValidator(collection: RegistryCollection): Promise<ValidateFunction> {
  const cached = validators.get(collection);
  if (cached) return cached;

  const schemaPath = path.join(SCHEMA_DIR, COLLECTION_SCHEMA_FILES[collection]);
  const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'));
  const validator = ajv.compile({
    type: 'array',
    items: schema,
  });

  validators.set(collection, validator);
  return validator;
}

async function readCollection<T>(collection: RegistryCollection): Promise<T[]> {
  const filePath = path.join(DATA_DIR, COLLECTION_FILES[collection]);
  await ensureArrayFile(filePath);

  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  const validator = await loadValidator(collection);

  if (!validator(parsed)) {
    const detail = ajv.errorsText(validator.errors, { separator: '\n' });
    throw new Error(`Invalid ${collection} data in ${filePath}:\n${detail}`);
  }

  return parsed as T[];
}

async function writeCollection(collection: RegistryCollection, records: unknown[]): Promise<void> {
  const validator = await loadValidator(collection);

  if (!validator(records)) {
    const detail = ajv.errorsText(validator.errors, { separator: '\n' });
    throw new Error(`Refusing to write invalid ${collection} data:\n${detail}`);
  }

  const filePath = path.join(DATA_DIR, COLLECTION_FILES[collection]);
  await fs.writeFile(filePath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
}

export class RegistryStore {
  static async readSnapshot(): Promise<RegistrySnapshot> {
    const [providers, models, modelRoutes, pricingRecords, capabilityProfiles, suitabilityProfiles, integrationMetadata] =
      await Promise.all([
        readCollection<RegistrySnapshot['providers'][number]>('providers'),
        readCollection<RegistrySnapshot['models'][number]>('models'),
        readCollection<RegistrySnapshot['modelRoutes'][number]>('modelRoutes'),
        readCollection<RegistrySnapshot['pricingRecords'][number]>('pricingRecords'),
        readCollection<RegistrySnapshot['capabilityProfiles'][number]>('capabilityProfiles'),
        readCollection<RegistrySnapshot['suitabilityProfiles'][number]>('suitabilityProfiles'),
        readCollection<RegistrySnapshot['integrationMetadata'][number]>('integrationMetadata'),
      ]);

    return {
      providers,
      models,
      modelRoutes,
      pricingRecords,
      capabilityProfiles,
      suitabilityProfiles,
      integrationMetadata,
    };
  }

  static async readCollection<K extends RegistryCollection>(collection: K): Promise<RegistrySnapshot[K]> {
    return readCollection(collection) as Promise<RegistrySnapshot[K]>;
  }

  static async writeCollection<K extends RegistryCollection>(collection: K, records: RegistrySnapshot[K]): Promise<void> {
    return writeCollection(collection, records as RegistrySnapshot[RegistryCollection]);
  }
}
