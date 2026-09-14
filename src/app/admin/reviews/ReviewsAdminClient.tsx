"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Star, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Search, 
  ExternalLink, 
  AlertTriangle,
  RefreshCw,
  Check,
  Filter,
  MessageSquare
} from 'lucide-react';
import { CustomerReview, ReviewStatus } from '@/types/review';
import styles from '../admin.module.css';

export default function ReviewsAdminClient() {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [activeTab, setActiveTab] = useState<ReviewStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch reviews from API
  const fetchReviews = useCallback(async (statusFilter: ReviewStatus | 'all' = activeTab) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews?status=${statusFilter}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setReviews(data.reviews || []);
        if (data.counts) {
          setCounts(data.counts);
        }
      } else {
        showNotification('error', data.error || 'Failed to fetch reviews.');
      }
    } catch {
      showNotification('error', 'Network error while fetching reviews.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchReviews(activeTab);
  }, [activeTab, fetchReviews]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Moderation Action: Update status (approve or reject)
  const handleUpdateStatus = async (reviewId: string, newStatus: ReviewStatus) => {
    setActionLoading(prev => ({ ...prev, [reviewId]: true }));
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', `Review successfully marked as ${newStatus}.`);
        // Optimistic state update
        setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status: newStatus } : r));
        setCounts(prev => {
          const oldReview = reviews.find(r => r.id === reviewId);
          if (!oldReview || oldReview.status === newStatus) return prev;
          const updated = { ...prev };
          if (oldReview.status === 'pending') updated.pending = Math.max(0, updated.pending - 1);
          if (oldReview.status === 'approved') updated.approved = Math.max(0, updated.approved - 1);
          if (oldReview.status === 'rejected') updated.rejected = Math.max(0, updated.rejected - 1);
          if (newStatus === 'pending') updated.pending++;
          if (newStatus === 'approved') updated.approved++;
          if (newStatus === 'rejected') updated.rejected++;
          return updated;
        });
      } else {
        showNotification('error', data.error || 'Failed to update review status.');
      }
    } catch {
      showNotification('error', 'Network error while updating review.');
    } finally {
      setActionLoading(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  // Moderation Action: Delete Review
  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this customer review? This cannot be undone.')) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [reviewId]: true }));
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', 'Review permanently deleted.');
        const deletedReview = reviews.find(r => r.id === reviewId);
        setReviews(prev => prev.filter(r => r.id !== reviewId));
        if (deletedReview) {
          setCounts(prev => ({
            ...prev,
            total: Math.max(0, prev.total - 1),
            [deletedReview.status]: Math.max(0, (prev as any)[deletedReview.status] - 1),
          }));
        }
      } else {
        showNotification('error', data.error || 'Failed to delete review.');
      }
    } catch {
      showNotification('error', 'Network error while deleting review.');
    } finally {
      setActionLoading(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  // Filter reviews by search query
  const filteredReviews = reviews.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (r.productName || '').toLowerCase().includes(q) ||
      (r.customerName || '').toLowerCase().includes(q) ||
      (r.reviewText || '').toLowerCase().includes(q) ||
      (r.productId || '').toLowerCase().includes(q)
    );
  });

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className={styles.pageTitle} style={{ margin: 0 }}>Customer Reviews &amp; Moderation</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-gray)', fontSize: '0.9rem' }}>
            Manage customer feedback across ADRIZO products. Reviews are automatically approved upon submission.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchReviews(activeTab)}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            background: '#ffffff',
            border: '1px solid #d4d4d8',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={15} className={loading ? styles.spinningIcon : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: notification.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${notification.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            color: notification.type === 'success' ? '#166534' : '#991b1b',
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div style={{ background: '#ffffff', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border-gray)', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'all' ? '#09090b' : '#f4f4f5',
              color: activeTab === 'all' ? '#ffffff' : '#52525b',
            }}
          >
            All Reviews ({counts.total})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'pending' ? '#d97706' : '#fef3c7',
              color: activeTab === 'pending' ? '#ffffff' : '#b45309',
            }}
          >
            Pending Approval ({counts.pending})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('approved')}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'approved' ? '#15803d' : '#dcfce7',
              color: activeTab === 'approved' ? '#ffffff' : '#166534',
            }}
          >
            Approved ({counts.approved})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rejected')}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'rejected' ? '#b91c1c' : '#fee2e2',
              color: activeTab === 'rejected' ? '#ffffff' : '#991b1b',
            }}
          >
            Rejected ({counts.rejected})
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 260px', maxWidth: '380px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
          <input
            type="text"
            placeholder="Search reviews, customer, product..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              paddingLeft: '34px',
              paddingRight: '12px',
              border: '1px solid #d4d4d8',
              borderRadius: '6px',
              fontSize: '0.85rem',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Reviews Table / Cards */}
      {loading ? (
        <div style={{ background: '#ffffff', padding: '3rem', borderRadius: '10px', border: '1px solid var(--border-gray)', textAlign: 'center', color: '#71717a' }}>
          <RefreshCw size={24} className={styles.spinningIcon} style={{ margin: '0 auto 0.75rem' }} />
          <p>Loading customer reviews...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div style={{ background: '#ffffff', padding: '3.5rem 1.5rem', borderRadius: '10px', border: '1.5px dashed var(--border-gray)', textAlign: 'center' }}>
          <MessageSquare size={36} color="#a1a1aa" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.35rem' }}>No Reviews Found</h3>
          <p style={{ color: '#71717a', fontSize: '0.875rem', margin: 0 }}>
            {searchQuery ? 'No reviews match your search query.' : 'There are currently no reviews in this category.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredReviews.map(review => {
            const isBusy = actionLoading[review.id];
            return (
              <div
                key={review.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--border-gray)',
                  borderRadius: '10px',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                {/* Top Row: Product, Status Badge, and Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <Link
                      href={`/product/${review.productId}`}
                      target="_blank"
                      style={{
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: '#09090b',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <span>{review.productName}</span>
                      <ExternalLink size={13} color="#71717a" />
                    </Link>

                    {/* Status Badge */}
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '0.725rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        background:
                          review.status === 'approved'
                            ? '#dcfce7'
                            : review.status === 'pending'
                            ? '#fef3c7'
                            : '#fee2e2',
                        color:
                          review.status === 'approved'
                            ? '#166534'
                            : review.status === 'pending'
                            ? '#b45309'
                            : '#991b1b',
                      }}
                    >
                      {review.status}
                    </span>

                    {/* Verified Purchase Badge */}
                    {review.verifiedPurchase && (
                      <span
                        style={{
                          background: '#ecfdf5',
                          color: '#065f46',
                          border: '1px solid #a7f3d0',
                          borderRadius: '999px',
                          padding: '2px 8px',
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Check size={11} strokeWidth={3} />
                        <span>Verified Buyer</span>
                      </span>
                    )}
                  </div>

                  {/* Moderation Actions: Delete Review (manual Approve removed as reviews are auto-approved) */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleDeleteReview(review.id)}
                      disabled={isBusy}
                      title="Permanently delete this review"
                      aria-label="Delete Review"
                      style={{
                        background: '#fef2f2',
                        color: '#b91c1c',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        opacity: isBusy ? 0.6 : 1,
                      }}
                    >
                      <Trash2 size={14} />
                      <span>Delete Review</span>
                    </button>
                  </div>
                </div>

                {/* Second Row: Customer, Stars, Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', color: '#71717a' }}>
                  <span style={{ fontWeight: 700, color: '#09090b' }}>{review.customerName}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#FFC800' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        size={14}
                        fill={star <= review.rating ? '#FFC800' : 'none'}
                        stroke={star <= review.rating ? '#FFC800' : '#d4d4d8'}
                      />
                    ))}
                    <span style={{ marginLeft: '4px', fontWeight: 800, color: '#09090b' }}>{review.rating}/5</span>
                  </div>
                  <span>•</span>
                  <span>{formatDate(review.createdAt)}</span>
                </div>

                {/* Third Row: Review Text */}
                <div style={{ background: '#fafafa', border: '1px solid #f4f4f5', borderRadius: '6px', padding: '0.85rem 1rem', fontSize: '0.9rem', color: '#27272a', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {review.reviewText}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
