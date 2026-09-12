import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCustomer } from '@/lib/customer-auth';
import { checkVerifiedPurchase } from '@/lib/purchase-verification';
import { getApprovedProductReviews, createCustomerReview } from '@/lib/reviews-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reviews?productId=...&page=...&limit=...
 * Public endpoint: returns only APPROVED reviews and rating statistics for a product.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 10;

    if (!productId || !productId.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Product ID is required.',
      }, { status: 400 });
    }

    const data = await getApprovedProductReviews(productId.trim(), { page, limit });

    return NextResponse.json({
      success: true,
      reviews: data.reviews,
      stats: data.stats,
      hasMore: data.hasMore,
    });
  } catch (err: any) {
    console.error('[GET /api/reviews Exception]:', err);
    return NextResponse.json({
      success: false,
      error: 'Unable to load reviews at this time.',
    }, { status: 500 });
  }
}

/**
 * POST /api/reviews
 * Authenticated customer endpoint: submits a new review with pending status.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Customer
    const customer = await getAuthenticatedCustomer();
    if (!customer || !customer.id || customer.id === 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Please sign in to write a review.',
      }, { status: 401 });
    }

    // 2. Parse & Validate Payload
    const body = await req.json();
    const { productId, productSlug, productName, customerName, rating, reviewText } = body;

    if (!productId || typeof productId !== 'string' || !productId.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Product ID is required.',
      }, { status: 400 });
    }

    const numRating = Number(rating);
    if (!numRating || isNaN(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json({
        success: false,
        error: 'Please provide a star rating between 1 and 5.',
      }, { status: 400 });
    }

    const cleanCustomerName = (customerName || customer.name || 'Valued Customer').trim();
    if (cleanCustomerName.length < 2 || cleanCustomerName.length > 60) {
      return NextResponse.json({
        success: false,
        error: 'Customer name must be between 2 and 60 characters.',
      }, { status: 400 });
    }

    const cleanReviewText = (reviewText || '').trim();
    if (cleanReviewText.length < 5) {
      return NextResponse.json({
        success: false,
        error: 'Please write a review of at least 5 characters.',
      }, { status: 400 });
    }

    if (cleanReviewText.length > 1000) {
      return NextResponse.json({
        success: false,
        error: 'Review text cannot exceed 1,000 characters.',
      }, { status: 400 });
    }

    // 3. Server-side purchase verification (prevents client spoofing)
    const verifiedPurchase = await checkVerifiedPurchase(customer, productId.trim());

    // 4. Save to Cloud Firestore with status: "pending"
    const result = await createCustomerReview({
      productId: productId.trim(),
      productSlug: productSlug ? String(productSlug).trim() : undefined,
      productName: productName ? String(productName).trim() : undefined,
      userId: customer.id,
      customerName: cleanCustomerName,
      rating: numRating,
      reviewText: cleanReviewText,
      verifiedPurchase,
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to submit your review. Please try again.',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your review has been submitted and is awaiting approval.',
      reviewId: result.reviewId,
    });
  } catch (err: any) {
    console.error('[POST /api/reviews Exception]:', err);
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred while submitting your review.',
    }, { status: 500 });
  }
}
