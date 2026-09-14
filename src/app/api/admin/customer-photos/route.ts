import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { getCustomerPhotos, uploadCustomerPhoto } from '@/lib/customer-photos-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/customer-photos
 * Admin-only: retrieve all customer photos for management.
 */
export async function GET() {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    const { row1, row2, all } = await getCustomerPhotos();

    return NextResponse.json({
      success: true,
      photos: all,
      row1,
      row2,
    });
  } catch (err: any) {
    console.error('[GET /api/admin/customer-photos Exception]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch customer photos.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/customer-photos
 * Admin-only: upload a photo and assign to Row 1 or Row 2.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const rowRaw = formData.get('row');
    const rowNum = Number(rowRaw);
    const row: 1 | 2 = rowNum === 2 ? 2 : 1;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Please select an image file to upload.' },
        { status: 400 }
      );
    }

    // Validate image format
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/jpg'];
    const isExtensionValid = Boolean(file.name && file.name.match(/\.(jpg|jpeg|png|webp|avif)$/i));
    if (!validMimeTypes.includes(file.type.toLowerCase()) && !isExtensionValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, WebP, and AVIF images are allowed.' },
        { status: 400 }
      );
    }

    // Validate size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'Image file size exceeds 10MB limit.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadCustomerPhoto(buffer, file.name, file.type || 'image/jpeg', row);

    if (!result.success || !result.photo) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to upload customer photo.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      photo: result.photo,
    });
  } catch (err: any) {
    console.error('[POST /api/admin/customer-photos Exception]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process customer photo upload.' },
      { status: 500 }
    );
  }
}
