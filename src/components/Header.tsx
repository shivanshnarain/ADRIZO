"use client";

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Search, User, Heart, ShoppingCart, Menu, X, ChevronDown, Truck, Sparkles, Package, MapPin, LogOut, ChevronRight, ArrowRight, Tag } from 'lucide-react';
import styles from './Header.module.css';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import AdrizoLogo from './AdrizoLogo';
import { getOptimizedImageUrl } from '@/lib/image-utils';

interface CatalogProduct {
  id: string;
  name: string;
  slug?: string;
  sku?: string;
  price: number;
  originalPrice?: number;
  image?: string;
  color?: string;
  productType?: string | null;
  gender?: string | null;
  category?: { id?: string; name: string; slug?: string } | null;
}

interface CategorySuggestion {
  name: string;
  href: string;
  keywords: string[];
}

const SEARCH_CATEGORY_SUGGESTIONS: CategorySuggestion[] = [
  { name: 'Polo T-Shirts', href: '/category/t-shirts', keywords: ['polo', 't-shirt', 'tshirt', 'shirts', 't-shirts'] },
  { name: 'Zipper Polo T-Shirts', href: '/category/zipper-polo', keywords: ['zipper polo', 'zipper', 'polo'] },
  { name: 'Button Polo T-Shirts', href: '/category/button-polo', keywords: ['button polo', 'button', 'polo'] },
  { name: 'Hoodies', href: '/category/hoodies', keywords: ['hoodie', 'hoodies', 'sweatshirt', 'fleece'] },
  { name: "Men's Collection", href: '/men', keywords: ['men', "men's", 'mens'] },
  { name: "Women's Collection", href: '/category/women', keywords: ['women', "women's", 'womens'] },
  { name: 'New Arrivals', href: '/shop?sort=new', keywords: ['new', 'arrivals'] },
];

// In-memory client cache for authoritative product catalog
let cachedCatalogProducts: CatalogProduct[] | null = null;
let catalogFetchPromise: Promise<CatalogProduct[]> | null = null;

