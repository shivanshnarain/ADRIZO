"use client";
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * ScrollRestorationHandler:
 * Guarantees every normal page load, reload, or client-side navigation starts at
 * scroll position (0, 0) at the top of the page, avoiding unwanted auto-scrolling
 * down to the footer caused by browser scroll restoration or client hydration shifts.
 * Preserves intentional hash anchors (e.g. #section).
 */
export default function ScrollRestorationHandler() {
  const pathname = usePathname();

  // Helper to ensure document body and html are never permanently locked
  const safelyUnlockBody = () => {
    if (typeof document === 'undefined') return;
    if (document.body) {
      if (document.body.style.position === 'fixed') {
        document.body.style.position = '';
      }
      if (document.body.style.overflow === 'hidden') {
        document.body.style.overflow = '';
      }
      if (document.body.style.top) document.body.style.top = '';
      if (document.body.style.left) document.body.style.left = '';
      if (document.body.style.right) document.body.style.right = '';
      if (document.body.style.width) document.body.style.width = '';
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
      }
    }
    if (document.documentElement) {
      if (document.documentElement.style.overflow === 'hidden') {
        document.documentElement.style.overflow = '';
      }
      if (document.documentElement.style.pointerEvents === 'none') {
        document.documentElement.style.pointerEvents = '';
      }
    }
  };

  useEffect(() => {
    // Prevent browser from automatically restoring a lower scroll position (e.g., near footer)
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      try {
        window.history.scrollRestoration = 'manual';
      } catch {
        // Safe fallback for restricted environments
      }
    }

    // Handle browser bfcache navigation and tab re-entry
    const handlePageShow = (e: PageTransitionEvent) => {
      safelyUnlockBody();
    };

    // Handle browser Back / Forward history transitions
    const handlePopState = () => {
      safelyUnlockBody();
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Authoritatively reset any lingering modal/drawer scroll locks on route change
    safelyUnlockBody();

    // If an intentional anchor/fragment exists (e.g. #faq, #reviews), preserve browser scroll to that anchor
    if (window.location.hash) {
      return;
    }

    // Immediately reset scroll position to top
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });

    // Double-check with requestAnimationFrame to counteract layout shifts or async hydration
    const rafId = requestAnimationFrame(() => {
      if (!window.location.hash && (window.scrollY > 0 || window.pageYOffset > 0)) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      }
    });

    const timer = setTimeout(() => {
      if (!window.location.hash && (window.scrollY > 0 || window.pageYOffset > 0)) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      }
    }, 50);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}
