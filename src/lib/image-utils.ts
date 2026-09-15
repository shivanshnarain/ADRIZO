/**
 * Client-safe image optimization utility for Cloudinary and external CDN URLs.
 * Does NOT import Node.js server packages.
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'limit' | 'scale' | 'thumb';
  quality?: 'auto' | 'auto:best' | 'auto:good' | 'auto:eco' | 'auto:low' | number;
  format?: 'auto' | 'webp' | 'avif' | 'png' | 'jpg';
}

/**
 * Generate an optimized Cloudinary CDN URL with dynamic on-the-fly transformations.
 * If the URL is external (e.g. Unsplash), returns the original URL.
 */
export function getOptimizedImageUrl(
  url: string,
  options?: ImageOptimizationOptions
): string {
  if (!url || typeof url !== 'string') return '';

  const trimmed = url.trim();

  // If not a Cloudinary URL, return original
  if (!trimmed.includes('res.cloudinary.com')) {
    return trimmed;
  }

  const { width, height, crop = 'limit', quality = 'auto', format = 'auto' } = options || {};

  const transformations: string[] = [`f_${format}`, `q_${quality}`];
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (width || height) transformations.push(`c_${crop}`);

  const transformString = transformations.join(',');

  // Cleanly replace any existing transformation segment or insert after /upload/
  if (trimmed.includes('/upload/')) {
    return trimmed.replace(/\/upload\/(?:[a-zA-Z0-9_,:]+\/)?(v\d+\/)?/, `/upload/${transformString}/$1`);
  }

  return trimmed;
}

/**
 * Generate responsive srcSet for an image across standard device widths
 */
export function getResponsiveImageSrcSet(
  url: string,
  widths: number[] = [400, 700, 1000]
): string {
  if (!url) return '';
  return widths
    .map((w) => `${getOptimizedImageUrl(url, { width: w, quality: 'auto', format: 'auto' })} ${w}w`)
    .join(', ');
}
