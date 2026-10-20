import { prisma } from './prisma';

export type CanonicalTrackingStatus =
  | 'ORDER_RECEIVED'
  | 'ORDER_CONFIRMED'
  | 'PACKED'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'RETURNED'
  | 'CANCELLED'
  | 'DELIVERY_EXCEPTION';

export interface TrackingHistoryEvent {
  id: string;
  orderNumber: string;
  status: CanonicalTrackingStatus | string;
  statusLabel: string;
  activity: string;
  location: string;
  timestamp: string;
  source: 'ADMIN_MANUAL' | 'CARRIER_EVENT' | 'SYSTEM';
  actor?: string;
  verified: boolean;
  rawStatus?: string;
}

// In-memory fallback cache on globalThis to preserve history across module reloads
const globalForTracking = globalThis as unknown as {
  __adrizoTrackingHistory?: Record<string, TrackingHistoryEvent[]>;
};
if (!globalForTracking.__adrizoTrackingHistory) {
  globalForTracking.__adrizoTrackingHistory = {};
}

/**
 * Normalizes any raw status string to canonical internal status
 */
export function normalizeTrackingStatus(rawStatus?: string | null): CanonicalTrackingStatus {
  if (!rawStatus) return 'ORDER_RECEIVED';
  const s = rawStatus.trim().toUpperCase();

  if (s === 'ORDER_CONFIRMED' || s === 'ORDER_RECEIVED' || s === 'CONFIRMED' || s === 'PLACED') {
    return 'ORDER_RECEIVED';
  }
  if (s === 'PACKED' || s.includes('PACKED') || s.includes('READY TO SHIP') || s === 'PROCESSING') {
    return 'PACKED';
  }
  if (s === 'SHIPPED' || s === 'PICKED_UP' || s.includes('PICKED UP') || s.includes('HANDED TO COURIER')) {
    return 'SHIPPED';
  }
  if (s === 'IN_TRANSIT' || s.includes('TRANSIT') || s.includes('REACHED')) {
    return 'IN_TRANSIT';
  }
  if (s === 'OUT_FOR_DELIVERY' || s === 'OFD' || s.includes('OUT FOR DELIVERY')) {
    return 'OUT_FOR_DELIVERY';
  }
  if (s === 'DELIVERED' || s.includes('DELIVERED')) {
    return 'DELIVERED';
  }
  if (s === 'RETURNED' || s === 'RTO' || s.includes('RTO') || s.includes('RETURN')) {
    return 'RETURNED';
  }
  if (s === 'CANCELLED' || s === 'CANCELED' || s.includes('CANCEL')) {
    return 'CANCELLED';
  }
  if (s.includes('EXCEPTION') || s.includes('UNDELIVERED') || s.includes('DELAYED')) {
    return 'DELIVERY_EXCEPTION';
  }

  return 'ORDER_RECEIVED';
}

/**
 * Human-readable display labels for each canonical status
 */
export function getTrackingStatusLabel(status: CanonicalTrackingStatus | string): string {
  const norm = normalizeTrackingStatus(status);
  switch (norm) {
    case 'ORDER_RECEIVED':
    case 'ORDER_CONFIRMED':
      return 'Order Confirmed';
    case 'PACKED':
      return 'Packed & Ready';
    case 'SHIPPED':
      return 'Handed to Courier (Shipped)';
    case 'IN_TRANSIT':
      return 'In Transit';
    case 'OUT_FOR_DELIVERY':
      return 'Out for Delivery';
    case 'DELIVERED':
      return 'Delivered';
    case 'RETURNED':
      return 'Returned / RTO';
    case 'CANCELLED':
      return 'Order Cancelled';
    case 'DELIVERY_EXCEPTION':
      return 'Delivery Exception';
    default:
      return 'In Progress';
  }
}

/**
 * Maps a tracking status to the 6-milestone progress index (0 to 5)
 */
export function getMilestoneIndex(status: CanonicalTrackingStatus | string): number {
  const norm = normalizeTrackingStatus(status);
  switch (norm) {
    case 'ORDER_RECEIVED':
    case 'ORDER_CONFIRMED':
      return 0; // Stage 1: Order Confirmed
    case 'PACKED':
      return 1; // Stage 2: Packed & Ready
    case 'SHIPPED':
      return 2; // Stage 3: Picked Up / Handed to Courier
    case 'IN_TRANSIT':
      return 3; // Stage 4: In Transit
    case 'OUT_FOR_DELIVERY':
      return 4; // Stage 5: Out for Delivery
    case 'DELIVERED':
      return 5; // Stage 6: Delivered
    default:
      return 0;
  }
}

/**
 * Validates whether a requested status transition is allowed
 */
