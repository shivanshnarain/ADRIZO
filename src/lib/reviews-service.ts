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
  orderBy,
  limit as firestoreLimit
} from 'firebase/firestore';
import { db } from './firebase';
import { CustomerReview, ProductRatingStats, ReviewStatus } from '@/types/review';

const REVIEWS_COLLECTION = 'reviews';

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
function parseReviewDoc(d: any): CustomerReview {
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
 * Fetch approved reviews and aggregated rating statistics for a product.
 * Optimized for Firebase Spark plan: single query by productId and status.
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

  try {
    const reviewsRef = collection(db, REVIEWS_COLLECTION);
    const q = query(
      reviewsRef,
      where('productId', '==', cleanId),
      where('status', '==', 'approved')
    );

    const snapshot = await getDocs(q);
    const allApproved: CustomerReview[] = [];
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let ratingSum = 0;

    snapshot.forEach((docSnap) => {
      const rev = parseReviewDoc(docSnap);
      allApproved.push(rev);

      const r = Math.min(5, Math.max(1, Math.round(rev.rating))) as 1 | 2 | 3 | 4 | 5;
      distribution[r] = (distribution[r] || 0) + 1;
      ratingSum += rev.rating;
    });

    // Sort newest-first in memory to avoid requiring complex composite index on Spark plan
    allApproved.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
  } catch (err) {
    console.error('[Firestore getApprovedProductReviews Error]:', err);
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
}

/**
 * Submit a customer review in "pending" status.
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
    const reviewsRef = collection(db, REVIEWS_COLLECTION);
    const docRef = await addDoc(reviewsRef, {
      productId: data.productId.trim(),
      productSlug: (data.productSlug || data.productId).trim(),
      productName: (data.productName || 'Garment Product').trim(),
      userId: data.userId,
      customerName: data.customerName.trim(),
      rating: Math.min(5, Math.max(1, Math.round(data.rating))),
      reviewText: data.reviewText.trim(),
      verifiedPurchase: Boolean(data.verifiedPurchase),
      status: 'pending', // Always defaults to pending for moderation
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { success: true, reviewId: docRef.id };
  } catch (err: any) {
    console.error('[Firestore createCustomerReview Error]:', err);
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
    const reviewsRef = collection(db, REVIEWS_COLLECTION);
    let q = query(reviewsRef);

    if (options?.status && options.status !== 'all') {
      q = query(reviewsRef, where('status', '==', options.status));
    }

    const snapshot = await getDocs(q);
    const reviews: CustomerReview[] = [];
    const counts = { total: 0, pending: 0, approved: 0, rejected: 0 };

    snapshot.forEach((docSnap) => {
      const rev = parseReviewDoc(docSnap);
      reviews.push(rev);
      counts.total++;
      if (rev.status === 'pending') counts.pending++;
      else if (rev.status === 'approved') counts.approved++;
      else if (rev.status === 'rejected') counts.rejected++;
    });

    // If query was for 'all', we already counted everything.
    // If query was filtered by status, we can also fetch overall counts if needed.
    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const limitCount = options?.limit ? Math.min(100, options.limit) : 50;

    return {
      reviews: reviews.slice(0, limitCount),
      counts,
    };
  } catch (err) {
    console.error('[Firestore getAdminReviews Error]:', err);
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
    const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
    await updateDoc(docRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err: any) {
    console.error('[Firestore updateReviewStatus Error]:', err);
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
    const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: any) {
    console.error('[Firestore deleteReview Error]:', err);
    return { success: false, error: err.message || 'Failed to delete review' };
  }
}
