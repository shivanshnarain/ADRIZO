import { getAdminClient } from '../../../lib/supabase/admin';
import CustomersClient from './CustomersClient';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  let customers: any[] = [];
  try {
    const supabase = getAdminClient();

    // 1. Fetch customer profiles enriched with Supabase Auth metadata from single source of truth
    let profileData: any[] = [];
    const { data: rpcData, error: profileErr } = await supabase.rpc('admin_get_customers', {
      p_admin_secret: 'adrizo_admin_secure_secret_2026',
      p_limit: 100,
      p_offset: 0,
      p_search: null
    });

    if (!profileErr && Array.isArray(rpcData) && rpcData.length > 0) {
      profileData = rpcData;
    } else {
      // Fallback directly to Supabase Auth and customer_profiles table
      try {
        const { data: directProfiles } = await supabase
          .from('customer_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        let authUsers: any[] = [];
        try {
          const { data: authUsersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
          authUsers = authUsersData?.users || [];
        } catch (authListErr) {
          console.warn('[Admin List Users Warning]', authListErr);
        }

        const idMap = new Map<string, any>();
        (directProfiles || []).forEach((p: any) => {
          idMap.set(p.id, {
            id: p.id,
            full_name: p.full_name,
            phone: p.phone,
            delivery_address: p.delivery_address,
            city: p.city,
            state: p.state,
            pincode: p.pincode,
            created_at: p.created_at,
            updated_at: p.updated_at,
            email: null,
            email_confirmed_at: null,
            last_sign_in_at: null,
          });
        });

        authUsers.forEach((u: any) => {
          const existing = idMap.get(u.id) || {
            id: u.id,
            full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Customer',
            phone: u.user_metadata?.phone || u.phone || null,
            delivery_address: null,
            city: null,
            state: null,
            pincode: null,
            created_at: u.created_at,
            updated_at: u.updated_at,
          };
          existing.email = u.email;
          existing.email_confirmed_at = u.email_confirmed_at;
          existing.last_sign_in_at = u.last_sign_in_at;
          if (!existing.full_name) {
            existing.full_name = u.user_metadata?.full_name || u.email?.split('@')[0] || 'Customer';
          }
          idMap.set(u.id, existing);
        });

        profileData = Array.from(idMap.values());
      } catch (err) {
        console.warn('[Customer Profile Fallback Error]', err);
      }
    }

    if (profileData && profileData.length > 0) {
      // 2. Fetch customer order summaries with strict column selection
      const { data: supaOrders } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_id,
          total_amount,
          payment_status,
          order_status,
          payment_method,
          delivery_partner,
          tracking_id,
          tracking_status,
          created_at,
          order_items (
            id,
            product_name,
            sku,
            size,
            color,
            quantity,
            unit_price,
            total_price
          )
        `)
        .order('created_at', { ascending: false });

      customers = profileData.map((p: any) => {
        const userOrders = (supaOrders || []).filter((o: any) => o.customer_id === p.id);
        const orderSpend = userOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);
        return {
          id: p.id,
          name: p.full_name || p.email?.split('@')[0] || 'Customer',
          email: p.email || 'No email',
          phone: p.phone,
          address: p.delivery_address,
          city: p.city,
          state: p.state,
          pincode: p.pincode,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          emailConfirmedAt: p.email_confirmed_at,
          lastSignInAt: p.last_sign_in_at,
          totalOrdersCount: p.total_orders !== undefined ? Number(p.total_orders) : userOrders.length,
          totalSpendAmount: p.total_spend !== undefined ? Number(p.total_spend) : orderSpend,
          orders: userOrders.map((o: any) => ({
            id: o.id,
            orderNumber: o.order_number,
            total: Number(o.total_amount || 0),
            paymentStatus: o.payment_status,
            orderStatus: o.order_status,
            paymentMethod: o.payment_method,
            deliveryPartner: o.delivery_partner,
            trackingId: o.tracking_id,
            trackingStatus: o.tracking_status,
            createdAt: o.created_at,
            items: (o.order_items || []).map((it: any) => ({
              id: it.id,
              productName: it.product_name,
              sku: it.sku,
              size: it.size,
              color: it.color,
              quantity: it.quantity,
              price: Number(it.unit_price || 0),
              total: Number(it.total_price || 0)
            }))
          }))
        };
      });
    }
  } catch (err) {
    console.error('[Admin Customers Server Page Error]', err);
    customers = [];
  }

  return <CustomersClient initialCustomers={customers} />;
}
