"use client";

import { useEffect, useState, useCallback, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  MapPin, 
  Package, 
  Check, 
  Clock, 
  Truck, 
  AlertCircle, 
  Navigation, 
  X, 
  RotateCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Calendar,
  CreditCard,
  RefreshCw,
  ShoppingBag,
  User,
  Plus,
  Trash2,
  Edit3,
  Phone
} from 'lucide-react';

// Status styling and label helpers
function getHumanReadableStatus(order: any): { label: string; bg: string; color: string; border: string } {
  const oStatus = (order.order_status || order.orderStatus || '').toUpperCase();
  const tStatus = (order.tracking_status || order.trackingStatus || '').toUpperCase();

  if (oStatus === 'CANCELLED' || tStatus === 'CANCELLED') {
    return { label: 'Cancelled', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
  }
  if (oStatus === 'DELIVERED' || tStatus === 'DELIVERED') {
    return { label: 'Delivered', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
  }
  if (tStatus === 'OUT_FOR_DELIVERY') {
    return { label: 'Out for Delivery', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
  }
  if (oStatus === 'SHIPPED' || tStatus === 'SHIPPED' || tStatus === 'IN_TRANSIT') {
    return { label: 'In Transit', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
  }
  if (tStatus === 'PICKED_UP') {
    return { label: 'Picked Up', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' };
  }
  if (tStatus === 'PACKED') {
    return { label: 'Packed', bg: '#f8fafc', color: '#334155', border: '#cbd5e1' };
  }
  if (oStatus === 'PROCESSING') {
    return { label: 'Processing', bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
  }
  if (oStatus === 'PENDING_COD_CONFIRMATION') {
    return { label: 'Awaiting ₹99 Confirmation', bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
  }
  if (oStatus === 'CONFIRMED') {
    return { label: 'Order Confirmed', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
  }
  return { label: 'Order Placed', bg: '#f8fafc', color: '#18181b', border: '#e2e8f0' };
}

function isOrderEligibleForCancellation(order: any): boolean {
  const oStatus = (order.order_status || order.orderStatus || '').toUpperCase();
  const tStatus = (order.tracking_status || order.trackingStatus || '').toUpperCase();

  // If already cancelled or delivered or shipped
  if (['CANCELLED', 'DELIVERED', 'SHIPPED'].includes(oStatus)) return false;
  if (['DELIVERED', 'OUT_FOR_DELIVERY', 'SHIPPED', 'IN_TRANSIT', 'PICKED_UP', 'PACKED', 'CANCELLED', 'RETURNED'].includes(tStatus)) {
    return false;
  }

  // If AWB or pickup already assigned
  if (order.tracking_id || order.trackingId || order.pickup_id || order.pickupId) {
    return false;
  }

  return ['PLACED', 'CONFIRMED', 'PROCESSING'].includes(oStatus);
}

function AccountContent() {
  const { user, loading, logout, updateProfile, openAuthModal } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const trackParam = searchParams.get('track');
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Tab State: 'orders' | 'addresses' | 'profile'
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'profile'>(() => {
    if (tabParam === 'address' || tabParam === 'addresses') return 'addresses';
    if (tabParam === 'profile') return 'profile';
    return 'orders';
  });

  // Saved Addresses state
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any | null>(null);
  const [addressForm, setAddressForm] = useState({
    full_name: '',
    phone: '',
    address: '',
    area: '',
    district: '',
    city: '',
    state: 'Delhi',
    pincode: '',
    landmark: '',
    is_default: false,
  });
  const [savingAddressItem, setSavingAddressItem] = useState(false);
  const [addressItemError, setAddressItemError] = useState<string | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);

  // Customer tracking modal state
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<any | null>(null);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingRefreshing, setTrackingRefreshing] = useState(false);
  const [customerTrackingData, setCustomerTrackingData] = useState<any | null>(null);
  const [lastTrackedTime, setLastTrackedTime] = useState<string | null>(null);

  // Customer cancellation state
  const [cancellingOrder, setCancellingOrder] = useState<any | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Changed my mind');
  const [cancelCustomReason, setCancelCustomReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancellationNotice, setCancellationNotice] = useState<{
    orderNumber: string;
    message: string;
    refundNote?: string;
  } | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (trackingModalOpen || isCancelModalOpen || isAddressModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [trackingModalOpen, isCancelModalOpen, isAddressModalOpen]);

  // Synchronize active tab with URL query parameter
  useEffect(() => {
    if (tabParam === 'address' || tabParam === 'addresses') {
      setActiveTab('addresses');
    } else if (tabParam === 'profile') {
      setActiveTab('profile');
    } else if (tabParam === 'orders' || trackParam) {
      setActiveTab('orders');
    }
  }, [tabParam, trackParam]);

  const handleTabChange = (tab: 'orders' | 'addresses' | 'profile') => {
    setActiveTab(tab);
    router.replace(`/account?tab=${tab}`, { scroll: false });
  };

  const fetchOrders = useCallback(async () => {
    if (user) {
      try {
        const res = await fetch('/api/orders/me');
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } catch (error) {
        console.error("Failed to fetch orders", error);
      } finally {
        setLoadingOrders(false);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const fetchAddresses = useCallback(async () => {
    if (user) {
      setLoadingAddresses(true);
      try {
        const res = await fetch('/api/customer/addresses');
        if (res.ok) {
          const data = await res.json();
          setAddresses(data.addresses || []);
        }
      } catch (error) {
        console.error("Failed to fetch addresses", error);
      } finally {
        setLoadingAddresses(false);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleTrackShipment = useCallback(async (orderOrId: any) => {
    let orderObj = typeof orderOrId === 'object' && orderOrId !== null ? orderOrId : null;
    const orderIdentifier = orderObj
      ? (orderObj.order_number || orderObj.orderNumber || orderObj.id)
      : String(orderOrId);

    if (!orderObj) {
      orderObj = orders.find(
        (o) => (o.order_number || o.orderNumber || o.id) === orderIdentifier
      ) || { order_number: orderIdentifier };
    }

    setActiveTrackingOrder(orderObj);
    setTrackingModalOpen(true);
    setTrackingLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderIdentifier}/tracking`);
      const data = await res.json();
      setCustomerTrackingData(data);
      setLastTrackedTime(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    } catch {
      setCustomerTrackingData({
        success: false,
        error: 'Unable to connect to tracking server. Please try again in a few moments.',
      });
    } finally {
      setTrackingLoading(false);
    }
  }, [orders]);

  // Handle deep-linked tracking (e.g. redirected from checkout ?track=ADR-XXXX)
  useEffect(() => {
    if (trackParam && !trackingModalOpen && !activeTrackingOrder) {
      handleTrackShipment(trackParam);
    }
  }, [trackParam, trackingModalOpen, activeTrackingOrder, handleTrackShipment]);

  const handleRefreshTracking = async () => {
    if (!activeTrackingOrder) return;
    setTrackingRefreshing(true);
    try {
      const orderIdentifier = activeTrackingOrder.order_number || activeTrackingOrder.orderNumber || activeTrackingOrder.id;
      const res = await fetch(`/api/orders/${orderIdentifier}/tracking`);
      const data = await res.json();
      if (data.success) {
        setCustomerTrackingData(data);
        setLastTrackedTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch {
      // Keep existing data on network glitch
    } finally {
      setTrackingRefreshing(false);
    }
  };

  const handleOpenCancelModal = (order: any) => {
    setCancellingOrder(order);
    setCancelReason('Changed my mind');
    setCancelCustomReason('');
    setCancelError(null);
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancelOrder = async () => {
    if (!cancellingOrder) return;
    setCancelSubmitting(true);
    setCancelError(null);

    const finalReason = cancelReason === 'Other' && cancelCustomReason.trim()
      ? cancelCustomReason.trim()
      : cancelReason;

    try {
      const orderIdentifier = cancellingOrder.order_number || cancellingOrder.orderNumber || cancellingOrder.id;
      const res = await fetch(`/api/orders/${orderIdentifier}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: finalReason }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setCancelError(data.error || 'Unable to cancel this order. Please try again.');
        return;
      }

      setIsCancelModalOpen(false);
      setCancellationNotice({
        orderNumber: data.orderNumber || cancellingOrder.order_number,
        message: data.message || 'Your order has been cancelled successfully.',
        refundNote: data.refundNote,
      });
      setCancellingOrder(null);
      setCancelReason('Changed my mind');
      setCancelCustomReason('');

      // Refresh orders list from database
      await fetchOrders();
    } catch {
      setCancelError('Network error while processing cancellation. Please try again.');
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Address CRUD modal handlers
  const handleOpenAddAddress = () => {
    setEditingAddress(null);
    setAddressForm({
      full_name: user?.name && user.name !== 'Customer' ? user.name : '',
      phone: user?.phone || '',
      address: '',
      area: '',
      district: '',
      city: user?.city || '',
      state: user?.state || 'Delhi',
      pincode: user?.pincode || '',
      landmark: '',
      is_default: addresses.length === 0,
    });
    setAddressItemError(null);
    setIsAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr: any) => {
    setEditingAddress(addr);
    setAddressForm({
      full_name: addr.full_name || '',
      phone: addr.phone || '',
      address: addr.address || '',
      area: addr.area || '',
      district: addr.district || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
      landmark: addr.landmark || '',
      is_default: Boolean(addr.is_default),
    });
    setAddressItemError(null);
    setIsAddressModalOpen(true);
  };

  const handleSaveAddressModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddressItem(true);
    setAddressItemError(null);
    try {
      const isEdit = Boolean(editingAddress);
      const url = '/api/customer/addresses';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit ? { ...addressForm, id: editingAddress.id } : addressForm;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAddressItemError(data.error || 'Failed to save address.');
        return;
      }

      setIsAddressModalOpen(false);
      setEditingAddress(null);
      await fetchAddresses();

      if (addressForm.is_default) {
        updateProfile({
          address: addressForm.address,
          city: addressForm.city,
          state: addressForm.state,
          pincode: addressForm.pincode,
          phone: addressForm.phone,
        });
      }
    } catch {
      setAddressItemError('Network error while saving address.');
    } finally {
      setSavingAddressItem(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    setDeletingAddressId(id);
    try {
      const res = await fetch(`/api/customer/addresses?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchAddresses();
      } else {
        alert(data.error || 'Failed to delete address.');
      }
    } catch {
      alert('Network error while deleting address.');
    } finally {
      setDeletingAddressId(null);
    }
  };

  const handleSetDefaultAddress = async (addr: any) => {
    try {
      const res = await fetch('/api/customer/addresses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: addr.id, is_default: true }),
      });
      if (res.ok) {
        await fetchAddresses();
        updateProfile({
          address: addr.address,
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
          phone: addr.phone,
        });
      }
    } catch (err) {
      console.error('Failed to set default address', err);
    }
  };

  // Inline Profile Address edit state
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPincode, setEditPincode] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressSavedNotice, setAddressSavedNotice] = useState(false);

  useEffect(() => {
    if (user) {
      setEditAddress(user.address || '');
      setEditCity(user.city || '');
      setEditState(user.state || '');
      setEditPincode(user.pincode || '');
      setEditPhone(user.phone || '');
    }
  }, [user]);

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddress(true);
    const res = await updateProfile({
      address: editAddress,
      city: editCity,
      state: editState,
      pincode: editPincode,
      phone: editPhone,
    });
    setSavingAddress(false);
    if (res.success) {
      setIsEditingAddress(false);
      setAddressSavedNotice(true);
      fetchAddresses();
      setTimeout(() => setAddressSavedNotice(false), 3000);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a' }}>
        <RotateCw size={24} className="animate-spin" style={{ marginRight: '10px', color: '#09090b' }} />
        <span>Loading ADRIZO Account...</span>
      </div>
    );
  }

  // Unauthenticated safe view (NEVER bounce to homepage hero!)
  if (!user) {
    return (
      <div className="container" style={{ padding: '5rem 1rem', maxWidth: '580px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f4f4f5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <User size={30} color="#09090b" />
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#09090b', letterSpacing: '-0.02em' }}>
          {trackParam ? `Track Order #${trackParam}` : 'Sign In to Your Account'}
        </h1>
        <p style={{ color: '#71717a', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: '1.5' }}>
          {trackParam
            ? 'Please sign in to view real-time courier tracking, estimated delivery dates, and shipment milestones for your order.'
            : 'Sign in to access your verified AD(R)IZO orders, manage saved delivery addresses, and track active shipments.'}
        </p>
        <button
          type="button"
          onClick={() => openAuthModal('SIGN_IN', typeof window !== 'undefined' ? window.location.href : '/account')}
          style={{
            padding: '0.8rem 2.25rem',
            background: '#09090b',
            color: '#ffffff',
            borderRadius: '8px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.92rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '3.5rem 1rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: '700', letterSpacing: '-0.02em', margin: 0 }}>My Account</h1>
          <p style={{ color: '#71717a', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Logged in as <strong style={{ color: '#09090b' }}>{user.email}</strong>
          </p>
        </div>
        <button
          onClick={logout}
          style={{
            padding: '0.6rem 1.25rem',
            border: '1px solid #e4e4e7',
            background: '#ffffff',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Sign Out
        </button>
      </div>

      {/* Account Tab Navigation Bar */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid #e4e4e7',
          marginBottom: '2rem',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('orders')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderBottom: activeTab === 'orders' ? '2.5px solid #09090b' : '2.5px solid transparent',
            color: activeTab === 'orders' ? '#09090b' : '#71717a',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <Package size={17} />
          <span>My Orders ({orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('addresses')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderBottom: activeTab === 'addresses' ? '2.5px solid #09090b' : '2.5px solid transparent',
            color: activeTab === 'addresses' ? '#09090b' : '#71717a',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <MapPin size={17} />
          <span>Saved Addresses ({addresses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('profile')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderBottom: activeTab === 'profile' ? '2.5px solid #09090b' : '2.5px solid transparent',
            color: activeTab === 'profile' ? '#09090b' : '#71717a',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <User size={17} />
          <span>Personal Details</span>
        </button>
      </div>

      {/* TAB 3: PERSONAL DETAILS & PROFILE */}
      {activeTab === 'profile' && (
        <div id="profile" style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Profile Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f4f4f5' }}>
              Personal Details
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.88rem' }}>
              <div>
                <span style={{ color: '#71717a' }}>Name:</span>{' '}
                <strong style={{ color: '#18181b' }}>{user.name}</strong>
              </div>
              <div>
                <span style={{ color: '#71717a' }}>Email:</span>{' '}
                <span style={{ color: '#18181b' }}>{user.email}</span>
              </div>
              <div>
                <span style={{ color: '#71717a' }}>Phone:</span>{' '}
                <span style={{ color: '#18181b' }}>{user.phone || 'Not provided'}</span>
              </div>
            </div>
          </div>

          {/* Delivery Address Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f4f4f5' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={18} color="#09090b" />
                Default Delivery Address
              </h2>
              {!isEditingAddress && (
                <button
                  type="button"
                  onClick={() => setIsEditingAddress(true)}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', padding: 0 }}
                >
                  {user.address ? 'Edit' : '+ Add Address'}
                </button>
              )}
            </div>

            {addressSavedNotice && (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Check size={15} /> Address saved successfully to your Supabase profile!
              </div>
            )}

            {isEditingAddress ? (
              <form onSubmit={handleSaveAddress} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#71717a', marginBottom: '0.25rem' }}>
                    Address (Flat/House/Street)
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#71717a', marginBottom: '0.25rem' }}>City</label>
                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      required
                      style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#71717a', marginBottom: '0.25rem' }}>State</label>
                    <input
                      type="text"
                      value={editState}
                      onChange={(e) => setEditState(e.target.value)}
                      required
                      style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#71717a', marginBottom: '0.25rem' }}>PIN Code</label>
                    <input
                      type="text"
                      value={editPincode}
                      maxLength={6}
                      onChange={(e) => setEditPincode(e.target.value)}
                      required
                      style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#71717a', marginBottom: '0.25rem' }}>Phone</label>
                    <input
                      type="tel"
                      value={editPhone}
                      maxLength={10}
                      onChange={(e) => setEditPhone(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    disabled={savingAddress}
                    style={{ flex: 1, padding: '0.55rem', background: '#09090b', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    {savingAddress ? 'Saving...' : 'Save Address'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingAddress(false)}
                    style={{ padding: '0.55rem 1rem', background: '#f4f4f5', border: '1px solid #e4e4e7', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : user.address ? (
              <div style={{ fontSize: '0.88rem', lineHeight: '1.5', color: '#3f3f46' }}>
                <p style={{ margin: 0, fontWeight: '500', color: '#18181b' }}>{user.address}</p>
                <p style={{ margin: 0 }}>{user.city}, {user.state} - {user.pincode}</p>
                <p style={{ margin: '0.25rem 0 0', color: '#71717a', fontSize: '0.82rem' }}>India</p>
              </div>
            ) : (
              <div style={{ color: '#71717a', fontSize: '0.85rem', fontStyle: 'italic' }}>
                No delivery address saved yet. Save an address for one-click checkout.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SAVED ADDRESSES */}
      {activeTab === 'addresses' && (
        <div id="address" style={{ scrollMarginTop: '80px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={20} />
                Saved Delivery Addresses ({addresses.length})
              </h2>
              <p style={{ color: '#71717a', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
                Manage your delivery destinations for quick one-click checkout.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddAddress}
              style={{
                background: '#09090b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.55rem 1.15rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Plus size={15} />
              <span>Add New Address</span>
            </button>
          </div>

          {loadingAddresses ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#71717a', background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px' }}>
              <RotateCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem', color: '#09090b' }} />
              <div>Loading your saved addresses...</div>
            </div>
          ) : addresses.length === 0 ? (
            <div style={{ padding: '3.5rem 1.5rem', border: '1px dashed #d4d4d8', borderRadius: '10px', textAlign: 'center', background: '#fafafa' }}>
              <MapPin size={38} color="#a1a1aa" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#27272a', margin: '0 0 0.25rem' }}>No saved addresses yet</h3>
              <p style={{ color: '#71717a', fontSize: '0.85rem', margin: '0 0 1.25rem' }}>
                Save your home or work address for quick and effortless checkout.
              </p>
              <button
                type="button"
                onClick={handleOpenAddAddress}
                style={{ padding: '0.6rem 1.35rem', background: '#09090b', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
              >
                + Add First Address
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  style={{
                    background: '#ffffff',
                    border: addr.is_default ? '2px solid #09090b' : '1px solid #e4e4e7',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#09090b' }}>
                        {addr.full_name}
                      </div>
                      {addr.is_default && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '0.15rem 0.55rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                          <Check size={12} /> Default
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#3f3f46', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                      <p style={{ margin: 0 }}>{addr.address}</p>
                      {addr.area && <p style={{ margin: 0 }}>{addr.area}</p>}
                      {addr.landmark && <p style={{ margin: 0, color: '#71717a', fontSize: '0.8rem' }}>Landmark: {addr.landmark}</p>}
                      <p style={{ margin: '0.2rem 0 0', fontWeight: 500 }}>
                        {addr.city}{addr.district && addr.district !== addr.city ? `, ${addr.district}` : ''}, {addr.state} - {addr.pincode}
                      </p>
                      <p style={{ margin: '0.15rem 0 0', color: '#71717a', fontSize: '0.8rem' }}>India</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#475569', marginBottom: '1rem', borderTop: '1px solid #f4f4f5', paddingTop: '0.5rem' }}>
                      <Phone size={13} color="#64748b" />
                      <span>+91 {addr.phone}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f4f4f5', paddingTop: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div>
                      {!addr.is_default && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultAddress(addr)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#2563eb',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          Set as Default
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditAddress(addr)}
                        style={{
                          background: '#f4f4f5',
                          border: '1px solid #e4e4e7',
                          borderRadius: '5px',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.78rem',
                          fontWeight: 500,
                          color: '#18181b',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        disabled={deletingAddressId === addr.id}
                        onClick={() => handleDeleteAddress(addr.id)}
                        style={{
                          background: '#fff',
                          border: '1px solid #fee2e2',
                          borderRadius: '5px',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.78rem',
                          fontWeight: 500,
                          color: '#dc2626',
                          cursor: deletingAddressId === addr.id ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <Trash2 size={13} />
                        <span>{deletingAddressId === addr.id ? 'Deleting...' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 1: MY ORDERS */}
      {activeTab === 'orders' && (
        <div id="orders" style={{ scrollMarginTop: '80px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={20} />
              My Orders ({orders.length})
            </h2>
            <button
              type="button"
              onClick={fetchOrders}
              style={{
                background: 'none',
                border: '1px solid #e4e4e7',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.78rem',
                color: '#71717a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RefreshCw size={12} />
              <span>Refresh Orders</span>
            </button>
          </div>

          {/* Cancellation Feedback Banner */}
          {cancellationNotice && (
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <CheckCircle2 size={18} color="#059669" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem', color: '#065f46' }}>
                  <strong style={{ color: '#064e3b' }}>Order #{cancellationNotice.orderNumber} Cancelled.</strong> {cancellationNotice.message}
                  {cancellationNotice.refundNote && (
                    <div style={{ marginTop: '4px', fontSize: '0.8rem', color: '#047857' }}>
                      {cancellationNotice.refundNote}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancellationNotice(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669', padding: 0 }}
                title="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {loadingOrders ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#71717a', background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px' }}>
              <RotateCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem', color: '#09090b' }} />
              <div>Loading your verified AD(R)IZO orders...</div>
            </div>
          ) : orders.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', border: '1px dashed #d4d4d8', borderRadius: '10px', textAlign: 'center', background: '#fafafa' }}>
              <Package size={36} color="#a1a1aa" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#27272a', margin: '0 0 0.25rem' }}>No orders yet</h3>
              <p style={{ color: '#71717a', fontSize: '0.85rem', margin: '0 0 1rem' }}>
                Your order history will appear here once you make your first purchase.
              </p>
              <button
                type="button"
                onClick={() => router.push('/shop')}
                style={{ padding: '0.6rem 1.25rem', background: '#09090b', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {orders.map((order) => {
                const isPaid = order.payment_status === 'PAID' || order.paymentStatus === 'PAID';
                const isCancelled = order.order_status === 'CANCELLED' || order.orderStatus === 'CANCELLED' || order.tracking_status === 'CANCELLED' || order.trackingStatus === 'CANCELLED';
                const isDelivered = order.order_status === 'DELIVERED' || order.orderStatus === 'DELIVERED' || order.tracking_status === 'DELIVERED' || order.trackingStatus === 'DELIVERED';
                const orderNum = order.order_number || order.orderNumber || order.id?.substring(0, 8);
                const orderDate = new Date(order.created_at || order.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                const totalAmount = Number(order.total_amount || order.total || 0);
                const shippingCharge = Number(order.shipping_charge || 0);
                const codCharge = Number(order.cod_charge || (order.payment_method === 'COD' ? 99 : 0));
                const discountAmount = Number(order.discount_amount || order.discount || 0);
                const subtotalAmount = order.subtotal !== null && order.subtotal !== undefined
                  ? Number(order.subtotal)
                  : Math.max(0, totalAmount - shippingCharge - (order.payment_method === 'COD' ? codCharge : 0) + discountAmount);
                const items = order.order_items || order.items || [];
                const statusStyle = getHumanReadableStatus(order);
                const cancellable = isOrderEligibleForCancellation(order);
                const courier = order.delivery_partner || order.deliveryPartner;
                const awb = order.tracking_id || order.trackingId;
                const edd = order.etd || order.estimated_delivery_date || order.estimatedDeliveryDate;
                const cancelledAtStr = (order.cancelled_at || order.cancelledAt)
                  ? new Date(order.cancelled_at || order.cancelledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : null;
                const cancelReasonStr = order.cancellation_reason || order.cancellationReason;

                return (
                  <div
                    key={order.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e4e4e7',
                      borderRadius: '12px',
                      padding: '1.35rem',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    {/* Top Header Row: Order Number, Date, Total */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid #f4f4f5',
                        paddingBottom: '0.85rem',
                        marginBottom: '0.85rem',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#71717a', fontWeight: '600', letterSpacing: '0.04em' }}>
                          Order Number
                        </div>
                        <div style={{ fontWeight: '700', fontSize: '1rem', color: '#09090b', fontFamily: 'monospace' }}>
                          #{orderNum}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#71717a', fontWeight: '600', letterSpacing: '0.04em' }}>
                          Placed On
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#27272a', fontWeight: '500' }}>
                          {orderDate}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#71717a', fontWeight: '600', letterSpacing: '0.04em' }}>
                          Total Amount
                        </div>
                        <div style={{ fontWeight: '700', fontSize: '1.05rem', color: '#09090b' }}>
                          ₹{totalAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Status Badges Row */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Order Status Badge */}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.65rem',
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          border: `1px solid ${statusStyle.border}`,
                          borderRadius: '5px',
                          fontSize: '0.78rem',
                          fontWeight: '600',
                        }}
                      >
                        <Truck size={13} />
                        {statusStyle.label}
                      </span>

                      {/* Payment Status Badge */}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.65rem',
                          background: isPaid ? '#ecfdf5' : '#fffbeb',
                          color: isPaid ? '#065f46' : '#92400e',
                          border: `1px solid ${isPaid ? '#a7f3d0' : '#fde68a'}`,
                          borderRadius: '5px',
                          fontSize: '0.78rem',
                          fontWeight: '600',
                        }}
                      >
                        {isPaid ? <Check size={13} /> : <Clock size={13} />}
                        {order.payment_method === 'ONLINE_RAZORPAY' ? 'Prepaid (Razorpay)' : 'Cash on Delivery (COD)'}: {order.payment_status || order.paymentStatus || 'PENDING'}
                      </span>
                    </div>

                    {/* Products List with Thumbnails */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '0.85rem 0', borderTop: '1px solid #f4f4f5', borderBottom: '1px solid #f4f4f5' }}>
                      {items.map((item: any, idx: number) => {
                        const pName = item.product_name || item.productName || item.product?.name || 'ADRIZO Garment';
                        const pImage = item.product_image || item.productImage;
                        const pSize = item.size ? `Size: ${item.size}` : '';
                        const pColor = item.color ? `Color: ${item.color}` : '';
                        const qty = item.quantity || 1;
                        const price = Number(item.unit_price || item.unitPrice || item.price || 0);
                        const itemTotal = Number(item.total_price || item.totalPrice || (price * qty));

                        return (
                          <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.85rem', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                              {pImage ? (
                                <img
                                  src={pImage}
                                  alt={pName}
                                  style={{
                                    width: '46px',
                                    height: '46px',
                                    objectFit: 'cover',
                                    borderRadius: '6px',
                                    border: '1px solid #e4e4e7',
                                    flexShrink: 0,
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '6px',
                                    background: '#f4f4f5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    border: '1px solid #e4e4e7',
                                  }}
                                >
                                  <ShoppingBag size={20} color="#71717a" />
                                </div>
                              )}
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: '600', color: '#18181b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {pName}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#71717a', marginTop: '2px' }}>
                                  {[pSize, pColor, `Qty: ${qty}`].filter(Boolean).join(' • ')}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
                                  ₹{price.toFixed(2)} each
                                </div>
                              </div>
                            </div>
                            <div style={{ fontWeight: '600', color: '#09090b', flexShrink: 0 }}>
                              ₹{itemTotal.toFixed(2)}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Financial Breakdown */}
                    <div style={{ padding: '0.75rem 0', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: '#71717a' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Subtotal</span>
                        <span style={{ color: '#18181b', fontWeight: '500' }}>₹{subtotalAmount.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Shipping</span>
                        <span style={{ color: shippingCharge === 0 ? '#16a34a' : '#18181b', fontWeight: '500' }}>
                          {shippingCharge === 0 ? 'FREE' : `₹${shippingCharge.toFixed(2)}`}
                        </span>
                      </div>
                      {codCharge > 0 && order.payment_method === 'COD' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>COD Handling Fee</span>
                          <span style={{ color: '#18181b', fontWeight: '500' }}>₹{codCharge.toFixed(2)}</span>
                        </div>
                      )}
                      {discountAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                          <span>Promotional Discount</span>
                          <span style={{ fontWeight: '500' }}>-₹{discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.35rem', borderTop: '1px dashed #e4e4e7', fontSize: '0.88rem', fontWeight: '700', color: '#09090b' }}>
                        <span>Total Order Value</span>
                        <span>₹{totalAmount.toFixed(2)}</span>
                      </div>
                      {order.payment_method === 'COD' && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontSize: '0.8rem', fontWeight: '600' }}>
                            <span>COD Confirmation Paid (Online)</span>
                            <span>₹{codCharge.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309', fontSize: '0.85rem', fontWeight: '700' }}>
                            <span>Remaining Payable on Delivery</span>
                            <span>₹{Math.max(0, totalAmount - codCharge).toFixed(2)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Logistics & Tracking Row */}
                    {/* Logistics & Tracking Row */}
                    {!isCancelled && (
                      <div
                        style={{
                          background: (courier || awb) ? '#f8fafc' : '#fafafa',
                          border: `1px solid ${(courier || awb) ? '#e2e8f0' : '#e4e4e7'}`,
                          borderRadius: '8px',
                          padding: '0.75rem 1rem',
                          margin: '0.75rem 0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: (courier || awb) ? '#eff6ff' : '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Truck size={17} color={(courier || awb) ? '#2563eb' : '#71717a'} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                              Delivery Partner:{' '}
                              <strong style={{ color: '#0f172a' }}>
                                {courier || 'Pending courier allocation'}
                              </strong>
                            </div>
                            {awb ? (
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>
                                AWB: <strong style={{ color: '#09090b', fontFamily: 'monospace' }}>{awb}</strong>
                                {edd && <span style={{ marginLeft: '8px', color: '#059669', fontWeight: '500' }}>• Est. Delivery: {edd}</span>}
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '1px' }}>
                                Shipment is being prepared for dispatch
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleTrackShipment(order)}
                          style={{
                            background: '#09090b',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.45rem 0.95rem',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <Navigation size={13} />
                          <span>Track Order</span>
                        </button>
                      </div>
                    )}

                    {/* Cancelled Banner */}
                    {isCancelled && (
                      <div
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fee2e2',
                          borderRadius: '8px',
                          padding: '0.85rem 1rem',
                          margin: '0.75rem 0 0.25rem',
                          fontSize: '0.8rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#991b1b', fontWeight: '600' }}>
                          <XCircle size={16} />
                          <span>Order Cancelled{cancelledAtStr ? ` on ${cancelledAtStr}` : ''}</span>
                        </div>
                        {cancelReasonStr && (
                          <div style={{ marginTop: '4px', color: '#b91c1c', fontSize: '0.76rem' }}>
                            Reason: <span style={{ fontStyle: 'italic' }}>{cancelReasonStr}</span>
                          </div>
                        )}
                        {isPaid && (
                          <div style={{ marginTop: '6px', padding: '6px 8px', background: 'rgba(255, 255, 255, 0.8)', borderRadius: '4px', color: '#7f1d1d', fontSize: '0.74rem', border: '1px solid #fecaca' }}>
                            Prepaid refund will be processed to your original payment method within 5–7 business days per the AD(R)IZO Refund Policy.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Delivered Notice */}
                    {isDelivered && (
                      <div
                        style={{
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '8px',
                          padding: '0.75rem 1rem',
                          margin: '0.75rem 0 0.25rem',
                          fontSize: '0.8rem',
                          color: '#166534',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <CheckCircle2 size={16} color="#15803d" />
                          <span>Delivered successfully to your delivery address.</span>
                        </div>
                        {awb && (
                          <button
                            type="button"
                            onClick={() => handleTrackShipment(order)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#15803d',
                              textDecoration: 'underline',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            View Delivery History
                          </button>
                        )}
                      </div>
                    )}

                    {/* Actions Row: Cancel Order */}
                    {cancellable && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid #f4f4f5' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenCancelModal(order)}
                          style={{
                            background: '#ffffff',
                            color: '#dc2626',
                            border: '1px solid #fca5a5',
                            borderRadius: '6px',
                            padding: '0.45rem 0.95rem',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#fef2f2';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ffffff';
                          }}
                        >
                          <X size={13} />
                          <span>Cancel Order</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Saved Address Modal */}
      {mounted && isAddressModalOpen && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '1rem',
          }}
          onClick={() => !savingAddressItem && setIsAddressModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              padding: '1.75rem',
              position: 'relative',
              zIndex: 100001,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={18} color="#059669" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                    {editingAddress ? 'Edit Delivery Address' : 'Add New Delivery Address'}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Saved addresses will be available during one-click checkout
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={savingAddressItem}
                onClick={() => setIsAddressModalOpen(false)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: savingAddressItem ? 'not-allowed' : 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {addressItemError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem 0.9rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertCircle size={16} />
                <span>{addressItemError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAddressModal} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Recipient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={addressForm.full_name}
                    onChange={(e) => setAddressForm({ ...addressForm, full_name: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    10-Digit Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value.replace(/\D/g, '') })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  House / Flat / Building / Street Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flat 402, Sunshine Heights, Main Road"
                  value={addressForm.address}
                  onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Area / Sector / Colony
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sector 62"
                    value={addressForm.area}
                    onChange={(e) => setAddressForm({ ...addressForm, area: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Near City Hospital"
                    value={addressForm.landmark}
                    onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Noida"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>State *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Uttar Pradesh"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>PIN Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="6 digits"
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value.replace(/\D/g, '') })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '0.25rem' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#1e293b', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={addressForm.is_default}
                    onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>Make this my default delivery address</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                <button
                  type="button"
                  disabled={savingAddressItem}
                  onClick={() => setIsAddressModalOpen(false)}
                  style={{
                    padding: '0.55rem 1.15rem',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: savingAddressItem ? 'not-allowed' : 'pointer',
                    color: '#475569',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAddressItem}
                  style={{
                    padding: '0.55rem 1.35rem',
                    background: savingAddressItem ? '#64748b' : '#09090b',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: savingAddressItem ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  {savingAddressItem ? (
                    <>
                      <RotateCw size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Address</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
      {/* Shipment Tracking Modal */}
      {mounted && trackingModalOpen && createPortal(
        <div
          id="tracking-order-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '1rem',
          }}
          onClick={() => setTrackingModalOpen(false)}
        >
          <div
            id="tracking-order-modal-card"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '640px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              padding: 'clamp(1rem, 4vw, 1.75rem)',
              position: 'relative',
              zIndex: 100001,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={20} color="#059669" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                    Shipment Live Tracking
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                    Order #{activeTrackingOrder?.order_number || activeTrackingOrder?.orderNumber || activeTrackingOrder?.id}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTrackingModalOpen(false)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            {trackingLoading ? (
              <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
                <RotateCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem', color: '#059669' }} />
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>Connecting to Live Tracking...</div>
                <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Fetching real-time updates from courier network</div>
              </div>
            ) : customerTrackingData?.success ? (
              (() => {
                const currentStatus = customerTrackingData.currentStatus || customerTrackingData.tracking?.currentStatus || customerTrackingData.tracking?.status || 'Shipment is being prepared';
                const awb = customerTrackingData.trackingId || customerTrackingData.tracking?.awbCode || activeTrackingOrder?.tracking_id || activeTrackingOrder?.trackingId;
                const courier = customerTrackingData.deliveryPartner || customerTrackingData.tracking?.courierName || activeTrackingOrder?.delivery_partner || activeTrackingOrder?.deliveryPartner;
                const edd = customerTrackingData.etd || customerTrackingData.tracking?.edd || activeTrackingOrder?.etd || activeTrackingOrder?.estimated_delivery_date;
                const hasAwb = !!awb;
                const activities = customerTrackingData.activities || customerTrackingData.tracking?.activities || [];

                return (
                  <div>
                    {/* Highlights Card */}
                    <div
                      style={{
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                        borderRadius: '10px',
                        padding: '1.25rem',
                        color: '#fff',
                        marginBottom: '1.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
                            Current Status
                          </div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px', color: '#4ade80' }}>
                            {currentStatus}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={handleRefreshTracking}
                            disabled={trackingRefreshing}
                            style={{
                              background: 'rgba(255, 255, 255, 0.12)',
                              border: '1px solid rgba(255, 255, 255, 0.22)',
                              borderRadius: '6px',
                              color: '#ffffff',
                              padding: '4px 10px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: trackingRefreshing ? 'default' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <RotateCw size={12} className={trackingRefreshing ? 'animate-spin' : ''} />
                            <span>{trackingRefreshing ? 'Refreshing...' : 'Refresh Tracking'}</span>
                          </button>
                          {lastTrackedTime && (
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                              Updated {lastTrackedTime}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '0.75rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                        <div>
                          <span style={{ color: '#94a3b8' }}>Courier: </span>
                          <strong style={{ color: '#fff' }}>{courier || (hasAwb ? 'Courier Partner' : 'Pending Allocation')}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8' }}>AWB / Tracking #: </span>
                          {hasAwb ? (
                            <strong style={{ color: '#fef08a', fontFamily: 'monospace', letterSpacing: '0.03em' }}>{awb}</strong>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Pending AWB assignment</span>
                          )}
                        </div>
                        {edd && (
                          <div>
                            <span style={{ color: '#94a3b8' }}>Est. Delivery: </span>
                            <strong style={{ color: '#4ade80' }}>{edd}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Information Banner if AWB is not yet assigned */}
                    {!hasAwb && (
                      <div
                        style={{
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '8px',
                          padding: '0.85rem 1rem',
                          marginBottom: '1.5rem',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.65rem',
                        }}
                      >
                        <AlertCircle size={18} color="#16a34a" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div style={{ fontSize: '0.82rem', color: '#166534', lineHeight: 1.45 }}>
                          <strong style={{ display: 'block', marginBottom: '2px', color: '#15803d' }}>Shipment is being prepared</strong>
                          Your order has been confirmed and registered for shipment. Live courier tracking will become available once a courier partner and AWB are assigned.
                        </div>
                      </div>
                    )}

                    {/* 6-Milestone Progress Timeline */}
                    {(() => {
                      const st = currentStatus.toLowerCase();
                      const isCancelled = st.includes('cancel');
                      const isDelivered = st.includes('deliver') && !st.includes('out for');
                      const isOFD = st.includes('out for delivery') || isDelivered;
                      const isInTransit = st.includes('transit') || st.includes('shipped') || isOFD;
                      const isPickedUp = st.includes('pickup') || st.includes('picked') || isInTransit;
                      const isPacked = st.includes('pack') || st.includes('awb') || st.includes('label') || st.includes('manifest') || isPickedUp;

                      let activeIndex = 0;
                      if (!hasAwb) {
                        activeIndex = 0; // Order Confirmed
                      } else if (isDelivered) activeIndex = 5;
                      else if (isOFD) activeIndex = 4;
                      else if (isInTransit) activeIndex = 3;
                      else if (isPickedUp) activeIndex = 2;
                      else if (isPacked) activeIndex = 1;
                      else activeIndex = 0;

                      const milestones = [
                        { label: 'Order Confirmed' },
                        { label: 'Packed' },
                        { label: 'Picked Up' },
                        { label: 'In Transit' },
                        { label: 'Out for Delivery' },
                        { label: 'Delivered' },
                      ];

                      return (
                        <div style={{ marginBottom: '1.5rem', padding: '1.25rem 1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', marginBottom: '1rem' }}>
                            Shipment Progress
                          </div>

                          {isCancelled ? (
                            <div style={{ padding: '0.85rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <XCircle size={18} />
                              <span>This shipment has been cancelled in the courier network.</span>
                            </div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.35rem', textAlign: 'center' }}>
                              {milestones.map((m, idx) => {
                                const isDone = idx < activeIndex;
                                const isActive = idx === activeIndex;

                                return (
                                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div
                                      style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        background: isDone ? '#16a34a' : isActive ? '#059669' : '#e2e8f0',
                                        color: isDone || isActive ? '#ffffff' : '#64748b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        marginBottom: '6px',
                                        boxShadow: isActive ? '0 0 0 3px rgba(255, 200, 0, 0.45), 0 2px 4px rgba(0, 0, 0, 0.08)' : 'none',
                                        border: isActive ? '1.5px solid #FFC800' : isDone ? '1.5px solid #16a34a' : '1.5px solid transparent',
                                        transition: 'all 0.15s ease',
                                      }}
                                    >
                                      {isDone ? '✓' : idx + 1}
                                    </div>
                                    <span
                                      style={{
                                        fontSize: '0.68rem',
                                        fontWeight: isActive ? 700 : isDone ? 600 : 500,
                                        color: isActive ? '#065f46' : isDone ? '#15803d' : '#94a3b8',
                                        lineHeight: 1.25,
                                      }}
                                    >
                                      {m.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Scan History Activities */}
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
                        Activity History
                      </div>
                      {activities.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: '2px solid #e2e8f0', marginLeft: '0.5rem', paddingLeft: '1rem' }}>
                          {activities.map((act: any, aIdx: number) => (
                            <div key={aIdx} style={{ position: 'relative' }}>
                              <div
                                style={{
                                  position: 'absolute',
                                  left: '-1.35rem',
                                  top: '4px',
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  background: aIdx === 0 ? '#16a34a' : '#94a3b8',
                                  boxShadow: aIdx === 0 ? '0 0 0 3px rgba(255, 200, 0, 0.35)' : 'none',
                                }}
                              />
                              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>
                                {act.activity || act['sr-status-label'] || 'Status update'}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                {[act.location, act.date].filter(Boolean).join(' • ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '6px', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
                          Package is currently in processing. Scan checkpoints will appear as the courier moves the shipment.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fee2e2' }}>
                <AlertCircle size={24} color="#dc2626" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#991b1b' }}>
                  {customerTrackingData?.error || 'Tracking details currently unavailable.'}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#7f1d1d', marginTop: '4px' }}>
                  Please try again in a few moments or contact our customer support team.
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setTrackingModalOpen(false)}
                style={{
                  background: '#09090b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 18px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Customer Cancellation Confirmation Modal */}
      {mounted && isCancelModalOpen && cancellingOrder && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '1rem',
          }}
          onClick={() => !cancelSubmitting && setIsCancelModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              padding: 'clamp(1rem, 4vw, 1.75rem)',
              position: 'relative',
              zIndex: 100001,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={20} color="#dc2626" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                    Cancel Order
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    #{cancellingOrder.order_number || cancellingOrder.orderNumber || cancellingOrder.id?.substring(0, 8)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={cancelSubmitting}
                onClick={() => setIsCancelModalOpen(false)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: cancelSubmitting ? 'not-allowed' : 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Order Summary */}
            <div style={{ background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#64748b' }}>Order Total:</span>
                <strong style={{ color: '#09090b' }}>₹{Number(cancellingOrder.total_amount || cancellingOrder.total || 0).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#64748b' }}>Payment:</span>
                <span style={{ color: '#09090b' }}>
                  {cancellingOrder.payment_method === 'ONLINE_RAZORPAY' ? 'Prepaid (Razorpay)' : 'Cash on Delivery (COD)'} ({cancellingOrder.payment_status || cancellingOrder.paymentStatus || 'PENDING'})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Items:</span>
                <span style={{ color: '#09090b' }}>{(cancellingOrder.order_items || cancellingOrder.items || []).length} item(s)</span>
              </div>
            </div>

            {/* Warning Box */}
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.75rem 0.9rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#92400e' }}>
              <strong>Warning:</strong> Are you sure you want to cancel this order? This action cannot be undone. Reserved inventory will be immediately released.
            </div>

            {/* Reason selector */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.35rem' }}>
                Reason for cancellation:
              </label>
              <select
                value={cancelReason}
                disabled={cancelSubmitting}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  background: '#ffffff',
                  color: '#111827',
                }}
              >
                <option value="Changed my mind">Changed my mind</option>
                <option value="Ordered by mistake">Ordered by mistake</option>
                <option value="Found a better price">Found a better price</option>
                <option value="Delivery is taking too long">Delivery is taking too long</option>
                <option value="Payment issue">Payment issue</option>
                <option value="Other">Other</option>
              </select>

              {cancelReason === 'Other' && (
                <textarea
                  value={cancelCustomReason}
                  disabled={cancelSubmitting}
                  onChange={(e) => setCancelCustomReason(e.target.value)}
                  placeholder="Please specify your reason..."
                  maxLength={200}
                  rows={2}
                  style={{
                    width: '100%',
                    marginTop: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    resize: 'vertical',
                  }}
                />
              )}
            </div>

            {/* Refund Policy Note for Prepaid Orders */}
            {(cancellingOrder.payment_status === 'PAID' || cancellingOrder.paymentStatus === 'PAID') && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem 0.9rem', marginBottom: '1.25rem', fontSize: '0.78rem', color: '#166534' }}>
                <strong>Refund Note:</strong> For this prepaid order, your payment will be refunded to your original payment method within 5–7 business days according to the AD(R)IZO Refund Policy.
              </div>
            )}

            {/* Error Message */}
            {cancelError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem 0.9rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertCircle size={16} />
                <span>{cancelError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={cancelSubmitting}
                onClick={() => setIsCancelModalOpen(false)}
                style={{
                  padding: '0.55rem 1.15rem',
                  background: '#ffffff',
                  border: '1px solid #e4e4e7',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  cursor: cancelSubmitting ? 'not-allowed' : 'pointer',
                  color: '#3f3f46',
                }}
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={cancelSubmitting}
                onClick={handleConfirmCancelOrder}
                style={{
                  padding: '0.55rem 1.15rem',
                  background: cancelSubmitting ? '#f87171' : '#dc2626',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  color: '#ffffff',
                  cursor: cancelSubmitting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                {cancelSubmitting ? (
                  <>
                    <RotateCw size={14} className="animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Yes, Cancel Order</span>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function Account() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
        Loading ADRIZO Account...
      </div>
    }>
      <AccountContent />
    </Suspense>
  );
}
