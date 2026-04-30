'use server';

import { revalidatePath } from 'next/cache';
import { parseModelBundleImport, summariseModelBundleImport } from '@/lib/registry/import';
import { upsertModelBundle } from '@/lib/registry/update';

export interface ImportModelBundleResult {
  ok: boolean;
  summary?: {
    providerId: string;
    apiModelId: string;
    routeCount: number;
    pricingCount: number;
    integrationCount: number;
  };
  modelId?: string;
  error?: string;
}

export async function importModelBundleAction(_previousState: ImportModelBundleResult | null, formData: FormData): Promise<ImportModelBundleResult> {
  try {
    const payload = String(formData.get('payload') ?? '').trim();
    if (!payload) throw new Error('Import payload is required.');

    const bundle = parseModelBundleImport(payload);
    const summary = summariseModelBundleImport(bundle);
    const result = upsertModelBundle(bundle);
    revalidatePath('/models');

    return {
      ok: true,
      summary,
      modelId: result.modelId,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown import error.',
    };
  }
}
