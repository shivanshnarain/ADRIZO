try { process.loadEnvFile('.env.local'); } catch {}
try { process.loadEnvFile('.env'); } catch {}

import { shiprocketRequest, maskEmail } from '../src/lib/shiprocket';

async function main() {
  console.log('Querying Shiprocket Account Settings for:', maskEmail(process.env.SHIPROCKET_API_EMAIL));
  try {
    const pickupRes = await shiprocketRequest<any>('/settings/company/pickup');
    console.log('--- PICKUP LOCATIONS ---');
    console.log(JSON.stringify(pickupRes, null, 2));

    const srvRes = await shiprocketRequest<any>('/courier/serviceability/?pickup_postcode=201301&delivery_postcode=282002&weight=0.5&cod=1');
    console.log('--- SERVICEABILITY SAMPLE (Available Couriers) ---');
    if (srvRes.data && srvRes.data.available_courier_companies) {
      console.log('Available couriers count:', srvRes.data.available_courier_companies.length);
      console.log('First 2 couriers:', JSON.stringify(srvRes.data.available_courier_companies.slice(0, 2), null, 2));
    } else {
      console.log('Serviceability raw response:', JSON.stringify(srvRes, null, 2));
    }
  } catch (err: any) {
    console.error('Failed to query Shiprocket:', err.message);
  }
}

main().catch(console.error);
