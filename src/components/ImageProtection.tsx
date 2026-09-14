"use client";

import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

export default function ImageProtection() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Toast Event Listener
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string }>;
      if (customEvent.detail?.message) {
        setToastMessage(customEvent.detail.message);
        const timer = setTimeout(() => {
          setToastMessage(null);
        }, 2500);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('adrizo-share-toast', handleToast);

    // 2. Best-Effort Image Protection Handlers
    const isProtectedTarget = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;

      // Check if it's an image element
      if (target.tagName === 'IMG') {
        const src = (target as HTMLImageElement).src || '';
        // Do not intercept essential brand logos or system SVG icons
        if (src.includes('logo') || src.includes('favicon') || src.endsWith('.svg')) {
          return false;
        }
        return true;
      }

      // Check if clicked element is inside a protected image wrapper or customer showcase
      if (
        target.closest('[data-protected-img="true"]') ||
        target.closest('.protected-image') ||
        target.closest('[class*="mainImageCard"]') ||
        target.closest('[class*="imageContainer"]') ||
        target.closest('[class*="categoryCardImageWrap"]') ||
        target.closest('[class*="photoCard"]') ||
        target.closest('[class*="lightboxContent"]')
      ) {
        return true;
      }

      return false;
    };

    // Prevent context menu (Save image as, Copy image address) on protected images
    const handleContextMenu = (e: MouseEvent) => {
      if (isProtectedTarget(e.target)) {
        e.preventDefault();
      }
    };

    // Prevent dragging images to desktop or other windows to save
    const handleDragStart = (e: DragEvent) => {
      if (isProtectedTarget(e.target)) {
        e.preventDefault();
      }
    };

    // Prevent text/image selection highlight over product images
    const handleSelectStart = (e: Event) => {
      if (isProtectedTarget(e.target)) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, { capture: true });
    document.addEventListener('dragstart', handleDragStart, { capture: true });
    document.addEventListener('selectstart', handleSelectStart, { capture: true });

    return () => {
      window.removeEventListener('adrizo-share-toast', handleToast);
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      document.removeEventListener('dragstart', handleDragStart, { capture: true });
      document.removeEventListener('selectstart', handleSelectStart, { capture: true });
    };
  }, []);

  if (!toastMessage) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#111111',
        color: '#FFFFFF',
        padding: '9px 18px',
        borderRadius: '9999px',
        fontSize: '13px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
        zIndex: 99999,
        pointerEvents: 'none',
        animation: 'adrizoToastIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        letterSpacing: '0.02em',
      }}
    >
      <Check size={16} strokeWidth={2.6} color="#4ade80" />
      <span>{toastMessage}</span>
      <style>{`
        @keyframes adrizoToastIn {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
