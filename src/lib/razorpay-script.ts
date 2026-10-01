/**
 * Authoritative, deduplicated script loader for Razorpay Magic Checkout.
 * Ensures:
 * - Loaded only once
 * - Never re-injected
 * - Thread/async safe singleton Promise
 * - Fallback to standard checkout.js if magic fails
 * - Preloadable on /checkout mount without blocking UI
 */

declare global {
  interface Window {
    Razorpay?: unknown;
  }
}

let scriptLoadingPromise: Promise<boolean> | null = null;

export function isRazorpayLoaded(): boolean {
  return typeof window !== 'undefined' && Boolean(window.Razorpay);
}

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  // 1. If already available on window, resolve immediately
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  // 2. If a load is already in-flight, return the existing Promise
  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  // 3. Check if script tag is already in DOM
  const existingScript = document.querySelector<HTMLScriptElement>('script[src*="checkout.razorpay.com"]');
  if (existingScript) {
    scriptLoadingPromise = new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      existingScript.addEventListener('load', () => resolve(true), { once: true });
      existingScript.addEventListener('error', () => resolve(false), { once: true });
    });
    return scriptLoadingPromise;
  }

  // 4. Create and append script tag
  scriptLoadingPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/magic-checkout.js';
    script.async = true;
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      // Fallback to standard checkout.js if magic checkout script fails
      console.warn('[Razorpay] Magic checkout script failed, falling back to standard checkout.js');
      const fallback = document.createElement('script');
      fallback.src = 'https://checkout.razorpay.com/v1/checkout.js';
      fallback.async = true;
      fallback.onload = () => resolve(true);
      fallback.onerror = () => {
        console.error('[Razorpay] Both Magic Checkout and standard checkout scripts failed to load');
        scriptLoadingPromise = null;
        resolve(false);
      };
      document.body.appendChild(fallback);
    };
    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
}

export function preloadRazorpayScript(): void {
  if (typeof window === 'undefined') return;
  loadRazorpayScript().catch(() => {});
}
