"use client";

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

function LoginContent() {
  const { user, loading, openAuthModal } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/account';

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace(returnUrl);
      } else {
        openAuthModal('SIGN_IN', returnUrl);
      }
    }
  }, [user, loading, openAuthModal, router, returnUrl]);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem' }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111111', letterSpacing: '-0.01em' }}>ADRIZO Customer Authentication</div>
      <div style={{ fontSize: '0.875rem', color: '#71717a' }}>
        Opening secure sign-in...
      </div>
      <button
        type="button"
        onClick={() => openAuthModal('SIGN_IN', returnUrl)}
        style={{
          padding: '0.65rem 1.5rem',
          backgroundColor: '#111111',
          color: '#ffffff',
          border: 'none',
          borderRadius: '9999px',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: '0.875rem'
        }}
      >
        Sign In / Create Account
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a' }}>Loading ADRIZO authentication...</div>}>
      <LoginContent />
    </Suspense>
  );
}
