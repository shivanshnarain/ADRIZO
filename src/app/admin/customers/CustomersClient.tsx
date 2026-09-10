"use client";

import { useState, useMemo } from 'react';
import { Search, Eye, ArrowLeft, Mail, Phone, MapPin, Calendar, Clock, CheckCircle2, AlertCircle, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from '../admin.module.css';

export default function CustomersClient({ initialCustomers }: { initialCustomers: any[] }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingCustomer, setViewingCustomer] = useState<any | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = (c.id || '').toLowerCase().includes(q);
        const matchesName = (c.name || '').toLowerCase().includes(q);
        const matchesEmail = (c.email || '').toLowerCase().includes(q);
        const matchesPhone = (c.phone || '').toLowerCase().includes(q);
        const matchesCity = (c.city || '').toLowerCase().includes(q);
        const matchesState = (c.state || '').toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesEmail && !matchesPhone && !matchesCity && !matchesState) return false;
      }
      return true;
    });
  }, [customers, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className={styles.pageTitle} style={{ margin: 0 }}>Customers</h1>
          <p style={{ fontSize: '0.8125rem', color: '#71717a', margin: '4px 0 0 0' }}>
            Single Source of Truth: Supabase customer profiles, auth confirmation metadata, and live order summaries.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#f4f4f5', padding: '0.35rem 0.65rem', borderRadius: '4px', color: '#52525b' }}>
            Total Customers: {customers.length}
          </span>
        </div>
      </div>

      {viewingCustomer ? (
        /* Customer Details / Order History Modal/View */
        <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e4e4e7', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  {viewingCustomer.name}
                </h2>
                {viewingCustomer.emailConfirmedAt ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.725rem', fontWeight: 700, background: '#f0fdf4', color: '#166534' }}>
                    <CheckCircle2 size={12} />
                    <span>Email Confirmed</span>
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.725rem', fontWeight: 700, background: '#fffbeb', color: '#b45309' }}>
                    <AlertCircle size={12} />
                    <span>Confirmation Pending</span>
                  </span>
                )}
              </div>
              <p style={{ color: '#71717a', fontSize: '0.75rem', margin: '6px 0 0 0', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span><strong>User ID (UUID):</strong> <code style={{ color: '#09090b' }}>{viewingCustomer.id}</code></span>
                <span>•</span>
                <span><strong>Signed Up:</strong> {new Date(viewingCustomer.createdAt).toLocaleString()}</span>
                {viewingCustomer.updatedAt && (
                  <>
                    <span>•</span>
                    <span><strong>Updated:</strong> {new Date(viewingCustomer.updatedAt).toLocaleString()}</span>
                  </>
                )}
              </p>
            </div>
            <button 
              type="button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem', background: '#fff', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer' }}
              onClick={() => setViewingCustomer(null)}
            >
              <ArrowLeft size={14} />
              <span>Back to Customers</span>
            </button>
          </div>

          {/* Customer Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
            <div style={{ background: '#fafafa', padding: '1.15rem', borderRadius: '6px', border: '1px solid #f4f4f5' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Mail size={14} />
                <span>Contact Details</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#09090b' }}>
                <div><strong>Email:</strong> {viewingCustomer.email || '—'}</div>
                <div style={{ marginTop: '4px' }}><strong>Phone:</strong> {viewingCustomer.phone || '—'}</div>
              </div>
            </div>

            <div style={{ background: '#fafafa', padding: '1.15rem', borderRadius: '6px', border: '1px solid #f4f4f5' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin size={14} />
                <span>Default Delivery Address</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#09090b' }}>
                {viewingCustomer.address ? (
                  <div>{viewingCustomer.address}</div>
                ) : (
                  <div style={{ color: '#71717a', fontStyle: 'italic' }}>No full address saved yet</div>
                )}
                {(viewingCustomer.city || viewingCustomer.state || viewingCustomer.pincode) && (
                  <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#52525b' }}>
                    <strong>City:</strong> {viewingCustomer.city || '—'} • <strong>State:</strong> {viewingCustomer.state || '—'} • <strong>PIN:</strong> {viewingCustomer.pincode || '—'}
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: '#fafafa', padding: '1.15rem', borderRadius: '6px', border: '1px solid #f4f4f5' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock size={14} />
                <span>Auth Activity (Supabase)</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#09090b' }}>
                <div>
                  <strong>Last Sign In:</strong>{' '}
                  {viewingCustomer.lastSignInAt ? new Date(viewingCustomer.lastSignInAt).toLocaleString() : 'Never logged in'}
                </div>
                <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#71717a' }}>
                  Auth Provider: Email &amp; Password
                </div>
              </div>
            </div>

            <div style={{ background: '#fffdf5', padding: '1.15rem', borderRadius: '6px', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ShoppingBag size={14} />
                <span>Lifetime Purchase Metrics</span>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#09090b' }}>
                ₹{(viewingCustomer.totalSpendAmount || (viewingCustomer.orders || []).reduce((sum: number, o: any) => sum + (o.total || 0), 0)).toFixed(2)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '2px' }}>
                {(viewingCustomer.totalOrdersCount !== undefined ? viewingCustomer.totalOrdersCount : (viewingCustomer.orders || []).length)} total orders placed
              </div>
            </div>
          </div>

          {/* Order History Table */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', marginBottom: '0.75rem' }}>
              Customer Order History ({(viewingCustomer.orders || []).length})
            </h3>
            {(viewingCustomer.orders || []).length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', background: '#fafafa', borderRadius: '6px', color: '#71717a', fontSize: '0.85rem' }}>
                No orders placed yet by this customer.
              </div>
            ) : (
              <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>Order Number</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>Date</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>Items</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>Payment</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>Tracking</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewingCustomer.orders || []).map((ord: any) => (
                      <tr key={ord.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 800, fontFamily: 'monospace' }}>
                          {ord.orderNumber ? `#${ord.orderNumber}` : `#${ord.id.slice(0, 8).toUpperCase()}`}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#71717a', fontSize: '0.8rem' }}>
                          {new Date(ord.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {(ord.items || []).map((it: any) => (
                            <div key={it.id} style={{ fontSize: '0.8rem', color: '#09090b', fontWeight: 600 }}>
                              {it.quantity}x {it.productName} {it.size ? `(${it.size})` : ''}
                            </div>
                          ))}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            background: ord.orderStatus === 'DELIVERED' ? '#f0fdf4' : ord.orderStatus === 'CANCELLED' ? '#fef2f2' : '#fffbeb',
                            color: ord.orderStatus === 'DELIVERED' ? '#166534' : ord.orderStatus === 'CANCELLED' ? '#991b1b' : '#b45309'
                          }}>
                            {ord.orderStatus}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            background: ord.paymentStatus === 'PAID' ? '#f0fdf4' : '#f4f4f5',
                            color: ord.paymentStatus === 'PAID' ? '#166534' : '#71717a'
                          }}>
                            {ord.paymentMethod}: {ord.paymentStatus}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: '#52525b' }}>
                          {ord.deliveryPartner ? (
                            <div>
                              <strong>{ord.deliveryPartner}</strong>
                              {ord.trackingId && <div>AWB: {ord.trackingId}</div>}
                            </div>
                          ) : (
                            <span style={{ color: '#a1a1aa' }}>Not Assigned</span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: '#09090b' }}>
                          ₹{ord.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Customers List Table */
        <div>
          {/* Search Toolbar */}
          <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '8px', padding: '0.85rem 1.15rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Search customers by name, email, phone, city, state, or ID..." 
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: '100%', height: '38px', padding: '0 0.85rem 0 2.25rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e4e4e7', overflowX: 'auto', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '880px', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Customer</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Phone</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Location</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Total Orders</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Total Spend</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#71717a' }}>
                      No customers found matching search query.
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map(c => {
                    const orderCount = c.totalOrdersCount !== undefined ? c.totalOrdersCount : (c.orders || []).length;
                    const totalSpend = c.totalSpendAmount !== undefined ? c.totalSpendAmount : (c.orders || []).reduce((sum: number, o: any) => sum + (o.total || 0), 0);
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: '#09090b' }}>{c.name}</div>
                          <div style={{ fontSize: '0.725rem', color: '#71717a' }}>
                            Joined {new Date(c.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#52525b' }}>
                          <div>{c.email || '—'}</div>
                          {c.emailConfirmedAt && (
                            <span style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 600 }}>✓ Confirmed</span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#52525b' }}>{c.phone || '—'}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>{c.city ? `${c.city}, ${c.state || ''}` : '—'}</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{orderCount}</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#09090b' }}>₹{totalSpend.toFixed(2)}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <button 
                            type="button"
                            onClick={() => setViewingCustomer(c)} 
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.35rem 0.65rem',
                              background: '#fff',
                              border: '1px solid #d4d4d8',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            <Eye size={13} />
                            <span>View Profile</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination Toolbar */}
            {filteredCustomers.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.15rem', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
                <div style={{ fontSize: '0.75rem', color: '#71717a' }}>
                  Showing {Math.min(filteredCustomers.length, (currentPage - 1) * pageSize + 1)} to {Math.min(filteredCustomers.length, currentPage * pageSize)} of {filteredCustomers.length} customers
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      padding: '0.35rem 0.65rem',
                      background: '#fff',
                      border: '1px solid #d4d4d8',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.5 : 1
                    }}
                  >
                    <ChevronLeft size={14} />
                    <span>Previous</span>
                  </button>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0 0.5rem', color: '#09090b' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      padding: '0.35rem 0.65rem',
                      background: '#fff',
                      border: '1px solid #d4d4d8',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage === totalPages ? 0.5 : 1
                    }}
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
