import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { deleteCloudinaryAsset } from '@/lib/cloudinary';

export async function POST(request: Request) {
  try {
    const adminCheck = await verifyAdminSession();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const { publicId } = await request.json();
    if (!publicId) {
      return NextResponse.json({ error: 'Missing publicId' }, { status: 400 });
    }

    const result = await deleteCloudinaryAsset(publicId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error deleting asset from Cloudinary:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete asset' },
      { status: 500 }
    );
  }
}
