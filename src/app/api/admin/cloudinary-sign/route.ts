import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { generateCloudinarySignature } from '@/lib/cloudinary';

async function handleSign(folder = 'adrizo/products') {
  try {
    const adminCheck = await verifyAdminSession();
    if (!adminCheck.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required', directUploadAvailable: false }, { status: 401 });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({
        success: true,
        directUploadAvailable: false,
        message: 'Cloudinary environment variables not configured'
      });
    }

    const signatureData = generateCloudinarySignature(folder);

    return NextResponse.json({
      success: true,
      directUploadAvailable: true,
      ...signatureData,
    });
  } catch (error: any) {
    console.error('Error generating Cloudinary signature:', error);
    return NextResponse.json({
      success: true,
      directUploadAvailable: false,
      error: error.message || 'Failed to generate upload signature'
    });
  }
}

export async function GET() {
  return handleSign('adrizo/products');
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const folder = body?.folder || 'adrizo/products';
  return handleSign(folder);
}

