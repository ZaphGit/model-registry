import { NextResponse } from 'next/server';
import { parseModelBundleImport, summariseModelBundleImport } from '@/lib/registry/import';
import { upsertModelBundle } from '@/lib/registry/update';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    const bundle = parseModelBundleImport(payload);
    const summary = summariseModelBundleImport(bundle);
    const result = upsertModelBundle(bundle);

    return NextResponse.json({
      ok: true,
      modelId: result.modelId,
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown import error.',
      },
      { status: 400 },
    );
  }
}
