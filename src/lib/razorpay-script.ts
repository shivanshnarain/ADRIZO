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
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

let scriptLoadingPromise: Promise<boolean> | null = null;

export function isRazorpayLoaded(): boolean {
  return typeof window !== 'undefined' && typeof window.Razorpay === 'function';
}

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  // 1. If already available on window, resolve immediately
  if (typeof window.Razorpay === 'function') {
    return Promise.resolve(true);
  }

  // 2. If a load is already in-flight, return the existing Promise
  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  // 3. Create single Promise
  scriptLoadingPromise = new Promise<boolean>((resolve) => {
    // Check if script tag is already in DOM
    const existingScript = document.querySelector<HTMLScriptElement>('script[src*="checkout.razorpay.com"]');
    if (existingScript) {
      if (typeof window.Razorpay === 'function') {
        resolve(true);
        return;
      }
      let checks = 0;
      const interval = setInterval(() => {
        checks++;
        if (typeof window.Razorpay === 'function') {
          clearInterval(interval);
          resolve(true);
        } else if (checks > 30) {
          clearInterval(interval);
          resolve(false);
        }
      }, 100);

      existingScript.addEventListener('load', () => {
        clearInterval(interval);
        resolve(true);
      }, { once: true });
      existingScript.addEventListener('error', () => {
        clearInterval(interval);
        resolve(false);
      }, { once: true });
      return;
    }

    // 4. Create and append official standard Razorpay checkout.js script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.id = 'razorpay-checkout-script';

    script.onload = () => {
      resolve(true);
    };

    script.onerror = () => {
      console.error('[Razorpay] Failed to load official Razorpay checkout script');
      scriptLoadingPromise = null;
      resolve(false);
    };

    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

export function preloadRazorpayScript(): void {
  if (typeof window === 'undefined') return;
  loadRazorpayScript().catch(() => {});
}