export function validateStatusTransition(
  currentStatus: string | null | undefined,
  nextStatus: string
): { allowed: boolean; reason?: string } {
  const cur = normalizeTrackingStatus(currentStatus);
  const next = normalizeTrackingStatus(nextStatus);

  if (cur === next) {
    return { allowed: true }; // No change
  }

  // Terminal state protection: Cancelled orders cannot be advanced without explicit admin handling
  if (cur === 'CANCELLED' && next !== 'ORDER_RECEIVED') {
    return { allowed: false, reason: 'Cancelled orders cannot be advanced to shipping stages.' };
  }

  // Prevent regressing a verified terminal DELIVERED status to an earlier shipping status
  if (cur === 'DELIVERED' && (next === 'SHIPPED' || next === 'PACKED' || next === 'IN_TRANSIT' || next === 'OUT_FOR_DELIVERY')) {
    return { allowed: false, reason: 'Delivered orders cannot regress to earlier transit stages.' };
  }

  return { allowed: true };
}

/**
 * Retrieves persisted tracking history events for an order
 */
export async function getOrderTrackingHistory(orderNumber: string): Promise<TrackingHistoryEvent[]> {
  const cleanNum = (orderNumber || '').trim().toUpperCase();
  if (!cleanNum) return [];

  // 1. Check in-memory global cache
  const memEvents = globalForTracking.__adrizoTrackingHistory?.[cleanNum];
  if (memEvents && memEvents.length > 0) {
    return memEvents;
  }

  // 2. Check MongoDB StoreSetting
  try {
    const record = await prisma.storeSetting.findUnique({
      where: { key: `tracking_history_${cleanNum}` },
    });
    if (record && record.value) {
      const parsed: TrackingHistoryEvent[] = JSON.parse(record.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (!globalForTracking.__adrizoTrackingHistory) {
          globalForTracking.__adrizoTrackingHistory = {};
        }
        globalForTracking.__adrizoTrackingHistory[cleanNum] = parsed;
        return parsed;
      }
    }
  } catch (err: any) {
    // If DB is offline or in sandbox, gracefully return memory cache
  }

  return globalForTracking.__adrizoTrackingHistory?.[cleanNum] || [];
}

/**
 * Appends a new tracking event with deduplication and persistence
 */
