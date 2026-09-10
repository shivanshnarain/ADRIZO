import React from 'react';

interface AdrizoLogoProps {
  /** Total height of the rendered SVG in px. Default 22 */
  height?: number;
  className?: string;
  /** Color of the "A". Default #FFC800 */
  accentColor?: string;
  /** Color of "DRIZO". Default #ffffff */
  wordmarkColor?: string;
}

/**
 * ADRIZO brand logotype — single unified wordmark.
 * A is rendered in yellow (#FFC800), DRIZO in white.
 * Both use the exact same font-family, font-size, font-weight,
 * letter-spacing, baseline and visual scale — no geometric shapes.
 */
export default function AdrizoLogo({
  height = 22,
  className,
  accentColor = '#FFC800',
  wordmarkColor = '#ffffff',
}: AdrizoLogoProps) {
  return (
    <svg
      viewBox="0 0 96 18"
      height={height}
      width={(height * 96) / 18}
      aria-label="ADRIZO"
      role="img"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      overflow="visible"
    >
      <text
        y="14"
        fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
        fontSize="16"
        fontWeight="500"
        letterSpacing="3"
        textAnchor="start"
        dominantBaseline="auto"
      >
        <tspan fill={accentColor}>A</tspan><tspan fill={wordmarkColor}>DRIZO</tspan>
      </text>
    </svg>
  );
}
