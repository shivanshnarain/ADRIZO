import fs from 'fs';
import path from 'path';
import { 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject, 
} from 'firebase/storage';
import { storage } from './firebase';
import { prisma } from './prisma';
import { v4 as uuidv4 } from 'uuid';

export const CUSTOMER_PHOTOS_COLLECTION = 'customerPhotos';
const prismaCustomerPhoto = (prisma as any).customerPhoto;

export interface CustomerPhotoItem {
  id: string;
  imageUrl: string;
  storagePath: string;
  row: 1 | 2;
  createdAt: string;
}

// In-memory cache for ultra-fast, zero-overhead reads
let cachedPhotosData: {
  row1: CustomerPhotoItem[];
  row2: CustomerPhotoItem[];
  all: CustomerPhotoItem[];
  timestamp: number;
} | null = null;

const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function invalidateCustomerPhotosCache(): void {
  cachedPhotosData = null;
}

/**
 * Execute a promise with a timeout to prevent indefinite hangs in Node.js
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs = 2000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}


/**
 * Retrieve all customer photos, ordered by newest first.
 * Queries primary database with optional cache bypass.
 */
export async function getCustomerPhotos(forceFresh = false): Promise<{
  row1: CustomerPhotoItem[];
  row2: CustomerPhotoItem[];
  all: CustomerPhotoItem[];
}> {
  // 1. Return fresh in-memory cache if available and not forced
  if (!forceFresh && cachedPhotosData && Date.now() - cachedPhotosData.timestamp < CACHE_TTL_MS) {
    return cachedPhotosData;
  }

  let photos: CustomerPhotoItem[] = [];

  // 2. Primary database query
  try {
    const dbPhotos = await prismaCustomerPhoto.findMany({
      orderBy: { createdAt: 'desc' },
    });
    if (dbPhotos && dbPhotos.length > 0) {
      photos = dbPhotos.map((p: any) => ({
        id: p.id,
        imageUrl: p.imageUrl,
        storagePath: p.storagePath,
        row: (p.row === 2 ? 2 : 1) as 1 | 2,
        createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
      }));
    }
  } catch (prismaErr) {
    console.error('[getCustomerPhotos Database Error]:', prismaErr);
  }

  const row1 = photos.filter((p) => p.row === 1);
  const row2 = photos.filter((p) => p.row === 2);

  const result = { row1, row2, all: photos, timestamp: Date.now() };
  cachedPhotosData = result;

  return result;
}

/**
 * Upload a customer photo file and save metadata to Firebase Storage + Database.
 * Ensures consistent rollback if database write fails.
 */
