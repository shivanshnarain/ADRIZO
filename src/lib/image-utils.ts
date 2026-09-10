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
  if (!url) return '';

  // If not a Cloudinary URL, return original
  if (!url.includes('res.cloudinary.com')) {
    return url;
  }

  const { width, height, crop = 'limit', quality = 'auto', format = 'auto' } = options || {};

  const transformations: string[] = [`f_${format}`, `q_${quality}`];
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (width || height) transformations.push(`c_${crop}`);

  const transformString = transformations.join(',');

  // Insert transformations into Cloudinary URL: .../upload/v123/... -> .../upload/f_auto,q_auto,w_800/...
  if (url.includes('/upload/')) {
    // If transformations already exist, replace or insert
    return url.replace('/upload/', `/upload/${transformString}/`);
  }

  return url;
}
