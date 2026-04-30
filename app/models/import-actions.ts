'use server';

import { revalidatePath } from 'next/cache';
import { parseModelBundleImport } from '@/lib/registry/import';
import { upsertModelBundle } from '@/lib/registry/update';

export async function importModelBundleAction(formData: FormData) {
  const payload = String(formData.get('payload') ?? '').trim();
  if (!payload) throw new Error('Import payload is required.');

  const bundle = parseModelBundleImport(payload);
  upsertModelBundle(bundle);
  revalidatePath('/models');
}
