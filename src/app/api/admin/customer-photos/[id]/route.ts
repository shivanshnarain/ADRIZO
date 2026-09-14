import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { deleteCustomerPhoto } from '@/lib/customer-photos-service';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/admin/customer-photos/[id]
 * Admin-only: delete a photo from Firebase Storage and document from Firestore/database.
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing customer photo ID.' },
        { status: 400 }
      );
    }

    const result = await deleteCustomerPhoto(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to delete customer photo.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully.',
    });
  } catch (err: any) {
    console.error('[DELETE /api/admin/customer-photos/[id] Exception]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete photo.' },
      { status: 500 }
    );
  }
}
