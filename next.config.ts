import type { NextConfig } from "next";

const rawKey = process.env.RAZORPAY_KEY_ID?.trim() || '';
const rawKeyLower = rawKey.toLowerCase();
const isDeprecated =
  !rawKey ||
  rawKeyLower.includes('tyio72mcolkjpn') ||
  rawKeyLower.includes('taj9ubralpmyhj');

const activeRazorpayKeyId = isDeprecated ? 'rzp_live_Tiib0FXtrAbDDN' : rawKey;

const nextConfig: NextConfig = {
  env: {
    RAZORPAY_KEY_ID: activeRazorpayKeyId,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: activeRazorpayKeyId,
    RAZORPAY_CURRENCY: process.env.RAZORPAY_CURRENCY || 'INR',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // Server runtime reload trigger - 2026-09-04
  allowedDevOrigins: ['localhost:3001', '127.0.0.1:3001', 'localhost', '127.0.0.1'],
};

export default nextConfig;
