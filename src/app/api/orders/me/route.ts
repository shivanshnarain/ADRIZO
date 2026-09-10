import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedCustomer } from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const customer = await getAuthenticatedCustomer();

    if (!customer || !customer.id || customer.id === 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = getAdminClient();
    const filterClauses: string[] = [];

    if (customer.id) filterClauses.push(`customer_id.eq.${customer.id}`);
    if (customer.email) filterClauses.push(`customer_email.eq.${customer.email.toLowerCase()}`);
    if (customer.phone) filterClauses.push(`customer_phone.eq.${customer.phone}`);

    const orCondition = filterClauses.join(',');

    const { data: orders, error: ordersError } = await adminSupabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .or(orCondition)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Supabase fetch customer orders error:', ordersError);
      return NextResponse.json({ orders: [] });
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (error) {
    console.error('Fetch customer orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
