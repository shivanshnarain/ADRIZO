import { v2 as cloudinary } from 'cloudinary';
export { getOptimizedImageUrl } from './image-utils';

// Configure Cloudinary on the server
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

export interface CloudinarySignResponse {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
}

/**
 * Generate a secure server-side signature for direct browser -> Cloudinary uploads.
 * Keeps CLOUDINARY_API_SECRET strictly on the server.
 */
export function generateCloudinarySignature(folder = 'adrizo/products'): CloudinarySignResponse {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not configured.');
  }

  const paramsToSign: Record<string, any> = {
    folder,
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return {
    timestamp,
    signature,
    apiKey,
    cloudName,
    folder,
  };
}

/**
 * Delete an image asset permanently from Cloudinary by its public ID.
 */
export async function deleteCloudinaryAsset(publicId: string): Promise<{ success: boolean; result?: string; error?: string }> {
  try {
    if (!publicId) return { success: false, error: 'No publicId provided' };
    const result = await cloudinary.uploader.destroy(publicId);
    return { success: result.result === 'ok', result: result.result };
  } catch (error: any) {
    console.error('Error deleting Cloudinary asset:', error);
    return { success: false, error: error.message };
  }
}
