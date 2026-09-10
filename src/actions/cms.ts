'use server';

import { prisma } from '../lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyAdminSession } from '../lib/auth';

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

const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    id: 'hero-slide-1',
    imageUrl: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&q=80&w=1200',
    badge: 'NEW SEASON ARRIVAL',
    heading: 'ELEVATE YOUR EVERYDAY ESSENTIALS',
    subheading: 'Premium Lycra & Heavyweight Cotton Polos engineered for the modern aesthetic.',
    buttonText: 'SHOP THE COLLECTION',
    buttonLink: '/shop',
    isActive: true,
    sortOrder: 0
  },
  {
    id: 'hero-slide-2',
    imageUrl: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?auto=format&fit=crop&q=80&w=1200',
    badge: 'EXCLUSIVE POLO EDIT',
    heading: 'SIGNATURE ZIPPER & BUTTON POLOS',
    subheading: 'Tailored silhouettes with refined zipper detailing and enduring comfort.',
    buttonText: 'EXPLORE POLOS',
    buttonLink: '/shop?category=polo-t-shirts',
    isActive: true,
    sortOrder: 1
  }
];

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

    return { success: true, slides: DEFAULT_HERO_SLIDES };
  } catch (error: any) {
    return { success: false, slides: DEFAULT_HERO_SLIDES, error: error.message };
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