export async function uploadCustomerPhoto(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  row: 1 | 2
): Promise<{ success: boolean; photo?: CustomerPhotoItem; error?: string }> {
  let isFirebaseStorage = false;
  let localCreatedFilePath: string | null = null;
  let sRefToDelete: any = null;

  try {
    const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    const uniqueId = uuidv4();
    const storageFileKey = `customer-photo-r${row}-${Date.now()}-${uniqueId}.${ext}`;
    const storagePath = `customer-photos/${storageFileKey}`;

    let imageUrl = '';

    // 1. Attempt Firebase Storage upload with safety timeout
    try {
      const sRef = storageRef(storage, storagePath);
      const uploadRes = await withTimeout(
        uploadBytes(sRef, fileBuffer, {
          contentType: mimeType,
          customMetadata: { row: String(row) },
        }),
        5000
      );
      imageUrl = await withTimeout(getDownloadURL(uploadRes.ref), 4000);
      if (imageUrl) {
        isFirebaseStorage = true;
        sRefToDelete = sRef;
      }
    } catch (storageErr: any) {
      console.warn('[Firebase Storage Notice]:', storageErr?.message || storageErr?.code || storageErr);
      
      // Resilient local public storage fallback in public/uploads/customer-photos
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'customer-photos');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const localFilePath = path.join(uploadDir, storageFileKey);
      fs.writeFileSync(localFilePath, fileBuffer);
      localCreatedFilePath = localFilePath;
      imageUrl = `/uploads/customer-photos/${storageFileKey}`;
    }

    if (!imageUrl) {
      return { success: false, error: 'Failed to generate image storage URL.' };
    }

    // 2. Primary database record with rollback on failure
    let dbRecord: any = null;
    try {
      dbRecord = await prismaCustomerPhoto.create({
        data: {
          imageUrl,
          storagePath,
          row,
        },
      });
    } catch (dbErr: any) {
      console.error('[uploadCustomerPhoto DB Insertion Error]:', dbErr);
      // Clean up uploaded file to avoid orphaned storage files
      if (isFirebaseStorage && sRefToDelete) {
        try {
          await deleteObject(sRefToDelete);
        } catch {}
      }
      if (localCreatedFilePath && fs.existsSync(localCreatedFilePath)) {
        try {
          fs.unlinkSync(localCreatedFilePath);
        } catch {}
      }
      return { success: false, error: 'Database write failed. Storage cleaned up.' };
    }

    const photoItem: CustomerPhotoItem = {
      id: dbRecord.id,
      imageUrl: dbRecord.imageUrl,
      storagePath: dbRecord.storagePath,
      row: (dbRecord.row === 2 ? 2 : 1) as 1 | 2,
      createdAt: dbRecord.createdAt instanceof Date ? dbRecord.createdAt.toISOString() : new Date().toISOString(),
    };

    invalidateCustomerPhotosCache();
    return { success: true, photo: photoItem };
  } catch (err: any) {
    console.error('[uploadCustomerPhoto Exception]:', err);
    // Clean up if created
    if (localCreatedFilePath && fs.existsSync(localCreatedFilePath)) {
      try {
        fs.unlinkSync(localCreatedFilePath);
      } catch {}
    }
    return { success: false, error: err.message || 'Failed to upload customer photo.' };
  }
}

/**
 * Delete a customer photo from Storage and remove document from Database.
 */
export async function deleteCustomerPhoto(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Valid photo ID is required for deletion.' };
    }

    // 1. Locate photo in database to obtain storagePath and imageUrl
    let photoRecord: { id: string; storagePath: string; imageUrl: string } | null = null;

    try {
      photoRecord = await prismaCustomerPhoto.findUnique({
        where: { id },
      });
    } catch (findErr) {
      console.warn('[deleteCustomerPhoto findUnique error]:', findErr);
    }

    const storagePath = photoRecord?.storagePath;
    const imageUrl = photoRecord?.imageUrl;

    // 2. Delete file from Firebase Storage if applicable
    if (storagePath) {
      try {
        const sRef = storageRef(storage, storagePath);
        await withTimeout(deleteObject(sRef), 4000);
      } catch (storageDelErr: any) {
        // Safe ignore if not in Firebase Storage
      }
    }

    // Also check local uploads if path matches
    if (imageUrl && imageUrl.startsWith('/uploads/customer-photos/')) {
      try {
        const localFileName = path.basename(imageUrl);
        const localPath = path.join(process.cwd(), 'public', 'uploads', 'customer-photos', localFileName);
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      } catch (localDelErr) {
        console.warn('[Local unlink warning]:', localDelErr);
      }
    }

    // 3. Delete from Prisma Database
    try {
      await prismaCustomerPhoto.delete({
        where: { id },
      });
    } catch (prismaDelErr: any) {
      if (prismaDelErr.code !== 'P2025') {
        console.warn('[Prisma delete warning]:', prismaDelErr);
      }
    }

    invalidateCustomerPhotosCache();
    return { success: true };
  } catch (err: any) {
    console.error('[deleteCustomerPhoto Exception]:', err);
    return { success: false, error: err.message || 'Failed to delete customer photo.' };
  }
}

