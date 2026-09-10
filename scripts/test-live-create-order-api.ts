try {
  process.loadEnvFile('.env.local');
} catch {}
try {
  process.loadEnvFile('.env');
} catch {}

import http from 'http';

async function testCreateOrderEndpoint() {
  console.log('Testing http://localhost:3001/api/checkout/create-order...');

  // First fetch products to get a valid product
  const { prisma } = await import('../src/lib/prisma');
  const sampleProduct = await prisma.product.findFirst({
    where: { status: 'ACTIVE', stock: { gt: 0 } },
    include: { variants: true }
  });

  if (!sampleProduct) {
    console.error('No published product found in DB');
    process.exit(1);
  }

  console.log('Using sample product:', sampleProduct.name, 'Price:', sampleProduct.price, 'ID:', sampleProduct.id);

  const payload = JSON.stringify({
    items: [
      {
        productId: sampleProduct.id,
        quantity: 1,
        size: sampleProduct.variants?.[0]?.size || 'M',
        price: sampleProduct.price,
      }
    ],
    shippingAddress: {
      fullName: 'Rahul Sharma',
      phone: '9876543210',
      email: 'rahul.test@example.com',
      addressLine1: 'Flat 402, Lotus Residency',
      addressLine2: 'Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
      country: 'India'
    },
    paymentMethod: 'ONLINE_RAZORPAY'
  });

  const req = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/checkout/create-order',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('Response Status:', res.statusCode);
      try {
        const parsed = JSON.parse(body);
        console.log('Response Body:', JSON.stringify(parsed, null, 2));
      } catch {
        console.log('Raw Body:', body);
      }
    });
  });

  req.on('error', (err) => {
    console.error('Request Error:', err);
  });

  req.write(payload);
  req.end();
}

testCreateOrderEndpoint().catch(console.error);
