import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { getCustomerPhotos, uploadCustomerPhoto } from '@/lib/customer-photos-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/customer-photos
 * Admin-only: retrieve all customer photos for management.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    const isRefresh = req.nextUrl.searchParams.get('refresh') === 'true';
    const { row1, row2, all } = await getCustomerPhotos(isRefresh);

    return NextResponse.json(
      {
        success: true,
        photos: all,
        row1,
        row2,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
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
 * Admin-only: upload single or multiple photos and assign to Row 1 or Row 2.
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
    const rowRaw = formData.get('row');
    const rowNum = Number(rowRaw);
    const row: 1 | 2 = rowNum === 2 ? 2 : 1;

    // Collect all uploaded files (supports both 'files' array and multiple 'file' keys or single 'file')
    const files: File[] = [];
    const filesAll = formData.getAll('files') as File[];
    if (filesAll && filesAll.length > 0) {
      for (const f of filesAll) {
        if (f && typeof f === 'object' && f.name) files.push(f);
      }
    }
    const singleFilesAll = formData.getAll('file') as File[];
    if (singleFilesAll && singleFilesAll.length > 0) {
      for (const f of singleFilesAll) {
        if (f && typeof f === 'object' && f.name && !files.includes(f)) files.push(f);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please select at least one image file to upload.' },
        { status: 400 }
      );
    }

    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/jpg'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    const uploadedPhotos: any[] = [];
    const failedFiles: { name: string; error: string }[] = [];

    for (const file of files) {
      const isExtensionValid = Boolean(file.name && file.name.match(/\.(jpg|jpeg|png|webp|avif)$/i));
      const mime = (file.type || '').toLowerCase();
      if (!validMimeTypes.includes(mime) && !isExtensionValid) {
        failedFiles.push({
          name: file.name,
          error: 'Invalid file format. Supported: JPEG, PNG, WebP, AVIF.',
        });
        continue;
      }

      if (file.size > maxSize) {
        failedFiles.push({
          name: file.name,
          error: 'File exceeds 10MB size limit.',
        });
        continue;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const result = await uploadCustomerPhoto(buffer, file.name, file.type || 'image/jpeg', row);

        if (result.success && result.photo) {
          uploadedPhotos.push(result.photo);
        } else {
          failedFiles.push({
            name: file.name,
            error: result.error || 'Failed to process upload.',
          });
        }
      } catch (err: any) {
        failedFiles.push({
          name: file.name,
          error: err.message || 'Error processing file.',
        });
      }
    }

    // If only one file was sent and it failed, return a 400 with the error
    if (files.length === 1 && uploadedPhotos.length === 0) {
      return NextResponse.json(
        { success: false, error: failedFiles[0]?.error || 'Failed to upload photo.' },
        { status: 400 }
      );
    }

    // If multiple files were sent and all failed
    if (files.length > 1 && uploadedPhotos.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'All photos failed to upload.',
          failed: failedFiles,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      photo: uploadedPhotos[0],
      photos: uploadedPhotos,
      failed: failedFiles.length > 0 ? failedFiles : undefined,
    });
  } catch (err: any) {
    console.error('[POST /api/admin/customer-photos Exception]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process customer photo upload.' },
      { status: 500 }
    );
  }
}

