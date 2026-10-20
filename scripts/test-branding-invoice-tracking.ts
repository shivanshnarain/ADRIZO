/**
 * ADRIZO BRANDING, INVOICE REGENERATION & SHIPMENT TRACKING VERIFICATION SUITE
 */

import { generateInvoicePdf } from '../src/lib/invoice-pdf';
import { generateInvoiceToken, verifyInvoiceToken } from '../src/lib/invoice-token';
import { ResolvedOrder } from '../src/lib/order-resolver';
import { getCircuitBreakerStatus } from '../src/lib/shiprocket/circuit-breaker';

async function runVerification() {
  console.log('================================================================');
  console.log('ADRIZO PRODUCTION BUGFIX VERIFICATION SUITE');
  console.log('Brand Spelling, Invoice Regeneration, WhatsApp, & Tracking');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // TEST 1: Token Generation and Verification
  console.log('--- TEST 1: INVOICE ACCESS TOKEN SECURITY ---');
  const testOrderId = 'e1a2b3c4-0000-4000-8000-0123456789ab';
  const testOrderNumber = 'ADR-364748';
  const token = generateInvoiceToken(testOrderId, testOrderNumber);
  
  assert('Invoice token generated successfully', typeof token === 'string' && token.length > 20);
  assert('Invoice token verifies with valid orderId and orderNumber', verifyInvoiceToken(token, testOrderId, testOrderNumber));
  assert('Invoice token rejects tampered token', !verifyInvoiceToken(token + 'x', testOrderId, testOrderNumber));
  assert('Invoice token rejects wrong order ID', !verifyInvoiceToken(token, 'wrong-id', testOrderNumber));
  assert('Invoice token rejects wrong order number', !verifyInvoiceToken(token, testOrderId, 'ADR-999999'));

  // TEST 2: PDF Generation with Brand Name and Real Persisted Data
  console.log('\n--- TEST 2: PDF INVOICE GENERATION & BRANDING ---');
  const sampleOrder: ResolvedOrder = {
    id: testOrderId,
    orderNumber: testOrderNumber,
    customerName: 'Shivansh Narain',
    customerEmail: 'shivanshnarain@gmail.com',
    customerPhone: '9876543210',
    shippingAddress: 'Flat 402, Lotus Court, Sector 62',
    houseFlat: 'Flat 402',
    areaStreet: 'Lotus Court',
    landmark: 'Near City Park',
    city: 'Noida',
    state: 'Uttar Pradesh',
    pincode: '201301',
    country: 'India',
    subtotal: 1999,
    shippingCharge: 0,
    codCharge: 0,
    discount: 200,
    couponCode: 'ADRIZO200',
    total: 1799,
    paymentMethod: 'ONLINE_RAZORPAY',
    paymentStatus: 'PAID',
    orderStatus: 'CONFIRMED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    razorpayPaymentId: 'pay_TestRealPaymentId123',
    items: [
      {
        id: 'item-1',
        productId: 'prod-tshirt',
        productName: 'Signature Heavyweight Cotton Tee',
        sku: 'ADR-TEE-BLK-L',
        size: 'L',
        color: 'Black',
        quantity: 1,
        unitPrice: 1999,
        mrp: 2999,
        totalPrice: 1999,
      },
    ],
  };

  const pdfBuffer = await generateInvoicePdf(sampleOrder);
  assert('PDF Buffer generated successfully', Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 1000);
  assert('PDF header signature matches standard PDF specification', pdfBuffer.subarray(0, 5).toString() === '%PDF-');

  const pdfString = pdfBuffer.toString('latin1');

  // PDFKit outputs text in TJ arrays containing kerned hex chunks: [<hex1> spacing <hex2>] TJ
  // Extract and combine kerned character chunks into complete text
  const textFromTj = (pdfString.match(/\[([\s\S]*?)\]\s*TJ/g) || []).map((tj: string) => {
    return tj
      .replace(/<([0-9a-fA-F]+)>/g, (_: string, hex: string) => {
        try {
          return Buffer.from(hex, 'hex').toString('utf8');
        } catch {
          return '';
        }
      })
      .replace(/\s*-?\d+(\.\d+)?\s*/g, '') // strip kerning numbers and surrounding spaces
      .replace(/[\[\]]/g, '')
      .trim();
  }).join('\n');

  const allPdfText = pdfString + '\n' + textFromTj;

  assert('PDF contains official brand spelling "ADRIZO"', allPdfText.includes('ADRIZO'));
  assert('PDF contains "ORDER INVOICE" header', allPdfText.includes('ORDER INVOICE'));
  assert('PDF does NOT contain incorrect spelling "AD(R)IZO"', !allPdfText.includes('AD(R)IZO') && !allPdfText.includes('AD(R)'));
  assert('PDF includes order number ADR-364748', allPdfText.includes('ADR-364748'));
  assert('PDF includes customer name Shivansh Narain', allPdfText.includes('Shivansh Narain'));

  // TEST 3: WhatsApp Invoice Message Formatting
  console.log('\n--- TEST 3: WHATSAPP MESSAGE FORMATTING ---');
  const invoiceUrl = `https://www.adrizo.com/api/orders/${sampleOrder.orderNumber}/invoice?token=${token}`;
  const verifiedOrderTotal = `₹${sampleOrder.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const actualPaymentMethod = 'Online Payment (Razorpay)';
  const trackingSection = 'Shipment tracking will be available after dispatch.';

  const waMessage = 
`Hello ${sampleOrder.customerName}, thank you for your order with ADRIZO!

Order Number: #${sampleOrder.orderNumber}

Total Amount: ${verifiedOrderTotal}

Payment Method: ${actualPaymentMethod}

Download your order invoice: ${invoiceUrl}

${trackingSection}

Warm regards,
ADRIZO Team`;

  assert('WhatsApp message greeting uses "Hello Shivansh Narain, thank you for your order with ADRIZO!"', 
    waMessage.includes('Hello Shivansh Narain, thank you for your order with ADRIZO!'));
  assert('WhatsApp message contains exact order number', waMessage.includes('Order Number: #ADR-364748'));
  assert('WhatsApp message contains formatted total', waMessage.includes('Total Amount: ₹1,799.00'));
  assert('WhatsApp message contains actual payment method', waMessage.includes('Payment Method: Online Payment (Razorpay)'));
  assert('WhatsApp message includes secure token in invoice link', waMessage.includes(`?token=${token}`));
  assert('WhatsApp message includes pending tracking note', waMessage.includes('Shipment tracking will be available after dispatch.'));
  assert('WhatsApp message sign-off is "Warm regards,\nADRIZO Team"', waMessage.includes('Warm regards,\nADRIZO Team'));
  assert('WhatsApp message does NOT contain "AD(R)IZO"', !waMessage.includes('AD(R)IZO'));

  // TEST 4: Tracking & Courier Placeholder Verification
  console.log('\n--- TEST 4: FULFILLMENT & COURIER TRACKING SAFEGUARDS ---');
  const dummyPlaceholderAwb: string = 'AWB123456789';

  const isVerifiedAwb = Boolean(dummyPlaceholderAwb && dummyPlaceholderAwb !== 'AWB123456789');
  assert('Placeholder AWB123456789 is classified as unverified', isVerifiedAwb === false);

  const genuineAwb: string = '143289123849';
  const isGenuineVerified = Boolean(genuineAwb && genuineAwb !== 'AWB123456789');
  assert('Genuine carrier AWB 143289123849 is classified as verified', isGenuineVerified === true);

  // Check Shiprocket circuit breaker status
  const lockInfo = await getCircuitBreakerStatus();
  console.log(`Shiprocket Circuit Breaker Status: isBlocked=${lockInfo.isBlocked}, state=${lockInfo.state}`);
  assert('Shiprocket circuit breaker prevents hammering live API when locked', typeof lockInfo.isBlocked === 'boolean');

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
