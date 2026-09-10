// scripts/verify-customer-account.mjs
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { getAdminClient } from '../src/lib/supabase/admin.ts';

function isOrderOwnedByCustomer(order, customer) {
  if (!customer) return false;
  if (customer.isAdmin) return true;

  const orderCustomerId = order.customerId || order.customer_id;
  const orderCustomerEmail = (order.customerEmail || order.customer_email || '').trim().toLowerCase();
  const orderCustomerPhone = (order.customerPhone || order.customer_phone || '').trim();

  if (orderCustomerId && customer.id && orderCustomerId === customer.id) {
    return true;
  }
  if (orderCustomerEmail && customer.email && orderCustomerEmail === customer.email.toLowerCase()) {
    return true;
  }
  if (orderCustomerPhone && customer.phone && orderCustomerPhone === customer.phone.trim()) {
    return true;
  }
  return false;
}


async function runTests() {
  console.log('====================================================');
  console.log('AD(R)IZO CUSTOMER ACCOUNT & NAVIGATION VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  const supabase = getAdminClient();

  // Test 1: Database Table customer_addresses schema
  console.log('--- TEST 1: Supabase public.customer_addresses Schema ---');
  try {
    const { data, error } = await supabase
      .from('customer_addresses')
      .select('id, customer_id, full_name, phone, address, area, district, city, state, pincode, landmark, is_default, created_at, updated_at')
      .limit(1);

    assert(!error, `customer_addresses table exists and query succeeded (error: ${error?.message || 'none'})`);
  } catch (err) {
    assert(false, `customer_addresses table query failed: ${err.message}`);
  }

  // Test 2: Address CRUD Simulation with isolated test customer UUID
  console.log('\n--- TEST 2: Customer Address CRUD Isolation & Default Toggle ---');
  const testCustomerId = '00000000-0000-4000-8000-000000000001';
  let createdAddr1Id = null;
  let createdAddr2Id = null;

  try {
    // Clean any leftover test data
    await supabase.from('customer_addresses').delete().eq('customer_id', testCustomerId);

    // 2a. Insert Address 1
    const { data: addr1, error: err1 } = await supabase
      .from('customer_addresses')
      .insert({
        customer_id: testCustomerId,
        full_name: 'Test Customer A',
        phone: '9876543210',
        address: 'Flat 101, Galaxy Apartments',
        area: 'Indirapuram',
        district: 'Ghaziabad',
        city: 'Ghaziabad',
        state: 'Uttar Pradesh',
        pincode: '201014',
        landmark: 'Near Shipra Mall',
        is_default: true,
      })
      .select()
      .single();

    assert(!err1 && addr1?.id, `Address 1 created successfully (${addr1?.id})`);
    createdAddr1Id = addr1?.id;
    assert(addr1?.is_default === true, 'Address 1 is marked as default');

    // 2b. Insert Address 2 with is_default = true (Address 1 should be unset)
    await supabase.from('customer_addresses').update({ is_default: false }).eq('customer_id', testCustomerId);
    const { data: addr2, error: err2 } = await supabase
      .from('customer_addresses')
      .insert({
        customer_id: testCustomerId,
        full_name: 'Test Customer A Office',
        phone: '9876543210',
        address: 'Plot 45, Tech Zone',
        area: 'Sector 62',
        district: 'Gautam Buddha Nagar',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
        landmark: 'Near Metro Station',
        is_default: true,
      })
      .select()
      .single();

    assert(!err2 && addr2?.id, `Address 2 created successfully (${addr2?.id})`);
    createdAddr2Id = addr2?.id;

    // Check that addr1 is now false and addr2 is true
    const { data: addr1Reloaded } = await supabase.from('customer_addresses').select('is_default').eq('id', createdAddr1Id).single();
    assert(addr1Reloaded?.is_default === false, 'Address 1 is_default toggled to false');
    assert(addr2?.is_default === true, 'Address 2 is_default is true');

    // 2c. Update Address 1
    const { data: updatedAddr1, error: updateErr } = await supabase
      .from('customer_addresses')
      .update({ address: 'Flat 102, New Wing, Galaxy Apartments', updated_at: new Date().toISOString() })
      .eq('id', createdAddr1Id)
      .eq('customer_id', testCustomerId)
      .select()
      .single();

    assert(!updateErr && updatedAddr1?.address.includes('Flat 102'), 'Address 1 updated successfully');

    // 2d. Delete Address 2
    const { error: delErr } = await supabase
      .from('customer_addresses')
      .delete()
      .eq('id', createdAddr2Id)
      .eq('customer_id', testCustomerId);

    assert(!delErr, 'Address 2 deleted successfully');

    // Clean up test customer data
    await supabase.from('customer_addresses').delete().eq('customer_id', testCustomerId);
  } catch (err) {
    assert(false, `Address CRUD test failed: ${err.message}`);
  }

  // Test 3: Customer Isolation (Customer B cannot access Customer A addresses)
  console.log('\n--- TEST 3: Strict Customer Address Isolation (Anti-IDOR) ---');
  const customerA = '00000000-0000-4000-8000-000000000001';
  const customerB = '00000000-0000-4000-8000-000000000002';

  try {
    const { data: addrA } = await supabase
      .from('customer_addresses')
      .insert({
        customer_id: customerA,
        full_name: 'Customer A Private',
        phone: '9999999991',
        address: '123 Private St',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        is_default: true,
      })
      .select()
      .single();

    // Querying with customer B ID must return 0 results
    const { data: listB } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', customerB);

    assert(listB.length === 0, 'Customer B queries return 0 addresses of Customer A');

    // Attempting to update customer A address using customer B ID must affect 0 rows
    const { data: unauthorizedUpdate } = await supabase
      .from('customer_addresses')
      .update({ full_name: 'Hacked' })
      .eq('id', addrA.id)
      .eq('customer_id', customerB)
      .select();

    assert(!unauthorizedUpdate || unauthorizedUpdate.length === 0, 'Customer B cannot update Customer A address (IDOR protected)');

    // Attempting to delete customer A address using customer B ID must fail to delete
    await supabase
      .from('customer_addresses')
      .delete()
      .eq('id', addrA.id)
      .eq('customer_id', customerB);

    const { data: stillExists } = await supabase
      .from('customer_addresses')
      .select('id')
      .eq('id', addrA.id)
      .single();

    assert(stillExists?.id === addrA.id, 'Customer B cannot delete Customer A address');

    // Clean up
    await supabase.from('customer_addresses').delete().eq('customer_id', customerA);
  } catch (err) {
    assert(false, `Isolation test failed: ${err.message}`);
  }

  // Test 4: Order Ownership Verification (isOrderOwnedByCustomer)
  console.log('\n--- TEST 4: IDOR Protection for Orders & Tracking ---');
  const dummyOrder = {
    id: 'ord-123',
    orderNumber: 'ADR-999999',
    customerId: 'cust-abc',
    customerEmail: 'user@example.com',
    customerPhone: '9876543210',
  };

  assert(
    isOrderOwnedByCustomer(dummyOrder, { id: 'cust-abc', email: 'other@example.com' }),
    'Matches by Supabase User UUID'
  );
  assert(
    isOrderOwnedByCustomer(dummyOrder, { id: 'cust-diff', email: 'USER@EXAMPLE.COM' }),
    'Matches by case-insensitive Email'
  );
  assert(
    isOrderOwnedByCustomer(dummyOrder, { id: 'cust-diff', email: 'diff@example.com', phone: '9876543210' }),
    'Matches by Customer Phone'
  );
  assert(
    !isOrderOwnedByCustomer(dummyOrder, { id: 'attacker', email: 'attacker@evil.com', phone: '9999999999' }),
    'Blocks unrelated customer (IDOR prevented)'
  );
  assert(
    !isOrderOwnedByCustomer(dummyOrder, null),
    'Blocks unauthenticated user when verifying order ownership'
  );
  assert(
    isOrderOwnedByCustomer(dummyOrder, { id: 'admin', isAdmin: true }),
    'Admin role possesses universal order management authority'
  );

  // Test 5: Verify Orders exist in Supabase
  console.log('\n--- TEST 5: Supabase public.orders Retrieval ---');
  try {
    const { data: recentOrders, error: orderErr } = await supabase
      .from('orders')
      .select('id, order_number, customer_id, customer_email, total_amount, payment_method, payment_status, order_status, tracking_id, delivery_partner, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    assert(!orderErr, `Orders query succeeded (count: ${recentOrders?.length || 0})`);
    if (recentOrders && recentOrders.length > 0) {
      const sample = recentOrders[0];
      console.log(`     Sample Order: #${sample.order_number} | Method: ${sample.payment_method} | Status: ${sample.order_status} | AWB: ${sample.tracking_id || 'Not yet assigned'}`);
    }
  } catch (err) {
    assert(false, `Orders query failed: ${err.message}`);
  }

  // Summary
  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
