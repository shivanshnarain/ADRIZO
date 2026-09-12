"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home, ShoppingBag } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception safely without exposing internal secrets
    console.error('[Application Error Boundary caught error]:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        textAlign: 'center',
        background: '#ffffff',
        color: '#09090b',
        fontFamily: 'inherit',
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
        <AlertTriangle size={32} />
      </div>

      <h1
        style={{
          fontSize: '1.75rem',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          marginBottom: '0.5rem',
          color: '#09090b',
        }}
      >
        Something went wrong
      </h1>

      <p
        style={{
          fontSize: '0.95rem',
          color: '#71717a',
          maxWidth: '440px',
          lineHeight: 1.5,
          marginBottom: '1.75rem',
        }}
      >
        We encountered an unexpected error while loading this page. Please try refreshing or return to the home store.
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
            padding: '0.75rem 1.5rem',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'opacity 0.2s ease',
          }}
        >
          <RefreshCw size={16} />
          <span>Try Again</span>
        </button>

        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#09090b',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem 1.5rem',
            fontSize: '0.9rem',
            fontWeight: 700,
            textDecoration: 'none',
            transition: 'opacity 0.2s ease',
          }}
        >
          <Home size={16} />
          <span>Go to Home</span>
        </Link>
      </div>
    </div>
  );
}
