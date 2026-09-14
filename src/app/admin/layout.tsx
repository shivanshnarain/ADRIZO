"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
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
  HelpCircle,
  Sliders,
  Star,
  Camera
} from 'lucide-react';
import styles from './admin.module.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [productsOpen, setProductsOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<{ email?: string; role?: string } | null>(null);

  useEffect(() => {
    if (pathname === '/admin/login') return;

    fetch('/api/admin/me')
      .then((res) => {
        if (!res.ok) {
          window.location.href = `/admin/login?from=${encodeURIComponent(pathname)}`;
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.authenticated) {
          setAdminUser(data.admin);
        } else if (data && !data.authenticated) {
          window.location.href = `/admin/login?from=${encodeURIComponent(pathname)}`;
        }
      })
      .catch(() => {});
  }, [pathname]);

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
    { label: 'Hero Banners', href: '/admin/banners', category: 'CMS' },
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

          {/* 5. CMS / Hero Banners */}
          <Link 
            href="/admin/banners" 
            className={`${styles.navItem} ${pathname.includes('/admin/banners') ? styles.navItemActive : ''}`}
          >
            <Globe size={18} />
            <span>CMS / Hero Banners</span>
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

          {/* 7. Settings */}
          <Link 
            href="/admin/settings?tab=general" 
            className={`${styles.navItem} ${pathname.includes('tab=general') ? styles.navItemActive : ''}`}
          >
            <Settings size={18} />
            <span>Settings</span>
          </Link>
        </nav>

        {/* Bottom Help Card */}
        <div className={styles.helpBox}>
          <div className={styles.helpBoxHeader}>
            <HelpCircle size={22} className={styles.helpIcon} />
            <div>
              <div className={styles.helpTitle}>Need Help?</div>
              <div className={styles.helpSubtitle}>Contact our support</div>
            </div>
          </div>
          <button 
            type="button" 
            className={styles.contactSupportBtn}
            onClick={() => window.open('mailto:support@adrizo.com')}
          >
            Contact Support
          </button>
        </div>

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
              <span className={styles.yellowBadge}>2</span>
            </button>
            {notificationsOpen && (
              <div className={styles.notificationsDropdown} id="admin-notifications-dropdown">
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9', marginBottom: '0.5rem' }}>
                  Notifications (2)
                </div>
                <div style={{ fontSize: '0.75rem', padding: '0.4rem 0', color: '#334155' }}>
                  • <strong>Customer Photos:</strong> Showcase updated with latest active photos.
                </div>
                <div style={{ fontSize: '0.75rem', padding: '0.4rem 0', color: '#334155' }}>
                  • <strong>Orders:</strong> 2 new orders awaiting dispatch sync.
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
