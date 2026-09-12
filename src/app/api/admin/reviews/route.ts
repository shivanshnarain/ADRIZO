import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { getAdminReviews } from '@/lib/reviews-service';
import { ReviewStatus } from '@/types/review';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/reviews?status=...&productId=...
 * Admin-only endpoint to fetch reviews for moderation.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = (searchParams.get('status') || 'all') as ReviewStatus | 'all';
    const productId = searchParams.get('productId') || undefined;
    const limit = Number(searchParams.get('limit')) || 100;

    const data = await getAdminReviews({
      status: statusParam,
      productId,
      limit,
    });

    return NextResponse.json({
      success: true,
      reviews: data.reviews,
      counts: data.counts,
    });
  } catch (err: any) {
    console.error('[GET /api/admin/reviews Exception]:', err);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch reviews for administration.',
    }, { status: 500 });
  }
}
