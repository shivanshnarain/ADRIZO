import { createClient } from '@supabase/supabase-js';

export function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().replace(/^["']|["']$/g, '');
  const isServiceKeyValid = Boolean(
    rawServiceKey && 
    !rawServiceKey.includes('REPLACE_WITH') && 
    !rawServiceKey.includes('placeholder') && 
    rawServiceKey.length > 20
  );

  const serviceKey = isServiceKeyValid 
    ? rawServiceKey! 
    : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim().replace(/^["']|["']$/g, '') || '');

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
