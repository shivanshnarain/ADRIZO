import React from 'react';
import Image from 'next/image';

interface AdrizoLogoProps {
  /** Total height of the rendered logo in px. Default 22 */
  height?: number;
  className?: string;
  /** Color of the "A". Default #FFC800 */
  accentColor?: string;
  /** Color of "DRIZO". Default #ffffff */
  wordmarkColor?: string;
}

/**
 * ADRIZO brand logotype — rendered using the exact official wordmark asset.
 * When wordmarkColor is dark (e.g. #111111, black), uses /adrizo-logo-dark.png.
 * Otherwise uses /adrizo-logo-transparent.png for dark/black backgrounds.
 */
export default function AdrizoLogo({
  height = 22,
  className,
  wordmarkColor = '#ffffff',
}: AdrizoLogoProps) {
  const isDark =
    wordmarkColor === '#111111' ||
    wordmarkColor === '#18181B' ||
    wordmarkColor === '#000000' ||
    wordmarkColor.toLowerCase() === 'black';

  const logoSrc = isDark ? '/adrizo-logo-dark.png' : '/adrizo-logo-transparent.png';
  const width = Math.round((height * 600) / 82);

  return (
    <Image
      src={logoSrc}
      alt="ADRIZO"
      width={width}
      height={height}
      priority
      className={className}
      style={{ width: 'auto', height: `${height}px`, objectFit: 'contain' }}
    />
  );
}
