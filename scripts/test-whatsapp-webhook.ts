import { NextRequest } from 'next/server';
import { GET, POST } from '../src/app/api/whatsapp/webhook/route';

const testToken = process.env.WHATSAPP_VERIFY_TOKEN || 'test_token_2026';
process.env.WHATSAPP_VERIFY_TOKEN = testToken;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log('=== RUNNING WHATSAPP WEBHOOK TESTS ===\n');

  // Test 1: Valid Verification Request
  console.log('--- Test 1: Valid Meta GET Verification ---');
  const validUrl = `http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(testToken)}&hub.challenge=ADRIZO_TEST_123`;
  const req1 = new NextRequest(validUrl, { method: 'GET' });
  const res1 = await GET(req1);
  const text1 = await res1.text();

  assert(res1.status === 200, `Expected status 200, got ${res1.status}`);
  assert(text1 === 'ADRIZO_TEST_123', `Expected body 'ADRIZO_TEST_123', got '${text1}'`);
  assert(res1.headers.get('content-type')?.includes('text/plain') === true, 'Content-Type is text/plain');

  // Test 2: Invalid Token Request
  console.log('\n--- Test 2: Invalid Verify Token ---');
  const invalidTokenUrl = 'http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=WRONG_TOKEN&hub.challenge=ADRIZO_TEST_123';
  const req2 = new NextRequest(invalidTokenUrl, { method: 'GET' });
  const res2 = await GET(req2);

  assert(res2.status === 403, `Expected status 403 for invalid token, got ${res2.status}`);

  // Test 3: Invalid Mode Request
  console.log('\n--- Test 3: Invalid Mode ---');
  const invalidModeUrl = `http://localhost:3000/api/whatsapp/webhook?hub.mode=unsubscribe&hub.verify_token=${encodeURIComponent(testToken)}&hub.challenge=ADRIZO_TEST_123`;
  const req3 = new NextRequest(invalidModeUrl, { method: 'GET' });
  const res3 = await GET(req3);

  assert(res3.status === 403, `Expected status 403 for invalid mode, got ${res3.status}`);

  // Test 4: Incoming POST Webhook Event
  console.log('\n--- Test 4: Incoming POST Event ---');
  const postPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '123456789',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '919876543210',
                phone_number_id: '9876543210'
              },
              messages: [
                {
                  from: '919876543210',
                  id: 'wamid.test123',
                  timestamp: '1727390000',
                  text: { body: 'Hello ADRIZO' },
                  type: 'text'
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  };

  const req4 = new NextRequest('http://localhost:3000/api/whatsapp/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postPayload)
  });
  const res4 = await POST(req4);
  const json4 = await res4.json();

  assert(res4.status === 200, `Expected status 200 for POST, got ${res4.status}`);
  assert(json4.status === 'EVENT_RECEIVED', `Expected status EVENT_RECEIVED, got ${json4.status}`);

  console.log('\n🎉 ALL WHATSAPP WEBHOOK TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
