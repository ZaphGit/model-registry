import { NextResponse } from 'next/server';
import { getModelDetailRecord } from '@/lib/registry/queries';
import { extractProvenance } from '@/lib/registry/provenance';

export async function GET(request: Request, context: { params: Promise<{ modelId: string }> }) {
  try {
    const { modelId } = await context.params;
    const detail = getModelDetailRecord(modelId);

    if (!detail) {
      return NextResponse.json(
        {
          ok: false,
          error: `Model not found: ${modelId}`,
        },
        { status: 404 },
      );
    }

    const url = new URL(request.url);
    const includeProvenance = url.searchParams.get('include') === 'provenance';

    return NextResponse.json({
      ok: true,
      modelId,
      detail,
      provenance: includeProvenance ? extractProvenance(detail) : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown model detail error.',
      },
      { status: 500 },
    );
  }
}