export async function appendTrackingEvent(
  orderNumber: string,
  event: {
    status: CanonicalTrackingStatus | string;
    activity: string;
    location?: string;
    source: 'ADMIN_MANUAL' | 'CARRIER_EVENT' | 'SYSTEM';
    actor?: string;
    timestamp?: string;
    verified?: boolean;
    rawStatus?: string;
  }
): Promise<TrackingHistoryEvent[]> {
  const cleanNum = (orderNumber || '').trim().toUpperCase();
  if (!cleanNum) return [];

  const existing = await getOrderTrackingHistory(cleanNum);
  const normStatus = normalizeTrackingStatus(event.status);
  const statusLabel = getTrackingStatusLabel(normStatus);
  const now = event.timestamp || new Date().toISOString();

  // Deduplication check: do not add duplicate identical status and source within 10 minutes
  const isDuplicate = existing.some((e) => {
    if (e.status === normStatus && e.source === event.source) {
      const timeDiff = Math.abs(new Date(e.timestamp).getTime() - new Date(now).getTime());
      return timeDiff < 10 * 60 * 1000; // 10 minutes window
    }
    return false;
  });

  if (isDuplicate) {
    return existing;
  }

  const newEvent: TrackingHistoryEvent = {
    id: `track_evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    orderNumber: cleanNum,
    status: normStatus,
    statusLabel,
    activity: event.activity,
    location: event.location || 'ADRIZO Fulfillment Center, Noida',
    timestamp: now,
    source: event.source,
    actor: event.actor || (event.source === 'ADMIN_MANUAL' ? 'ADRIZO Fulfillment Team' : 'Courier Network'),
    verified: event.verified ?? (event.source === 'CARRIER_EVENT'),
    rawStatus: event.rawStatus,
  };

  const updatedHistory = [newEvent, ...existing];

  // Update in-memory cache
  if (!globalForTracking.__adrizoTrackingHistory) {
    globalForTracking.__adrizoTrackingHistory = {};
  }
  globalForTracking.__adrizoTrackingHistory[cleanNum] = updatedHistory;

  // Persist to MongoDB StoreSetting asynchronously
  try {
    await prisma.storeSetting.upsert({
      where: { key: `tracking_history_${cleanNum}` },
      create: {
        key: `tracking_history_${cleanNum}`,
        value: JSON.stringify(updatedHistory),
      },
      update: {
        value: JSON.stringify(updatedHistory),
      },
    });
  } catch (err: any) {
    // If DB is offline, in-memory cache persists for process lifetime
  }

  return updatedHistory;
}

/**
 * Builds the complete unified tracking activities timeline combining
 * order placement, admin operational updates, and carrier scan events.
 */
export async function buildUnifiedTrackingActivities(
  order: {
    orderNumber: string;
    createdAt: string;
    updatedAt?: string;
    city?: string | null;
    trackingStatus?: string | null;
    deliveryPartner?: string | null;
    trackingId?: string | null;
  },
  carrierActivities: any[] = []
): Promise<any[]> {
  const persistedHistory = await getOrderTrackingHistory(order.orderNumber);
  const normCurrent = normalizeTrackingStatus(order.trackingStatus);

  const activities: any[] = [];

  // 1. Add carrier scan events if available
  if (Array.isArray(carrierActivities) && carrierActivities.length > 0) {
    for (const ca of carrierActivities) {
      activities.push({
        date: ca.date || new Date().toISOString(),
        status: ca.status || 'IN_TRANSIT',
        activity: ca.activity || 'Carrier tracking scan',
        location: ca.location || 'Courier Transit Hub',
        source: 'CARRIER_EVENT',
        actor: order.deliveryPartner || 'Carrier Partner',
        verified: true,
      });
    }
  }

  // 2. Add persisted history events
  for (const pe of persistedHistory) {
    // Check if not already added from carrier with same text/date
    const alreadyExists = activities.some(
      (a) => a.activity === pe.activity && Math.abs(new Date(a.date).getTime() - new Date(pe.timestamp).getTime()) < 60000
    );
    if (!alreadyExists) {
      activities.push({
        date: pe.timestamp,
        status: pe.status,
        activity: pe.activity,
        location: pe.location,
        source: pe.source,
        actor: pe.actor,
        verified: pe.verified,
      });
    }
  }

  // 3. Ensure intermediate operational milestones are present if status has progressed
  const milestoneIdx = getMilestoneIndex(normCurrent);

  // If status is PACKED or higher, ensure a Packed event exists
  if (milestoneIdx >= 1 && !activities.some((a) => normalizeTrackingStatus(a.status) === 'PACKED')) {
    activities.push({
      date: order.updatedAt || order.createdAt,
      status: 'PACKED',
      activity: 'Package packed & ready for courier handover at ADRIZO facility.',
      location: 'ADRIZO Fulfillment Center, Noida',
      source: 'ADMIN_MANUAL',
      actor: 'ADRIZO Fulfillment Team',
      verified: true,
    });
  }

  // If status is SHIPPED or higher, ensure a Shipped event exists
  if (milestoneIdx >= 2 && !activities.some((a) => normalizeTrackingStatus(a.status) === 'SHIPPED')) {
    activities.push({
      date: order.updatedAt || order.createdAt,
      status: 'SHIPPED',
      activity: `Handed over to delivery partner ${order.deliveryPartner || 'Courier'}.`,
      location: 'Noida Hub',
      source: order.trackingId ? 'CARRIER_EVENT' : 'ADMIN_MANUAL',
      actor: order.deliveryPartner || 'Courier Partner',
      verified: Boolean(order.trackingId),
    });
  }

  // If status is OUT_FOR_DELIVERY or higher
  if (milestoneIdx >= 4 && !activities.some((a) => normalizeTrackingStatus(a.status) === 'OUT_FOR_DELIVERY')) {
    activities.push({
      date: order.updatedAt || order.createdAt,
      status: 'OUT_FOR_DELIVERY',
      activity: `Out for delivery to customer destination address in ${order.city || 'destination'}.`,
      location: order.city || 'Local Delivery Hub',
      source: 'CARRIER_EVENT',
      actor: order.deliveryPartner || 'Courier Executive',
      verified: true,
    });
  }

  // If status is DELIVERED
  if (milestoneIdx === 5 && !activities.some((a) => normalizeTrackingStatus(a.status) === 'DELIVERED')) {
    activities.push({
      date: order.updatedAt || order.createdAt,
      status: 'DELIVERED',
      activity: 'Shipment successfully delivered to recipient.',
      location: order.city || 'Customer Address',
      source: 'CARRIER_EVENT',
      actor: order.deliveryPartner || 'Courier Partner',
      verified: true,
    });
  }

  // 4. Always ensure initial Order Confirmed event exists at the foundation
  if (!activities.some((a) => normalizeTrackingStatus(a.status) === 'ORDER_RECEIVED')) {
    activities.push({
      date: order.createdAt,
      status: 'ORDER_CONFIRMED',
      activity: 'Order placed & confirmed. Ready for fulfillment.',
      location: 'ADRIZO Store Online',
      source: 'SYSTEM',
      actor: 'ADRIZO System',
      verified: true,
    });
  }

  // Sort chronologically (newest first for tracking display)
  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return activities;
}
