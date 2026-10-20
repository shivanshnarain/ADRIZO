'use server';

import { prisma } from '../lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyAdminSession } from '../lib/auth';

import { 
  HeroImageItem, 
  DeviceHeroConfig, 
  ResponsiveHeroConfig, 
  HeroSlide,
  DEFAULT_MOBILE_HERO,
  DEFAULT_TABLET_HERO,
  DEFAULT_DESKTOP_HERO,
  DEFAULT_RESPONSIVE_HERO 
} from '../lib/hero-config';

export type {
  HeroImageItem,
  DeviceHeroConfig,
  ResponsiveHeroConfig,
  HeroSlide,
};

/**
 * Fetch responsive hero configuration from database
 */
export async function getResponsiveHeroConfig(): Promise<{
  success: boolean;
  config: ResponsiveHeroConfig;
  error?: string;
}> {
  try {
    const setting = await prisma.storeSetting.findUnique({
      where: { key: 'responsive_hero_config' }
    });

    if (setting && setting.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (parsed && (parsed.mobile || parsed.tablet || parsed.desktop)) {
          return {
            success: true,
            config: {
              mobile: parsed.mobile || DEFAULT_MOBILE_HERO,
              tablet: parsed.tablet || DEFAULT_TABLET_HERO,
              desktop: parsed.desktop || DEFAULT_DESKTOP_HERO,
            }
          };
        }
      } catch (parseErr) {
        console.warn('[getResponsiveHeroConfig Parse Error, using defaults]:', parseErr);
      }
    }

    return { success: true, config: DEFAULT_RESPONSIVE_HERO };
  } catch (error: any) {
    console.error('[getResponsiveHeroConfig DB Error]:', error);
    return { success: false, config: DEFAULT_RESPONSIVE_HERO, error: error.message };
  }
}

/**
 * Save responsive hero configuration to database
 */
export async function saveResponsiveHeroConfig(config: ResponsiveHeroConfig) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Ensure valid structure
    const safeConfig: ResponsiveHeroConfig = {
      mobile: {
        rotationEnabled: Boolean(config.mobile?.rotationEnabled),
        rotationIntervalSec: Math.max(2, Number(config.mobile?.rotationIntervalSec) || 5),
        dailyMode: Boolean(config.mobile?.dailyMode),
        selectedImageId: config.mobile?.selectedImageId || undefined,
        images: (config.mobile?.images || []).map((img, i) => ({
          ...img,
          sortOrder: i,
          isActive: img.isActive !== false,
        }))
      },
      tablet: {
        rotationEnabled: Boolean(config.tablet?.rotationEnabled),
        rotationIntervalSec: Math.max(2, Number(config.tablet?.rotationIntervalSec) || 5),
        dailyMode: Boolean(config.tablet?.dailyMode),
        selectedImageId: config.tablet?.selectedImageId || undefined,
        images: (config.tablet?.images || []).map((img, i) => ({
          ...img,
          sortOrder: i,
          isActive: img.isActive !== false,
        }))
      },
      desktop: {
        rotationEnabled: Boolean(config.desktop?.rotationEnabled),
        rotationIntervalSec: Math.max(2, Number(config.desktop?.rotationIntervalSec) || 5),
        dailyMode: Boolean(config.desktop?.dailyMode),
        selectedImageId: config.desktop?.selectedImageId || undefined,
        images: (config.desktop?.images || []).map((img, i) => ({
          ...img,
          sortOrder: i,
          isActive: img.isActive !== false,
        }))
      }
    };

    await prisma.storeSetting.upsert({
      where: { key: 'responsive_hero_config' },
      update: { value: JSON.stringify(safeConfig) },
      create: { key: 'responsive_hero_config', value: JSON.stringify(safeConfig) }
    });

    revalidatePath('/');
    revalidatePath('/admin/banners');
    return { success: true };
  } catch (error: any) {
    console.error('[saveResponsiveHeroConfig Error]:', error);
    return { success: false, error: error.message };
  }
}

// Backward-compatible methods
export async function getHeroBanners(): Promise<{ success: boolean; slides: HeroSlide[]; error?: string }> {
  try {
    const setting = await prisma.storeSetting.findUnique({
      where: { key: 'hero_banners' }
    });

    if (setting && setting.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { success: true, slides: parsed };
        }
      } catch {
        // fallback
      }
    }

    return {
      success: true,
      slides: [
        {
          id: 'hero-slide-1',
          imageUrl: '/hero-bg.png',
          heading: 'ELEVATE YOUR EVERYDAY ESSENTIALS',
          subheading: 'Premium Lycra & Heavyweight Cotton Polos',
          buttonText: 'SHOP THE COLLECTION',
          buttonLink: '/shop',
          isActive: true,
          sortOrder: 0
        }
      ]
    };
  } catch (error: any) {
    return { success: false, slides: [], error: error.message };
  }
}

export async function saveHeroBanners(slides: HeroSlide[]) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    await prisma.storeSetting.upsert({
      where: { key: 'hero_banners' },
      update: { value: JSON.stringify(slides) },
      create: { key: 'hero_banners', value: JSON.stringify(slides) }
    });

    revalidatePath('/');
    revalidatePath('/admin/banners');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
