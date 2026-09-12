import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { updateReviewStatus, deleteReview } from '@/lib/reviews-service';
import { ReviewStatus } from '@/types/review';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/reviews/[id]
 * Admin-only: update review status (approve or reject).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
    }

    const resolvedParams = await (params as any);
    const reviewId = resolvedParams.id;

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID is required.' }, { status: 400 });
    }

    const body = await req.json();
    const { status } = body;

    if (status !== 'approved' && status !== 'rejected' && status !== 'pending') {
      return NextResponse.json({
        error: "Invalid status. Must be 'approved', 'rejected', or 'pending'.",
      }, { status: 400 });
    }

    const result = await updateReviewStatus(reviewId, status as ReviewStatus);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to update review status.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, status });
  } catch (err: any) {
    console.error('[PATCH /api/admin/reviews/[id] Exception]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/reviews/[id]
 * Admin-only: permanently delete a review document.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
    }

    const resolvedParams = await (params as any);
    const reviewId = resolvedParams.id;

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID is required.' }, { status: 400 });
    }

    const result = await deleteReview(reviewId);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to delete review.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/admin/reviews/[id] Exception]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
