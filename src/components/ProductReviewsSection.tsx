"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Star, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  X, 
  Loader2, 
  MessageSquare,
  Check
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CustomerReview, ProductRatingStats } from '@/types/review';
import styles from './ProductReviewsSection.module.css';

interface ProductReviewsSectionProps {
  productId: string;
  productSlug?: string;
  productName?: string;
  onRatingStatsLoaded?: (stats: ProductRatingStats) => void;
}

const RATING_DESCRIPTORS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

export default function ProductReviewsSection({
  productId,
  productSlug = '',
  productName = 'Product',
  onRatingStatsLoaded,
}: ProductReviewsSectionProps) {
  const { user, loading: authLoading, openAuthModal } = useAuth();

  // Reviews Data State
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [stats, setStats] = useState<ProductRatingStats>({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [, setFetchError] = useState('');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewerName, setReviewerName] = useState(user?.name || '');
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState('');

  // Update reviewer name whenever authenticated user state loads
  useEffect(() => {
    if (user?.name && !reviewerName) {
      setReviewerName(user.name);
    }
  }, [user, reviewerName]);

  // Fetch approved reviews for this product
  const loadReviews = useCallback(async (pageNum: number, isInitial = false) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);
    setFetchError('');

    try {
      const res = await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}&page=${pageNum}&limit=10`);
      const data = await res.json();

      if (res.ok && data.success) {
        if (pageNum === 1) {
          setReviews(data.reviews || []);
        } else {
          setReviews(prev => [...prev, ...(data.reviews || [])]);
        }
        if (data.stats) {
          setStats(data.stats);
          if (onRatingStatsLoaded) {
            onRatingStatsLoaded(data.stats);
          }
        }
        setHasMore(Boolean(data.hasMore));
        setPage(pageNum);
      } else {
        setFetchError(data.error || 'Failed to load reviews.');
      }
    } catch {
      setFetchError('Network error while loading reviews.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [productId, onRatingStatsLoaded]);

  useEffect(() => {
    loadReviews(1, true);
  }, [loadReviews]);

  // Handle "Write a Review" button click
  const handleWriteReviewClick = () => {
    if (!user && !authLoading) {
      openAuthModal('SIGN_IN');
      return;
    }
    setIsFormOpen(prev => !prev);
    setSubmitError('');
    setSubmitSuccessMessage('');
  };

  // Submit Review Form
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccessMessage('');

    if (!user) {
      openAuthModal('SIGN_IN');
      setSubmitError('Please sign in to submit your review.');
      return;
    }

    const cleanName = reviewerName.trim();
    if (!cleanName || cleanName.length < 2) {
      setSubmitError('Please enter a valid customer name.');
      return;
    }

    if (!selectedRating || selectedRating < 1 || selectedRating > 5) {
      setSubmitError('Please select a star rating from 1 to 5.');
      return;
    }

    const cleanText = reviewText.trim();
    if (!cleanText || cleanText.length < 5) {
      setSubmitError('Review text must be at least 5 characters.');
      return;
    }

    if (cleanText.length > 1000) {
      setSubmitError('Review text cannot exceed 1,000 characters.');
      return;
    }

    setSubmitting(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          productSlug,
          productName,
          customerName: cleanName,
          rating: selectedRating,
          reviewText: cleanText,
        }),
        signal: controller.signal,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSubmitSuccessMessage(
          data.message || 'Thank you! Your review has been submitted and is awaiting approval.'
        );
        setReviewText('');
        setSelectedRating(5);
        // Refresh reviews and statistics
        await loadReviews(1, false);
        // Collapse form automatically after 4 seconds
        setTimeout(() => {
          setIsFormOpen(false);
        }, 4000);
      } else {
        setSubmitError(data.error || 'Failed to submit review. Please try again.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setSubmitError('Submission timed out. Please try again.');
      } else {
        setSubmitError('Network failure. Please check your internet connection.');
      }
    } finally {
      clearTimeout(timeoutId);
      setSubmitting(false);
    }
  };

  // Format date helper (e.g. "12 Sep 2026")
  const formatReviewDate = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'Recently';
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  // Render individual star rating icons
  const renderStars = (rating: number, size = 16) => {
    const rounded = Math.round(rating);
    return (
      <div className={styles.starsRow} aria-label={`${rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            size={size}
            fill={star <= rounded ? '#FFC800' : 'none'}
            stroke={star <= rounded ? '#FFC800' : '#d4d4d8'}
            strokeWidth={1.75}
          />
        ))}
      </div>
    );
  };

  return (
    <section id="customer-reviews" className={styles.reviewsContainer} aria-label="Customer Reviews">
      <div className={styles.reviewsDivider} />

      {/* 1. Header Row */}
      <div className={styles.sectionHeaderRow}>
        <div className={styles.titleGroup}>
          <span className={styles.sectionTag}>Verified Feedback</span>
          <h2 className={styles.sectionTitle}>Customer Reviews</h2>
        </div>

        {!isFormOpen && (
          <button
            type="button"
            onClick={handleWriteReviewClick}
            className={styles.writeReviewBtn}
            aria-expanded={false}
          >
            <Edit3 size={16} />
            <span>Write a Review</span>
          </button>
        )}
      </div>

      {/* 2. Rating Summary Card */}
      {loading ? (
        <div className={styles.summaryCard}>
          <div className={styles.overallRatingCol}>
            <div className={`${styles.skeletonPulse}`} style={{ width: '80px', height: '56px', marginBottom: '8px' }} />
            <div className={`${styles.skeletonPulse}`} style={{ width: '110px', height: '20px' }} />
          </div>
          <div className={styles.ratingDistributionCol}>
            {[5, 4, 3, 2, 1].map(s => (
              <div key={s} className={`${styles.skeletonPulse}`} style={{ width: '100%', height: '14px' }} />
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.summaryCard}>
          <div className={styles.overallRatingCol}>
            <div className={styles.bigRatingNumber}>
              {stats.totalReviews > 0 ? stats.averageRating.toFixed(1) : '0.0'}
            </div>
            {renderStars(stats.averageRating, 20)}
            <div className={styles.totalReviewsCaption}>
              {stats.totalReviews === 1
                ? 'Based on 1 customer review'
                : `Based on ${stats.totalReviews.toLocaleString('en-IN')} customer reviews`}
            </div>
          </div>

          {/* Rating Distribution Bars */}
          <div className={styles.ratingDistributionCol}>
            {[5, 4, 3, 2, 1].map(ratingLevel => {
              const count = (stats.ratingDistribution as any)[ratingLevel] || 0;
              const percent = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              return (
                <div key={ratingLevel} className={styles.distRow}>
                  <span className={styles.starLabel}>
                    {ratingLevel} <Star size={12} fill="#FFC800" stroke="#FFC800" />
                  </span>
                  <div className={styles.progressBarTrack} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                    <div className={styles.progressBarFill} style={{ width: `${percent}%` }} />
                  </div>
                  <span className={styles.distCount}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Write a Review Form (when toggled open) */}
      {isFormOpen && (
        <div className={styles.reviewFormPanel}>
          <div className={styles.formHeader}>
            <h3 className={styles.formTitle}>Write a Customer Review</h3>
            <button
              type="button"
              className={styles.formCloseBtn}
              onClick={() => setIsFormOpen(false)}
              aria-label="Close review form"
            >
              <X size={18} />
            </button>
          </div>

          {submitSuccessMessage && (
            <div className={styles.formAlertSuccess}>
              <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Submission Successful!</strong>
                <p style={{ margin: '4px 0 0' }}>{submitSuccessMessage}</p>
              </div>
            </div>
          )}

          {submitError && (
            <div className={styles.formAlertError}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitReview}>
            {/* Interactive Star Picker */}
            <div className={styles.starRatingPickerGroup}>
              <label className={styles.pickerLabel}>Your Rating *</label>
              <div className={styles.starPickerButtons}>
                {[1, 2, 3, 4, 5].map(starValue => {
                  const isFilled = (hoverRating || selectedRating) >= starValue;
                  return (
                    <button
                      key={starValue}
                      type="button"
                      className={`${styles.starPickerBtn} ${isFilled ? styles.starPickerBtnFilled : ''}`}
                      onClick={() => setSelectedRating(starValue)}
                      onMouseEnter={() => setHoverRating(starValue)}
                      onMouseLeave={() => setHoverRating(0)}
                      aria-label={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
                    >
                      <Star
                        size={28}
                        fill={isFilled ? '#FFC800' : 'none'}
                        stroke={isFilled ? '#FFC800' : '#d4d4d8'}
                        strokeWidth={1.8}
                      />
                    </button>
                  );
                })}
                <span className={styles.ratingDescriptor}>
                  {RATING_DESCRIPTORS[hoverRating || selectedRating] || 'Select rating'}
                </span>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Customer Name *</label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  placeholder="e.g. Rahul S."
                  value={reviewerName}
                  onChange={e => setReviewerName(e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Your Review *</label>
                <textarea
                  required
                  rows={4}
                  maxLength={1000}
                  placeholder="Share details of the fabric quality, fit, comfort, and style..."
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  className={styles.formTextarea}
                />
                <div className={styles.charCounter}>
                  {reviewText.length} / 1,000 characters
                </div>
              </div>
            </div>

            <div className={styles.formActionsRow}>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className={styles.formCloseBtn}
                style={{ padding: '0.65rem 1.25rem', border: '1px solid #d4d4d8' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={styles.submitBtn}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className={styles.spinningIcon} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Submitting Review...</span>
                  </>
                ) : (
                  <span>Submit Review</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Actual Customer Reviews List / Compact Empty State */}
      {!loading && (
        reviews.length > 0 ? (
          <div className={styles.reviewsList}>
            {reviews.map(review => {
              const initial = (review.customerName || 'C').charAt(0).toUpperCase();
              return (
                <article key={review.id} className={styles.reviewCard}>
                  <div className={styles.reviewCardHeader}>
                    <div className={styles.authorInfo}>
                      <div className={styles.avatarCircle} aria-hidden="true">
                        {initial}
                      </div>
                      <div className={styles.authorMeta}>
                        <div className={styles.authorNameRow}>
                          <span className={styles.authorName}>{review.customerName}</span>
                          {review.verifiedPurchase && (
                            <span className={styles.verifiedBadge}>
                              <Check size={11} strokeWidth={3} />
                              <span>Verified Purchase</span>
                            </span>
                          )}
                        </div>
                        <time className={styles.reviewDate} dateTime={review.createdAt}>
                          {formatReviewDate(review.createdAt)}
                        </time>
                      </div>
                    </div>

                    <div className={styles.reviewStars}>
                      {renderStars(review.rating, 15)}
                    </div>
                  </div>

                  <p className={styles.reviewBodyText}>{review.reviewText}</p>
                </article>
              );
            })}
          </div>
        ) : !isFormOpen ? (
          /* Sleek, compact empty state only rendered when form is closed */
          <div className={styles.compactEmptyState}>
            <MessageSquare size={24} color="#a1a1aa" strokeWidth={1.5} />
            <p className={styles.compactEmptyText}>
              No customer reviews yet. Be the first to share your experience.
            </p>
            <button
              type="button"
              onClick={handleWriteReviewClick}
              className={styles.compactWriteBtn}
            >
              <Edit3 size={14} />
              <span>Write a Review</span>
            </button>
          </div>
        ) : null /* When form is open and 0 reviews, render nothing redundant below */
      )}

      {/* 5. Pagination / Load More */}
      {hasMore && (
        <div className={styles.loadMoreRow}>
          <button
            type="button"
            onClick={() => loadReviews(page + 1, false)}
            disabled={loadingMore}
            className={styles.loadMoreBtn}
          >
            {loadingMore ? 'Loading More Reviews...' : 'Load More Reviews'}
          </button>
        </div>
      )}
    </section>
  );
}
