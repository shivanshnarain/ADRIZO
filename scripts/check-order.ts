try { process.loadEnvFile('.env.local'); } catch {}
try { process.loadEnvFile('.env'); } catch {}

import { getAdminClient } from '../src/lib/supabase/admin';

async function check() {
  const supa = getAdminClient();
  const { data, error } = await supa
    .from('orders')
    .select('id, order_number, total_amount, payment_method, payment_status, order_status, razorpay_order_id, razorpay_payment_id')
    .eq('id', 'ce6d4aee-01bd-4324-aabc-4aedfc912793');
  console.log('Order in Supabase:', JSON.stringify(data, null, 2));
  if (error) console.error('Supabase Error:', error);
}

check();
