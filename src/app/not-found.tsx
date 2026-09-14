import React from 'react';
import Link from 'next/link';
import { ShoppingBag, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
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
      }}
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: '#F4F4F5',
          color: '#18181B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.25rem',
        }}
      >
        <Search size={32} />
      </div>

      <span
        style={{
          fontSize: '0.8rem',
          fontWeight: 800,
          color: '#D97706',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '0.5rem',
        }}
      >
        404 — Page Not Found
      </span>

      <h1
        style={{
          fontSize: '1.85rem',
          fontWeight: 900,
          letterSpacing: '-0.02em',
          marginBottom: '0.5rem',
          color: '#09090b',
        }}
      >
        Looking for Something?
      </h1>

      <p
        style={{
          fontSize: '0.95rem',
          color: '#71717a',
          maxWidth: '440px',
          lineHeight: 1.5,
          marginBottom: '2rem',
        }}
      >
        The product or page you requested could not be found or may have been moved.
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          justifyContent: 'center',
        }}
      >
        <Link
          href="/shop"
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
            textDecoration: 'none',
            transition: 'opacity 0.2s ease',
          }}
        >
          <ShoppingBag size={16} />
          <span>Shop All Products</span>
        </Link>

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
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}
