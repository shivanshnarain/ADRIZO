import { NextResponse } from 'next/server';
import { getCustomerPhotos } from '@/lib/customer-photos-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/customer-photos
 * Public endpoint to fetch customer showcase photos for Row 1 and Row 2.
 */
export async function GET() {
  try {
    const data = await getCustomerPhotos();

    return NextResponse.json(
      {
        success: true,
        row1: data.row1,
        row2: data.row2,
        total: data.all.length,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        },
      }
    );
  } catch (err: any) {
    console.error('[GET /api/customer-photos Exception]:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer photos.' },
      { status: 500 }
    );
  }
}
