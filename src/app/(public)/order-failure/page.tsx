"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw, ShoppingBag, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { POLICY_CONFIG } from '@/config/policies';

function OrderFailureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const orderNumber = searchParams.get('orderNumber');
  const reason = searchParams.get('reason') || 'The transaction was cancelled or declined by your bank/UPI provider.';

  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    // Navigate back to checkout with active session
    router.push('/checkout');
  };

  return (
    <div className="container section-padding" style={{ maxWidth: '650px', margin: '0 auto', padding: '4rem 1rem 6rem', textAlign: 'center' }}>
      <div style={{
        width: '68px',
        height: '68px',
        borderRadius: '50%',
        background: '#fef2f2',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.25rem',
        border: '2px solid #fecaca'
      }}>
        <AlertTriangle size={38} color="#dc2626" />
      </div>

      <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#09090b', margin: '0 0 0.5rem 0' }}>
        Payment Could Not Be Completed
      </h1>

      <p style={{ color: '#71717a', fontSize: '0.95rem', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
        No amount was deducted from your account. If any deduction occurred, your bank will automatically reverse it within 3–5 business days.
      </p>

      {/* Failure Details Card */}
      <div style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '1.5rem', textAlign: 'left', marginBottom: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        {orderNumber && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem', fontSize: '0.875rem' }}>
            <span style={{ color: '#71717a' }}>Reference Order:</span>
            <strong style={{ fontFamily: 'monospace', color: '#09090b' }}>{orderNumber}</strong>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem', fontSize: '0.875rem' }}>
          <span style={{ color: '#71717a' }}>Payment Status:</span>
          <span style={{ color: '#dc2626', fontWeight: 700 }}>FAILED / UNCONFIRMED</span>
        </div>

        <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid #f4f4f5', fontSize: '0.8125rem', color: '#64748b' }}>
          <strong>Reason:</strong> {decodeURIComponent(reason)}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          className="btn-primary"
          style={{ padding: '0.75rem 2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}
        >
          <RefreshCw size={16} className={retrying ? 'spin' : ''} />
          <span>{retrying ? 'Returning to Checkout...' : 'Retry Payment'}</span>
        </button>

        <Link
          href="/shop"
          className="btn-outline"
          style={{ padding: '0.75rem 1.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', fontSize: '0.9rem' }}
        >
          <ShoppingBag size={16} />
          <span>Return to Shop</span>
        </Link>
      </div>

      {/* Support Info */}
      <div style={{ marginTop: '2.5rem', borderTop: '1px solid #f4f4f5', paddingTop: '1.5rem', fontSize: '0.8125rem', color: '#71717a' }}>
        Need assistance with your payment? Email our customer support team at{' '}
        <a href={`mailto:${POLICY_CONFIG.supportEmail}`} style={{ color: '#09090b', fontWeight: 700, textDecoration: 'underline' }}>
          {POLICY_CONFIG.supportEmail}
        </a>
      </div>
    </div>
  );
}

export default function OrderFailurePage() {
  return (
    <Suspense fallback={<div className="container section-padding" style={{ textAlign: 'center', padding: '4rem 0' }}>Loading...</div>}>
      <OrderFailureContent />
    </Suspense>
  );
}
