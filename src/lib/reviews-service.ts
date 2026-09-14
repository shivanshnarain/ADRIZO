import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { prisma } from './prisma';
import { CustomerReview, ProductRatingStats, ReviewStatus } from '@/types/review';

const REVIEWS_COLLECTION = 'reviews';
const FIRESTORE_TIMEOUT_MS = 2500;
const prismaReview = (prisma as any).review;

/**
 * Execute a promise with a strict timeout to prevent indefinite hangs in Node.js
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs = FIRESTORE_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)),
  ]);
}

/**
 * Format Firestore timestamp or Date to an ISO string safely.
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
 * Parse a Firestore DocumentSnapshot into a typed CustomerReview.
 */
function parseFirestoreReviewDoc(d: any): CustomerReview {
  const data = d.data();
  return {
    id: d.id,
    productId: data.productId || '',
    productSlug: data.productSlug || '',
    productName: data.productName || 'Garment Product',
    userId: data.userId || '',
    customerName: data.customerName || 'Customer',
    rating: Number(data.rating) || 5,
    reviewText: data.reviewText || '',
    verifiedPurchase: Boolean(data.verifiedPurchase),
    status: (data.status as ReviewStatus) || 'pending',
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

/**
 * Parse a Prisma review record into a typed CustomerReview.
 */
function parsePrismaReview(r: any): CustomerReview {
  return {
    id: r.id,
    productId: r.productId,
    productSlug: r.productSlug || '',
    productName: r.productName || 'Garment Product',
    userId: r.userId || '',
    customerName: r.customerName || 'Customer',
    rating: Number(r.rating) || 5,
    reviewText: r.reviewText || '',
    verifiedPurchase: Boolean(r.verifiedPurchase),
    status: (r.status as ReviewStatus) || 'pending',
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
  };
}

/**
 * Fetch approved reviews and aggregated rating statistics for a product.
 * Returns only status == "approved" reviews for this specific product.
 */
export async function getApprovedProductReviews(
  productId: string,
  options?: { page?: number; limit?: number }
): Promise<{ reviews: CustomerReview[]; stats: ProductRatingStats; hasMore: boolean }> {
  const cleanId = String(productId || '').trim();
  if (!cleanId) {
    return {
      reviews: [],
      stats: {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      },
      hasMore: false,
    };
  }

  // 1. Fetch from Prisma Database (immediate, reliable)
  let dbReviews: CustomerReview[] = [];
  try {
    const raw = await prismaReview.findMany({
      where: {
        productId: cleanId,
        status: 'approved',
      },
      orderBy: { createdAt: 'desc' },
    });
    dbReviews = raw.map(parsePrismaReview);
  } catch (dbErr) {
    console.warn('[Prisma getApprovedProductReviews Warning]:', dbErr);
  }

  // 2. Also attempt Firestore (within strict timeout, non-blocking)
  let firestoreReviews: CustomerReview[] = [];
  try {
    const reviewsRef = collection(db, REVIEWS_COLLECTION);
    const q = query(
      reviewsRef,
      where('productId', '==', cleanId),
      where('status', '==', 'approved')
    );
    const snapshot = await withTimeout(getDocs(q), 2000);
    snapshot.forEach((docSnap) => {
      firestoreReviews.push(parseFirestoreReviewDoc(docSnap));
    });
  } catch {
    // Firestore unavailable or timed out; dbReviews remains authoritative
  }

  // Merge unique reviews by ID
  const reviewMap = new Map<string, CustomerReview>();
  for (const r of dbReviews) reviewMap.set(r.id, r);
  for (const r of firestoreReviews) {
    if (!reviewMap.has(r.id)) reviewMap.set(r.id, r);
  }

  const allApproved = Array.from(reviewMap.values());
  allApproved.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Calculate rating statistics
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let ratingSum = 0;

  for (const rev of allApproved) {
    const r = Math.min(5, Math.max(1, Math.round(rev.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[r] = (distribution[r] || 0) + 1;
    ratingSum += rev.rating;
  }

  const totalReviews = allApproved.length;
  const averageRating = totalReviews > 0 ? Number((ratingSum / totalReviews).toFixed(1)) : 0;

  // Pagination
  const page = Math.max(1, Number(options?.page) || 1);
  const pageSize = Math.max(1, Math.min(50, Number(options?.limit) || 10));
  const startIndex = (page - 1) * pageSize;
  const paginatedReviews = allApproved.slice(startIndex, startIndex + pageSize);
  const hasMore = startIndex + pageSize < totalReviews;

  return {
    reviews: paginatedReviews,
    stats: {
      averageRating,
      totalReviews,
      ratingDistribution: distribution,
    },
    hasMore,
  };
}

/**
 * Submit a customer review in "approved" status for instant visibility.
 * Never hangs: completes immediately in database and writes to Cloud Firestore.
 */
export async function createCustomerReview(data: {
  productId: string;
  productSlug?: string;
  productName?: string;
  userId: string;
  customerName: string;
  rating: number;
  reviewText: string;
  verifiedPurchase: boolean;
}): Promise<{ success: boolean; reviewId?: string; error?: string }> {
  try {
    const cleanProductId = data.productId.trim();
    const cleanRating = Math.min(5, Math.max(1, Math.round(data.rating)));
    const cleanCustomerName = data.customerName.trim();
    const cleanReviewText = data.reviewText.trim();
    const cleanSlug = (data.productSlug || cleanProductId).trim();
    const cleanName = (data.productName || 'Garment Product').trim();

    // 0. Duplicate submission debounce protection (15 seconds window for identical user + product + text)
    if (data.userId) {
      try {
        const recentDuplicate = await prismaReview.findFirst({
          where: {
            productId: cleanProductId,
            userId: data.userId,
            reviewText: cleanReviewText,
            createdAt: {
              gte: new Date(Date.now() - 15000),
            },
          },
        });
        if (recentDuplicate) {
          return { success: true, reviewId: recentDuplicate.id };
        }
      } catch (dupErr) {
        // If query fails, continue with creation
        console.warn('[createCustomerReview Duplicate Check Warning]:', dupErr);
      }
    }

    // 1. Primary write to Prisma MongoDB (automatically approved)
    const createdReview = await prismaReview.create({
      data: {
        productId: cleanProductId,
        productSlug: cleanSlug,
        productName: cleanName,
        userId: data.userId,
        customerName: cleanCustomerName,
        rating: cleanRating,
        reviewText: cleanReviewText,
        verifiedPurchase: Boolean(data.verifiedPurchase),
        status: 'approved', // Automatically approved for instant visibility on the website
      },
    });

    const reviewId = createdReview.id;

    // 2. Dual write to Cloud Firestore with strict timeout (non-blocking)
    try {
      const reviewsRef = collection(db, REVIEWS_COLLECTION);
      await withTimeout(
        addDoc(reviewsRef, {
          id: reviewId,
          productId: cleanProductId,
          productSlug: cleanSlug,
          productName: cleanName,
          userId: data.userId,
          customerName: cleanCustomerName,
          rating: cleanRating,
          reviewText: cleanReviewText,
          verifiedPurchase: Boolean(data.verifiedPurchase),
          status: 'approved',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        2500
      );
    } catch {
      // Gentle warning: Firestore write timed out or offline, document is safe in database
      console.log(`[Reviews] Review ${reviewId} persisted in database; Firestore cloud sync deferred.`);
    }

    return { success: true, reviewId };
  } catch (err: any) {
    console.error('[createCustomerReview Error]:', err);
    return { success: false, error: err.message || 'Failed to submit review' };
  }
}

/**
 * Admin: Query reviews with optional status filter.
 */
export async function getAdminReviews(options?: {
  status?: ReviewStatus | 'all';
  productId?: string;
  limit?: number;
}): Promise<{
  reviews: CustomerReview[];
  counts: { total: number; pending: number; approved: number; rejected: number };
}> {
  try {
    // 1. Query Prisma Database
    const whereClause: any = {};
    if (options?.status && options.status !== 'all') {
      whereClause.status = options.status;
    }
    if (options?.productId && options.productId.trim()) {
      whereClause.productId = options.productId.trim();
    }

    const [rawReviews, totalCount, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prismaReview.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: options?.limit ? Math.min(100, options.limit) : 50,
      }),
      prismaReview.count(),
      prismaReview.count({ where: { status: 'pending' } }),
      prismaReview.count({ where: { status: 'approved' } }),
      prismaReview.count({ where: { status: 'rejected' } }),
    ]);

    const reviews = rawReviews.map(parsePrismaReview);

    return {
      reviews,
      counts: {
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
    };
  } catch (err) {
    console.error('[getAdminReviews Error]:', err);
    return {
      reviews: [],
      counts: { total: 0, pending: 0, approved: 0, rejected: 0 },
    };
  }
}

/**
 * Admin: Update review status (approve or reject).
 */
export async function updateReviewStatus(
  reviewId: string,
  newStatus: ReviewStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Update in Prisma
    await prismaReview.update({
      where: { id: reviewId },
      data: { status: newStatus },
    });

    // 2. Also update in Cloud Firestore (with timeout)
    try {
      const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
      await withTimeout(
        updateDoc(docRef, {
          status: newStatus,
          updatedAt: serverTimestamp(),
        }),
        2500
      );
    } catch {
      // Firestore offline or doc with this ID not in Firestore yet
    }

    return { success: true };
  } catch (err: any) {
    console.error('[updateReviewStatus Error]:', err);
    return { success: false, error: err.message || 'Failed to update review status' };
  }
}

/**
 * Admin: Delete a review document.
 */
export async function deleteReview(
  reviewId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Delete in Prisma
    await prismaReview.delete({
      where: { id: reviewId },
    });

    // 2. Also delete in Cloud Firestore (with timeout)
    try {
      const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
      await withTimeout(deleteDoc(docRef), 2500);
    } catch {
      // Ignored
    }

    return { success: true };
  } catch (err: any) {
    console.error('[deleteReview Error]:', err);
    return { success: false, error: err.message || 'Failed to delete review' };
  }
}
