import Link from 'next/link';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  Boxes, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Plus,
  Eye
} from 'lucide-react';
import styles from '../admin.module.css';
import { prisma } from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  let productCount = 0;
  let activeProductCount = 0;
  let inactiveProductCount = 0;
  let orderCount = 0;
  let pendingOrdersCount = 0;
  let completedOrdersCount = 0;
  let customerCount = 0;
  let totalRevenue = 0;
  let recentOrders: any[] = [];
  let recentProducts: any[] = [];

  try {

    const [
      allProducts,
      customers,
      recentProds
    ] = await Promise.all([
      prisma.product.findMany({
        include: { category: true, images: true }
      }),
      prisma.user.findMany({ where: { role: 'CUSTOMER' } }).catch(() => []),
      prisma.product.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { category: true, images: true }
      })
    ]);

    let combinedOrders: any[] = [];
    let combinedRecentOrders: any[] = [];

    // Fetch Supabase live orders and customer profiles
    try {
      const { getAdminClient } = await import('../../../lib/supabase/admin');
      const supabase = getAdminClient();
      const [supaOrdersRes, supaProfilesCountRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_number, customer_name, customer_email, total_amount, payment_status, order_status, payment_method, created_at, order_items(id, product_name, quantity, unit_price)')
          .order('created_at', { ascending: false }),
        supabase.from('customer_profiles').select('id', { count: 'exact', head: true })
      ]);

      if (supaOrdersRes.data && supaOrdersRes.data.length > 0) {
        combinedOrders = supaOrdersRes.data.map((o: any) => ({
          id: o.id,
          orderNumber: o.order_number,
          customerName: o.customer_name,
          customerEmail: o.customer_email,
          total: Number(o.total_amount || 0),
          paymentStatus: o.payment_status,
          orderStatus: o.order_status,
          paymentMethod: o.payment_method,
          createdAt: new Date(o.created_at),
          items: (o.order_items || []).map((it: any) => ({
            id: it.id,
            productName: it.product_name,
            quantity: it.quantity,
            price: Number(it.unit_price || 0)
          }))
        })) as any;
        combinedRecentOrders = combinedOrders.slice(0, 6);
      }

      if (supaProfilesCountRes.count !== null && supaProfilesCountRes.count !== undefined) {
        customerCount = Math.max(customers.length, supaProfilesCountRes.count);
      } else {
        customerCount = customers.length;
      }
    } catch {
      customerCount = customers.length;
    }

    productCount = allProducts.length;
    activeProductCount = allProducts.filter(p => p.status === 'ACTIVE').length;
    inactiveProductCount = allProducts.filter(p => p.status === 'INACTIVE').length;

    orderCount = combinedOrders.length;
    pendingOrdersCount = combinedOrders.filter(o => o.orderStatus === 'PENDING' || o.orderStatus === 'PROCESSING').length;
    completedOrdersCount = combinedOrders.filter(o => o.orderStatus === 'DELIVERED' || o.paymentStatus === 'PAID').length;
    totalRevenue = combinedOrders.reduce((sum, ord) => sum + (ord.total || 0), 0);

    recentOrders = combinedRecentOrders;
    recentProducts = recentProds;

  } catch (err: any) {
    console.warn("Dashboard database fallback:", err.message);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className={styles.pageTitle} style={{ margin: 0 }}>Dashboard Overview</h1>
          <p style={{ fontSize: '0.8125rem', color: '#71717a', margin: '4px 0 0 0' }}>
            Live performance summary and store catalogue across ADrizo store.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link 
            href="/admin/products?action=add" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.25rem', background: '#FFC800', color: '#000000', fontWeight: 800, fontSize: '0.8125rem', borderRadius: '6px', border: '1px solid #eab308', textDecoration: 'none' }}
          >
            <Plus size={16} />
            <span>Add New Product</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Total Sales / Revenue */}
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <TrendingUp size={22} color="#000" />
          </div>
          <div className={styles.statInfo}>
            <h3>Total Revenue</h3>
            <p>₹{totalRevenue.toLocaleString('en-IN')}</p>
            <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Lifetime store gross</span>
          </div>
        </div>

        {/* Total Products */}
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Package size={22} color="#000" />
          </div>
          <div className={styles.statInfo}>
            <h3>Total Products</h3>
            <p>{productCount}</p>
            <span style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 700 }}>
              {activeProductCount} Active • {inactiveProductCount} Inactive
            </span>
          </div>
        </div>

        {/* Total Orders */}
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <ShoppingCart size={22} color="#000" />
          </div>
          <div className={styles.statInfo}>
            <h3>Total Orders</h3>
            <p>{orderCount}</p>
            <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
              {pendingOrdersCount} Pending • {completedOrdersCount} Completed
            </span>
          </div>
        </div>

        {/* Total Customers */}
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Users size={22} color="#000" />
          </div>
          <div className={styles.statInfo}>
            <h3>Total Customers</h3>
            <p>{customerCount}</p>
            <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Registered accounts</span>
          </div>
        </div>
      </div>

      {/* 2-Column Tables (Recent Orders & Recent Products) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Recent Orders */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e4e4e7', padding: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#09090b' }}>Recent Orders</h2>
            <Link href="/admin/orders" style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>View All</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#71717a', padding: '1rem 0' }}>No recent orders.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {recentOrders.map(order => (
                <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.75rem', background: '#fafafa', borderRadius: '6px', border: '1px solid #f4f4f5' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#09090b' }}>{order.customerName}</div>
                    <div style={{ fontSize: '0.725rem', color: '#71717a' }}>
                      #{order.id.slice(0, 8).toUpperCase()} • {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.875rem', color: '#09090b' }}>₹{order.total.toFixed(2)}</div>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      fontSize: '0.675rem',
                      fontWeight: 700,
                      background: order.orderStatus === 'DELIVERED' ? '#f0fdf4' : order.orderStatus === 'CANCELLED' ? '#fef2f2' : '#fffbeb',
                      color: order.orderStatus === 'DELIVERED' ? '#166534' : order.orderStatus === 'CANCELLED' ? '#991b1b' : '#b45309'
                    }}>
                      {order.orderStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Products */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e4e4e7', padding: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#09090b' }}>Recent Products</h2>
            <Link href="/admin/products" style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>View All</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {recentProducts.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#71717a', padding: '1rem 0' }}>No products created yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {recentProducts.map(prod => {
                const primaryImg = prod.images?.find((img: any) => img.isPrimary)?.url || prod.images?.[0]?.url;
                return (
                  <div key={prod.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#fafafa', borderRadius: '6px', border: '1px solid #f4f4f5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{ width: 34, height: 40, borderRadius: 4, background: '#f4f4f5', overflow: 'hidden', border: '1px solid #e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {primaryImg ? <img src={primaryImg} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={16} color="#a1a1aa" />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.825rem', color: '#09090b' }}>{prod.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#71717a' }}>{prod.sku || 'No SKU'}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#09090b' }}>₹{prod.price}</div>
                      <span style={{ fontSize: '0.675rem', fontWeight: 700, color: prod.status === 'ACTIVE' ? '#166534' : '#71717a' }}>
                        {prod.status === 'ACTIVE' ? '● Active' : '○ Inactive'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
