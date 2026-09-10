import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { cloudinary } from '@/lib/cloudinary';

export async function POST(request: Request) {
  try {
    const adminCheck = await verifyAdminSession();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/jpg'];
    const isExtensionValid = Boolean(file.name && file.name.match(/\.(jpg|jpeg|png|webp|avif)$/i));
    if (!validTypes.includes(file.type.toLowerCase()) && !isExtensionValid) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, WebP, and AVIF are allowed.' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload directly to Cloudinary stream
    const uploadResult: any = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'adrizo/products',
          resource_type: 'image',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
    });
  } catch (error: any) {
    console.error('Error uploading file to Cloudinary:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload file to Cloudinary' }, { status: 500 });
  }
}
