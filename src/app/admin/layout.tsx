"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Globe, 
  Settings, 
  LogOut, 
  ChevronDown, 
  ChevronRight,
  Search,
  Bell,
  Mail,
  Menu,
  Sliders,
  Star,
  Camera
} from 'lucide-react';
import styles from './admin.module.css';

function getNotificationBadge(type: string) {
  switch (type) {
    case 'NEW_ORDER':
      return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'New Order' };
    case 'PAYMENT_SUCCESS':
      return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', label: 'Paid' };
    case 'PAYMENT_FAILED':
      return { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: 'Payment Failed' };
    case 'PACKING_OVERDUE':
      return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: '10h Pack Overdue' };
    case 'PACKING_APPROACHING':
      return { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'Pack Due Soon' };
    case 'PICKUP_OVERDUE':
      return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: '24h Pickup Overdue' };
    case 'SHIPROCKET_AUTH_FAILED':
      return { bg: '#fef2f2', color: '#991b1b', border: '#fecaca', label: 'Shiprocket Auth' };
    case 'SHIPMENT_CREATION_FAILED':
      return { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: 'Sync Failed' };
    case 'AWB_ASSIGNED':
      return { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', label: 'AWB Assigned' };
    case 'PICKUP_CONFIRMED':
      return { bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe', label: 'Pickup Set' };
    case 'DELIVERY_EXCEPTION':
      return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Delivery Issue' };
    case 'DELIVERED':
      return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', label: 'Delivered' };
    default:
      return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', label: type.replace(/_/g, ' ') };
  }
}

