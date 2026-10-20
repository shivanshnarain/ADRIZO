export interface SlaStatusDetail {
  status: 'COMPLETED' | 'ON_TRACK' | 'APPROACHING' | 'OVERDUE' | 'EXEMPT';
  targetHours: number;
  deadlineIso: string;
  deadlineIst: string;
  hoursElapsed: number;
  hoursRemaining: number;
  isOverdue: boolean;
  label: string;
}

export interface OrderSlaEvaluation {
  orderNumber: string;
  orderId: string;
  createdAt: string;
  createdAtIst: string;
  packingSla: SlaStatusDetail;
  pickupSla: SlaStatusDetail;
}

/**
 * Format timestamp in Asia/Kolkata timezone (IST)
 */
export function formatToKolkataTime(dateInput: string | Date | number): string {
  const d = new Date(dateInput);
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Evaluates the 10-hour packing and 24-hour courier pickup SLAs for an order.
 * All operations anchored to Indian Standard Time (Asia/Kolkata).
 * 
 * Pure function: Safe to import in both client and server components.
 */
export function evaluateOrderSla(order: {
  id: string;
  orderNumber?: string;
  order_number?: string;
  createdAt?: string | Date;
  created_at?: string | Date;
  orderStatus?: string;
  order_status?: string;
  trackingStatus?: string;
  tracking_status?: string;
}): OrderSlaEvaluation {
  const orderNumber = order.orderNumber || order.order_number || order.id;
  const orderId = order.id;
  const createdAtRaw = order.createdAt || order.created_at || new Date().toISOString();
  const createdDate = new Date(createdAtRaw);
  const now = Date.now();
  const createdMs = createdDate.getTime();
  const hoursElapsed = Math.max(0, (now - createdMs) / (1000 * 60 * 60));

  const oStatus = (order.orderStatus || order.order_status || '').toUpperCase();
  const tStatus = (order.trackingStatus || order.tracking_status || '').toUpperCase();

  const isTerminal = ['CANCELLED', 'DELIVERED', 'RETURNED'].includes(oStatus);
  const isPacked = ['PACKED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(tStatus) || oStatus === 'PACKED';
  const isPickedUp = ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(tStatus) || ['SHIPPED', 'DELIVERED'].includes(oStatus);

  // 1. 10-Hour Packing SLA
  const packingDeadlineMs = createdMs + 10 * 60 * 60 * 1000;
  const packingDeadlineIso = new Date(packingDeadlineMs).toISOString();
  const packingDeadlineIst = formatToKolkataTime(packingDeadlineMs);
  const packingHoursRemaining = Math.max(0, Number(((packingDeadlineMs - now) / (1000 * 60 * 60)).toFixed(1)));

  let packingStatus: SlaStatusDetail['status'] = 'ON_TRACK';
  let packingLabel = `${packingHoursRemaining}h remaining`;

  if (isTerminal) {
    packingStatus = 'EXEMPT';
    packingLabel = oStatus;
  } else if (isPacked) {
    packingStatus = 'COMPLETED';
    packingLabel = 'Packed';
  } else if (hoursElapsed >= 10) {
    packingStatus = 'OVERDUE';
    packingLabel = `Overdue by ${(hoursElapsed - 10).toFixed(1)}h`;
  } else if (hoursElapsed >= 8) {
    packingStatus = 'APPROACHING';
    packingLabel = `Due in ${packingHoursRemaining}h`;
  }

  const packingSla: SlaStatusDetail = {
    status: packingStatus,
    targetHours: 10,
    deadlineIso: packingDeadlineIso,
    deadlineIst: packingDeadlineIst,
    hoursElapsed: Number(hoursElapsed.toFixed(1)),
    hoursRemaining: packingHoursRemaining,
    isOverdue: packingStatus === 'OVERDUE',
    label: packingLabel,
  };

  // 2. 24-Hour Pickup SLA
  const pickupDeadlineMs = createdMs + 24 * 60 * 60 * 1000;
  const pickupDeadlineIso = new Date(pickupDeadlineMs).toISOString();
  const pickupDeadlineIst = formatToKolkataTime(pickupDeadlineMs);
  const pickupHoursRemaining = Math.max(0, Number(((pickupDeadlineMs - now) / (1000 * 60 * 60)).toFixed(1)));

  let pickupStatus: SlaStatusDetail['status'] = 'ON_TRACK';
  let pickupLabel = `${pickupHoursRemaining}h remaining`;

  if (isTerminal) {
    pickupStatus = 'EXEMPT';
    pickupLabel = oStatus;
  } else if (isPickedUp) {
    pickupStatus = 'COMPLETED';
    pickupLabel = 'Picked Up';
  } else if (hoursElapsed >= 24) {
    pickupStatus = 'OVERDUE';
    pickupLabel = `Overdue by ${(hoursElapsed - 24).toFixed(1)}h`;
  } else if (hoursElapsed >= 20) {
    pickupStatus = 'APPROACHING';
    pickupLabel = `Due in ${pickupHoursRemaining}h`;
  }

  const pickupSla: SlaStatusDetail = {
    status: pickupStatus,
    targetHours: 24,
    deadlineIso: pickupDeadlineIso,
    deadlineIst: pickupDeadlineIst,
    hoursElapsed: Number(hoursElapsed.toFixed(1)),
    hoursRemaining: pickupHoursRemaining,
    isOverdue: pickupStatus === 'OVERDUE',
    label: pickupLabel,
  };

  return {
    orderNumber,
    orderId,
    createdAt: createdDate.toISOString(),
    createdAtIst: formatToKolkataTime(createdDate),
    packingSla,
    pickupSla,
  };
}