async function fetchAuthoritativeCatalog(): Promise<CatalogProduct[]> {
  if (cachedCatalogProducts && cachedCatalogProducts.length > 0) return cachedCatalogProducts;
  if (!catalogFetchPromise) {
    catalogFetchPromise = fetch('/api/products/catalog')
      .then((res) => {
        if (!res.ok) throw new Error('Catalog fetch failed');
        return res.json();
      })
      .then((data) => {
        if (data && data.success && Array.isArray(data.products)) {
          cachedCatalogProducts = data.products;
          return data.products;
        }
        return [];
      })
      .catch((err) => {
        console.warn('Unable to load search catalog:', err);
        catalogFetchPromise = null;
        return [];
      });
  }
  return catalogFetchPromise;
}

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
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>(cachedCatalogProducts || []);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);



  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const shopDropdownRef = useRef<HTMLDivElement>(null);
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

  // Pre-load catalog into memory for 0ms instant keystroke autocomplete
  useEffect(() => {
    fetchAuthoritativeCatalog().then((prods) => {
      if (prods && prods.length > 0) {
        setCatalogProducts(prods);
      }
    });
  }, []);



  // Close shop dropdown on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shopDropdownRef.current && !shopDropdownRef.current.contains(e.target as Node)) {
        setIsShopDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsShopDropdownOpen(false);
      }
    };
    if (isShopDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isShopDropdownOpen]);

  // Close search overlay on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        const target = e.target as HTMLElement;
        if (target.closest('#mobile-search-btn') || target.closest('button[title="Search"]')) {
          return;
        }
        setIsSearchOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchOpen]);

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
    { name: 'MEN', href: '/men' },
    { name: 'WOMEN', href: '/category/women' },
    { name: 'NEW ARRIVALS', href: '/shop?sort=new' },
  ];

  const shopCategories = [
    { name: 'All Products', href: '/shop' },
    { name: "Men's Collection", href: '/men' },
    { name: "Women's Collection", href: '/category/women' },
    { name: 'T-Shirts (Polo & Classic)', href: '/category/t-shirts' },
    { name: 'Hoodies', href: '/category/hoodies' },
    { name: 'New Arrivals', href: '/shop?sort=new' },
  ];

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
      fetchAuthoritativeCatalog().then((prods) => {
        if (prods && prods.length > 0) {
          setCatalogProducts(prods);
        }
      });
    }
  }, [isSearchOpen]);

  // Intelligent real-time search suggestions with weighted relevance scoring
  const matchingSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { products: [], categories: [] };

    const tokens = q.split(/\s+/).filter(Boolean);

    // 1. Match relevant categories
    const matchedCategories = SEARCH_CATEGORY_SUGGESTIONS.filter((cat) => {
      const catName = cat.name.toLowerCase();
      if (catName.includes(q)) return true;
      return cat.keywords.some((kw) => kw.includes(q) || q.includes(kw));
    }).slice(0, 2);

    // 2. Score products dynamically against query
    const scoredProducts: Array<{ product: CatalogProduct; score: number }> = [];

    for (const prod of catalogProducts) {
      const name = (prod.name || '').toLowerCase();
      const color = (prod.color || '').toLowerCase();
      const pType = (prod.productType || '').toLowerCase();
      const cat = (prod.category?.name || '').toLowerCase();
      const gender = (prod.gender || '').toLowerCase();

      const nameWords = name.split(/\s+/);
      const colorWords = color.split(/\s+/);
      const pTypeWords = pType.split(/\s+/);

      let score = 0;

      // Exact prefix match on product name
      if (name.startsWith(q)) {
        score += 150;
      }

      // Any word in name starts with query (e.g. "P" matches "Polo", "PI" matches "Pink")
      if (nameWords.some((w) => w.startsWith(q))) {
        score += 80;
      }

      // Any word in color starts with query (e.g. "P" matches "Pink", "RED" matches "Red")
      if (colorWords.some((w) => w.startsWith(q))) {
        score += 65;
      }

      // Any word in product type starts with query
      if (pTypeWords.some((w) => w.startsWith(q))) {
        score += 55;
      }

      // Substring matches
      if (name.includes(q)) {
        score += 30;
      }
      if (color.includes(q)) {
        score += 25;
      }
      if (pType.includes(q)) {
        score += 20;
      }
      if (cat.includes(q)) {
        score += 15;
      }
      if (gender.includes(q)) {
        score += 10;
      }

      // Multi-token match bonus (e.g. "pink polo")
      if (tokens.length > 1) {
        const fullSearchable = `${name} ${color} ${pType} ${cat} ${gender}`;
        if (tokens.every((t) => fullSearchable.includes(t))) {
          score += 100;
        }
      }

      if (score > 0) {
        scoredProducts.push({ product: prod, score });
      }
    }

    scoredProducts.sort((a, b) => b.score - a.score);

    return {
      categories: matchedCategories,
      products: scoredProducts.slice(0, 6).map((item) => item.product),
    };
  }, [searchQuery, catalogProducts]);

  const totalSuggestionsCount =
    matchingSuggestions.categories.length + matchingSuggestions.products.length;

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
      setSelectedIndex(-1);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (totalSuggestionsCount > 0) {
        // totalSuggestionsCount index is "View all results" footer
        setSelectedIndex((prev) => (prev + 1) % (totalSuggestionsCount + 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (totalSuggestionsCount > 0) {
        setSelectedIndex((prev) => (prev <= 0 ? totalSuggestionsCount : prev - 1));
      }
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < matchingSuggestions.categories.length) {
        e.preventDefault();
        const targetCat = matchingSuggestions.categories[selectedIndex];
        router.push(targetCat.href);
        setIsSearchOpen(false);
        setSearchQuery('');
        setSelectedIndex(-1);
      } else if (
        selectedIndex >= matchingSuggestions.categories.length &&
        selectedIndex < totalSuggestionsCount
      ) {
        e.preventDefault();
        const targetProd =
          matchingSuggestions.products[selectedIndex - matchingSuggestions.categories.length];
        router.push(`/product/${targetProd.slug || targetProd.id}`);
        setIsSearchOpen(false);
        setSearchQuery('');
        setSelectedIndex(-1);
      } else {
        // Default form submission
        handleSearchSubmit(e);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
      setSearchQuery('');
      setSelectedIndex(-1);
    }
  };

  const handleShopClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (shopDropdownTimeoutRef.current) {
      clearTimeout(shopDropdownTimeoutRef.current);
    }
    setIsShopDropdownOpen((prev) => !prev);
    setIsUserDropdownOpen(false);
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
    }, 180);
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

        {/* Right Side: Search and Cart only */}
        <div className={styles.mobileRightActionIcons}>
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
                      ref={shopDropdownRef}
                      className={styles.dropdownContainer}
                      onMouseEnter={handleShopMouseEnter}
                      onMouseLeave={handleShopMouseLeave}
                    >
                      <button
                        type="button"
                        className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                        onClick={handleShopClick}
                        aria-expanded={isShopDropdownOpen}
                        aria-haspopup="true"
                        id="desktop-shop-menu-btn"
                      >
                        <span className={styles.navLinkText}>{item.name}</span>
                        <ChevronDown size={13} className={`${styles.dropdownChevron} ${isShopDropdownOpen ? styles.dropdownChevronOpen : ''}`} />
                        <span className={styles.navUnderline} />
                      </button>

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
          <div className={styles.searchContainer} ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
              <Search size={19} className={styles.searchFormIcon} />
              <input
                ref={searchInputRef}
                type="text"
                className={styles.searchFormInput}
                placeholder="Search luxury fashion, polo t-shirts, hoodies..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedIndex(-1);
                }}
                onKeyDown={handleSearchKeyDown}
              />
              {searchQuery && (
                <button
                  type="button"
                  className={styles.searchClearBtn}
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedIndex(-1);
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search query"
                >
                  <X size={14} />
                </button>
              )}
              <button
                type="button"
                className={styles.searchCloseBtn}
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                  setSelectedIndex(-1);
                }}
                aria-label="Close search"
              >
                <X size={18} />
              </button>
            </form>

            {/* REAL-TIME AUTOCOMPLETE SUGGESTIONS PANEL */}
            {searchQuery.trim().length > 0 && (
              <div className={styles.searchSuggestionsPanel}>
                {matchingSuggestions.categories.length === 0 && matchingSuggestions.products.length === 0 ? (
                  <div className={styles.suggestionsNoResults}>
                    <p style={{ margin: '0 0 0.35rem 0', fontWeight: 600, color: '#111111' }}>
                      No matching products found for &ldquo;{searchQuery.trim()}&rdquo;
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#71717a' }}>
                      Press Enter to search all collections or try another keyword.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Category Suggestions */}
                    {matchingSuggestions.categories.length > 0 && (
                      <div>
                        <div className={styles.suggestionsSectionTitle}>Collections & Categories</div>
                        {matchingSuggestions.categories.map((cat, idx) => {
                          const isHighlighted = selectedIndex === idx;
                          return (
                            <Link
                              key={cat.name}
                              href={cat.href}
                              className={`${styles.suggestionItem} ${isHighlighted ? styles.suggestionItemActive : ''}`}
                              onClick={() => {
                                setIsSearchOpen(false);
                                setSearchQuery('');
                                setSelectedIndex(-1);
                              }}
                            >
                              <div className={styles.suggestionLeft}>
                                <div className={styles.suggestionCategoryIcon}>
                                  <Tag size={16} />
                                </div>
                                <div className={styles.suggestionTextGroup}>
                                  <span className={styles.suggestionTitle}>{cat.name}</span>
                                  <span className={styles.suggestionSubtitle}>Explore Collection</span>
                                </div>
                              </div>
                              <div className={styles.suggestionRight}>
                                <ChevronRight size={16} className={styles.suggestionArrow} />
                              </div>
                            </Link>
                          );
                        })}
                        {matchingSuggestions.products.length > 0 && <div className={styles.suggestionsDivider} />}
                      </div>
                    )}

                    {/* Product Suggestions */}
                    {matchingSuggestions.products.length > 0 && (
                      <div>
                        <div className={styles.suggestionsSectionTitle}>Products</div>
                        {matchingSuggestions.products.map((prod, idx) => {
                          const itemIndex = matchingSuggestions.categories.length + idx;
                          const isHighlighted = selectedIndex === itemIndex;
                          const productUrl = `/product/${prod.slug || prod.id}`;
                          const thumbUrl = prod.image && prod.image !== '/placeholder.png'
                            ? getOptimizedImageUrl(prod.image, { width: 80 })
                            : '/placeholder.png';

                          const subtitleParts = [
                            prod.color && prod.color !== 'Standard' ? prod.color : null,
                            prod.category?.name || prod.productType || null,
                          ].filter(Boolean);

                          return (
                            <Link
                              key={prod.id}
                              href={productUrl}
                              className={`${styles.suggestionItem} ${isHighlighted ? styles.suggestionItemActive : ''}`}
                              onClick={() => {
                                setIsSearchOpen(false);
                                setSearchQuery('');
                                setSelectedIndex(-1);
                              }}
                            >
                              <div className={styles.suggestionLeft}>
                                <img
                                  src={thumbUrl}
                                  alt={prod.name}
                                  className={styles.suggestionThumb}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=200';
                                  }}
                                />
                                <div className={styles.suggestionTextGroup}>
                                  <span className={styles.suggestionTitle}>{prod.name}</span>
                                  {subtitleParts.length > 0 && (
                                    <span className={styles.suggestionSubtitle}>
                                      {subtitleParts.join(' • ')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className={styles.suggestionRight}>
                                {prod.price > 0 && (
                                  <span className={styles.suggestionPrice}>
                                    ₹{prod.price.toLocaleString('en-IN')}
                                  </span>
                                )}
                                <ChevronRight size={16} className={styles.suggestionArrow} />
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}

                    {/* View All Results Footer */}
                    <div
                      className={`${styles.suggestionsFooter} ${selectedIndex === totalSuggestionsCount ? styles.suggestionsFooterActive : ''}`}
                      onClick={() => {
                        router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
                        setIsSearchOpen(false);
                        setSearchQuery('');
                        setSelectedIndex(-1);
                      }}
                    >
                      <span>View all results for &ldquo;{searchQuery.trim()}&rdquo;</span>
                      <ArrowRight size={14} />
                    </div>
                  </>
                )}
              </div>
            )}
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
