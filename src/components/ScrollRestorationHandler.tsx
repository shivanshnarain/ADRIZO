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

  useEffect(() => {
    // Prevent browser from automatically restoring a lower scroll position (e.g., near footer)
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      try {
        window.history.scrollRestoration = 'manual';
      } catch {
        // Safe fallback for restricted environments
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

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
