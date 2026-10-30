import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

/**
 * Ensures production database credentials from deployment configuration or fallback files
 * are loaded into process.env before Prisma Client initialization.
 */
function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
    return;
  }

  try {
    const candidates = [
      path.resolve(process.cwd(), '.env.local'),
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '.env.production'),
      path.resolve(process.cwd(), '.env.vercel'),
    ];

    for (const fullPath of candidates) {
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
          const eqIdx = trimmed.indexOf('=');
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (key === 'DATABASE_URL' && val && val.length > 0) {
            process.env.DATABASE_URL = val;
            return;
          }
        }
      }
    }
  } catch {
    // In restricted execution environments or read-only workers, ignore file system fallback errors
  }
}

ensureDatabaseUrl();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function isPrismaConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
