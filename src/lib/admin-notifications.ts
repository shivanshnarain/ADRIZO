import { prisma } from './prisma';

export type NotificationType =
  | 'NEW_ORDER'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'PACKING_OVERDUE'
  | 'PACKING_APPROACHING'
  | 'SHIPROCKET_AUTH_FAILED'
  | 'SHIPMENT_CREATION_FAILED'
  | 'AWB_ASSIGNED'
  | 'PICKUP_OVERDUE'
  | 'PICKUP_CONFIRMED'
  | 'DELIVERY_EXCEPTION'
  | 'DELIVERED';

export interface CreateAdminNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  orderNumber?: string;
  orderId?: string;
  customerName?: string;
  orderTotal?: number;
  paymentStatus?: string;
  dedupKey?: string;
  metadata?: Record<string, any>;
}

/**
 * Creates a durable, deduplicated notification for administrators.
 * Guarantees idempotency via unique dedupKey.
 */
export async function createAdminNotification(params: CreateAdminNotificationParams) {
  try {
    const dedupKey = params.dedupKey || `${params.type}_${params.orderNumber || params.orderId || Date.now()}`;

    // Upsert or create if not exists
    const notification = await prisma.adminNotification.upsert({
      where: { dedupKey },
      update: {
        title: params.title,
        message: params.message,
        orderTotal: params.orderTotal,
        paymentStatus: params.paymentStatus,
        customerName: params.customerName,
        metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
        updatedAt: new Date(),
      },
      create: {
        type: params.type,
        title: params.title,
        message: params.message,
        orderNumber: params.orderNumber || null,
        orderId: params.orderId || null,
        customerName: params.customerName || null,
        orderTotal: params.orderTotal !== undefined ? Number(params.orderTotal) : null,
        paymentStatus: params.paymentStatus || null,
        dedupKey,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        isRead: false,
      },
    });

    return { success: true, notification };
  } catch (err: any) {
    console.error('[Admin Notification Create Error]', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Retrieves latest notifications with unread count.
 */
export async function getAdminNotifications(limit = 20) {
  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.adminNotification.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.adminNotification.count({
        where: { isRead: false },
      }),
    ]);

    return {
      success: true,
      unreadCount,
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        orderNumber: n.orderNumber,
        orderId: n.orderId,
        customerName: n.customerName,
        orderTotal: n.orderTotal,
        paymentStatus: n.paymentStatus,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      })),
    };
  } catch (err: any) {
    console.error('[Get Admin Notifications Error]', err.message);
    return { success: false, unreadCount: 0, notifications: [] };
  }
}

/**
 * Marks one or all notifications as read.
 */
export async function markNotificationsAsRead(notificationId?: string) {
  try {
    if (notificationId) {
      await prisma.adminNotification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
    } else {
      await prisma.adminNotification.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      });
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Mark Notifications Read Error]', err.message);
    return { success: false, error: err.message };
  }
}
