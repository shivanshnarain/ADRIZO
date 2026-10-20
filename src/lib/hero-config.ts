export interface HeroImageItem {
  id: string;
  url: string;
  altText?: string;
  badge?: string;
  heading?: string;
  subheading?: string;
  buttonText?: string;
  buttonLink?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface DeviceHeroConfig {
  rotationEnabled: boolean;
  rotationIntervalSec: number;
  dailyMode: boolean;
  startDate?: string;
  selectedImageId?: string;
  images: HeroImageItem[];
}

export interface ResponsiveHeroConfig {
  mobile: DeviceHeroConfig;
  tablet: DeviceHeroConfig;
  desktop: DeviceHeroConfig;
}

// Backward compatibility legacy interface
export interface HeroSlide {
  id: string;
  imageUrl: string;
  badge?: string;
  heading: string;
  subheading: string;
  buttonText: string;
  buttonLink: string;
  isActive: boolean;
  sortOrder: number;
}

export const DEFAULT_MOBILE_HERO: DeviceHeroConfig = {
  rotationEnabled: false,
  rotationIntervalSec: 5,
  dailyMode: true,
  images: [
    {
      id: 'default-mobile-1',
      url: '/hero-mobile-bg.jpg',
      altText: 'ADRIZO Mobile Hero — Good Outfits Better Days',
      badge: 'WEAR A BETTER TOMORROW',
      heading: 'More Than Clothes. A Better You.',
      buttonText: 'SHOP NOW',
      buttonLink: '/shop',
      isActive: true,
      sortOrder: 0,
    }
  ]
};

export const DEFAULT_TABLET_HERO: DeviceHeroConfig = {
  rotationEnabled: false,
  rotationIntervalSec: 5,
  dailyMode: true,
  images: [
    {
      id: 'default-tablet-1',
      url: '/hero-bg.png',
      altText: 'ADRIZO Tablet Hero — Premium Indian Menswear',
      badge: 'EXCLUSIVE EDIT',
      heading: 'SIGNATURE POLOS & ESSENTIALS',
      buttonText: 'EXPLORE COLLECTION',
      buttonLink: '/shop',
      isActive: true,
      sortOrder: 0,
    }
  ]
};

export const DEFAULT_DESKTOP_HERO: DeviceHeroConfig = {
  rotationEnabled: false,
  rotationIntervalSec: 5,
  dailyMode: true,
  images: [
    {
      id: 'default-desktop-1',
      url: '/hero-bg.png',
      altText: 'ADRIZO Desktop Hero — Buy 1 Get 2 Free',
      badge: 'LIMITED TIME OFFER',
      heading: 'BUY 1 GET 2 FREE',
      subheading: 'Premium Luxury Polos & Contemporary Menswear',
      buttonText: 'SHOP NOW',
      buttonLink: '/shop',
      isActive: true,
      sortOrder: 0,
    }
  ]
};

export const DEFAULT_RESPONSIVE_HERO: ResponsiveHeroConfig = {
  mobile: DEFAULT_MOBILE_HERO,
  tablet: DEFAULT_TABLET_HERO,
  desktop: DEFAULT_DESKTOP_HERO,
};

/**
 * Deterministically select the active hero image based on device configuration.
 * When dailyMode is enabled, selects the next eligible image after each 24-hour interval
 * in Indian Standard Time (UTC+5:30), cycling deterministically through active images.
 */
export function getDeterministicHeroImage(
  deviceConfig: DeviceHeroConfig,
  currentTimeMs: number = Date.now()
): HeroImageItem | null {
  const activeImages = (deviceConfig?.images || [])
    .filter(img => img.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (activeImages.length === 0) return null;

  if (deviceConfig.dailyMode) {
    // IST offset: 5 hours 30 minutes in milliseconds
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const currentDayIndex = Math.floor((currentTimeMs + IST_OFFSET_MS) / (24 * 60 * 60 * 1000));
    const index = Math.abs(currentDayIndex) % activeImages.length;
    return activeImages[index];
  }

  if (deviceConfig.selectedImageId) {
    const selected = activeImages.find(img => img.id === deviceConfig.selectedImageId);
    if (selected) return selected;
  }

  return activeImages[0];
}
