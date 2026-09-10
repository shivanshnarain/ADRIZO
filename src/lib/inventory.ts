/**
 * Inventory & Stock Management (DEPRECATED & OBSOLETE)
 * Size-wise inventory and stock management has been removed from the system.
 * These helper shims remain solely to prevent runtime crashes in legacy code.
 */

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export function parseSizeWiseStock(raw: unknown): Record<string, number> {
  return {};
}

export function calculateTotalStock(sizeWiseStock: unknown): number {
  return 0;
}

export function calculateStockStatus(
  totalStock?: number,
  lowStockThreshold?: number
): StockStatus {
  return 'IN_STOCK';
}

export function getStockStatusLabel(status?: string | null): string {
  return 'IN STOCK';
}
