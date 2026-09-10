try {
  process.loadEnvFile('.env.local');
} catch {}
try {
  process.loadEnvFile('.env');
} catch {}

import { shiprocketRequest } from '../src/lib/shiprocket/client';

async function checkTestShipment() {
  console.log('Checking Shiprocket status for Order 1563637289...');
  try {
    const res: any = await shiprocketRequest('/orders/show/1563637289');
    console.log('Order status:', res?.data?.status);
    console.log('Order status code:', res?.data?.status_code);
    console.log('Shipments type:', typeof res?.data?.shipments, Array.isArray(res?.data?.shipments));
    if (typeof res?.data?.shipments === 'object' && res?.data?.shipments !== null) {
      console.log('Shipment object:', JSON.stringify(res?.data?.shipments, null, 2));
    }
  } catch (err: any) {
    console.error('Error fetching order:', err.message);
  }
}

checkTestShipment();
