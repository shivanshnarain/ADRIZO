import fs from 'fs';
import path from 'path';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  deleteDoc, 
  orderBy,
  serverTimestamp, 
  Timestamp,
} from 'firebase/firestore';
import { 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject, 
} from 'firebase/storage';
import { db, storage } from './firebase';
import { prisma } from './prisma';
import { v4 as uuidv4 } from 'uuid';

export const CUSTOMER_PHOTOS_COLLECTION = 'customerPhotos';
const FIRESTORE_TIMEOUT_MS = 1500;
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
async function withTimeout<T>(promise: Promise<T>, timeoutMs = FIRESTORE_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Format timestamp or Date safely to an ISO string.
 */
function toIsoString(val: any): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val.toDate === 'function') return val.toDate().toISOString();
  if (val.seconds) return new Date(val.seconds * 1000).toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

/**
 * Retrieve all customer photos, ordered by newest first.
 * Queries Firestore with graceful fallback to database.
 */
export async function getCustomerPhotos(): Promise<{
  row1: CustomerPhotoItem[];
  row2: CustomerPhotoItem[];
  all: CustomerPhotoItem[];
}> {
  // 1. Fast path: return fresh in-memory cache if available (0ms)
  if (cachedPhotosData && Date.now() - cachedPhotosData.timestamp < CACHE_TTL_MS) {
    return cachedPhotosData;
  }

  let photos: CustomerPhotoItem[] = [];

  // 2. Primary database query (sub-10ms)
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
        createdAt: p.createdAt.toISOString(),
      }));
    }
  } catch (prismaErr) {
    console.warn('[getCustomerPhotos Prisma Notice]:', prismaErr);
  }

  // 3. Fallback to Firestore if database was empty or errored
  if (photos.length === 0) {
    try {
      const photosCol = collection(db, CUSTOMER_PHOTOS_COLLECTION);
      const q = query(photosCol, orderBy('createdAt', 'desc'));
      const snapshot = await withTimeout(getDocs(q), FIRESTORE_TIMEOUT_MS);

      if (!snapshot.empty) {
        photos = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            imageUrl: data.imageUrl || '',
            storagePath: data.storagePath || '',
            row: (data.row === 2 ? 2 : 1) as 1 | 2,
            createdAt: toIsoString(data.createdAt),
          };
        });
      }
    } catch (firestoreErr) {
      // Offline fallback
    }
  }

  const row1 = photos.filter((p) => p.row === 1);
  const row2 = photos.filter((p) => p.row === 2);

  const result = { row1, row2, all: photos, timestamp: Date.now() };
  cachedPhotosData = result;

  return result;
}

/**
 * Upload a customer photo file and save metadata to Firebase Storage + Firestore + Database.
 */
export async function uploadCustomerPhoto(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  row: 1 | 2
): Promise<{ success: boolean; photo?: CustomerPhotoItem; error?: string }> {
  try {
    const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    const uniqueId = uuidv4();
    const storageFileKey = `customer-photo-r${row}-${Date.now()}-${uniqueId}.${ext}`;
    const storagePath = `customer-photos/${storageFileKey}`;

    let imageUrl = '';

    // 1. Attempt Firebase Storage upload
    try {
      const sRef = storageRef(storage, storagePath);
      const uploadRes = await withTimeout(
        uploadBytes(sRef, fileBuffer, {
          contentType: mimeType,
          customMetadata: { row: String(row) },
        }),
        6000
      );
      imageUrl = await withTimeout(getDownloadURL(uploadRes.ref), 4000);
    } catch (storageErr: any) {
      console.warn('[Firebase Storage Notice]:', storageErr.message || storageErr.code);
      
      // Resilient local public storage fallback in public/uploads/customer-photos
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'customer-photos');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const localFilePath = path.join(uploadDir, storageFileKey);
      fs.writeFileSync(localFilePath, fileBuffer);
      imageUrl = `/uploads/customer-photos/${storageFileKey}`;
    }

    if (!imageUrl) {
      return { success: false, error: 'Failed to generate image storage URL.' };
    }

    // 2. Primary database record
    const dbRecord = await prismaCustomerPhoto.create({
      data: {
        imageUrl,
        storagePath,
        row,
      },
    });

    const photoId = dbRecord.id;

    // 3. Dual write to Cloud Firestore
    try {
      const photosCol = collection(db, CUSTOMER_PHOTOS_COLLECTION);
      await withTimeout(
        addDoc(photosCol, {
          id: photoId,
          imageUrl,
          storagePath,
          row,
          createdAt: serverTimestamp(),
        }),
        FIRESTORE_TIMEOUT_MS
      );
    } catch (firestoreWriteErr) {
      // Non-blocking for primary record
    }

    const photoItem: CustomerPhotoItem = {
      id: photoId,
      imageUrl,
      storagePath,
      row,
      createdAt: dbRecord.createdAt.toISOString(),
    };

    invalidateCustomerPhotosCache();
    return { success: true, photo: photoItem };
  } catch (err: any) {
    console.error('[uploadCustomerPhoto Exception]:', err);
    return { success: false, error: err.message || 'Failed to upload customer photo' };
  }
}

/**
 * Delete a customer photo from Firebase Storage and remove document from Firestore and DB.
 */
export async function deleteCustomerPhoto(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Valid photo ID is required for deletion.' };
    }

    // 1. Locate photo in database or Firestore to obtain storagePath
    let photoRecord: { id: string; storagePath: string; imageUrl: string } | null = null;

    try {
      photoRecord = await prismaCustomerPhoto.findUnique({
        where: { id },
      });
    } catch (findErr) {
      // Continue to Firestore check
    }

    let firestoreDocId = id;
    if (!photoRecord) {
      try {
        const photosCol = collection(db, CUSTOMER_PHOTOS_COLLECTION);
        const q = query(photosCol, where('id', '==', id));
        const snap = await withTimeout(getDocs(q), FIRESTORE_TIMEOUT_MS);
        if (!snap.empty) {
          const d = snap.docs[0];
          firestoreDocId = d.id;
          const data = d.data();
          photoRecord = {
            id,
            storagePath: data.storagePath || '',
            imageUrl: data.imageUrl || '',
          };
        }
      } catch (fErr) {
        // Continue
      }
    }

    const storagePath = photoRecord?.storagePath;
    const imageUrl = photoRecord?.imageUrl;

    // 2. Delete file from Firebase Storage
    if (storagePath) {
      try {
        const sRef = storageRef(storage, storagePath);
        await withTimeout(deleteObject(sRef), 4000);
      } catch (storageDelErr: any) {
        // If file not found or bucket disabled, check local fallback
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

    // 3. Delete from Firestore
    try {
      const docRef = doc(db, CUSTOMER_PHOTOS_COLLECTION, firestoreDocId);
      await withTimeout(deleteDoc(docRef), FIRESTORE_TIMEOUT_MS);
    } catch (fDelErr) {
      // Non-blocking
    }

    // 4. Delete from Prisma
    try {
      await prismaCustomerPhoto.delete({
        where: { id },
      });
    } catch (prismaDelErr: any) {
      // If already deleted or not found
      if (prismaDelErr.code !== 'P2025') {
        console.warn('[Prisma delete warning]:', prismaDelErr);
      }
    }

    invalidateCustomerPhotosCache();
    return { success: true };
  } catch (err: any) {
    console.error('[deleteCustomerPhoto Exception]:', err);
    return { success: false, error: err.message || 'Failed to delete customer photo' };
  }
}
