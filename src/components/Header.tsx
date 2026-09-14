"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Search, User, Heart, ShoppingCart, Menu, X, ChevronDown, Truck, Sparkles, Package, MapPin, LogOut, Share2 } from 'lucide-react';
import styles from './Header.module.css';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import AdrizoLogo from './AdrizoLogo';
import { executeShare } from '@/lib/share';

export default function Header() {
  const { itemCount, setIsCartOpen } = useCart();
  const { user, logout, openAuthModal } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const shopDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Close user dropdown on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsUserDropdownOpen(false);
      }
    };
    if (isUserDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserDropdownOpen]);

  // Generate safe customer initials (strictly avoiding 'Administrator' or 'Admin')
  const getInitials = (name?: string, email?: string | null): string => {
    const cleanName = (name || '').trim();
    if (cleanName && cleanName.toLowerCase() !== 'administrator' && cleanName.toLowerCase() !== 'admin') {
      const parts = cleanName.split(/\s+/);
      if (parts.length >= 2 && parts[0][0] && parts[1][0]) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return cleanName.slice(0, 2).toUpperCase();
    }
    const cleanEmail = (email || '').trim();
    if (cleanEmail) {
      const localPart = cleanEmail.split('@')[0];
      return localPart.slice(0, 2).toUpperCase();
    }
    return 'CU';
  };

  const navItems = [
    { name: 'HOME', href: '/' },
    { name: 'SHOP', href: '/shop', hasDropdown: true },
    { name: 'MEN', href: '/category/men' },
    { name: 'WOMEN', href: '/category/women' },
    { name: 'NEW ARRIVALS', href: '/shop?sort=new' },
  ];

  const shopCategories = [
    { name: 'All Products', href: '/shop' },
    { name: "Men's Collection", href: '/category/men' },
    { name: "Women's Collection", href: '/category/women' },
    { name: 'T-Shirts (Polo & Classic)', href: '/category/t-shirts' },
    { name: 'Hoodies', href: '/category/hoodies' },
    { name: 'New Arrivals', href: '/shop?sort=new' },
  ];

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
    }
  };

  const handleShopMouseEnter = () => {
    if (shopDropdownTimeoutRef.current) {
      clearTimeout(shopDropdownTimeoutRef.current);
    }
    setIsShopDropdownOpen(true);
  };

  const handleShopMouseLeave = () => {
    shopDropdownTimeoutRef.current = setTimeout(() => {
      setIsShopDropdownOpen(false);
    }, 150);
  };

  const handleHeaderShare = async () => {
    await executeShare({
      title: typeof document !== 'undefined' ? document.title : 'ADRIZO',
      url: typeof window !== 'undefined' ? window.location.href : 'https://adrizo.com',
    });
  };

  return (
    <header className={styles.navbarHeader}>
      {/* =========================================
          1. TOP PROMOTIONAL ANNOUNCEMENT BAR
         ========================================= */}
      <div className={styles.topPromoBar}>
        <div className={styles.topPromoContainer}>
          <div className={styles.promoItem}>
            <Truck size={14} className={styles.promoIconTruck} />
            <span>FREE SHIPPING ON ORDERS ABOVE ₹999</span>
          </div>
          <span className={styles.promoDivider}>|</span>
          <div className={styles.promoItem}>
            <Sparkles size={13} className={styles.promoIconSparkle} />
            <span>NEW ARRIVALS JUST LANDED</span>
          </div>
        </div>
      </div>

      {/* =========================================
          PHONE / MOBILE ONLY NAVBAR (≤ 767px)
          Frameless, compact, clean, matches Reference Image 1
         ========================================= */}
      <div className={styles.mobileNavbar}>
        {/* Left Side: Hamburger menu icon */}
        <button
          type="button"
          className={styles.mobileThreeDotBtn}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Open navigation menu"
          aria-expanded={isMobileMenuOpen}
          id="mobile-nav-menu-btn"
        >
          {isMobileMenuOpen ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
        </button>

        {/* Center: ADRIZO Logo (cleaned transparent artwork) */}
        <Link href="/" className={styles.mobileBrandWordmarkGroup} aria-label="ADRIZO Home">
          <Image
            src="/adrizo-logo-transparent.png"
            alt="ADRIZO"
            width={146}
            height={20}
            priority
            className={styles.mobileNavbarLogoImg}
          />
        </Link>

        {/* Right Side: Share, Search and Cart */}
        <div className={styles.mobileRightActionIcons}>
          <button
            type="button"
            className={styles.mobileIconBtn}
            onClick={handleHeaderShare}
            aria-label="Share"
            title="Share"
            id="mobile-share-btn"
          >
            <Share2 size={18} strokeWidth={1.8} />
          </button>

          <button
            type="button"
            className={`${styles.mobileIconBtn} ${isSearchOpen ? styles.mobileIconBtnActive : ''}`}
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            aria-label="Search"
            title="Search"
            id="mobile-search-btn"
          >
            <Search size={19} strokeWidth={1.8} />
          </button>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className={`${styles.mobileIconBtn} ${styles.mobileCartBtn}`}
            aria-label="Shopping Cart"
            title="Shopping Cart"
            id="mobile-cart-btn"
          >
            <ShoppingCart size={19} strokeWidth={1.8} />
            {itemCount > 0 && (
              <span className={styles.mobileCartBadge}>{itemCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* =========================================
          2. MAIN NAVBAR WITH CONNECTED BLACK STRUCTURE (DESKTOP / TABLET ≥ 768px)
         ========================================= */}
      <div className={styles.navbarWrapper}>
        <div className={styles.navbarContainer}>
          {/* ZONE 1: LEFT BLACK SECTION (PILL + TRANSITION CURVE) */}
          <div className={styles.leftSectionWrapper}>
            <div className={styles.leftCapsuleWrapper}>
              <Link href="/" className={styles.brandCapsule} aria-label="ADRIZO Home">
                <div className={styles.brandContent}>
                  <AdrizoLogo height={22} accentColor="#FFC800" wordmarkColor="#ffffff" />
                </div>
              </Link>
            </div>

            {/* LEFT ORGANIC TRANSITION S-CURVE (Pill to Bottom Base) */}
            <div className={styles.leftTransitionWrapper} aria-hidden="true">
              <svg
                viewBox="0 0 56 52"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={styles.transitionSvg}
                preserveAspectRatio="none"
                shapeRendering="geometricPrecision"
              >
                <path
                  d="M 0 0 C 28 0, 28 44, 56 44 L 56 52 L 0 52 Z"
                  fill="#111111"
                />
              </svg>
            </div>
          </div>

          {/* ZONE 2: CENTER WHITE NAVIGATION AREA */}
          <nav className={styles.centerNavArea} aria-label="Main Navigation">
            <div className={styles.navLinksWrapper}>
              {navItems.map((item) => {
                const isExactMatch = item.href === '/' ? pathname === '/' : pathname === item.href;
                const isActive = isExactMatch;

                if (item.hasDropdown) {
                  return (
                    <div
                      key={item.name}
                      className={styles.dropdownContainer}
                      onMouseEnter={handleShopMouseEnter}
                      onMouseLeave={handleShopMouseLeave}
                    >
                      <Link
                        href={item.href}
                        className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                      >
                        <span className={styles.navLinkText}>{item.name}</span>
                        <ChevronDown size={13} className={`${styles.dropdownChevron} ${isShopDropdownOpen ? styles.dropdownChevronOpen : ''}`} />
                        <span className={styles.navUnderline} />
                      </Link>

                      {isShopDropdownOpen && (
                        <div className={styles.shopDropdownMenu}>
                          {shopCategories.map((cat) => (
                            <Link
                              key={cat.name}
                              href={cat.href}
                              className={styles.shopDropdownItem}
                              onClick={() => setIsShopDropdownOpen(false)}
                            >
                              {cat.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                  >
                    <span className={styles.navLinkText}>{item.name}</span>
                    <span className={styles.navUnderline} />
                  </Link>
                );
              })}
            </div>
            {/* Horizontal Black Base Line running along the bottom */}
            <div className={styles.connectingBaseLine} />
          </nav>

          {/* ZONE 3: RIGHT BLACK SECTION (TRANSITION CURVE + PILL) */}
          <div className={styles.rightSectionWrapper}>
            {/* RIGHT ORGANIC TRANSITION S-CURVE (Bottom Base to Pill) */}
            <div className={styles.rightTransitionWrapper} aria-hidden="true">
              <svg
                viewBox="0 0 56 52"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={styles.transitionSvg}
                preserveAspectRatio="none"
                shapeRendering="geometricPrecision"
              >
                <path
                  d="M 0 44 C 28 44, 28 0, 56 0 L 56 52 L 0 52 Z"
                  fill="#111111"
                />
              </svg>
            </div>

            <div className={styles.rightCapsuleWrapper}>
              <div className={styles.iconCapsule}>
                <div className={styles.iconGroup}>
                  {/* 1. Search Icon */}
                  <button
                    type="button"
                    className={`${styles.iconButton} ${isSearchOpen ? styles.iconActive : ''}`}
                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                    aria-label="Search"
                    title="Search"
                  >
                    <Search size={18} strokeWidth={1.8} />
                  </button>

                  {/* 2. Login / Account Section */}
                  {user ? (
                    <div className={styles.userProfileContainer} ref={userDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                        className={`${styles.userAvatarBtn} ${isUserDropdownOpen ? styles.userAvatarBtnActive : ''}`}
                        aria-label="Customer Account Menu"
                        aria-expanded={isUserDropdownOpen}
                        title={`Account: ${user.name || user.email}`}
                        id="navbar-user-avatar-btn"
                      >
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.name || 'Account'} className={styles.avatarImg} />
                        ) : (
                          <div className={styles.avatarCircle}>{getInitials(user.name, user.email)}</div>
                        )}
                      </button>

                      {/* Interactive Customer Dropdown */}
                      {isUserDropdownOpen && (
                        <div className={styles.userDropdownMenu}>
                          <div className={styles.dropdownHeader}>
                            <div className={styles.dropdownAvatarCircle}>
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt={user.name || 'Account'} />
                              ) : (
                                <span>{getInitials(user.name, user.email)}</span>
                              )}
                            </div>
                            <div className={styles.dropdownUserInfo}>
                              <div className={styles.dropdownUserName}>{user.name || 'Customer'}</div>
                              <div className={styles.dropdownUserEmail}>{user.email}</div>
                            </div>
                          </div>

                          <div className={styles.dropdownDivider} />

                          <Link
                            href="/account"
                            className={styles.dropdownItem}
                            onClick={() => setIsUserDropdownOpen(false)}
                          >
                            <User size={15} />
                            <span>My Account</span>
                          </Link>

                          <Link
                            href="/account?tab=orders"
                            className={styles.dropdownItem}
                            onClick={() => setIsUserDropdownOpen(false)}
                          >
                            <Package size={15} />
                            <span>My Orders</span>
                          </Link>

                          <Link
                            href="/account?tab=address"
                            className={styles.dropdownItem}
                            onClick={() => setIsUserDropdownOpen(false)}
                          >
                            <MapPin size={15} />
                            <span>Saved Address</span>
                          </Link>

                          <div className={styles.dropdownDivider} />

                          <button
                            type="button"
                            className={`${styles.dropdownItem} ${styles.dropdownLogout}`}
                            onClick={async () => {
                              setIsUserDropdownOpen(false);
                              await logout();
                            }}
                          >
                            <LogOut size={15} />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openAuthModal('SIGN_IN')}
                      className={styles.accountLoginBtn}
                      aria-label="Account / Login"
                      title="Account / Login"
                      id="navbar-account-login-btn"
                    >
                      <User size={16} strokeWidth={2} />
                      <span className={styles.accountLoginLabel}>Account / Login</span>
                    </button>
                  )}

                  {/* Share Icon */}
                  <button
                    type="button"
                    onClick={handleHeaderShare}
                    className={styles.iconButton}
                    aria-label="Share"
                    title="Share"
                    id="desktop-header-share-btn"
                  >
                    <Share2 size={18} strokeWidth={1.8} />
                  </button>

                  {/* 3. Wishlist / Favorite Icon */}
                  <Link
                    href="/wishlist"
                    className={styles.iconButton}
                    aria-label="Wishlist"
                    title="Wishlist"
                  >
                    <Heart size={18} strokeWidth={1.8} />
                  </Link>

                  {/* 4. Cart Icon */}
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(true)}
                    className={`${styles.iconButton} ${styles.cartButton}`}
                    aria-label="Shopping Cart"
                    title="Shopping Cart"
                  >
                    <ShoppingCart size={18} strokeWidth={1.8} />
                    {itemCount > 0 && (
                      <span className={styles.cartBadge}>{itemCount}</span>
                    )}
                  </button>

                  {/* Mobile Menu Toggle button */}
                  <button
                    type="button"
                    className={styles.mobileHamburgerBtn}
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label="Toggle Mobile Menu"
                  >
                    {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          EXPANDABLE SEARCH DRAWER / OVERLAY
         ========================================= */}
      {isSearchOpen && (
        <div className={styles.searchOverlay}>
          <div className={styles.searchContainer}>
            <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
              <Search size={19} className={styles.searchFormIcon} />
              <input
                ref={searchInputRef}
                type="text"
                className={styles.searchFormInput}
                placeholder="Search luxury fashion, polo shirts, denim..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="button"
                className={styles.searchCloseBtn}
                onClick={() => setIsSearchOpen(false)}
                aria-label="Close search"
              >
                <X size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          MOBILE NAVIGATION DRAWER
         ========================================= */}
      {isMobileMenuOpen && (
        <div className={styles.mobileNavDrawer}>
          {/* Mobile User Authentication / Profile Banner */}
          <div className={styles.mobileUserSection}>
            {user ? (
              <div className={styles.mobileUserCard}>
                <div className={styles.mobileUserHeader}>
                  <div className={styles.mobileUserAvatar}>
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name || 'Account'} />
                    ) : (
                      <span>{getInitials(user.name, user.email)}</span>
                    )}
                  </div>
                  <div className={styles.mobileUserMeta}>
                    <div className={styles.mobileUserName}>{user.name || 'Customer'}</div>
                    <div className={styles.mobileUserEmail}>{user.email}</div>
                  </div>
                </div>
                <div className={styles.mobileUserLinks}>
                  <Link
                    href="/account"
                    className={styles.mobileUserActionLink}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User size={14} />
                    <span>My Account</span>
                  </Link>
                  <Link
                    href="/account?tab=orders"
                    className={styles.mobileUserActionLink}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Package size={14} />
                    <span>My Orders</span>
                  </Link>
                  <Link
                    href="/account?tab=address"
                    className={styles.mobileUserActionLink}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <MapPin size={14} />
                    <span>Saved Address</span>
                  </Link>
                  <button
                    type="button"
                    className={styles.mobileLogoutBtn}
                    onClick={async () => {
                      setIsMobileMenuOpen(false);
                      await logout();
                    }}
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={styles.mobileAccountLoginBtn}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openAuthModal('SIGN_IN');
                }}
              >
                <User size={16} />
                <span>Account / Login</span>
              </button>
            )}
          </div>

          <div className={styles.mobileNavLinks}>
            {navItems.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname?.startsWith(item.href.split('?')[0]);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${styles.mobileNavLink} ${isActive ? styles.mobileNavLinkActive : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              );
            })}
            <Link
              href="/wishlist"
              className={`${styles.mobileNavLink} ${pathname === '/wishlist' ? styles.mobileNavLinkActive : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              WISHLIST
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
