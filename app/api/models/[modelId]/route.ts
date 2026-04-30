import { NextResponse } from 'next/server';
import { getModelDetailRecord } from '@/lib/registry/queries';

export async function GET(_request: Request, context: { params: Promise<{ modelId: string }> }) {
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

    return NextResponse.json({
      ok: true,
      modelId,
      detail,
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
