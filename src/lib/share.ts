/**
 * ADRIZO Centralized Web Share & Clipboard Fallback Utility
 * Provides native navigator.share with fallback to clipboard copy
 * and fires single-event triggers.
 */

let isSharePending = false;

export interface ShareDataPayload {
  title: string;
  text?: string;
  url?: string;
}

export interface ShareResult {
  status: 'shared' | 'copied' | 'aborted' | 'failed';
  message?: string;
}

/**
 * Executes native Web Share API or falls back to clipboard copy.
 */
export async function executeShare(payload: ShareDataPayload): Promise<ShareResult> {
  if (isSharePending) {
    return { status: 'aborted' };
  }
  isSharePending = true;

  try {
    const url = payload.url || (typeof window !== 'undefined' ? window.location.href : 'https://adrizo.com');
    const title = payload.title || (typeof document !== 'undefined' ? document.title : 'ADRIZO');
    const text = payload.text || `Check out ${title} on ADRIZO`;

    // 1. Try Native Web Share API (iOS Safari, Android Chrome, macOS Safari)
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        return { status: 'shared', message: 'Shared successfully' };
      } catch (err: any) {
        // User cancelled or aborted the native share dialog
        if (err?.name === 'AbortError' || err?.name === 'NotAllowedError') {
          return { status: 'aborted' };
        }
        // Fallback to clipboard if native share threw an unhandled error
      }
    }

    // 2. Clipboard API Fallback
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(url);
        dispatchShareToast('Product link copied');
        return { status: 'copied', message: 'Product link copied' };
      } catch (clipErr) {
        // Fall through to textarea execCommand fallback
      }
    }

    // 3. Fallback textarea copy for older mobile browsers / webviews
    if (typeof document !== 'undefined') {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (successful) {
          dispatchShareToast('Product link copied');
          return { status: 'copied', message: 'Product link copied' };
        }
      } catch (execErr) {
        // continue
      }
    }

    return { status: 'failed', message: 'Unable to share or copy link' };
  } finally {
    setTimeout(() => {
      isSharePending = false;
    }, 400);
  }
}

/**
 * Dispatches a lightweight custom event to show the global toast notification
 */
export function dispatchShareToast(message: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('adrizo-share-toast', { detail: { message } }));
  }
}
