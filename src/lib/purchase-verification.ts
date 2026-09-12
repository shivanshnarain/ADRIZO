import { getAdminClient } from '@/lib/supabase/admin';
import { AuthenticatedCustomer } from '@/lib/customer-auth';

/**
 * Checks whether the authenticated customer has completed a verified purchase
 * of the specified product.
 * Prevents client-side spoofing of verified purchase status.
 */
export async function checkVerifiedPurchase(
  customer: AuthenticatedCustomer,
  productId: string
): Promise<boolean> {
  if (!customer || !productId) return false;

  const cleanProductId = productId.trim();

  try {
    const adminSupabase = getAdminClient();
    const filterClauses: string[] = [];

    if (customer.id && customer.id !== 'admin') {
      filterClauses.push(`customer_id.eq.${customer.id}`);
    }
    if (customer.email && customer.email.trim()) {
      filterClauses.push(`customer_email.eq.${customer.email.trim().toLowerCase()}`);
    }
    if (customer.phone && customer.phone.trim()) {
      filterClauses.push(`customer_phone.eq.${customer.phone.trim()}`);
    }

    if (filterClauses.length === 0) return false;

    const orCondition = filterClauses.join(',');

    // Fetch customer's orders along with their line items
    const { data: orders, error } = await adminSupabase
      .from('orders')
      .select(`
        id,
        order_status,
        payment_status,
        order_items (
          product_id,
          product_name
        )
      `)
      .or(orCondition);

    if (error || !orders || !Array.isArray(orders)) {
      return false;
    }

    // Match if product appears in any non-cancelled order
    const hasBought = orders.some((order: any) => {
      // Exclude cancelled or failed orders
      if (order.order_status === 'CANCELLED' || order.payment_status === 'FAILED') {
        return false;
      }

      const items = order.order_items || [];
      return items.some((item: any) => {
        return item.product_id === cleanProductId;
      });
    });

    return hasBought;
  } catch (err) {
    console.warn('[Purchase Verification Warning]:', err);
    return false;
  }
}
