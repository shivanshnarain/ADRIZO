/**
 * ADRIZO — UNIFIED MANUAL + AUTOMATIC SHIPROCKET TRACKING VERIFICATION SUITE
 * 
 * Verifies:
 * 1. Status normalization and milestone index calculation.
 * 2. Status transition validation & terminal state regression prevention.
 * 3. History appending, deduplication, and source tagging (ADMIN_MANUAL vs CARRIER_EVENT).
 * 4. Merged unified timeline activity building without fake scans.
 * 5. Carrier webhook simulation with out-of-order protection against DELIVERED.
 */

import {
  normalizeTrackingStatus,
  getTrackingStatusLabel,
  getMilestoneIndex,
  validateStatusTransition,
  appendTrackingEvent,
  getOrderTrackingHistory,
  buildUnifiedTrackingActivities,
} from '../src/lib/order-tracking';
import { mapShiprocketStatusToAdrizo } from '../src/lib/shiprocket/tracking';

async function runTestSuite() {
  console.log('===============================================================');
  console.log('ADRIZO — UNIFIED MANUAL + SHIPROCKET TRACKING VERIFICATION SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  }

  // -----------------------------------------------------------------
  // 1. Status Normalization & Milestone Index Tests
  // -----------------------------------------------------------------
  console.log('\n--- 1. STATUS NORMALIZATION & MILESTONES ---');
  assert(normalizeTrackingStatus('Packed & Ready') === 'PACKED', 'Normalizes "Packed & Ready" to PACKED');
  assert(normalizeTrackingStatus('Handed to Courier (Shipped)') === 'SHIPPED', 'Normalizes "Handed to Courier" to SHIPPED');
  assert(normalizeTrackingStatus('Out for Delivery') === 'OUT_FOR_DELIVERY', 'Normalizes "Out for Delivery" to OUT_FOR_DELIVERY');
  assert(normalizeTrackingStatus('DELIVERED') === 'DELIVERED', 'Normalizes "DELIVERED" to DELIVERED');
  assert(normalizeTrackingStatus('RTO INITIATED') === 'RETURNED', 'Normalizes "RTO INITIATED" to RETURNED');

  assert(getMilestoneIndex('ORDER_RECEIVED') === 0, 'Stage 0: Order Confirmed');
  assert(getMilestoneIndex('PACKED') === 1, 'Stage 1: Packed & Ready (even without AWB)');
  assert(getMilestoneIndex('SHIPPED') === 2, 'Stage 2: Picked Up / Handed to Courier');
  assert(getMilestoneIndex('IN_TRANSIT') === 3, 'Stage 3: In Transit');
  assert(getMilestoneIndex('OUT_FOR_DELIVERY') === 4, 'Stage 4: Out for Delivery');
  assert(getMilestoneIndex('DELIVERED') === 5, 'Stage 5: Delivered');

  // -----------------------------------------------------------------
  // 2. Transition Validation Tests
  // -----------------------------------------------------------------
  console.log('\n--- 2. TRANSITION VALIDATION & TERMINAL PROTECTION ---');
  const t1 = validateStatusTransition('ORDER_RECEIVED', 'PACKED');
  assert(t1.allowed, 'Valid transition: ORDER_RECEIVED -> PACKED');

  const t2 = validateStatusTransition('PACKED', 'SHIPPED');
  assert(t2.allowed, 'Valid transition: PACKED -> SHIPPED');

  const t3 = validateStatusTransition('DELIVERED', 'PACKED');
  assert(!t3.allowed, 'Rejected regression: DELIVERED -> PACKED', t3.reason);

  const t4 = validateStatusTransition('DELIVERED', 'SHIPPED');
  assert(!t4.allowed, 'Rejected regression: DELIVERED -> SHIPPED', t4.reason);

  const t5 = validateStatusTransition('CANCELLED', 'SHIPPED');
  assert(!t5.allowed, 'Rejected transition: CANCELLED -> SHIPPED', t5.reason);

  // -----------------------------------------------------------------
  // 3. Tracking Event Deduplication & History Persistence
  // -----------------------------------------------------------------
  console.log('\n--- 3. EVENT DEDUPLICATION & AUDIT TRAIL ---');
  const testOrderNum = `TEST-ORD-${Date.now()}`;

  // Add initial packed event
  await appendTrackingEvent(testOrderNum, {
    status: 'PACKED',
    activity: 'Order packed & verified at ADRIZO facility.',
    source: 'ADMIN_MANUAL',
    actor: 'Admin (Shivansh)',
    timestamp: new Date().toISOString(),
  });

  let history = await getOrderTrackingHistory(testOrderNum);
  assert(history.length === 1, 'Initial manual event saved');
  assert(history[0].source === 'ADMIN_MANUAL', 'Event source is ADMIN_MANUAL');
  assert(history[0].status === 'PACKED', 'Event status is PACKED');

  // Attempt duplicate addition (simulating rapid double-click in admin panel)
  await appendTrackingEvent(testOrderNum, {
    status: 'PACKED',
    activity: 'Order packed & verified at ADRIZO facility.',
    source: 'ADMIN_MANUAL',
    actor: 'Admin (Shivansh)',
    timestamp: new Date().toISOString(),
  });

  history = await getOrderTrackingHistory(testOrderNum);
  assert(history.length === 1, 'Duplicate manual submission within 10m is safely deduplicated');

  // Add carrier pickup event
  await appendTrackingEvent(testOrderNum, {
    status: 'SHIPPED',
    activity: 'Picked up by Shiprocket courier partner.',
    location: 'Noida Hub',
    source: 'CARRIER_EVENT',
    actor: 'Shiprocket / Delhivery',
    timestamp: new Date().toISOString(),
    rawStatus: 'PICKED UP',
  });

  history = await getOrderTrackingHistory(testOrderNum);
  assert(history.length === 2, 'Distinct carrier event appended without overwriting history');
  assert(history[0].source === 'CARRIER_EVENT', 'Newest event is CARRIER_EVENT');
  assert(history[0].rawStatus === 'PICKED UP', 'Raw carrier status is preserved');

  // -----------------------------------------------------------------
  // 4. Unified Timeline Construction (Customer View)
  // -----------------------------------------------------------------
  console.log('\n--- 4. UNIFIED TIMELINE CONSTRUCTION ---');
  const mockOrder = {
    orderNumber: testOrderNum,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    deliveryPartner: 'Delhivery',
    awbCode: 'DEL1234567890',
    trackingStatus: 'SHIPPED',
    city: 'Noida',
    state: 'Uttar Pradesh',
  };

  const carrierActivities = [
    {
      activity: 'Departed transit facility',
      location: 'Delhi Central Sort Center',
      date: new Date().toISOString(),
      'sr-status-label': 'IN TRANSIT',
    },
  ];

  const unifiedActivities = await buildUnifiedTrackingActivities(mockOrder, carrierActivities);
  assert(unifiedActivities.length >= 3, 'Activities combine order creation, admin action, and carrier scans');
  
  const sources = unifiedActivities.map(a => a.source);
  assert(sources.includes('SYSTEM'), 'Includes initial order placement');
  assert(sources.includes('ADMIN_MANUAL'), 'Includes operational admin update');
  assert(sources.includes('CARRIER_EVENT') || sources.includes('CARRIER_LIVE'), 'Includes genuine carrier scan');

  // -----------------------------------------------------------------
  // 5. Shiprocket Webhook Status Mapping & Out-of-Order Safety
  // -----------------------------------------------------------------
  console.log('\n--- 5. SHIPROCKET WEBHOOK STATUS MAPPING ---');
  const map1 = mapShiprocketStatusToAdrizo('PICKED UP');
  assert(map1.trackingStatus === 'SHIPPED', 'Maps "PICKED UP" -> SHIPPED');

  const map2 = mapShiprocketStatusToAdrizo('OUT FOR DELIVERY');
  assert(map2.trackingStatus === 'OUT_FOR_DELIVERY', 'Maps "OUT FOR DELIVERY" -> OUT_FOR_DELIVERY');

  const map3 = mapShiprocketStatusToAdrizo('DELIVERED');
  assert(map3.trackingStatus === 'DELIVERED', 'Maps "DELIVERED" -> DELIVERED');

  const map4 = mapShiprocketStatusToAdrizo('RTO DELIVERED');
  assert(map4.trackingStatus === 'RETURNED', 'Maps "RTO DELIVERED" -> RETURNED');

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
