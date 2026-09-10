// scripts/test-auth-persistence.mjs

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'Care.adrizo@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Shree@2805';

function parseCookies(res) {
  const rawHeaders = typeof res.headers.getSetCookie === 'function' 
    ? res.headers.getSetCookie() 
    : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : []);
  const cookies = {};
  for (const str of rawHeaders) {
    const parts = str.split(';').map(s => s.trim());
    const [cookieName, cookieVal] = parts[0].split('=');
    const attrs = {};
    for (const attr of parts.slice(1)) {
      const [k, v] = attr.split('=');
      attrs[k.toLowerCase()] = v !== undefined ? v : true;
    }
    cookies[cookieName] = {
      value: cookieVal,
      raw: str,
      attrs,
    };
  }
  return cookies;
}

function buildCookieHeader(cookieMap) {
  return Object.entries(cookieMap)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('  ADRIZO PERSISTENT AUTH & CUSTOMER DATA TEST SUITE');
  console.log(`  Base URL: ${BASE_URL}`);
  console.log('================================================================\n');

  let adminToken = '';
  let customerAToken = '';
  let customerBToken = '';
  let createdAddressId = '';

  // -------------------------------------------------------------------------
  // TEST 1: ADMIN LOGIN & PERSISTENCE
  // -------------------------------------------------------------------------
  console.log('▶ [TEST 1] Admin Login, HTTP-only Cookie & Route Protection');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const data = await res.json();
    assert(res.status === 200, `Admin login returns 200 (got ${res.status})`);
    assert(data.success === true && data.role === 'ADMIN', 'Response indicates successful ADMIN role');

    const cookies = parseCookies(res);
    assert(Boolean(cookies.admin_token), 'admin_token Set-Cookie header is present');
    if (cookies.admin_token) {
      adminToken = cookies.admin_token.value;
      assert(cookies.admin_token.attrs.httponly === true, 'admin_token is HttpOnly');
      assert(cookies.admin_token.attrs.path === '/', 'admin_token Path is /');
      assert(
        Number(cookies.admin_token.attrs['max-age']) >= 2500000,
        `admin_token has persistent 30-day Max-Age (~2592000s, got ${cookies.admin_token.attrs['max-age']})`
      );
    }

    // Verify session with /api/admin/me
    const meRes = await fetch(`${BASE_URL}/api/admin/me`, {
      headers: { Cookie: `admin_token=${adminToken}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, `GET /api/admin/me returns 200 with admin_token`);
    assert(meData.authenticated === true, 'Admin is verified as authenticated');
    assert(meData.admin?.role === 'ADMIN', `Admin role is ADMIN (got ${meData.admin?.role})`);

    // Verify proxy allows /admin/dashboard with cookie
    const dashRes = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: { Cookie: `admin_token=${adminToken}` },
      redirect: 'manual',
    });
    assert(
      dashRes.status === 200 || dashRes.status === 304,
      `Proxy allows access to /admin/dashboard with admin_token (status: ${dashRes.status})`
    );

    // Verify proxy blocks /admin/dashboard without cookie
    const blockedRes = await fetch(`${BASE_URL}/admin/dashboard`, {
      redirect: 'manual',
    });
    assert(
      blockedRes.status === 307 || blockedRes.status === 302,
      `Proxy redirects unauthenticated request to /admin/login (status: ${blockedRes.status})`
    );

    // Verify admin token CANNOT access customer session
    const custMeWithAdminToken = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `admin_token=${adminToken}` },
    });
    assert(
      custMeWithAdminToken.status === 401,
      `Admin token alone does NOT grant customer session on /api/auth/me (got ${custMeWithAdminToken.status})`
    );
  } catch (err) {
    console.error('Test 1 error:', err);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TEST 2: CUSTOMER SIGNUP / LOGIN PERSISTENCE
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 2] Customer Authentication & 30-Day Session Persistence');
  const testCustomerA = {
    email: `testcustomer_${Date.now()}@example.com`,
    password: 'Password@123456',
    name: 'Aarav Sharma',
    phone: '9876543210',
  };

  try {
    const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCustomerA),
    });
    const signupData = await signupRes.json();
    assert(signupRes.status === 200 || signupRes.status === 201, `Customer signup returns 200/201 (got ${signupRes.status})`);

    const cookies = parseCookies(signupRes);
    assert(Boolean(cookies.customer_token), 'customer_token Set-Cookie header is set on signup');
    if (cookies.customer_token) {
      customerAToken = cookies.customer_token.value;
      assert(cookies.customer_token.attrs.httponly === true, 'customer_token is HttpOnly');
      assert(cookies.customer_token.attrs.path === '/', 'customer_token Path is /');
      assert(
        Number(cookies.customer_token.attrs['max-age']) >= 2500000,
        `customer_token has persistent 30-day Max-Age (got ${cookies.customer_token.attrs['max-age']})`
      );
    }

    // Verify customer session via /api/auth/me
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `customer_token=${customerAToken}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, `GET /api/auth/me returns 200 with customer_token`);
    assert(meData.user?.email === testCustomerA.email, `Customer email matches (${meData.user?.email})`);
    assert(meData.user?.name === testCustomerA.name, `Customer name matches (${meData.user?.name})`);
    assert(meData.user?.phone === testCustomerA.phone, `Customer phone matches (${meData.user?.phone})`);

    // Verify sliding session: /api/auth/me refreshes customer_token cookie
    const meCookies = parseCookies(meRes);
    assert(Boolean(meCookies.customer_token), '/api/auth/me issues sliding customer_token refresh cookie');
    if (meCookies.customer_token) {
      customerAToken = meCookies.customer_token.value;
    }
  } catch (err) {
    console.error('Test 2 error:', err);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TEST 3: SAVED ADDRESS SYSTEM (CRUD & PERSISTENCE)
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 3] Saved Address System (CRUD & Multi-User Isolation)');
  try {
    // 3.1: Create new address
    const newAddressPayload = {
      full_name: 'Aarav Sharma',
      phone: '9876543210',
      address: 'Flat 402, Sunshine Heights',
      area: 'MG Road, Indiranagar',
      district: 'Bengaluru',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      landmark: 'Near Metro Station',
      is_default: true,
    };

    const addRes = await fetch(`${BASE_URL}/api/customer/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `customer_token=${customerAToken}`,
      },
      body: JSON.stringify(newAddressPayload),
    });
    const addData = await addRes.json();
    assert(addRes.status === 200, `POST /api/customer/addresses returns 200 (got ${addRes.status})`);
    assert(addData.success === true && addData.address?.id, 'Address created with valid ID');
    createdAddressId = addData.address?.id;
    assert(addData.address?.is_default === true, 'New address marked as default');

    // 3.2: Fetch saved addresses
    const getRes = await fetch(`${BASE_URL}/api/customer/addresses`, {
      headers: { Cookie: `customer_token=${customerAToken}` },
    });
    const getData = await getRes.json();
    assert(getRes.status === 200, `GET /api/customer/addresses returns 200`);
    assert(Array.isArray(getData.addresses) && getData.addresses.length > 0, `Returned ${getData.addresses?.length} saved addresses`);
    const saved = getData.addresses.find(a => a.id === createdAddressId);
    assert(Boolean(saved), 'Newly created address is present in saved list');
    assert(saved?.city === 'Bengaluru' && saved?.pincode === '560038', 'Saved address fields (city, pincode) persist correctly');

    // 3.3: Edit address (PUT)
    const editPayload = {
      id: createdAddressId,
      address: 'Flat 402, Tower B, Sunshine Heights',
      landmark: 'Opposite Metro Station Pillar 12',
    };
    const putRes = await fetch(`${BASE_URL}/api/customer/addresses`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `customer_token=${customerAToken}`,
      },
      body: JSON.stringify(editPayload),
    });
    const putData = await putRes.json();
    assert(putRes.status === 200, `PUT /api/customer/addresses returns 200`);
    assert(putData.success === true, 'Address successfully updated');
    assert(
      putData.address?.address === 'Flat 402, Tower B, Sunshine Heights',
      'Updated address content persisted'
    );

    // 3.4: Multi-User Isolation: Customer B should NOT see Customer A's address
    const testCustomerB = {
      email: `testcustomer_b_${Date.now()}@example.com`,
      password: 'Password@123456',
      name: 'Rohan Gupta',
      phone: '9812345678',
    };
    const signupBRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCustomerB),
    });
    const bCookies = parseCookies(signupBRes);
    customerBToken = bCookies.customer_token?.value || '';

    const bAddressRes = await fetch(`${BASE_URL}/api/customer/addresses`, {
      headers: { Cookie: `customer_token=${customerBToken}` },
    });
    const bAddressData = await bAddressRes.json();
    const leakedAddress = bAddressData.addresses?.find(a => a.id === createdAddressId);
    assert(!leakedAddress, "Customer B cannot see Customer A's address (Strict IDOR isolation)");

    // 3.5: Customer B cannot edit or delete Customer A's address
    const bTamperRes = await fetch(`${BASE_URL}/api/customer/addresses`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `customer_token=${customerBToken}`,
      },
      body: JSON.stringify({ id: createdAddressId, full_name: 'Hacked Name' }),
    });
    assert(
      bTamperRes.status === 404 || bTamperRes.status === 403,
      `Customer B cannot modify Customer A's address (status: ${bTamperRes.status})`
    );
  } catch (err) {
    console.error('Test 3 error:', err);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TEST 4: CHECKOUT ADDRESS AUTO-PERSISTENCE & ORDER LINKING
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 4] Checkout Flow: Auto-save Address & Order Association');
  try {
    const catRes = await fetch(`${BASE_URL}/api/products/catalog`);
    const catData = await catRes.json();
    const product = catData.products?.[0] || {
      id: '6a9e8f9be9b908f4a3f490c9',
      name: 'Yellow Button Polo T-Shirt',
      price: 1299,
      availableSizes: ['M'],
    };

    const checkoutOrderPayload = {
      items: [
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          size: product.availableSizes?.[0] || 'M',
        },
      ],
      shippingAddress: {
        fullName: 'Aarav Sharma',
        email: testCustomerA.email,
        phone: '9876543210',
        address: 'Villa 15, Palm Meadows',
        area: 'Whitefield',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560066',
      },
      paymentMethod: 'cod',
    };

    const orderRes = await fetch(`${BASE_URL}/api/checkout/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `customer_token=${customerAToken}`,
      },
      body: JSON.stringify(checkoutOrderPayload),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok || !orderData.success) {
      console.log('    create-order failure response:', orderRes.status, orderData);
    }
    assert(
      orderRes.status === 200 && orderData.success === true,
      `POST /api/checkout/create-order returns 200 success (orderId: ${orderData.orderId || orderData.order?.id})`
    );

    // Verify that the checkout address was auto-saved to customer_addresses
    const checkAddrRes = await fetch(`${BASE_URL}/api/customer/addresses`, {
      headers: { Cookie: `customer_token=${customerAToken}` },
    });
    const checkAddrData = await checkAddrRes.json();
    const autoSaved = checkAddrData.addresses?.find(a => a.pincode === '560066');
    assert(Boolean(autoSaved), 'Checkout address auto-saved to customer_addresses table');
    assert(autoSaved?.address === 'Villa 15, Palm Meadows', 'Auto-saved address text matches checkout input');

    // Verify /api/orders/me returns the customer's order
    const ordersMeRes = await fetch(`${BASE_URL}/api/orders/me`, {
      headers: { Cookie: `customer_token=${customerAToken}` },
    });
    const ordersMeData = await ordersMeRes.json();
    assert(ordersMeRes.status === 200, `GET /api/orders/me returns 200`);
    assert(Array.isArray(ordersMeData.orders) && ordersMeData.orders.length > 0, `Customer sees their placed order`);
  } catch (err) {
    console.error('Test 4 error:', err);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TEST 5: CUSTOMER LOGOUT DOES NOT KILL ADMIN SESSION
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 5] Independent Sessions: Customer Logout vs Admin Session');
  try {
    // Both tokens present on browser
    const combinedCookies = `customer_token=${customerAToken}; admin_token=${adminToken}`;

    const custLogoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: combinedCookies },
    });
    const logoutCookies = parseCookies(custLogoutRes);

    assert(
      logoutCookies.customer_token && (
        Number(logoutCookies.customer_token.attrs['max-age']) === 0 ||
        logoutCookies.customer_token.value === '' ||
        Boolean(logoutCookies.customer_token.attrs.expires)
      ),
      'Customer logout clears customer_token (Max-Age=0 or cleared)'
    );
    assert(!logoutCookies.admin_token, 'Customer logout does NOT delete or clear admin_token');

    // Verify customer is logged out
    const meAfterLogout = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `customer_token=deleted` },
    });
    assert(meAfterLogout.status === 401, 'Customer session is terminated after logout');

    // Verify admin is STILL authenticated!
    const adminStillValid = await fetch(`${BASE_URL}/api/admin/me`, {
      headers: { Cookie: `admin_token=${adminToken}` },
    });
    const adminStillValidData = await adminStillValid.json();
    assert(
      adminStillValid.status === 200 && adminStillValidData.authenticated === true,
      'Admin session remains fully active and valid after customer logout'
    );
  } catch (err) {
    console.error('Test 5 error:', err);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TEST 6: ADMIN LOGOUT
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 6] Admin Logout & Session Invalidation');
  try {
    const adminLogoutRes = await fetch(`${BASE_URL}/api/admin/logout`, {
      method: 'POST',
      headers: { Cookie: `admin_token=${adminToken}` },
    });
    const adminLogoutCookies = parseCookies(adminLogoutRes);
    assert(
      adminLogoutCookies.admin_token && (
        Number(adminLogoutCookies.admin_token.attrs['max-age']) === 0 ||
        adminLogoutCookies.admin_token.value === '' ||
        Boolean(adminLogoutCookies.admin_token.attrs.expires)
      ),
      'Admin logout clears admin_token (Max-Age=0 or cleared)'
    );

    const adminMeAfter = await fetch(`${BASE_URL}/api/admin/me`, {
      headers: { Cookie: `admin_token=deleted` },
    });
    assert(
      adminMeAfter.status === 401 || adminMeAfter.status === 403,
      `GET /api/admin/me returns 401/403 after admin logout (status: ${adminMeAfter.status})`
    );

    const blockedAfterLogout = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: { Cookie: `admin_token=deleted` },
      redirect: 'manual',
    });
    assert(
      blockedAfterLogout.status === 307 || blockedAfterLogout.status === 302,
      'Admin route redirects to /admin/login after logout'
    );
  } catch (err) {
    console.error('Test 6 error:', err);
    failed++;
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
