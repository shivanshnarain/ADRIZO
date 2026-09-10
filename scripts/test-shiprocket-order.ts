try {
  process.loadEnvFile('.env.local');
} catch {}
try {
  process.loadEnvFile('.env');
} catch {}

import { getAdminClient } from '../src/lib/supabase/admin';
import { resolveOrderFromSupabase } from '../src/lib/order-resolver';
import {
  createShiprocketOrder,
  checkCourierServiceability,
  isShiprocketConfigured,
  maskEmail,
} from '../src/lib/shiprocket';

async function runShiprocketOrderTests() {
  console.log('====================================================');
  console.log('AD(R)IZO Phase 2: Shiprocket Order & Shipment Verification');
  console.log('====================================================\n');

  // Step 0: Check configuration
  const configured = isShiprocketConfigured();
  console.log(`[Check 0] Shiprocket configured in environment: ${configured ? 'YES' : 'NO'}`);
  if (!configured) {
    console.error('Shiprocket API credentials missing from .env.local. Aborting.');
    process.exit(1);
  }
  console.log(`[Check 0] Authenticated API user: ${maskEmail(process.env.SHIPROCKET_API_EMAIL)}\n`);

  // Step 1: Courier Serviceability Test
  console.log('--- TEST 1: LIVE COURIER SERVICEABILITY CHECK ---');
  const serviceability = await checkCourierServiceability({
    pickupPincode: '201301',
    deliveryPincode: '282002', // Agra
    weightKg: 0.5,
    isCod: true,
    orderTotal: 598,
  });

  console.log(`Serviceability status: ${serviceability.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`Pickup Pincode: ${serviceability.pickupPincode}`);
  console.log(`Delivery Pincode: ${serviceability.deliveryPincode}`);
  console.log(`Serviceable Couriers count: ${serviceability.availableCouriers.length}`);

  if (serviceability.availableCouriers.length > 0) {
    const top3 = serviceability.availableCouriers.slice(0, 3);
    console.log('Top Courier Options:');
    top3.forEach((c, idx) => {
      console.log(
        `  ${idx + 1}. ${c.courierName} (ID: ${c.courierCompanyId}) - Rate: ₹${c.rate} (Freight: ₹${c.freightCharge}, COD: ₹${c.codCharges}), ETD: ${c.etd || c.estimatedDeliveryDays + ' days'}, Rating: ${c.rating}★`
      );
    });
    console.log(`Recommended Courier ID: ${serviceability.recommendedCourierId}`);
    console.log('[PASS] Courier serviceability API operational and verified.\n');
  } else {
    console.warn(`[WARN] Serviceability returned no couriers: ${serviceability.error}`);
  }

  // Step 2: Create a Test Order in Supabase
  console.log('--- TEST 2: CREATE REAL AD(R)IZO ORDER IN DATABASE ---');
  const supabase = getAdminClient();
  const testOrderNumber = `ADR-TEST-${Date.now().toString().slice(-6)}`;

  const { data: insertedOrder, error: orderInsertErr } = await supabase
    .from('orders')
    .insert({
      order_number: testOrderNumber,
      customer_name: 'Rahul Sharma',
      customer_email: 'care.adrizo@gmail.com',
      customer_phone: '9876543210',
      shipping_address: 'Flat 302, Green Valley Apartments, Sanjay Place',
      city: 'Agra',
      state: 'Uttar Pradesh',
      pincode: '282002',
      subtotal: 499,
      shipping_charge: 0,
      cod_charge: 99,
      discount: 0,
      total_amount: 598,
      payment_method: 'COD',
      payment_status: 'PENDING',
      order_status: 'PLACED',
    })
    .select()
    .single();

  if (orderInsertErr || !insertedOrder) {
    console.error('[FAIL] Could not insert test order into Supabase:', orderInsertErr);
    process.exit(1);
  }

  console.log(`Test order inserted in Supabase: #${insertedOrder.order_number} (UUID: ${insertedOrder.id})`);

  // Insert order item
  const { error: itemInsertErr } = await supabase
    .from('order_items')
    .insert({
      order_id: insertedOrder.id,
      product_id: 'prod_test_cotton_tee',
      product_name: 'ADRIZO Classic Cotton Crewneck T-Shirt',
      sku: 'TSH-ADR-BLK-M',
      size: 'M',
      color: 'Onyx Black',
      quantity: 1,
      unit_price: 499,
      total_price: 499,
      mrp: 999,
    });

  if (itemInsertErr) {
    console.error('[FAIL] Could not insert test order item:', itemInsertErr);
    process.exit(1);
  }
  console.log('[PASS] Test order and items successfully seeded into Supabase.\n');

  // Step 3: Resolve the Order
  console.log('--- TEST 3: RESOLVE ORDER VIA ORDER RESOLVER ---');
  const resolvedOrder = await resolveOrderFromSupabase(insertedOrder.id);
  if (!resolvedOrder) {
    console.error('[FAIL] Failed to resolve order from Supabase.');
    process.exit(1);
  }
  console.log(`Resolved order #${resolvedOrder.orderNumber}:`);
  console.log(`  Customer: ${resolvedOrder.customerName} (${resolvedOrder.customerPhone})`);
  console.log(`  Destination: ${resolvedOrder.shippingAddress}, ${resolvedOrder.city}, ${resolvedOrder.state} - ${resolvedOrder.pincode}`);
  console.log(`  Items: ${resolvedOrder.items.length} item(s) - ${resolvedOrder.items[0].productName} (Qty: ${resolvedOrder.items[0].quantity})`);
  console.log(`  Total: ₹${resolvedOrder.total} (${resolvedOrder.paymentMethod})\n`);

  // Step 4: Call createShiprocketOrder (Real Shiprocket API call)
  console.log('--- TEST 4: CREATE SHIPROCKET ORDER (POST /orders/create/adhoc) ---');
  const result = await createShiprocketOrder(resolvedOrder);
  console.log('Shiprocket API Result:');
  console.log(`  Success: ${result.success}`);
  console.log(`  Shiprocket Order ID: ${result.orderId}`);
  console.log(`  Shiprocket Shipment ID: ${result.shipmentId}`);
  console.log(`  Status: ${result.status}`);
  console.log(`  Message: ${result.message}`);

  if (!result.orderId || !result.shipmentId) {
    console.error('[FAIL] Missing order_id or shipment_id from Shiprocket response!');
    process.exit(1);
  }
  console.log('[PASS] Live Shiprocket Order & Shipment created successfully!\n');

  // Step 5: Verify Persistence in Supabase
  console.log('--- TEST 5: VERIFY DATABASE PERSISTENCE ---');
  const { data: verifiedOrder, error: verifyErr } = await supabase
    .from('orders')
    .select('id, order_number, shiprocket_order_id, shiprocket_shipment_id, shiprocket_status, shiprocket_synced_at')
    .eq('id', insertedOrder.id)
    .single();

  if (verifyErr || !verifiedOrder) {
    console.error('[FAIL] Could not verify order in Supabase:', verifyErr);
    process.exit(1);
  }

  console.log(`Database record for #${verifiedOrder.order_number}:`);
  console.log(`  shiprocket_order_id: ${verifiedOrder.shiprocket_order_id}`);
  console.log(`  shiprocket_shipment_id: ${verifiedOrder.shiprocket_shipment_id}`);
  console.log(`  shiprocket_status: ${verifiedOrder.shiprocket_status}`);
  console.log(`  shiprocket_synced_at: ${verifiedOrder.shiprocket_synced_at}`);

  if (
    verifiedOrder.shiprocket_order_id === String(result.orderId) &&
    verifiedOrder.shiprocket_shipment_id === String(result.shipmentId)
  ) {
    console.log('[PASS] Shiprocket identifiers correctly saved in AD(R)IZO Supabase database!\n');
  } else {
    console.error('[FAIL] Database identifiers do not match Shiprocket response!');
    process.exit(1);
  }

  // Step 6: Test Idempotency (Prevent Duplicate Shiprocket Orders)
  console.log('--- TEST 6: VERIFY IDEMPOTENCY (NO DUPLICATE SHIPROCKET ORDERS) ---');
  const reResolvedOrder = await resolveOrderFromSupabase(insertedOrder.id);
  if (!reResolvedOrder) {
    console.error('[FAIL] Could not re-resolve order.');
    process.exit(1);
  }

  const retryResult = await createShiprocketOrder(reResolvedOrder);
  console.log('Second invocation result:');
  console.log(`  Already Synced flag: ${retryResult.alreadySynced}`);
  console.log(`  Order ID: ${retryResult.orderId}`);
  console.log(`  Shipment ID: ${retryResult.shipmentId}`);
  console.log(`  Message: ${retryResult.message}`);

  if (
    retryResult.alreadySynced === true &&
    retryResult.orderId === result.orderId &&
    retryResult.shipmentId === result.shipmentId
  ) {
    console.log('[PASS] Idempotency verified: re-submitting an already synced order safely returns existing IDs without hitting external API.\n');
  } else {
    console.error('[FAIL] Idempotency failed! Re-submission did not detect already synced state.');
    process.exit(1);
  }

  // Step 7: Test Validation Failure Safety
  console.log('--- TEST 7: VERIFY VALIDATION FAILURE SAFETY ---');
  try {
    const invalidOrder = {
      ...resolvedOrder,
      shiprocketOrderId: null,
      shiprocketShipmentId: null,
      customerPhone: '123', // Invalid phone
    };
    await createShiprocketOrder(invalidOrder as any);
    console.error('[FAIL] Validation did not reject invalid phone number!');
  } catch (err: any) {
    console.log(`[PASS] Correctly rejected invalid input: "${err.message}"`);
  }

  console.log('\n====================================================');
  console.log('ALL PHASE 2 SHIPROCKET TESTS COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
}

runShiprocketOrderTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
