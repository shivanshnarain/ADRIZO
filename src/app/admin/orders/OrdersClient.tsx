"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Eye, 
  Check, 
  Search, 
  ArrowLeft, 
  Package, 
  User, 
  MapPin, 
  CreditCard, 
  Truck, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck,
  Copy,
  FileText,
  Settings,
  RotateCw,
  Printer,
  Mail,
  XCircle,
  AlertCircle,
  X,
  ExternalLink,
  MessageSquare,
  Trash2,
  AlertTriangle,
  Navigation,
  FileDown,
  CheckCircle2,
  Clock,
  Gift
} from 'lucide-react';
import styles from '../admin.module.css';
import { 
  updateOrderStatus, 
  deleteOrder, 
  createShiprocketShipmentAction, 
  checkOrderServiceabilityAction,
  assignAwbAction,
  generateLabelAction,
  generateInvoiceAction,
  requestPickupAction,
  generateManifestAction,
  trackOrderAction,
  syncTrackingAction
} from '../../../actions/orders';

export default function OrdersClient({ initialOrders }: { initialOrders: any[] }) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);

  // Synchronize state when server component revalidates
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [successToast, setSuccessToast] = useState('');

  // Modals state
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactSuccess, setContactSuccess] = useState('');

  // Delete Order state
  const [orderToDelete, setOrderToDelete] = useState<any | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Editable fields for fulfillment
  const [editOrderStatus, setEditOrderStatus] = useState('PLACED');
  const [editPaymentStatus, setEditPaymentStatus] = useState('PENDING');
  const [editDeliveryPartner, setEditDeliveryPartner] = useState('');
  const [editTrackingId, setEditTrackingId] = useState('');
  const [editTrackingStatus, setEditTrackingStatus] = useState('ORDER_RECEIVED');

  // Shiprocket Logistics State
  const [shiprocketLoading, setShiprocketLoading] = useState(false);
  const [shiprocketError, setShiprocketError] = useState('');
  const [serviceabilityLoading, setServiceabilityLoading] = useState(false);
  const [availableCouriers, setAvailableCouriers] = useState<any[] | null>(null);
  const [serviceabilityError, setServiceabilityError] = useState('');

  // Phase 3 Fulfillment states
  const [selectedCourier, setSelectedCourier] = useState<any | null>(null);
  const [assigningAwb, setAssigningAwb] = useState(false);
  const [generatingLabel, setGeneratingLabel] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [requestingPickup, setRequestingPickup] = useState(false);
  const [generatingManifest, setGeneratingManifest] = useState(false);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<any | null>(null);
  const [syncingTracking, setSyncingTracking] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard`);
    }
  };

  const parseShippingAddress = (order: any) => {
    if (order.houseFlat || order.areaStreet) {
      return {
        houseFlat: order.houseFlat || '—',
        areaStreet: order.areaStreet || '—',
        landmark: order.landmark || '—',
        city: order.city || '—',
        state: order.state || '—',
        pincode: order.pincode || '—',
      };
    }

    const raw = order.shippingAddress || '';
    const parts = raw.split(',').map((s: string) => s.trim()).filter(Boolean);

    const houseFlat = parts[0] || '—';
    const areaStreet = parts[1] || '—';
    const landmark = parts.find((p: string) => p.toLowerCase().startsWith('near') || p.toLowerCase().startsWith('landmark')) || order.landmark || '—';

    return {
      houseFlat,
      areaStreet,
      landmark: landmark ? landmark.replace(/^(near|landmark:?)\s*/i, '') : '—',
      city: order.city || (parts.length >= 3 ? parts[parts.length - 3] : '—'),
      state: order.state || (parts.length >= 2 ? parts[parts.length - 2] : '—'),
      pincode: order.pincode || '—',
    };
  };

  const handleCancelOrder = async () => {
    if (!viewingOrder) return;
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel order #${viewingOrder.orderNumber || viewingOrder.id.slice(0, 8).toUpperCase()}?\nThis will mark the order as CANCELLED in Supabase.`
    );
    if (!confirmCancel) return;

    setLoading(true);
    const res = await updateOrderStatus(
      viewingOrder.id,
      'CANCELLED',
      viewingOrder.paymentStatus,
      viewingOrder.deliveryPartner,
      viewingOrder.trackingId,
      viewingOrder.trackingStatus
    );
    setLoading(false);

    if (res.success) {
      const updatedOrder = {
        ...viewingOrder,
        orderStatus: 'CANCELLED',
        updatedAt: new Date().toISOString(),
      };
      setOrders(orders.map(o => o.id === viewingOrder.id ? updatedOrder : o));
      setViewingOrder(updatedOrder);
      setEditOrderStatus('CANCELLED');
      showToast('Order marked as CANCELLED successfully');
    } else {
      showToast(res.error || 'Failed to cancel order');
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete || deleteLoading) return;
    setDeleteLoading(true);
    try {
      const targetId = orderToDelete.id || orderToDelete.orderNumber;
      const res = await deleteOrder(targetId);
      setDeleteLoading(false);
      if (res.success) {
        setOrders(prev => prev.filter(o => o.id !== orderToDelete.id && o.orderNumber !== orderToDelete.orderNumber));
        if (viewingOrder && (viewingOrder.id === orderToDelete.id || viewingOrder.orderNumber === orderToDelete.orderNumber)) {
          setViewingOrder(null);
        }
        setIsDeleteModalOpen(false);
        const deletedNum = res.orderNumber || orderToDelete.orderNumber || (orderToDelete.id ? orderToDelete.id.slice(0, 8).toUpperCase() : '');
        setOrderToDelete(null);
        showToast(res.message || `Order #${deletedNum} permanently deleted.`);
        router.refresh();
      } else {
        setIsDeleteModalOpen(false);
        setOrderToDelete(null);
        showToast(res.error || 'Unable to delete this order. No data was removed.');
      }
    } catch (err: any) {
      setDeleteLoading(false);
      setIsDeleteModalOpen(false);
      setOrderToDelete(null);
      showToast('Unable to delete this order. No data was removed.');
    }
  };

  const handleSendInvoice = async (channel: 'EMAIL' | 'WHATSAPP') => {
    if (!viewingOrder || contactLoading) return;
    setContactLoading(true);
    setContactError('');
    setContactSuccess('');
    try {
      const orderParam = encodeURIComponent(viewingOrder.orderNumber || viewingOrder.id);
      const res = await fetch(`/api/orders/${orderParam}/send-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel })
      });
      const data = await res.json();
      setContactLoading(false);

      if (data.success) {
        setContactSuccess(data.message || 'Invoice Sent Successfully');
        showToast(data.message || `Invoice sent via ${channel}`);
        if (data.whatsappDirectUrl) {
          window.open(data.whatsappDirectUrl, '_blank');
        }
        setTimeout(() => {
          setIsContactModalOpen(false);
          setContactSuccess('');
        }, 1800);
      } else {
        setContactError(data.error || 'Failed to send invoice. Please try again.');
      }
    } catch (err: any) {
      setContactLoading(false);
      setContactError(err.message || 'Unable to communicate with invoice dispatch service.');
    }
  };

  const handleSaveStatusModal = async () => {
    if (!viewingOrder) return;
    setLoading(true);
    const res = await updateOrderStatus(
      viewingOrder.id,
      editOrderStatus,
      editPaymentStatus,
      editDeliveryPartner,
      editTrackingId,
      editTrackingStatus
    );
    setLoading(false);

    if (res.success) {
      const updatedOrder = {
        ...viewingOrder,
        orderStatus: editOrderStatus,
        paymentStatus: editPaymentStatus,
        deliveryPartner: editDeliveryPartner,
        trackingId: editTrackingId,
        trackingStatus: editTrackingStatus,
        updatedAt: new Date().toISOString(),
      };
      setOrders(orders.map(o => o.id === viewingOrder.id ? updatedOrder : o));
      setViewingOrder(updatedOrder);
      setIsUpdateModalOpen(false);
      showToast('Order status updated in Supabase');
    } else {
      alert(res.error || 'Failed to update order status');
    }
  };

  const handleOpenOrder = (order: any) => {
    setViewingOrder(order);
    setEditOrderStatus(order.orderStatus || 'PLACED');
    setEditPaymentStatus(order.paymentStatus || 'PENDING');
    setEditDeliveryPartner(order.deliveryPartner || '');
    setEditTrackingId(order.trackingId || '');
    setEditTrackingStatus(order.trackingStatus || 'ORDER_RECEIVED');
    setShiprocketError('');
    setServiceabilityError('');
    setAvailableCouriers(null);
    setSelectedCourier(null);
    setTrackingData(null);
  };

  const handleSaveFulfillment = async () => {
    if (!viewingOrder) return;
    setLoading(true);
    const res = await updateOrderStatus(
      viewingOrder.id,
      editOrderStatus,
      editPaymentStatus,
      editDeliveryPartner,
      editTrackingId,
      editTrackingStatus
    );
    setLoading(false);
    
    if (res.success) {
      const updatedOrder = {
        ...viewingOrder,
        orderStatus: editOrderStatus,
        paymentStatus: editPaymentStatus,
        deliveryPartner: editDeliveryPartner,
        trackingId: editTrackingId,
        trackingStatus: editTrackingStatus,
        updatedAt: new Date().toISOString(),
      };
      setOrders(orders.map(o => o.id === viewingOrder.id ? updatedOrder : o));
      setViewingOrder(updatedOrder);
      showToast('Order fulfillment and tracking updated in Supabase');
    } else {
      alert(res.error || 'Failed to update order status');
    }
  };

  const handleCreateShiprocketOrder = async () => {
    if (!viewingOrder) return;
    setShiprocketLoading(true);
    setShiprocketError('');
    try {
      const res = await createShiprocketShipmentAction(viewingOrder.id);
      if (res.success) {
        const updatedOrder = {
          ...viewingOrder,
          shiprocketOrderId: String(res.orderId),
          shiprocketShipmentId: String(res.shipmentId),
          shiprocketStatus: res.status || 'NEW',
          shiprocketSyncedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setOrders(orders.map(o => o.id === viewingOrder.id ? updatedOrder : o));
        setViewingOrder(updatedOrder);
        showToast(res.alreadySynced ? 'Order is already synced with Shiprocket' : 'Shiprocket order & shipment created successfully!');
      } else {
        setShiprocketError(res.error || 'Failed to create Shiprocket order');
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setShiprocketError(e.message || 'An unexpected error occurred');
    } finally {
      setShiprocketLoading(false);
    }
  };

  const handleCheckServiceability = async () => {
    if (!viewingOrder) return;
    setServiceabilityLoading(true);
    setServiceabilityError('');
    try {
      const res = await checkOrderServiceabilityAction(viewingOrder.id);
      if (res.success && res.availableCouriers) {
        setAvailableCouriers(res.availableCouriers);
      } else {
        setServiceabilityError(res.error || 'No serviceable couriers found for this PIN code');
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setServiceabilityError(e.message || 'Failed to check courier serviceability');
    } finally {
      setServiceabilityLoading(false);
    }
  };

  const handleSelectCourier = (c: any) => {
    setSelectedCourier(c);
  };

  const handleConfirmAssignAwb = async () => {
    if (!viewingOrder || !selectedCourier) return;
    setAssigningAwb(true);
    setShiprocketError('');
    try {
      const res = await assignAwbAction(
        viewingOrder.id,
        selectedCourier.courierCompanyId,
        selectedCourier.courierName
      );
      if (res.success && res.awbCode) {
        const updatedOrder = {
          ...viewingOrder,
          trackingId: res.awbCode,
          deliveryPartner: res.courierName,
          courierCompanyId: String(res.courierCompanyId),
          shiprocketStatus: 'AWB_ASSIGNED',
          trackingStatus: 'PACKED',
          shiprocketSyncedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setOrders(orders.map(o => o.id === viewingOrder.id ? updatedOrder : o));
        setViewingOrder(updatedOrder);
        setEditTrackingId(res.awbCode);
        setEditDeliveryPartner(res.courierName);
        setEditTrackingStatus('PACKED');
        setSelectedCourier(null);
        showToast(`AWB ${res.awbCode} assigned with ${res.courierName}!`);
      } else {
        setShiprocketError(res.error || 'Failed to assign AWB');
      }
    } catch (err: any) {
      setShiprocketError(err.message || 'AWB assignment failed');
    } finally {
      setAssigningAwb(false);
    }
  };

  const handleGenerateLabel = async (force = false) => {
    if (!viewingOrder) return;
    setGeneratingLabel(true);
    setShiprocketError('');
    try {
      const res = await generateLabelAction(viewingOrder.id, force);
      if (res.success && res.labelUrl) {
        const updatedOrder = {
          ...viewingOrder,
          labelUrl: res.labelUrl,
          shiprocketSyncedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setOrders(orders.map(o => o.id === viewingOrder.id ? updatedOrder : o));
        setViewingOrder(updatedOrder);
        showToast('Shipping label generated successfully!');
        window.open(res.labelUrl, '_blank');
      } else {
        setShiprocketError(res.error || 'Failed to generate shipping label');
      }
    } catch (err: any) {
      setShiprocketError(err.message || 'Shipping label generation failed');
    } finally {
      setGeneratingLabel(false);
    }
  };

  const handleGenerateInvoice = async (force = false) => {
    if (!viewingOrder) return;
    setGeneratingInvoice(true);
    setShiprocketError('');
    try {
      const res = await generateInvoiceAction(viewingOrder.id, force);
      if (res.success && res.invoiceUrl) {
        const updatedOrder = {
          ...viewingOrder,
          invoiceUrl: res.invoiceUrl,
          shiprocketSyncedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setOrders(orders.map(o => o.id === viewingOrder.id ? updatedOrder : o));
        setViewingOrder(updatedOrder);
        showToast('Shipping invoice generated successfully!');
        window.open(res.invoiceUrl, '_blank');
      } else {
        setShiprocketError(res.error || 'Failed to generate shipping invoice');
      }
    } catch (err: any) {
      setShiprocketError(err.message || 'Shipping invoice generation failed');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleRequestPickup = async () => {
    if (!viewingOrder) return;
    setRequestingPickup(true);
    setShiprocketError('');
    try {
      const res = await requestPickupAction(viewingOrder.id);
      if (res.success && res.pickupId) {
        const updatedOrder = {
          ...viewingOrder,
          pickupId: String(res.pickupId),
          shiprocketStatus: 'PICKUP_SCHEDULED',
          trackingStatus: 'PACKED',
          shiprocketSyncedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setOrders(orders.map(o => o.id === viewingOrder.id ? updatedOrder : o));
        setViewingOrder(updatedOrder);
        showToast(`Pickup requested successfully (ID: ${res.pickupId})!`);
      } else {
        setShiprocketError(res.error || 'Failed to request courier pickup');
      }
    } catch (err: any) {
      setShiprocketError(err.message || 'Pickup scheduling failed');
    } finally {
      setRequestingPickup(false);
    }
  };

  const handleGenerateManifest = async () => {
    if (!viewingOrder) return;
    setGeneratingManifest(true);
    setShiprocketError('');
    try {
      const res = await generateManifestAction(viewingOrder.id);
      if (res.success && res.manifestUrl) {
        const updatedOrder = {
          ...viewingOrder,
          manifestUrl: res.manifestUrl,
          shiprocketSyncedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setOrders(orders.map(o => o.id === viewingOrder.id ? updatedOrder : o));
        setViewingOrder(updatedOrder);
        showToast('Manifest generated successfully!');
        window.open(res.manifestUrl, '_blank');
      } else {
        setShiprocketError(res.error || 'Failed to generate manifest');
      }
    } catch (err: any) {
      setShiprocketError(err.message || 'Manifest generation failed');
    } finally {
      setGeneratingManifest(false);
    }
  };

  const handleOpenTrackingModal = async () => {
    if (!viewingOrder?.trackingId) {
      showToast('Order does not have an AWB assigned yet');
      return;
    }
    setTrackingModalOpen(true);
    setTrackingLoading(true);
    try {
      const res = await trackOrderAction(viewingOrder.trackingId);
      setTrackingData(res);
    } catch (err: any) {
      setTrackingData({
        success: false,
        error: err.message || 'Failed to retrieve tracking data',
      });
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleSyncTracking = async () => {
    if (!viewingOrder?.trackingId) return;
    setSyncingTracking(true);
    try {
      const res = await syncTrackingAction(viewingOrder.id);
      if (res.success && 'trackingStatus' in res) {
        const updatedOrder = {
          ...viewingOrder,
          trackingStatus: res.trackingStatus || viewingOrder.trackingStatus,
          shiprocketStatus: res.trackingStatus || viewingOrder.shiprocketStatus,
          shiprocketSyncedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setOrders(orders.map(o => o.id === viewingOrder.id ? updatedOrder : o));
        setViewingOrder(updatedOrder);
        setEditTrackingStatus(res.trackingStatus || viewingOrder.trackingStatus);
        showToast(res.message || 'Tracking synchronized with Shiprocket');
      } else {
        const msg = ('message' in res && res.message) || ('error' in res && res.error) || 'Tracking check completed';
        showToast(msg);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to sync tracking');
    } finally {
      setSyncingTracking(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = (o.id || '').toLowerCase().includes(q);
        const matchesNumber = (o.orderNumber || '').toLowerCase().includes(q);
        const matchesName = (o.customerName || '').toLowerCase().includes(q);
        const matchesEmail = (o.customerEmail || '').toLowerCase().includes(q);
        const matchesPhone = (o.customerPhone || '').toLowerCase().includes(q);
        const matchesTracking = (o.trackingId || '').toLowerCase().includes(q);
        if (!matchesId && !matchesNumber && !matchesName && !matchesEmail && !matchesPhone && !matchesTracking) return false;
      }
      if (statusFilter !== 'ALL' && o.orderStatus !== statusFilter) return false;
      if (paymentFilter !== 'ALL' && o.paymentStatus !== paymentFilter) return false;
      return true;
    });
  }, [orders, searchQuery, statusFilter, paymentFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  return (
    <div>
      {/* Toast Notification */}
      {successToast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#09090b',
          color: '#FFC800',
          padding: '0.85rem 1.25rem',
          borderRadius: '8px',
          border: '1px solid #FFC800',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: 700,
          fontSize: '0.875rem',
          zIndex: 999999
        }}>
          <Check size={18} />
          <span>{successToast}</span>
        </div>
      )}

      {!viewingOrder && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className={styles.pageTitle} style={{ margin: 0 }}>All Orders</h1>
            <p style={{ fontSize: '0.8125rem', color: '#71717a', margin: '4px 0 0 0' }}>
              Single Source of Truth: Supabase orders, live payment records, items snapshot, and fulfillment tracking.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#f4f4f5', padding: '0.35rem 0.65rem', borderRadius: '4px', color: '#52525b' }}>
              Total Orders: {orders.length}
            </span>
          </div>
        </div>
      )}
      
      {viewingOrder ? (
        /* Order Details View — Matches Reference Screenshot */
        <div>
          {/* Breadcrumb Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.65rem' }}>
            <button 
              type="button" 
              onClick={() => setViewingOrder(null)} 
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, fontSize: '0.8125rem' }}
            >
              All Orders
            </button>
            <span>&gt;</span>
            <span style={{ color: '#09090b', fontWeight: 600 }}>Order Details</span>
          </div>

          {/* Page Heading & Back Action */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#09090b', margin: 0, letterSpacing: '-0.02em' }}>
                Order Details
              </h1>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '4px 0 0 0' }}>
                View complete information about this order including customer details, delivery address, payment status, and fulfillment tracking.
              </p>
            </div>
            <button 
              type="button" 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.45rem', 
                padding: '0.5rem 1rem', 
                background: '#fff', 
                border: '1px solid #d4d4d8', 
                borderRadius: '8px', 
                fontSize: '0.8125rem', 
                fontWeight: 700, 
                color: '#09090b', 
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
              onClick={() => setViewingOrder(null)}
            >
              <ArrowLeft size={15} />
              <span>Back to Orders</span>
            </button>
          </div>

          {/* Order Header Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e4e4e7',
            padding: '1.15rem 1.35rem',
            marginBottom: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: '#09090b',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <FileText size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#09090b', margin: 0, letterSpacing: '-0.01em' }}>
                    {viewingOrder.orderNumber ? `#${viewingOrder.orderNumber}` : `#${viewingOrder.id.slice(0, 8).toUpperCase()}`}
                  </h2>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(viewingOrder.orderNumber || viewingOrder.id, 'Order Number')}
                    title="Copy Order Number"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', padding: '2px', display: 'inline-flex', alignItems: 'center' }}
                  >
                    <Copy size={15} />
                  </button>

                  {/* Status Badges */}
                  <span style={{
                    padding: '0.2rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.725rem',
                    fontWeight: 800,
                    background: viewingOrder.orderStatus === 'DELIVERED' ? '#f0fdf4' : viewingOrder.orderStatus === 'CANCELLED' ? '#fef2f2' : '#fdf2f2',
                    color: viewingOrder.orderStatus === 'DELIVERED' ? '#166534' : viewingOrder.orderStatus === 'CANCELLED' ? '#991b1b' : '#ef4444'
                  }}>
                    {viewingOrder.orderStatus}
                  </span>
                  <span style={{
                    padding: '0.2rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.725rem',
                    fontWeight: 800,
                    background: viewingOrder.paymentMethod === 'COD' ? '#e0f2fe' : '#f0fdf4',
                    color: viewingOrder.paymentMethod === 'COD' ? '#0369a1' : '#166534'
                  }}>
                    {viewingOrder.paymentMethod === 'COD' ? 'CASH ON DELIVERY' : 'ONLINE RAZORPAY'}
                  </span>
                  <span style={{
                    padding: '0.2rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.725rem',
                    fontWeight: 800,
                    background: (viewingOrder.paymentStatus || '').toUpperCase() === 'PAID' || (viewingOrder.paymentStatus || '').toUpperCase() === 'COD_CONFIRMATION_PAID' ? '#dcfce7' : ((viewingOrder.paymentStatus || '').toUpperCase() === 'PENDING_COD_CONFIRMATION' || (viewingOrder.paymentMethod === 'COD' && (viewingOrder.paymentStatus || '').toUpperCase() === 'PENDING')) ? '#fef3c7' : '#fee2e2',
                    color: (viewingOrder.paymentStatus || '').toUpperCase() === 'PAID' || (viewingOrder.paymentStatus || '').toUpperCase() === 'COD_CONFIRMATION_PAID' ? '#15803d' : ((viewingOrder.paymentStatus || '').toUpperCase() === 'PENDING_COD_CONFIRMATION' || (viewingOrder.paymentMethod === 'COD' && (viewingOrder.paymentStatus || '').toUpperCase() === 'PENDING')) ? '#92400e' : '#dc2626'
                  }}>
                    PAYMENT: {viewingOrder.paymentStatus}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  Order ID (UUID): <code style={{ color: '#09090b', fontFamily: 'monospace' }}>{viewingOrder.id}</code>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'right' }}>
              <div><strong>Placed:</strong> {new Date(viewingOrder.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date(viewingOrder.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</div>
              <div style={{ marginTop: '3px' }}><strong>Updated:</strong> {new Date(viewingOrder.updatedAt || viewingOrder.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date(viewingOrder.updatedAt || viewingOrder.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</div>
            </div>
          </div>

          {/* Order Cancellation Banner if Cancelled */}
          {viewingOrder.orderStatus === 'CANCELLED' && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem'
            }}>
              <AlertCircle size={18} color="#dc2626" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{viewingOrder.cancellationSource === 'CUSTOMER' ? 'CANCELLED BY CUSTOMER' : 'ORDER CANCELLED'}</span>
                    {viewingOrder.cancelledAt && (
                      <span style={{ fontWeight: 500, fontSize: '0.78rem', color: '#b91c1c' }}>
                        • {new Date(viewingOrder.cancelledAt).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: viewingOrder.shiprocketStatus === 'CANCELED' ? '#dcfce7' : '#f4f4f5',
                    color: viewingOrder.shiprocketStatus === 'CANCELED' ? '#166534' : '#475569',
                    border: viewingOrder.shiprocketStatus === 'CANCELED' ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                  }}>
                    Shiprocket: {viewingOrder.shiprocketStatus === 'CANCELED' ? 'CANCELLED' : !viewingOrder.shiprocketOrderId ? 'NOT APPLICABLE' : viewingOrder.shiprocketStatus || 'CANCELLATION FAILED'}
                  </span>
                </div>
                {viewingOrder.cancellationReason && (
                  <div style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '4px' }}>
                    Cancellation Reason: <span style={{ fontStyle: 'italic', fontWeight: 600 }}>{viewingOrder.cancellationReason}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main 2-Column Responsive Layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.95fr) minmax(0, 1.05fr)',
            gap: '1.25rem',
            alignItems: 'start'
          }}>
            {/* ======================================================== */}
            {/* LEFT COLUMN: Customer + Address + Items + Summary/Actions */}
            {/* ======================================================== */}
            <div>
              {/* Row 1: Customer Details & Delivery Address side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                {/* 1. Customer Details Card */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ background: '#f5f3ff', padding: '1rem 1.25rem', borderBottom: '1px solid #ede9fe', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#7c3aed', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <User size={16} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#5b21b6', margin: 0 }}>Customer Details</h3>
                      <p style={{ fontSize: '0.725rem', color: '#6d28d9', margin: '2px 0 0 0' }}>Registered customer information</p>
                    </div>
                  </div>
                  <div style={{ padding: '1.15rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.7rem', fontSize: '0.825rem', background: '#ffffff' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.5rem' }}>
                      <span style={{ color: '#09090b', fontWeight: 700 }}>Name:</span>
                      <span style={{ color: '#334155' }}>{viewingOrder.customerName || '—'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.5rem' }}>
                      <span style={{ color: '#09090b', fontWeight: 700 }}>Email:</span>
                      <span style={{ color: '#334155', wordBreak: 'break-all' }}>{viewingOrder.customerEmail || '—'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.5rem' }}>
                      <span style={{ color: '#09090b', fontWeight: 700 }}>Phone:</span>
                      <span style={{ color: '#334155' }}>{viewingOrder.customerPhone || '—'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.5rem' }}>
                      <span style={{ color: '#09090b', fontWeight: 700 }}>Customer ID:</span>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {viewingOrder.customerId || 'Guest Checkout'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.5rem' }}>
                      <span style={{ color: '#09090b', fontWeight: 700 }}>Account Type:</span>
                      <span style={{ color: '#334155' }}>
                        {viewingOrder.customerId ? 'Registered Customer' : 'Guest Customer'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.5rem' }}>
                      <span style={{ color: '#09090b', fontWeight: 700 }}>Joined On:</span>
                      <span style={{ color: '#334155' }}>
                        {viewingOrder.customerJoinedAt
                          ? new Date(viewingOrder.customerJoinedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date(viewingOrder.customerJoinedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Delivery Address Card */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1.5px solid #2563eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ background: '#eff6ff', padding: '1rem 1.25rem', borderBottom: '1px solid #dbeafe', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MapPin size={16} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e40af', margin: 0 }}>Delivery Address</h3>
                      <p style={{ fontSize: '0.725rem', color: '#1d4ed8', margin: '2px 0 0 0' }}>Shipping address for this order</p>
                    </div>
                  </div>
                  {(() => {
                    const addr = parseShippingAddress(viewingOrder);
                    return (
                      <div style={{ padding: '1.15rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.7rem', fontSize: '0.825rem', background: '#ffffff' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.5rem' }}>
                          <span style={{ color: '#09090b', fontWeight: 700 }}>House / Flat:</span>
                          <span style={{ color: '#334155' }}>{addr.houseFlat}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.5rem' }}>
                          <span style={{ color: '#09090b', fontWeight: 700 }}>Area / Street:</span>
                          <span style={{ color: '#334155' }}>{addr.areaStreet}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.5rem' }}>
                          <span style={{ color: '#09090b', fontWeight: 700 }}>Landmark:</span>
                          <span style={{ color: '#334155' }}>{addr.landmark}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.5rem' }}>
                          <span style={{ color: '#09090b', fontWeight: 700 }}>City:</span>
                          <span style={{ color: '#334155' }}>{addr.city}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.5rem' }}>
                          <span style={{ color: '#09090b', fontWeight: 700 }}>State:</span>
                          <span style={{ color: '#334155' }}>{addr.state}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.5rem' }}>
                          <span style={{ color: '#09090b', fontWeight: 700 }}>PIN Code:</span>
                          <span style={{ color: '#334155' }}>{addr.pincode}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.5rem' }}>
                          <span style={{ color: '#09090b', fontWeight: 700 }}>Country:</span>
                          <span style={{ color: '#334155' }}>India</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Row 2: Order Items (1) Card spanning full width of left area */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e4e4e7', overflow: 'hidden', marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f4f4f5', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#16a34a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Package size={16} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                      Order Items ({viewingOrder.items.length})
                    </h3>
                    <p style={{ fontSize: '0.725rem', color: '#64748b', margin: '2px 0 0 0' }}>Products in this order</p>
                  </div>
                </div>

                {(() => {
                  const freeItems = viewingOrder.items.filter((it: any) => it.price === 0 || (it.productName && it.productName.startsWith('[FREE]')));
                  const paidItems = viewingOrder.items.filter((it: any) => it.isPaidPromoItem || (it.price > 0 && it.total > 0));
                  if (freeItems.length === 0) return null;

                  const promoRule = viewingOrder.items.find((it: any) => it.promotionRule)?.promotionRule || 'BUY X GET Y';
                  const promoDiscount = freeItems.reduce((acc: number, it: any) => acc + (it.mrp || it.originalPrice || 999), 0);

                  return (
                    <div style={{ margin: '1rem 1.25rem 0.5rem 1.25rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#166534', fontWeight: 800, fontSize: '0.85rem' }}>
                        <Gift size={16} /> Promotion: {promoRule} Applied
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem', marginTop: '0.5rem', fontSize: '0.775rem' }}>
                        <div>
                          <span style={{ color: '#64748b' }}>Paid Product{paidItems.length > 1 ? 's' : ''}: </span>
                          <strong style={{ color: '#09090b' }}>
                            {paidItems.length > 0 ? paidItems.map((p: any) => `${(p.productName || '').replace(/^\[FREE\]\s*/, '')} (₹${(p.price || 0).toFixed(2)})`).join(', ') : '—'}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Free Products ({freeItems.length}): </span>
                          <strong style={{ color: '#166534' }}>
                            {freeItems.map((it: any) => `${(it.productName || '').replace(/^\[FREE\]\s*/, '')} (₹0)`).join(', ')}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Promotion Savings: </span>
                          <strong style={{ color: '#166534' }}>-₹{promoDiscount.toFixed(2)}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Order Total: </span>
                          <strong style={{ color: '#09090b' }}>₹{Number(viewingOrder.total).toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ padding: '0.75rem 1rem', width: '40px', textAlign: 'center' }}>#</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Product</th>
                        <th style={{ padding: '0.75rem 1rem' }}>SKU</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Size</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Color</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Qty</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Unit Price</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>MRP</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingOrder.items.map((item: any, idx: number) => {
                        const cleanName = (item.productName || 'Garment Item').replace(/^\[FREE\]\s*/, '');
                        const isFree = item.price === 0 || (item.productName && item.productName.startsWith('[FREE]'));
                        const imgUrl = item.productImage || '/logo-transparent.png';
                        return (
                          <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: isFree ? '#f0fdf4' : 'transparent' }}>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>{idx + 1}</td>
                            <td style={{ padding: '0.75rem 1rem', color: '#09090b', fontWeight: 700 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '42px', height: '42px', borderRadius: '6px', overflow: 'hidden', background: '#f4f4f5', flexShrink: 0, border: '1px solid #e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <img src={imgUrl} alt={cleanName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as any).src = '/logo-transparent.png'; }} />
                                </div>
                                <div>
                                  <div>{cleanName}</div>
                                  {isFree && <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>PROMOTIONAL FREE</span>}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontFamily: 'monospace', fontSize: '0.75rem' }}>{item.sku || '—'}</td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600 }}>{item.size || 'M'}</td>
                            <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>{item.color || 'Standard'}</td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700 }}>{item.quantity}</td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>₹{item.price.toFixed(2)}</td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#94a3b8', textDecoration: 'line-through' }}>₹{(item.mrp || item.price * 2).toFixed(2)}</td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: '#09090b' }}>₹{item.total.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Row 3: Order Summary (lower-left) & Quick Actions (lower-right) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {/* Card E: Order Summary */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e4e4e7', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f4f4f5', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1e293b', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={16} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', margin: 0 }}>Order Summary</h3>
                      <p style={{ fontSize: '0.725rem', color: '#64748b', margin: '2px 0 0 0' }}>Price breakdown for this order</p>
                    </div>
                  </div>
                  <div style={{ padding: '1.15rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.825rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Item Subtotal</span>
                      <span style={{ fontWeight: 600, color: '#09090b' }}>₹{viewingOrder.subtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', alignItems: 'center' }}>
                      <span>Shipping Charge</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontWeight: 600, color: '#09090b' }}>₹{viewingOrder.shippingCharge.toFixed(2)}</span>
                        {viewingOrder.shippingCharge === 0 && (
                          <span style={{ background: '#dcfce7', color: '#166534', fontSize: '0.65rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px' }}>FREE</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>COD Handling Fee</span>
                      <span style={{ fontWeight: 600, color: '#09090b' }}>
                        ₹{(viewingOrder.codCharge || (viewingOrder.paymentMethod === 'COD' ? 99 : 0)).toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Discount</span>
                      <span style={{ fontWeight: 600, color: viewingOrder.discount > 0 ? '#166534' : '#09090b' }}>
                        - ₹{viewingOrder.discount.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ borderTop: '2px solid #09090b', paddingTop: '0.75rem', marginTop: '0.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b' }}>Total Amount</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b' }}>
                        ₹{Number(viewingOrder.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card F: Quick Actions */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e4e4e7', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f4f4f5', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Settings size={16} color="#09090b" />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', margin: 0 }}>Quick Actions</h3>
                  </div>
                  <div style={{ padding: '1.15rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <button
                      type="button"
                      onClick={() => setIsUpdateModalOpen(true)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.65rem 1rem', background: '#fff', border: '1px solid #d4d4d8', borderRadius: '6px', fontWeight: 700, fontSize: '0.8125rem', color: '#09090b', cursor: 'pointer' }}
                    >
                      <RotateCw size={15} />
                      <span>Update Order Status</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(`/api/orders/${encodeURIComponent(viewingOrder.orderNumber || viewingOrder.id)}/invoice?print=true`, '_blank')}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.65rem 1rem', background: '#fff', border: '1px solid #d4d4d8', borderRadius: '6px', fontWeight: 700, fontSize: '0.8125rem', color: '#09090b', cursor: 'pointer' }}
                    >
                      <Printer size={15} />
                      <span>Print Invoice</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsContactModalOpen(true)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.65rem 1rem', background: '#fff', border: '1px solid #d4d4d8', borderRadius: '6px', fontWeight: 700, fontSize: '0.8125rem', color: '#09090b', cursor: 'pointer' }}
                    >
                      <Mail size={15} />
                      <span>Contact Customer</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelOrder}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.65rem 1rem', background: '#fff', border: '1px solid #fca5a5', borderRadius: '6px', fontWeight: 700, fontSize: '0.8125rem', color: '#dc2626', cursor: 'pointer' }}
                    >
                      <XCircle size={15} />
                      <span>Cancel Order</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOrderToDelete(viewingOrder);
                        setIsDeleteModalOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        width: '100%',
                        padding: '0.65rem 1rem',
                        background: '#fff',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        color: '#dc2626',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                    >
                      <Trash2 size={15} />
                      <span>Delete Order</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* RIGHT COLUMN: Payment & Gateway + Fulfillment & Tracking */}
            {/* ======================================================== */}
            <div>
              {/* Card 3: Payment & Gateway Details */}
              {(() => {
                const isCod = viewingOrder.paymentMethod === 'COD';
                const isPaid = (viewingOrder.paymentStatus || '').toUpperCase() === 'PAID';
                const isCodPaid = (viewingOrder.paymentStatus || '').toUpperCase() === 'COD_CONFIRMATION_PAID';
                const isCodPending = (viewingOrder.paymentStatus || '').toUpperCase() === 'PENDING_COD_CONFIRMATION';
                const isDirectCodPending = isCod && ((viewingOrder.paymentStatus || '').toUpperCase() === 'PENDING' || (viewingOrder.paymentStatus || '').toUpperCase() === 'COD_PENDING');
                const isPaymentVerified = isPaid || isCodPaid;

                const codConfirmationAmount = viewingOrder.codCharge || 99;
                const codRemainingAmount = isCodPaid ? Math.max(0, viewingOrder.total - codConfirmationAmount) : viewingOrder.total;

                return (
                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    border: isPaymentVerified ? '1.5px solid #16a34a' : (isCodPending || isDirectCodPending) ? '1.5px solid #f59e0b' : '1.5px solid #ef4444',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    marginBottom: '1.25rem'
                  }}>
                    <div style={{
                      background: isPaymentVerified ? '#f0fdf4' : (isCodPending || isDirectCodPending) ? '#fffbeb' : '#fef2f2',
                      padding: '1rem 1.25rem',
                      borderBottom: isPaymentVerified ? '1px solid #bbf7d0' : (isCodPending || isDirectCodPending) ? '1px solid #fde68a' : '1px solid #fee2e2',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: isPaymentVerified ? '#16a34a' : (isCodPending || isDirectCodPending) ? '#f59e0b' : '#dc2626',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <CreditCard size={16} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: isPaymentVerified ? '#14532d' : (isCodPending || isDirectCodPending) ? '#92400e' : '#991b1b', margin: 0 }}>
                          Payment &amp; Gateway Details
                        </h3>
                        <p style={{ fontSize: '0.725rem', color: isPaymentVerified ? '#15803d' : (isCodPending || isDirectCodPending) ? '#b45309' : '#b91c1c', margin: '2px 0 0 0' }}>
                          {isCod 
                            ? (isDirectCodPending ? 'Cash on Delivery (Payable on Delivery)' : 'Cash on Delivery with ₹99 Online Confirmation') 
                            : 'Online Prepaid Razorpay Payment'}
                        </p>
                      </div>
                    </div>

                    <div style={{ padding: '1.15rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.825rem', background: '#ffffff' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.5rem' }}>
                        <span style={{ color: '#09090b', fontWeight: 700 }}>Payment Method:</span>
                        <span style={{ color: '#334155' }}>
                          {isCod ? 'Cash on Delivery (COD)' : 'Online Razorpay'}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ color: '#09090b', fontWeight: 700 }}>Payment Status:</span>
                        <div>
                          <span style={{
                            padding: '0.15rem 0.55rem',
                            borderRadius: '4px',
                            fontSize: '0.725rem',
                            fontWeight: 800,
                            background: isPaymentVerified ? '#dcfce7' : (isCodPending || isDirectCodPending) ? '#fef3c7' : '#fee2e2',
                            color: isPaymentVerified ? '#15803d' : (isCodPending || isDirectCodPending) ? '#92400e' : '#dc2626'
                          }}>
                            {viewingOrder.paymentStatus}
                          </span>
                        </div>
                      </div>

                      {isCod ? (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.5rem' }}>
                            <span style={{ color: '#09090b', fontWeight: 700 }}>Amount Paid Online:</span>
                            <span style={{ color: isCodPaid ? '#16a34a' : '#52525b', fontWeight: 700 }}>
                              {isCodPaid ? '₹99.00 (Paid & Verified Online)' : '₹0.00 (Unpaid / Online ₹0)'}
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.5rem' }}>
                            <span style={{ color: '#09090b', fontWeight: 700 }}>COD Handling Fee:</span>
                            <span style={{ color: '#334155', fontWeight: 600 }}>
                              ₹{codConfirmationAmount.toFixed(2)}
                            </span>
                          </div>
                          {viewingOrder.razorpayPaymentId && (
                            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.5rem' }}>
                              <span style={{ color: '#09090b', fontWeight: 700 }}>Razorpay Payment ID:</span>
                              <span style={{ color: '#334155', fontFamily: 'monospace' }}>
                                {viewingOrder.razorpayPaymentId}
                              </span>
                            </div>
                          )}
                          {viewingOrder.razorpayOrderId && (
                            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.5rem' }}>
                              <span style={{ color: '#09090b', fontWeight: 700 }}>Razorpay Order ID:</span>
                              <span style={{ color: '#334155', fontFamily: 'monospace' }}>
                                {viewingOrder.razorpayOrderId}
                              </span>
                            </div>
                          )}
                          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.5rem', background: '#fffbeb', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                            <span style={{ color: '#92400e', fontWeight: 800 }}>Payable on Delivery:</span>
                            <span style={{ color: '#b45309', fontWeight: 800, fontSize: '0.95rem' }}>
                              ₹{codRemainingAmount.toFixed(2)} on Delivery
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.5rem' }}>
                            <span style={{ color: '#09090b', fontWeight: 700 }}>Razorpay Payment ID:</span>
                            <span style={{ color: '#334155', fontFamily: 'monospace' }}>
                              {viewingOrder.razorpayPaymentId || '—'}
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.5rem' }}>
                            <span style={{ color: '#09090b', fontWeight: 700 }}>Razorpay Order ID:</span>
                            <span style={{ color: '#334155', fontFamily: 'monospace' }}>
                              {viewingOrder.razorpayOrderId || '—'}
                            </span>
                          </div>
                        </>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.5rem' }}>
                        <span style={{ color: '#09090b', fontWeight: 700 }}>Item Subtotal:</span>
                        <span style={{ color: '#334155' }}>₹{viewingOrder.subtotal.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.5rem' }}>
                        <span style={{ color: '#09090b', fontWeight: 700 }}>Discount:</span>
                        <span style={{ color: '#16a34a', fontWeight: viewingOrder.discount > 0 ? 700 : 400 }}>
                          ₹{viewingOrder.discount.toFixed(2)} {viewingOrder.couponCode ? `(${viewingOrder.couponCode})` : ''}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.5rem' }}>
                        <span style={{ color: '#09090b', fontWeight: 700 }}>Shipping Charge:</span>
                        <span style={{ color: '#334155' }}>₹{viewingOrder.shippingCharge.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.5rem', borderTop: '1px dashed #e4e4e7', paddingTop: '0.5rem', marginTop: '2px' }}>
                        <span style={{ color: '#09090b', fontWeight: 800 }}>Total Order Value:</span>
                        <span style={{ color: '#09090b', fontWeight: 800, fontSize: '1.15rem' }}>
                          ₹{Number(viewingOrder.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Callout alert box at bottom */}
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        background: isPaymentVerified ? '#f0fdf4' : isCodPending ? '#fffbeb' : '#fef2f2',
                        border: isPaymentVerified ? '1px solid #bbf7d0' : isCodPending ? '1px solid #fde68a' : '1px solid #fee2e2',
                        color: isPaymentVerified ? '#15803d' : isCodPending ? '#92400e' : '#dc2626',
                        fontWeight: 600
                      }}>
                        <AlertCircle size={14} style={{ flexShrink: 0 }} />
                        <span>
                          {isCod
                            ? isCodPaid
                              ? `₹99 confirmation payment verified. Collect remaining ₹${codRemainingAmount.toFixed(2)} in cash/UPI upon doorstep delivery.`
                              : 'Payment Pending: Customer has NOT completed ₹99 COD confirmation payment. Do NOT dispatch until confirmed.'
                            : isPaid
                            ? `Prepaid order verified & received in full (Payment ID: ${viewingOrder.razorpayPaymentId || '—'}). Collect ₹0 upon delivery.`
                            : 'Payment pending or not verified.'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Card 7: Fulfillment & Courier Tracking */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e4e4e7',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f4f4f5', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f59e0b', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Truck size={16} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                      Fulfillment &amp; Courier Tracking
                    </h3>
                    <p style={{ fontSize: '0.725rem', color: '#64748b', margin: '2px 0 0 0' }}>Manage order status and tracking details</p>
                  </div>
                </div>

                <div style={{ padding: '1.15rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>Order Status:</label>
                    <select
                      style={{ width: '100%', height: '36px', padding: '0 0.65rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.8125rem', background: '#fff', fontWeight: 600 }}
                      value={editOrderStatus}
                      onChange={e => setEditOrderStatus(e.target.value)}
                    >
                      <option value="PLACED">Placed</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="PROCESSING">Processing</option>
                      <option value="SHIPPED">Shipped</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>Delivery Partner:</label>
                    <input
                      type="text"
                      placeholder="Blue Dart Delivery"
                      value={editDeliveryPartner}
                      onChange={e => setEditDeliveryPartner(e.target.value)}
                      style={{ width: '100%', height: '36px', padding: '0 0.65rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.8125rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>Tracking / AWB #:</label>
                    <input
                      type="text"
                      placeholder="AWB123456789"
                      value={editTrackingId}
                      onChange={e => setEditTrackingId(e.target.value)}
                      style={{ width: '100%', height: '36px', padding: '0 0.65rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.8125rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>Tracking Status:</label>
                    <select
                      style={{ width: '100%', height: '36px', padding: '0 0.65rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.8125rem', background: '#fff', fontWeight: 600 }}
                      value={editTrackingStatus}
                      onChange={e => setEditTrackingStatus(e.target.value)}
                    >
                      <option value="ORDER_RECEIVED">Order Received</option>
                      <option value="PACKED">Packed &amp; Ready</option>
                      <option value="SHIPPED">Handed to Courier (Shipped)</option>
                      <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="RETURNED">Returned / RTO</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveFulfillment}
                    disabled={loading}
                    style={{
                      marginTop: '4px',
                      height: '40px',
                      background: '#09090b',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Check size={16} />
                    <span>{loading ? 'Saving Changes...' : 'Save Fulfillment Details'}</span>
                  </button>
                </div>
              </div>

              {/* Card 8: Shiprocket Logistics & Automation */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e4e4e7',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#6366f1', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Package size={16} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                        Shiprocket Logistics
                      </h3>
                      <p style={{ fontSize: '0.725rem', color: '#64748b', margin: '2px 0 0 0' }}>Automated shipping &amp; courier fulfillment</p>
                    </div>
                  </div>

                  {viewingOrder.shiprocketShipmentId ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      background: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0'
                    }}>
                      <ShieldCheck size={13} />
                      SHIPROCKET SYNCED
                    </span>
                  ) : viewingOrder.shiprocketSyncStatus === 'FAILED' ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      background: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca'
                    }}>
                      <AlertCircle size={13} />
                      SHIPROCKET SYNC FAILED
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      background: '#fef3c7',
                      color: '#d97706',
                      border: '1px solid #fde68a'
                    }}>
                      <Clock size={13} />
                      SHIPROCKET SYNC PENDING
                    </span>
                  )}
                </div>

                <div style={{ padding: '1.15rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Status Banner */}
                  {viewingOrder.shiprocketShipmentId ? (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.775rem' }}>
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>Shiprocket Order ID</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <strong style={{ color: '#0f172a' }}>{viewingOrder.shiprocketOrderId || '—'}</strong>
                            {viewingOrder.shiprocketOrderId && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(String(viewingOrder.shiprocketOrderId), 'Shiprocket Order ID')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
                                title="Copy Shiprocket Order ID"
                              >
                                <Copy size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>Shipment ID</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <strong style={{ color: '#0f172a' }}>{viewingOrder.shiprocketShipmentId}</strong>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(String(viewingOrder.shiprocketShipmentId), 'Shipment ID')}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
                              title="Copy Shipment ID"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        </div>

                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>Courier Partner</span>
                          <strong style={{ color: '#0284c7', marginTop: '2px', display: 'inline-block' }}>
                            {viewingOrder.deliveryPartner || 'Not Assigned Yet'}
                          </strong>
                        </div>

                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>AWB / Tracking #</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <strong style={{ color: viewingOrder.trackingId ? '#0f172a' : '#94a3b8' }}>
                              {viewingOrder.trackingId || 'Unassigned'}
                            </strong>
                            {viewingOrder.trackingId && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(String(viewingOrder.trackingId), 'AWB Tracking #')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
                                title="Copy AWB Tracking Code"
                              >
                                <Copy size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>Pickup Status</span>
                          <span style={{ fontWeight: 700, color: viewingOrder.pickupId ? '#059669' : '#64748b', marginTop: '2px', display: 'inline-block' }}>
                            {viewingOrder.pickupId ? `Scheduled (#${viewingOrder.pickupId})` : 'Not Requested'}
                          </span>
                        </div>

                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>Fulfillment State</span>
                          <span style={{ fontWeight: 700, color: '#4338ca', marginTop: '2px', display: 'inline-block' }}>
                            {viewingOrder.shiprocketStatus || viewingOrder.trackingStatus || 'NEW'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {viewingOrder.shiprocketSyncStatus === 'FAILED' ? (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#991b1b', marginBottom: '2px' }}>
                            Automatic Shiprocket Sync Failed
                          </div>
                          <p style={{ fontSize: '0.75rem', color: '#b91c1c', margin: 0, lineHeight: 1.4 }}>
                            {viewingOrder.shiprocketSyncError || 'Unable to create order in Shiprocket. Click below to safely retry.'}
                          </p>
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.785rem', color: '#64748b', margin: '0 0 0.75rem 0', lineHeight: 1.45 }}>
                          Automatic Shiprocket synchronization is pending or can be retried below.
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={handleCreateShiprocketOrder}
                        disabled={shiprocketLoading}
                        style={{
                          width: '100%',
                          height: '38px',
                          background: '#6366f1',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.8125rem',
                          cursor: shiprocketLoading ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          transition: 'background 0.2s ease'
                        }}
                      >
                        <RotateCw size={14} className={shiprocketLoading ? styles.spin : ''} />
                        <span>{shiprocketLoading ? 'Synchronizing...' : 'Retry Shiprocket Sync'}</span>
                      </button>
                    </div>
                  )}

                  {shiprocketError && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.65rem 0.75rem', fontSize: '0.75rem', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span>{shiprocketError}</span>
                    </div>
                  )}

                  {/* Section: Courier Selection & AWB Assignment */}
                  {viewingOrder.shiprocketShipmentId && !viewingOrder.trackingId && (
                    <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <label style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b', margin: 0 }}>
                          Select Courier &amp; Assign AWB:
                        </label>
                        <button
                          type="button"
                          onClick={handleCheckServiceability}
                          disabled={serviceabilityLoading}
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            color: '#334155',
                            borderRadius: '5px',
                            padding: '3px 9px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: serviceabilityLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <RotateCw size={11} className={serviceabilityLoading ? styles.spin : ''} />
                          <span>{serviceabilityLoading ? 'Checking...' : 'Check Live Couriers'}</span>
                        </button>
                      </div>

                      <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '0 0 0.5rem 0' }}>
                        Destination PIN: <strong style={{ color: '#09090b' }}>{viewingOrder.pincode || 'Not specified'}</strong>
                      </p>

                      {serviceabilityError && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.5rem', fontSize: '0.725rem', color: '#b91c1c', marginBottom: '0.5rem' }}>
                          {serviceabilityError}
                        </div>
                      )}

                      {/* Selected Courier Confirmation Box */}
                      {selectedCourier && (
                        <div style={{ background: '#eff6ff', border: '1.5px solid #3b82f6', borderRadius: '8px', padding: '0.85rem', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <strong style={{ fontSize: '0.8rem', color: '#1e40af' }}>Confirm Courier Selection</strong>
                            <button
                              type="button"
                              onClick={() => setSelectedCourier(null)}
                              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.75rem' }}
                            >
                              Change
                            </button>
                          </div>
                          <div style={{ fontSize: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', color: '#334155' }}>
                            <div>Courier: <strong>{selectedCourier.courierName}</strong></div>
                            <div>Courier ID: <strong>{selectedCourier.courierCompanyId}</strong></div>
                            <div>Total Shipping: <strong style={{ color: '#059669' }}>₹{selectedCourier.rate}</strong></div>
                            <div>Est. Delivery: <strong>{selectedCourier.estimatedDeliveryDays} days</strong></div>
                          </div>
                          <button
                            type="button"
                            onClick={handleConfirmAssignAwb}
                            disabled={assigningAwb}
                            style={{
                              marginTop: '0.75rem',
                              width: '100%',
                              height: '34px',
                              background: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '0.775rem',
                              cursor: assigningAwb ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <ShieldCheck size={14} />
                            <span>{assigningAwb ? 'Assigning AWB...' : `Confirm & Assign AWB (${selectedCourier.courierName})`}</span>
                          </button>
                        </div>
                      )}

                      {/* Couriers List */}
                      {availableCouriers && availableCouriers.length > 0 && !selectedCourier && (
                        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fafafa' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.725rem' }}>
                            <thead>
                              <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '6px 8px' }}>Courier</th>
                                <th style={{ padding: '6px 8px' }}>Rate</th>
                                <th style={{ padding: '6px 8px' }}>Est. Delivery</th>
                                <th style={{ padding: '6px 8px' }}>Rating</th>
                                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {availableCouriers.map((c, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0f172a' }}>{c.courierName}</td>
                                  <td style={{ padding: '6px 8px', fontWeight: 700, color: '#059669' }}>₹{c.rate}</td>
                                  <td style={{ padding: '6px 8px', color: '#64748b' }}>{c.estimatedDeliveryDays} days</td>
                                  <td style={{ padding: '6px 8px', color: '#d97706', fontWeight: 600 }}>★ {c.rating || 4.5}</td>
                                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleSelectCourier(c)}
                                      style={{
                                        background: '#09090b',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '2px 8px',
                                        fontSize: '0.675rem',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Select
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section: Post-AWB Fulfillment Lifecycle (Label, Invoice, Pickup, Manifest, Tracking) */}
                  {viewingOrder.trackingId && (
                    <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.725rem', fontWeight: 800, color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Fulfillment Documents &amp; Dispatch
                      </span>

                      {/* Action Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        {/* 1. Shipping Label */}
                        {viewingOrder.labelUrl ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <a
                              href={viewingOrder.labelUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                flex: 1,
                                height: '34px',
                                background: '#f0fdf4',
                                color: '#15803d',
                                border: '1px solid #bbf7d0',
                                borderRadius: '6px',
                                fontSize: '0.725rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                textDecoration: 'none'
                              }}
                            >
                              <FileDown size={13} />
                              <span>View Label PDF</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleGenerateLabel(true)}
                              disabled={generatingLabel}
                              title="Regenerate Label"
                              style={{
                                width: '34px',
                                height: '34px',
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <RotateCw size={12} className={generatingLabel ? styles.spin : ''} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleGenerateLabel(false)}
                            disabled={generatingLabel}
                            style={{
                              height: '34px',
                              background: '#f8fafc',
                              color: '#0f172a',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              cursor: generatingLabel ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            <FileText size={13} />
                            <span>{generatingLabel ? 'Generating...' : 'Generate Label'}</span>
                          </button>
                        )}

                        {/* 2. Shipping Invoice */}
                        {viewingOrder.invoiceUrl ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <a
                              href={viewingOrder.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                flex: 1,
                                height: '34px',
                                background: '#f0fdf4',
                                color: '#15803d',
                                border: '1px solid #bbf7d0',
                                borderRadius: '6px',
                                fontSize: '0.725rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                textDecoration: 'none'
                              }}
                            >
                              <FileDown size={13} />
                              <span>View Invoice PDF</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleGenerateInvoice(true)}
                              disabled={generatingInvoice}
                              title="Regenerate Invoice"
                              style={{
                                width: '34px',
                                height: '34px',
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <RotateCw size={12} className={generatingInvoice ? styles.spin : ''} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleGenerateInvoice(false)}
                            disabled={generatingInvoice}
                            style={{
                              height: '34px',
                              background: '#f8fafc',
                              color: '#0f172a',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              cursor: generatingInvoice ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            <Printer size={13} />
                            <span>{generatingInvoice ? 'Printing...' : 'Generate Invoice'}</span>
                          </button>
                        )}

                        {/* 3. Courier Pickup */}
                        {viewingOrder.pickupId ? (
                          <div style={{
                            height: '34px',
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            borderRadius: '6px',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            color: '#047857',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}>
                            <CheckCircle2 size={13} />
                            <span>Pickup Scheduled</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleRequestPickup}
                            disabled={requestingPickup}
                            style={{
                              height: '34px',
                              background: '#09090b',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              cursor: requestingPickup ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            <Truck size={13} />
                            <span>{requestingPickup ? 'Scheduling...' : 'Schedule Pickup'}</span>
                          </button>
                        )}

                        {/* 4. Manifest */}
                        {viewingOrder.manifestUrl ? (
                          <a
                            href={viewingOrder.manifestUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              height: '34px',
                              background: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              borderRadius: '6px',
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              textDecoration: 'none'
                            }}
                          >
                            <FileDown size={13} />
                            <span>Manifest PDF</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={handleGenerateManifest}
                            disabled={generatingManifest}
                            style={{
                              height: '34px',
                              background: '#f8fafc',
                              color: '#0f172a',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              cursor: generatingManifest ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            <FileText size={13} />
                            <span>{generatingManifest ? 'Generating...' : 'Generate Manifest'}</span>
                          </button>
                        )}
                      </div>

                      {/* Live Tracking and Sync row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '4px' }}>
                        <button
                          type="button"
                          onClick={handleOpenTrackingModal}
                          style={{
                            height: '34px',
                            background: '#6366f1',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px'
                          }}
                        >
                          <Navigation size={13} />
                          <span>Live Tracking</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleSyncTracking}
                          disabled={syncingTracking}
                          style={{
                            height: '34px',
                            background: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            cursor: syncingTracking ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px'
                          }}
                        >
                          <RotateCw size={12} className={syncingTracking ? styles.spin : ''} />
                          <span>{syncingTracking ? 'Syncing...' : 'Sync Tracking'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Update Order Status Modal */}
          {isUpdateModalOpen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '460px', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#09090b' }}>Update Order Status</h3>
                  <button type="button" onClick={() => setIsUpdateModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a' }}>
                    <X size={18} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px', color: '#09090b' }}>Order Status</label>
                    <select
                      value={editOrderStatus}
                      onChange={e => setEditOrderStatus(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 0.65rem', borderRadius: '6px', border: '1px solid #d4d4d8', fontSize: '0.85rem' }}
                    >
                      <option value="PLACED">Placed</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="PROCESSING">Processing</option>
                      <option value="SHIPPED">Shipped</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px', color: '#09090b' }}>Payment Status</label>
                    <select
                      value={editPaymentStatus}
                      onChange={e => setEditPaymentStatus(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 0.65rem', borderRadius: '6px', border: '1px solid #d4d4d8', fontSize: '0.85rem' }}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="PAID">Paid</option>
                      <option value="FAILED">Failed</option>
                      <option value="REFUNDED">Refunded</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                  <button type="button" onClick={() => setIsUpdateModalOpen(false)} style={{ padding: '0.6rem 1.15rem', background: '#f4f4f5', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer' }}>Cancel</button>
                  <button type="button" onClick={handleSaveStatusModal} disabled={loading} style={{ padding: '0.6rem 1.25rem', background: '#09090b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.8125rem', cursor: loading ? 'not-allowed' : 'pointer' }}>
                    {loading ? 'Updating...' : 'Save Updates'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Contact Customer Modal */}
          {isContactModalOpen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#09090b' }}>Contact Customer</h3>
                  <button type="button" onClick={() => setIsContactModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a' }}>
                    <X size={18} />
                  </button>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.825rem' }}>
                  <p style={{ margin: '0 0 4px 0' }}><strong>Customer:</strong> {viewingOrder.customerName}</p>
                  <p style={{ margin: '0 0 4px 0' }}><strong>Email:</strong> {viewingOrder.customerEmail || '—'}</p>
                  <p style={{ margin: 0 }}><strong>Phone:</strong> +91 {viewingOrder.customerPhone || '—'}</p>
                </div>

                {contactError && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fca5a5',
                    color: '#991b1b',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    <span>{contactError}</span>
                  </div>
                )}

                {contactSuccess && (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    color: '#166534',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Check size={15} style={{ flexShrink: 0 }} />
                    <span>{contactSuccess}</span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => handleSendInvoice('EMAIL')}
                    disabled={contactLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1rem',
                      background: '#09090b',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      cursor: contactLoading ? 'not-allowed' : 'pointer',
                      opacity: contactLoading ? 0.7 : 1
                    }}
                  >
                    <Mail size={16} />
                    <span>{contactLoading ? 'Generating & Sending PDF Invoice...' : `Send Invoice to ${viewingOrder.customerEmail || 'Customer'}`}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendInvoice('WHATSAPP')}
                    disabled={contactLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1rem',
                      background: '#25D366',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      cursor: contactLoading ? 'not-allowed' : 'pointer',
                      opacity: contactLoading ? 0.7 : 1
                    }}
                  >
                    <MessageSquare size={16} />
                    <span>Send Invoice on WhatsApp (+91 {viewingOrder.customerPhone || '—'})</span>
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsContactModalOpen(false);
                      setContactError('');
                      setContactSuccess('');
                    }} 
                    style={{ padding: '0.5rem 1rem', background: '#f4f4f5', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Orders List Table */
        <div>
          {/* Search & Filter Toolbar */}
          <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '8px', padding: '0.85rem 1.15rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Search by Order #, customer, email, phone, AWB..." 
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: '100%', height: '38px', padding: '0 0.85rem 0 2.25rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.85rem' }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ height: '38px', padding: '0 0.85rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', fontWeight: 600 }}
            >
              <option value="ALL">All Fulfillment Status</option>
              <option value="PLACED">Placed</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              value={paymentFilter}
              onChange={e => {
                setPaymentFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ height: '38px', padding: '0 0.85rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', fontWeight: 600 }}
            >
              <option value="ALL">All Payments</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e4e4e7', overflowX: 'auto', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '920px', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Order Number</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Customer</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Total</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Method</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Payment</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Fulfillment</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#71717a' }}>
                      No orders found matching filters.
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800, fontFamily: 'monospace' }}>
                        {o.orderNumber ? `#${o.orderNumber}` : `#${o.id.slice(0, 8).toUpperCase()}`}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#09090b' }}>{o.customerName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#71717a' }}>{o.customerPhone || o.customerEmail}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#71717a', fontSize: '0.8rem' }}>
                        {new Date(o.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#09090b' }}>
                        ₹{o.total.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: o.paymentMethod === 'COD' ? '#f4f4f5' : '#e0f2fe',
                          color: o.paymentMethod === 'COD' ? '#52525b' : '#0369a1'
                        }}>
                          {o.paymentMethod === 'COD' ? 'COD' : 'ONLINE'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          background: o.paymentStatus === 'PAID' || o.paymentStatus === 'COD_CONFIRMATION_PAID' ? '#f0fdf4' : (o.paymentStatus === 'PENDING_COD_CONFIRMATION' || (o.paymentMethod === 'COD' && o.paymentStatus === 'PENDING')) ? '#fffbeb' : '#fef2f2',
                          color: o.paymentStatus === 'PAID' || o.paymentStatus === 'COD_CONFIRMATION_PAID' ? '#166534' : (o.paymentStatus === 'PENDING_COD_CONFIRMATION' || (o.paymentMethod === 'COD' && o.paymentStatus === 'PENDING')) ? '#92400e' : '#991b1b'
                        }}>
                          {o.paymentStatus}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          background: o.orderStatus === 'DELIVERED' ? '#f0fdf4' : o.orderStatus === 'CANCELLED' ? '#fef2f2' : '#fffbeb',
                          color: o.orderStatus === 'DELIVERED' ? '#166534' : o.orderStatus === 'CANCELLED' ? '#991b1b' : '#b45309'
                        }}>
                          {o.orderStatus === 'CANCELLED' && o.cancellationSource === 'CUSTOMER' ? 'CANCELLED BY CUSTOMER' : o.orderStatus}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          <button 
                            type="button"
                            onClick={() => handleOpenOrder(o)}
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
                            <span>View &amp; Manage</span>
                          </button>
                          <button 
                            type="button"
                            title="Delete Order"
                            onClick={() => {
                              setOrderToDelete(o);
                              setIsDeleteModalOpen(true);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0.35rem 0.5rem',
                              background: '#fff',
                              border: '1px solid #fecaca',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              color: '#dc2626'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination Toolbar */}
            {filteredOrders.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.15rem', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
                <div style={{ fontSize: '0.75rem', color: '#71717a' }}>
                  Showing {Math.min(filteredOrders.length, (currentPage - 1) * pageSize + 1)} to {Math.min(filteredOrders.length, currentPage * pageSize)} of {filteredOrders.length} orders
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

      {/* Delete Order Confirmation Modal */}
      {isDeleteModalOpen && orderToDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(2px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '440px',
            padding: '1.5rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '1px solid #e4e4e7'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '1.15rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 800, color: '#09090b' }}>
                  Delete Order Permanently?
                </h3>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5 }}>
                  This order and its related order data will be permanently removed from the database. This action cannot be undone.
                </p>
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.775rem',
              color: '#475569'
            }}>
              <div><strong>Order:</strong> #{orderToDelete.orderNumber || (orderToDelete.id ? orderToDelete.id.slice(0, 8).toUpperCase() : '—')}</div>
              <div style={{ marginTop: '2px' }}><strong>Customer:</strong> {orderToDelete.customerName} ({orderToDelete.customerEmail || 'No email'})</div>
              <div style={{ marginTop: '2px' }}>
                <strong>Total:</strong> ₹{Number(orderToDelete.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} | <strong>Method:</strong> {orderToDelete.paymentMethod}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => {
                  if (!deleteLoading) {
                    setIsDeleteModalOpen(false);
                    setOrderToDelete(null);
                  }
                }}
                disabled={deleteLoading}
                style={{
                  padding: '0.6rem 1.15rem',
                  background: '#ffffff',
                  border: '1px solid #d4d4d8',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: '#334155',
                  cursor: deleteLoading ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteOrder}
                disabled={deleteLoading}
                style={{
                  padding: '0.6rem 1.25rem',
                  background: '#dc2626',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: deleteLoading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)'
                }}
              >
                <Trash2 size={14} />
                <span>{deleteLoading ? 'Permanently Deleting...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 3 Live Shipment Tracking Modal */}
      {trackingModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#6366f1',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Navigation size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                    Live Shipment Tracking
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.725rem', color: '#64748b' }}>
                    AWB #{viewingOrder?.trackingId || '—'} • {viewingOrder?.deliveryPartner || 'Courier'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTrackingModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {trackingLoading ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <RotateCw size={24} className={styles.spin} color="#6366f1" />
                  <span>Connecting to courier network &amp; fetching live scans...</span>
                </div>
              ) : (
                <>
                  {/* Status Banner */}
                  <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '1rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.775rem' }}>
                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>Current Status</span>
                        <strong style={{ color: '#4338ca', fontSize: '0.9rem', display: 'inline-block', marginTop: '2px' }}>
                          {trackingData?.currentStatus || viewingOrder?.trackingStatus || 'AWB ASSIGNED'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>Estimated Delivery</span>
                        <strong style={{ color: '#059669', fontSize: '0.85rem', display: 'inline-block', marginTop: '2px' }}>
                          {trackingData?.etd || 'Within 3-5 days'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>Courier Partner</span>
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>
                          {trackingData?.courierName || viewingOrder?.deliveryPartner || 'Standard Courier'}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>Destination</span>
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>
                          {viewingOrder?.city ? `${viewingOrder.city} (${viewingOrder.pincode})` : viewingOrder?.pincode || 'India'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Scans Timeline */}
                  <div>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.75rem 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Shipment Journey &amp; Scans
                    </h4>

                    {trackingData?.activities && trackingData.activities.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', paddingLeft: '1.25rem' }}>
                        <div style={{ position: 'absolute', top: '8px', bottom: '8px', left: '5px', width: '2px', background: '#e2e8f0' }} />
                        {trackingData.activities.map((act: any, idx: number) => (
                          <div key={idx} style={{ position: 'relative' }}>
                            <div style={{
                              position: 'absolute',
                              left: '-1.25rem',
                              top: '4px',
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: idx === 0 ? '#6366f1' : '#cbd5e1',
                              border: '2px solid #fff',
                              boxShadow: '0 0 0 2px ' + (idx === 0 ? '#6366f1' : '#e2e8f0')
                            }} />
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                              {act.activity || act.status}
                            </div>
                            <div style={{ fontSize: '0.725rem', color: '#64748b', display: 'flex', gap: '0.5rem', marginTop: '2px' }}>
                              <span>{act.date}</span>
                              {act.location && <span>• {act.location}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ background: '#fafafa', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '1.25rem', textAlign: 'center', fontSize: '0.785rem', color: '#64748b' }}>
                        <Truck size={28} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                        <p style={{ margin: 0, fontWeight: 600, color: '#334155' }}>Shipment Registered with Courier</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.725rem' }}>
                          AWB <strong>{viewingOrder?.trackingId}</strong> is generated. Live transit checkpoints will appear as the courier scans the package during transit.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '0.85rem 1.5rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setTrackingModalOpen(false)}
                style={{
                  padding: '0.5rem 1.15rem',
                  background: '#09090b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.775rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
