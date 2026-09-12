"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, ShoppingBag, ArrowLeft } from 'lucide-react';
import styles from './product.module.css';

export default function ProductErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Product Page Error Boundary caught error]:', error);
  }, [error]);

  return (
    <div className={styles.pageContainer}>
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '3rem 1.5rem',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#FEF3C7',
            color: '#D97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem',
          }}
        >
          <AlertCircle size={32} />
        </div>

        <h1
          style={{
            fontSize: '1.65rem',
            fontWeight: 800,
            marginBottom: '0.5rem',
            color: '#09090b',
          }}
        >
          Unable to Load Product Details
        </h1>

        <p
          style={{
            fontSize: '0.95rem',
            color: '#71717a',
            maxWidth: '420px',
            lineHeight: 1.5,
            marginBottom: '1.75rem',
          }}
        >
          We had trouble loading this product. This might be due to a temporary network hiccup or product refresh.
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            justifyContent: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => reset()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#FFC800',
              color: '#09090b',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 1.4rem',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} />
            <span>Try Again</span>
          </button>

          <Link
            href="/category/all"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#09090b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 1.4rem',
              fontSize: '0.875rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <ShoppingBag size={16} />
            <span>Browse All Apparel</span>
          </Link>

          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#f4f4f5',
              color: '#18181b',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 1.4rem',
              fontSize: '0.875rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={16} />
            <span>Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
