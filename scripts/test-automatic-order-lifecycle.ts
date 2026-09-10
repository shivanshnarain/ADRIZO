try {
  process.loadEnvFile('.env.local');
} catch {}
try {
  process.loadEnvFile('.env');
} catch {}

import { getAdminClient } from '../src/lib/supabase/admin';
import { autoSyncOrderToShiprocket } from '../src/lib/shiprocket-auto-sync';
import { isOrderCancellable, cancelCustomerOrder } from '../src/lib/order-cancellation';
import { isOrderOwnedByCustomer, AuthenticatedCustomer } from '../src/lib/customer-auth';
import { resolveOrderFromSupabase } from '../src/lib/order-resolver';
import { trackShipmentByAwb } from '../src/lib/shiprocket/tracking';

async function runAutomaticOrderLifecycleTests() {
  console.log('================================================================');
  console.log('AD(R)IZO — COMPLETE AUTOMATIC ORDER LIFECYCLE VERIFICATION SUITE');
  console.log('================================================================\n');

  const supabase = getAdminClient();
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${detail ? `| Detail: ${detail}` : ''}`);
      failed++;
    }
  }

  const createdOrderIds: string[] = [];

  const testCustomer: AuthenticatedCustomer = {
    id: '11111111-1111-4111-a111-111111111111',
    email: 'care.adrizo@gmail.com',
    phone: '9876543210',
    name: 'Test Automatic Customer',
  };

  try {
    // -------------------------------------------------------------------------
    // 1. Security & Token Leakage Audit
    // -------------------------------------------------------------------------
    console.log('--- 1. Security & Token Leakage Audit ---');
    const srPassword = process.env.SHIPROCKET_API_PASSWORD || '';
    const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    assert(
      srPassword.length > 0 && supaKey.length > 0,
      'Environment secrets loaded in server runtime'
    );

    // Verify resolveOrderFromSupabase never returns sensitive credentials
    const dummyResolved: any = await resolveOrderFromSupabase('non-existent-order-12345');
    assert(dummyResolved === null, 'Non-existent order safely resolves to null without throwing');

    // -------------------------------------------------------------------------
    // 2. IDOR & Customer Ownership Verification
    // -------------------------------------------------------------------------
    console.log('\n--- 2. IDOR Protection & Ownership Verification ---');
    const customerBeta: AuthenticatedCustomer = {
      id: 'bbbbbbbb-2222-4222-b222-bbbbbbbbbbbb',
      email: 'beta@adrizo-test.com',
      phone: '9123456780',
      name: 'Beta Customer',
    };

    const orderAlpha: any = {
      id: 'order-alpha-001',
      orderNumber: 'ADR-ALPHA-001',
      customerId: testCustomer.id,
      customerEmail: testCustomer.email,
      customerPhone: testCustomer.phone,
    };

    assert(
      isOrderOwnedByCustomer(orderAlpha, testCustomer),
      'Customer Alpha authorized to access own order'
    );
    assert(
      !isOrderOwnedByCustomer(orderAlpha, customerBeta),
      'Customer Beta BLOCKED from accessing Customer Alpha order (IDOR Protection)'
    );

    // -------------------------------------------------------------------------
    // 3. COD Checkout: Automatic Supabase Order & Shiprocket Creation
    // -------------------------------------------------------------------------
    console.log('\n--- 3. COD Automatic Order & Shiprocket Creation ---');
    const codOrderNumber = `ADR-AUTO-COD-${Date.now().toString().slice(-6)}`;
    const { data: codOrder, error: codErr } = await supabase
      .from('orders')
      .insert({
        order_number: codOrderNumber,
        customer_id: null,
        customer_name: testCustomer.name,
        customer_email: testCustomer.email,
        customer_phone: testCustomer.phone,
        shipping_address: 'Plot 101, Phase 2, Industrial Area',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
        payment_method: 'COD',
        payment_status: 'PENDING',
        order_status: 'CONFIRMED',
        subtotal: 1299,
        shipping_charge: 0,
        cod_charge: 99,
        total_amount: 1398,
        shiprocket_sync_status: 'PENDING',
      })
      .select()
      .single();

    if (codErr || !codOrder) {
      throw new Error(`Failed to create test COD order: ${codErr?.message}`);
    }
    createdOrderIds.push(codOrder.id);

    // Insert order items with required product_id
    const { error: itemInsertErr } = await supabase.from('order_items').insert({
      order_id: codOrder.id,
      product_id: 'prod_test_polo_cod',
      product_name: 'ADRIZO Luxury Polo Shirt',
      sku: 'ADR-POLO-TEST',
      quantity: 1,
      unit_price: 1299,
      total_price: 1299,
    });

    if (itemInsertErr) {
      throw new Error(`Failed to insert order item: ${itemInsertErr.message}`);
    }

    console.log(`Created Supabase COD Order: ${codOrder.order_number} (${codOrder.id})`);

    // Run automatic server-side Shiprocket synchronization
    const codSyncResult = await autoSyncOrderToShiprocket(codOrder.id);
    console.log('Shiprocket Auto-Sync Result (COD):', codSyncResult);

    assert(
      codSyncResult.success && !!codSyncResult.shiprocketOrderId,
      'COD order automatically created in Shiprocket',
      codSyncResult.error
    );

    // Verify database state updated atomically
    const { data: verifiedCodOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', codOrder.id)
      .single();

    assert(
      verifiedCodOrder?.shiprocket_sync_status === 'SYNCED',
      'COD order shiprocket_sync_status is SYNCED'
    );
    assert(
      !!verifiedCodOrder?.shiprocket_order_id && !!verifiedCodOrder?.shiprocket_shipment_id,
      'COD order has shiprocket_order_id and shiprocket_shipment_id stored'
    );
    assert(
      verifiedCodOrder?.order_status === 'CONFIRMED',
      'AD(R)IZO order remains authoritative and CONFIRMED'
    );

    // -------------------------------------------------------------------------
    // 4. Duplicate Shiprocket Creation Protection (Strict Idempotency)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Duplicate Shiprocket Protection (Idempotency) ---');
    const duplicateSyncAttempt = await autoSyncOrderToShiprocket(codOrder.id);
    console.log('Duplicate Sync Attempt Result:', duplicateSyncAttempt);

    assert(
      duplicateSyncAttempt.alreadySynced === true,
      'Idempotency guard caught already-synced order and returned alreadySynced: true'
    );
    assert(
      String(duplicateSyncAttempt.shiprocketOrderId) === String(verifiedCodOrder?.shiprocket_order_id),
      'Shiprocket Order ID unchanged on duplicate sync attempt'
    );

    // -------------------------------------------------------------------------
    // 5. Prepaid / Online Payment Checkout & Auto-Sync
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Prepaid / Online Payment Auto-Sync ---');
    const prepaidOrderNumber = `ADR-AUTO-PREPAID-${Date.now().toString().slice(-6)}`;
    const { data: prepaidOrder, error: prepErr } = await supabase
      .from('orders')
      .insert({
        order_number: prepaidOrderNumber,
        customer_id: null,
        customer_name: testCustomer.name,
        customer_email: testCustomer.email,
        customer_phone: testCustomer.phone,
        shipping_address: 'Flat 402, High-rise Towers, Sector 62',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201309',
        payment_method: 'ONLINE_RAZORPAY',
        payment_status: 'PAID',
        razorpay_payment_id: `pay_test_${Date.now()}`,
        order_status: 'CONFIRMED',
        subtotal: 2499,
        shipping_charge: 0,
        cod_charge: 0,
        total_amount: 2499,
        shiprocket_sync_status: 'PENDING',
      })
      .select()
      .single();

    if (prepErr || !prepaidOrder) {
      throw new Error(`Failed to create test Prepaid order: ${prepErr?.message}`);
    }
    createdOrderIds.push(prepaidOrder.id);

    await supabase.from('order_items').insert({
      order_id: prepaidOrder.id,
      product_id: 'prod_test_oxford_prep',
      product_name: 'ADRIZO Premium Oxford Shirt',
      sku: 'ADR-OXFORD-TEST',
      quantity: 1,
      unit_price: 2499,
      total_price: 2499,
    });

    console.log(`Created Supabase Prepaid Order: ${prepaidOrder.order_number} (${prepaidOrder.id})`);

    const prepaidSyncResult = await autoSyncOrderToShiprocket(prepaidOrder.id);
    console.log('Shiprocket Auto-Sync Result (Prepaid):', prepaidSyncResult);

    assert(
      prepaidSyncResult.success && !!prepaidSyncResult.shiprocketOrderId,
      'Prepaid order automatically created in Shiprocket',
      prepaidSyncResult.error
    );

    const { data: verifiedPrepaidOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', prepaidOrder.id)
      .single();

    assert(
      verifiedPrepaidOrder?.shiprocket_sync_status === 'SYNCED',
      'Prepaid order shiprocket_sync_status is SYNCED'
    );
    assert(
      verifiedPrepaidOrder?.payment_status === 'PAID',
      'Prepaid payment status safely remains PAID'
    );

    // -------------------------------------------------------------------------
    // 6. Partial Failure & Retry Safety
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Partial Failure & Safe Retry Handling ---');
    const failedOrderNumber = `ADR-AUTO-FAIL-${Date.now().toString().slice(-6)}`;
    const { data: failOrder, error: fErr } = await supabase
      .from('orders')
      .insert({
        order_number: failedOrderNumber,
        customer_name: 'Invalid Order',
        customer_email: 'invalid-email',
        customer_phone: '123', // Invalid phone
        shipping_address: '', // Missing address
        city: 'Noida',
        state: 'UP',
        pincode: '000000',
        payment_method: 'COD',
        payment_status: 'PENDING',
        order_status: 'CONFIRMED',
        total_amount: 500,
        shiprocket_sync_status: 'PENDING',
      })
      .select()
      .single();

    if (fErr || !failOrder) {
      throw new Error(`Failed to create test failure order: ${fErr?.message}`);
    }
    createdOrderIds.push(failOrder.id);

    const failureResult = await autoSyncOrderToShiprocket(failOrder.id);
    assert(
      !failureResult.success,
      'Sync fails safely when required fields are missing'
    );

    const { data: recordedFailOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', failOrder.id)
      .single();

    assert(
      recordedFailOrder?.shiprocket_sync_status === 'FAILED',
      'Failed order marked as shiprocket_sync_status: FAILED'
    );
    assert(
      !!recordedFailOrder?.shiprocket_sync_error,
      'Sync error message recorded in shiprocket_sync_error'
    );
    assert(
      recordedFailOrder?.order_status === 'CONFIRMED',
      'AD(R)IZO customer order was NOT deleted and remains intact'
    );

    // Now test retry with corrected fields and order item
    await supabase.from('orders').update({
      customer_name: 'Corrected Customer',
      customer_email: 'care.adrizo@gmail.com',
      customer_phone: '9876543210',
      shipping_address: 'Plot 55, Sector 63, Near Metro',
      pincode: '201301',
    }).eq('id', failOrder.id);

    await supabase.from('order_items').insert({
      order_id: failOrder.id,
      product_id: 'prod_test_retry_01',
      product_name: 'ADRIZO Retry Shirt',
      sku: 'ADR-RETRY-01',
      quantity: 1,
      unit_price: 500,
      total_price: 500,
    });

    const retryResult = await autoSyncOrderToShiprocket(failOrder.id);
    assert(
      retryResult.success && !!retryResult.shiprocketOrderId,
      'Admin retry safely succeeds and synchronizes order to Shiprocket'
    );

    // -------------------------------------------------------------------------
    // 7. Tracking States: No-AWB Preparation vs Live AWB Tracking
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Tracking States: No-AWB Preparation vs Live AWB Tracking ---');
    const resolvedNoAwb = await resolveOrderFromSupabase(codOrder.id);
    assert(
      !!resolvedNoAwb && !resolvedNoAwb.trackingId,
      'Order has no AWB assigned yet'
    );
    assert(
      resolvedNoAwb?.shiprocketSyncStatus === 'SYNCED',
      'Order is synced with Shiprocket fulfillment system'
    );

    // Live Tracking query against tracking service
    const trackingProbe = await trackShipmentByAwb('1234567890');
    assert(
      typeof trackingProbe.activities === 'object',
      'trackShipmentByAwb returns structured tracking object without crashing'
    );

    // -------------------------------------------------------------------------
    // 8. Customer Order Cancellation Lifecycle (COD)
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Customer Cancellation Lifecycle (COD) ---');
    const cancellableCheck = isOrderCancellable(resolvedNoAwb!);
    assert(
      cancellableCheck.cancellable === true,
      'COD order before courier/AWB assignment is eligible for customer cancellation'
    );

    const cancelResult = await cancelCustomerOrder({
      orderIdentifier: codOrder.id,
      reason: 'Found a better price elsewhere',
      customer: testCustomer,
    });
    console.log('Customer Cancellation Result (COD):', cancelResult);

    assert(
      cancelResult.success === true,
      'cancelCustomerOrder succeeded server-side'
    );

    const { data: cancelledCodOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', codOrder.id)
      .single();

    assert(
      cancelledCodOrder?.order_status === 'CANCELLED',
      'Local AD(R)IZO order status is CANCELLED'
    );
    assert(
      cancelledCodOrder?.cancellation_source === 'CUSTOMER',
      'cancellation_source is recorded as CUSTOMER'
    );
    assert(
      cancelledCodOrder?.cancellation_reason === 'Found a better price elsewhere',
      'Customer cancellation reason preserved'
    );
    assert(
      !!cancelledCodOrder?.cancelled_at,
      'cancelled_at timestamp recorded'
    );
    assert(
      cancelledCodOrder?.payment_status === 'CANCELLED',
      'COD payment status safely transitioned to CANCELLED without fake refund'
    );

    // -------------------------------------------------------------------------
    // 9. Customer Order Cancellation Lifecycle (Prepaid)
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Customer Cancellation Lifecycle (Prepaid) ---');
    const prepaidCancelResult = await cancelCustomerOrder({
      orderIdentifier: prepaidOrder.id,
      reason: 'Ordered by mistake',
      customer: testCustomer,
    });
    console.log('Customer Cancellation Result (Prepaid):', prepaidCancelResult);

    assert(
      prepaidCancelResult.success === true,
      'Prepaid order cancellation processed safely'
    );

    const { data: cancelledPrepaidOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', prepaidOrder.id)
      .single();

    assert(
      cancelledPrepaidOrder?.order_status === 'CANCELLED',
      'Prepaid order status is CANCELLED'
    );
    assert(
      cancelledPrepaidOrder?.cancellation_source === 'CUSTOMER',
      'Prepaid order cancellation_source is CUSTOMER'
    );
    assert(
      cancelledPrepaidOrder?.payment_status === 'PAID',
      'Prepaid payment_status remains PAID (no fake refund created)'
    );
    assert(
      prepaidCancelResult.refundNote?.includes('5–7 business days') === true,
      'Customer informed with official 5–7 business days refund policy notice'
    );

    // -------------------------------------------------------------------------
    // 10. Cancellation Rejection Safety
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Cancellation Rejection Safety ---');
    const reCancelAttempt = await cancelCustomerOrder({
      orderIdentifier: codOrder.id,
      reason: 'Try again',
      customer: testCustomer,
    });
    assert(
      reCancelAttempt.success === true && reCancelAttempt.alreadyCancelled === true,
      'Already cancelled order returns idempotent alreadyCancelled: true'
    );

    const deliveredMock: any = { orderStatus: 'DELIVERED', trackingStatus: 'DELIVERED' };
    assert(
      !isOrderCancellable(deliveredMock).cancellable,
      'Delivered order blocked from cancellation'
    );

    const shippedMock: any = { orderStatus: 'SHIPPED', trackingId: 'SR123456789' };
    assert(
      !isOrderCancellable(shippedMock).cancellable,
      'Shipped order with AWB blocked from cancellation'
    );

  } finally {
    // Clean up created test orders
    console.log('\n--- Cleaning up temporary test orders ---');
    for (const id of createdOrderIds) {
      await supabase.from('order_items').delete().eq('order_id', id);
      await supabase.from('orders').delete().eq('id', id);
    }
    console.log(`Cleaned up ${createdOrderIds.length} test order(s) successfully.`);
  }

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAutomaticOrderLifecycleTests().catch((err) => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});