function formatRelativeTime(dateInput: string): string {
  try {
    const diffMs = Date.now() - new Date(dateInput).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [productsOpen, setProductsOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<{ email?: string; role?: string } | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications?limit=20');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      }
    } catch (err) {
      // Background poll silently fails on network switch
    }
  }, []);

  useEffect(() => {
    if (pathname === '/admin/login') return;

    fetch('/api/admin/me')
      .then((res) => {
        if (res.status === 401) {
          window.location.href = `/admin/login?from=${encodeURIComponent(pathname)}`;
          return null;
        }
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data && data.authenticated) {
          setAdminUser(data.admin);
        } else if (data && data.authenticated === false) {
          window.location.href = `/admin/login?from=${encodeURIComponent(pathname)}`;
        }
      })
      .catch(() => {});

    fetchNotifications();
    const timer = setInterval(fetchNotifications, 25000);
    return () => clearInterval(timer);
  }, [pathname, fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error('Failed to mark notifications read', err);
    }
  };

  const handleNotificationClick = async (n: any) => {
    if (!n.isRead) {
      fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: n.id }),
      }).catch(() => {});
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item)));
    }
    setNotificationsOpen(false);
    if (n.orderNumber) {
      router.push(`/admin/orders?search=${encodeURIComponent(n.orderNumber)}`);
    }
  };

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setProfileOpen(false);
        setNotificationsOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`.${styles.headerSearch}`)) {
        setSearchOpen(false);
      }
      if (!target.closest(`.${styles.userCardWrapper}`)) {
        setProfileOpen(false);
      }
      if (!target.closest(`.${styles.iconBtn}`)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const searchItems = [
    { label: 'All Products', href: '/admin/products', category: 'Products' },
    { label: 'Add New Product', href: '/admin/products?action=add', category: 'Products' },
    { label: 'Product Configuration', href: '/admin/settings', category: 'Products' },
    { label: 'All Orders', href: '/admin/orders', category: 'Orders' },
    { label: 'Pending Orders', href: '/admin/orders?status=PENDING', category: 'Orders' },
    { label: 'Customers Directory', href: '/admin/customers', category: 'Customers' },
    { label: 'Customer Photos', href: '/admin/customer-photos', category: 'CMS' },
    { label: 'Customer Reviews', href: '/admin/reviews', category: 'CMS' },
    { label: 'Hero Section Manager', href: '/admin/banners', category: 'CMS' },
    { label: 'Store Settings', href: '/admin/settings?tab=general', category: 'Settings' },
  ];

  const filteredSearchItems = searchQuery.trim() === '' 
    ? searchItems.slice(0, 6)
    : searchItems.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.toLowerCase().includes(searchQuery.toLowerCase()));

  // If viewing the admin login page, don't show the dashboard shell
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const isProductsActive = pathname.includes('/admin/products') || 
                           pathname.includes('/admin/categories') || 
                           (pathname.includes('/admin/settings') && !pathname.includes('tab=general'));

  return (
    <div className={styles.adminLayout}>
      {/* ========================================================= */}
      {/* SIDEBAR                                                   */}
      {/* ========================================================= */}
      <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.sidebarMobileOpen : ''}`}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandTextGroup}>
            <Image 
              src="/adrizo-logo-dark.png" 
              alt="ADRIZO" 
              width={130} 
              height={18} 
              priority
              style={{ width: '130px', height: 'auto', objectFit: 'contain' }}
            />
            <span className={styles.brandSubText}>ADMIN PANEL</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {/* 1. Dashboard */}
          <Link 
            href="/admin/dashboard" 
            className={`${styles.navItem} ${pathname === '/admin/dashboard' ? styles.navItemActive : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>

          {/* 2. Products */}
          <div className={styles.navGroup}>
            <button 
              type="button"
              className={`${styles.navItem} ${styles.navGroupHeader} ${isProductsActive ? styles.navGroupActive : ''}`}
              onClick={() => setProductsOpen(!productsOpen)}
            >
              <div className={styles.navItemLeft}>
                <Package size={18} />
                <span>Products</span>
              </div>
              {productsOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>

            {productsOpen && (
              <div className={styles.navSubMenu}>
                <Link 
                  href="/admin/products" 
                  className={`${styles.navSubItem} ${pathname === '/admin/products' && !pathname.includes('action=add') ? styles.navSubItemActive : ''}`}
                >
                  <span>All Products</span>
                </Link>
                <Link 
                  href="/admin/products?action=add" 
                  className={`${styles.navSubItem} ${pathname.includes('action=add') ? styles.navSubItemActive : ''}`}
                >
                  <span style={{ color: '#FFC800', fontWeight: 700 }}>+ Add Product</span>
                </Link>
                <Link 
                  href="/admin/settings" 
                  className={`${styles.navSubItem} ${pathname.includes('/admin/settings') && !pathname.includes('tab=general') ? styles.navSubItemActive : ''}`}
                >
                  <span>Product Configuration &amp; Settings</span>
                </Link>
              </div>
            )}
          </div>

          {/* 3. All Orders */}
          <Link 
            href="/admin/orders" 
            className={`${styles.navItem} ${pathname.includes('/admin/orders') ? styles.navItemActive : ''}`}
          >
            <ShoppingCart size={18} />
            <span>All Orders</span>
          </Link>

          {/* 4. Customers */}
          <Link 
            href="/admin/customers" 
            className={`${styles.navItem} ${pathname.includes('/admin/customers') ? styles.navItemActive : ''}`}
          >
            <Users size={18} />
            <span>Customers</span>
          </Link>

          {/* 5. Hero Section Manager */}
          <Link 
            href="/admin/banners" 
            className={`${styles.navItem} ${pathname.includes('/admin/banners') ? styles.navItemActive : ''}`}
          >
            <Globe size={18} />
            <span>Hero Section Manager</span>
          </Link>

          {/* 6. Customer Photos */}
          <Link 
            href="/admin/customer-photos" 
            className={`${styles.navItem} ${pathname.includes('/admin/customer-photos') ? styles.navItemActive : ''}`}
          >
            <Camera size={18} />
            <span>Customer Photos</span>
          </Link>

          {/* 7. Customer Reviews */}
          <Link 
            href="/admin/reviews" 
            className={`${styles.navItem} ${pathname.includes('/admin/reviews') ? styles.navItemActive : ''}`}
          >
            <Star size={18} />
            <span>Customer Reviews</span>
          </Link>

          {/* 8. Settings */}
          <Link 
            href="/admin/settings?tab=general" 
            className={`${styles.navItem} ${pathname.includes('tab=general') ? styles.navItemActive : ''}`}
          >
            <Settings size={18} />
            <span>Settings</span>
          </Link>
        </nav>

        {/* Logout */}
        <button 
          className={styles.logoutBtn}
          onClick={async () => {
            await fetch('/api/admin/logout', { method: 'POST' });
            window.location.href = '/admin/login';
          }}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </aside>

      {/* ========================================================= */}
      {/* MAIN CONTENT AREA                                         */}
      {/* ========================================================= */}
      <div className={styles.mainContent}>
        {/* Top Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button 
              className={styles.menuToggleBtn}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </button>
            <div className={styles.headerSearch}>
              <Search size={16} className={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="Search products, orders, customers..." 
                className={styles.headerSearchInput}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                id="admin-global-search-input"
              />
              <span className={styles.searchShortcut}>⌘K</span>

              {/* Search Suggestions Dropdown */}
              {searchOpen && (
                <div className={styles.searchDropdown} id="admin-search-dropdown">
                  <div className={styles.searchSectionHeader}>
                    {searchQuery.trim() ? `Search Results (${filteredSearchItems.length})` : 'Quick Navigation'}
                  </div>
                  {filteredSearchItems.map((item, idx) => (
                    <Link
                      key={idx}
                      href={item.href}
                      className={styles.searchResultItem}
                      onClick={() => setSearchOpen(false)}
                    >
                      <span>{item.label}</span>
                      <span className={styles.searchResultMeta}>{item.category}</span>
                    </Link>
                  ))}
                  {filteredSearchItems.length === 0 && (
                    <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                      No matching destinations found.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={styles.headerRight}>
            <button 
              className={styles.iconBtn} 
              aria-label="Notifications"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              id="admin-notifications-btn"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className={styles.yellowBadge}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className={styles.notificationsDropdown} id="admin-notifications-dropdown">
                <div className={styles.notificationsHeader}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0f172a' }}>
                    Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6366f1',
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className={styles.notificationsList}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const badge = getNotificationBadge(n.type);
                      const isUnread = !n.isRead;

                      return (
                        <div
                          key={n.id}
                          className={`${styles.notificationCard} ${isUnread ? styles.notificationCardUnread : ''}`}
                          onClick={() => handleNotificationClick(n)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <span
                              style={{
                                background: badge.bg,
                                color: badge.color,
                                border: `1px solid ${badge.border}`,
                                borderRadius: '4px',
                                padding: '1px 6px',
                                fontSize: '0.675rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em',
                              }}
                            >
                              {badge.label}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', flexShrink: 0 }}>
                              {formatRelativeTime(n.createdAt)}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                            {n.title}
                          </div>

                          <div style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.35 }}>
                            {n.message}
                          </div>

                          {n.orderNumber && (
                            <div style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 600, marginTop: '2px' }}>
                              Order #{n.orderNumber} →
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <button className={styles.iconBtn} aria-label="Messages">
              <Mail size={18} />
            </button>

            <div className={styles.userCardWrapper}>
              <div 
                className={styles.userCard}
                onClick={() => setProfileOpen(!profileOpen)}
                id="admin-profile-trigger"
              >
                <div className={styles.userAvatar}>
                  <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#000' }}>
                    {adminUser?.email ? adminUser.email.charAt(0).toUpperCase() : 'A'}
                  </span>
                </div>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{adminUser?.email || 'ADRIZO Admin'}</span>
                  <span className={styles.userRole}>{adminUser?.role === 'ADMIN' ? 'Super Administrator' : 'Administrator'}</span>
                </div>
                <ChevronDown size={14} style={{ color: '#94a3b8', marginLeft: '2px' }} />
              </div>

              {/* Admin Profile Dropdown Menu */}
              {profileOpen && (
                <div className={styles.profileDropdown} id="admin-profile-dropdown">
                  <div className={styles.profileDropdownHeader}>
                    <div className={styles.profileDropdownEmail}>{adminUser?.email || 'care.adrizo@gmail.com'}</div>
                    <div className={styles.profileDropdownRole}>{adminUser?.role === 'ADMIN' ? 'Super Administrator' : 'Administrator'}</div>
                  </div>
                  <Link 
                    href="/admin/settings?tab=general" 
                    className={styles.profileDropdownItem}
                    onClick={() => setProfileOpen(false)}
                  >
                    <Settings size={15} />
                    <span>Store Settings</span>
                  </Link>
                  <button 
                    type="button"
                    className={`${styles.profileDropdownItem} ${styles.profileDropdownItemDanger}`}
                    onClick={async () => {
                      setProfileOpen(false);
                      await fetch('/api/admin/logout', { method: 'POST' });
                      window.location.href = '/admin/login';
                    }}
                  >
                    <LogOut size={15} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={styles.pageContent}>
          {children}
        </main>
      </div>
    </div>
  );
}
