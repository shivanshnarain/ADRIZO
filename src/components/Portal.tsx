"use client";

import { useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
  containerId?: string;
}

/**
 * Universal SSR-safe React Portal component.
 * Renders overlay content directly into document.body or a dedicated target,
 * breaking free from any parent stacking context, overflow clipping, or transforms.
 */
export default function Portal({ children, containerId }: PortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  const container = containerId ? document.getElementById(containerId) || document.body : document.body;
  return createPortal(children, container);
}
