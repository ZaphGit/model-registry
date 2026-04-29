'use server';

import { revalidatePath } from 'next/cache';
import { updateModelRecord } from '@/lib/registry/update';
import type { Model } from '@/lib/registry/types';

function asModelStatus(value: string): Model['status'] {
  if (value === 'active' || value === 'preview' || value === 'deprecated' || value === 'experimental' || value === 'disabled') {
    return value;
  }

  return 'active';
}

export async function saveModelAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const displayName = String(formData.get('displayName') ?? '').trim();
  const family = String(formData.get('family') ?? '').trim();
  const tier = String(formData.get('tier') ?? '').trim();
  const status = asModelStatus(String(formData.get('status') ?? 'active'));
  const description = String(formData.get('description') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();

  if (!id || !displayName || !family || !tier) {
    throw new Error('Model id, display name, family, and tier are required.');
  }

  updateModelRecord({
    id,
    displayName,
    family,
    tier,
    status,
    description,
    notes,
  });

  revalidatePath('/models');
}
