import { NextResponse } from 'next/server';
import { getModelListRows } from '@/lib/registry/queries';

export async function GET() {
  try {
    const rows = getModelListRows();
    return NextResponse.json({
      ok: true,
      count: rows.length,
      rows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown model listing error.',
      },
      { status: 500 },
    );
  }
}
