"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import CodSuccessModal from '@/components/CodSuccessModal';
import PhoneOtpAuth from '@/components/PhoneOtpAuth';
import { 
  Check, 
  MapPin, 
  Truck, 
  CreditCard, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft,
  Lock, 
  HelpCircle, 
  X, 
  ShoppingBag,
  AlertCircle,
  LogIn,
  UserPlus,
  KeyRound,
  CheckCircle2,
  Phone,
  Mail,
  User,
  Building,
  Home,
  Plus,
  Minus,
  Edit3,
  Trash2,
  Sparkles,
  RefreshCw,
  Award,
  Headphones
} from 'lucide-react';
import styles from './checkout.module.css';
import AddressFormModal from '@/components/AddressFormModal';
import ConfirmDeleteAddressModal from '@/components/ConfirmDeleteAddressModal';
import PromoBundleRemovalModal from '@/components/PromoBundleRemovalModal';
import AddCheckoutItemModal from '@/components/AddCheckoutItemModal';
import EditCheckoutItemModal from '@/components/EditCheckoutItemModal';
import { POLICY_CONFIG } from '@/config/policies';
import { ADRIZO_LOGO_DATA_URI } from '@/lib/brand-logo';
import { 
  getStatesList, 
  getDistrictsForState,
  getLocationsForDistrict,
  getPincodesForLocation,
  checkPinDeliverability,
  lookupPincode 
} from '@/data/indiaLocations';

interface BuyNowItem {
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  image: string;
  size: string;
  color: string;
  quantity: number;
  sku?: string;
  maxStock?: number;
}

export default function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    cart, 
    clearCart, 
    updateQuantity, 
    removeFromCart, 
    editCartItem,
    setIsCartOpen, 
    addToCart, 
    openBogoSelectorForBundle, 
    dissolvePromoBundle,
    bogoPromoConfig,
  } = useCart();
  const { user, loading: authLoading, logout, fetchUser } = useAuth();

  const isBuyNowMode = searchParams.get('buyNow') === '1';

  // Buy Now item state
  const [buyNowItem, setBuyNowItem] = useState<BuyNowItem | null>(null);
  const [loadingBuyNow, setLoadingBuyNow] = useState(isBuyNowMode);

  // Load Buy Now item from sessionStorage if in buyNowMode
  useEffect(() => {
    if (isBuyNowMode && typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('adrizo_buy_now');
        if (stored) {
          setBuyNowItem(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Failed to load buy now item', err);
      } finally {
        setLoadingBuyNow(false);
      }
    } else {
      setLoadingBuyNow(false);
    }
  }, [isBuyNowMode]);

  // Checkout Items: either single buyNowItem or cart items
  const checkoutItems = useMemo(() => {
    if (isBuyNowMode && buyNowItem) {
      return [{
        id: `${buyNowItem.productId}-${buyNowItem.size}`,
        productId: buyNowItem.productId,
        name: buyNowItem.name,
        price: buyNowItem.price,
        originalPrice: buyNowItem.originalPrice || buyNowItem.price,
        image: buyNowItem.image,
        size: buyNowItem.size,
        color: buyNowItem.color,
        quantity: buyNowItem.quantity,
        sku: buyNowItem.sku,
        isFree: false,
        promotionRule: undefined as string | undefined,
        parentId: undefined as string | undefined,
        promoGroupId: undefined as string | undefined,
      }];
    }
    return cart.map(item => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      price: item.isFree ? 0 : item.price,
      originalPrice: item.originalPrice || item.price,
      image: item.image,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      sku: item.sku,
      isFree: Boolean(item.isFree),
      promotionRule: item.promotionRule,
      parentId: item.parentId,
      promoGroupId: item.promoGroupId,
    }));
  }, [isBuyNowMode, buyNowItem, cart]);

  // Calculations: Free promotional items contribute ₹0 to rawSubtotal
  const rawSubtotal = useMemo(() => {
    return checkoutItems.reduce((acc, item) => acc + ((item.isFree ? 0 : item.price) * item.quantity), 0);
  }, [checkoutItems]);

  const rawMrpTotal = useMemo(() => {
    return checkoutItems.reduce((acc, item) => acc + ((item.originalPrice || item.price) * item.quantity), 0);
  }, [checkoutItems]);

  const mrpSavings = useMemo(() => {
    return rawMrpTotal > rawSubtotal ? rawMrpTotal - rawSubtotal : 0;
  }, [rawMrpTotal, rawSubtotal]);

  // Step state: 1: Auth, 2: Address, 3: Payment
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [addressConfirmed, setAddressConfirmed] = useState(false);

  // Sync step with auth status
  useEffect(() => {
    if (user && currentStep === 1) {
      setCurrentStep(2);
    }
  }, [user, currentStep]);

  // =========================================================================
  // STEP 1: AUTHENTICATION INLINE STATE
  // =========================================================================
  const [authTab, setAuthTab] = useState<'otp' | 'login' | 'signup' | 'forgot'>('otp');
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Signup form
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');

  // Forgot Password form
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');

  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await fetchUser();
        setCurrentStep(2);
      } else {
        setLoginError(data.error || 'Invalid email or password.');
      }
    } catch {
      setLoginError('Login request failed. Please check your network connection.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleInlineSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');

    if (!signupName.trim()) {
      setSignupError('Please enter your full name.');
      return;
    }
    const cleanPhone = signupPhone.trim().replace(/\D/g, '');
    if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setSignupError('Enter a valid 10-digit mobile number.');
      return;
    }
    if (!signupEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail.trim())) {
      setSignupError('Please enter a valid email address.');
      return;
    }
    if (!signupPassword || signupPassword.length < 6) {
      setSignupError('Password must be at least 6 characters long.');
      return;
    }

    setSignupLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName.trim(),
          email: signupEmail.trim(),
          phone: cleanPhone,
          password: signupPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await fetchUser();
        setCurrentStep(2);
      } else {
        setSignupError(data.error || 'Registration failed. Please try again.');
      }
    } catch {
      setSignupError('Signup request failed. Please check your connection.');
    } finally {
      setSignupLoading(false);
    }
  };

  const handleInlineForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');

    if (!forgotEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) {
      setForgotError('Please enter a valid email address.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setForgotMessage('Password reset link sent! Check your inbox.');
      } else {
        setForgotError(data.error || 'Failed to send reset link.');
      }
    } catch {
      setForgotError('Request failed. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  // =========================================================================
  // STEP 2: CASCADING DELIVERY ADDRESS STATE
  // =========================================================================
  const allStates = useMemo(() => getStatesList(), []);
  
  const [addressForm, setAddressForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    flatHouseBuilding: '',
    areaStreetSector: '',
    landmark: '',
    state: 'Delhi',
    district: 'Central Delhi',
    city: 'Connaught Place',
    pincode: '110001',
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderNumber: string;
    total: number;
    codConfirmationPaid?: number;
    codRemaining?: number;
    address: string;
    paymentMethod: string;
  } | null>(null);
  const isSubmittingRef = useRef(false);

  // Customer Saved Addresses in Checkout
  const [customerAddresses, setCustomerAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState<any | null>(null);
  const [addressToDelete, setAddressToDelete] = useState<any | null>(null);
  const [isDeletingAddress, setIsDeletingAddress] = useState(false);
  const [addressSwitchNotice, setAddressSwitchNotice] = useState('');
  const [bundleRemovalTarget, setBundleRemovalTarget] = useState<{ promoGroupId: string; itemId: string } | null>(null);
  const [isChangeAddressOpen, setIsChangeAddressOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<any | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [itemToReplace, setItemToReplace] = useState<any | null>(null);

  const applyAddressToForm = (addr: any) => {
    if (!addr) return;
    setSelectedAddressId(addr.id || null);
    if (addr.id && typeof window !== 'undefined') {
      sessionStorage.setItem('adrizo_selected_address_id', addr.id);
    }
    setAddressForm(prev => ({
      ...prev,
      fullName: addr.full_name || prev.fullName,
      phone: addr.phone || prev.phone,
      flatHouseBuilding: addr.address || prev.flatHouseBuilding,
      areaStreetSector: addr.area || '',
      landmark: addr.landmark || '',
      state: addr.state || prev.state,
      city: addr.city || prev.city,
      district: addr.district || prev.district,
      pincode: addr.pincode || prev.pincode,
    }));
  };

  const handleSelectAddress = (addr: any) => {
    applyAddressToForm(addr);
    setAddressConfirmed(true);
    setCurrentStep(3);
  };

  const handleBackToCart = () => {
    if (isBuyNowMode && buyNowItem) {
      addToCart({
        id: `${buyNowItem.productId}-${buyNowItem.size}`,
        productId: buyNowItem.productId,
        name: buyNowItem.name,
        price: buyNowItem.price,
        originalPrice: buyNowItem.originalPrice || buyNowItem.price,
        image: buyNowItem.image,
        size: buyNowItem.size,
        color: buyNowItem.color,
        quantity: buyNowItem.quantity,
        maxStock: buyNowItem.maxStock || 10,
        sku: buyNowItem.sku,
        isFree: false,
      });
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('adrizo_buy_now');
      }
      router.replace('/checkout');
    }
    setIsCartOpen(true);
  };

  const handleDeleteAddressConfirm = async () => {
    if (!addressToDelete) return;
    setIsDeletingAddress(true);
    try {
      const res = await fetch(`/api/customer/addresses?id=${addressToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete address.');
      }

      const remaining = customerAddresses.filter(a => a.id !== addressToDelete.id);
      setCustomerAddresses(remaining);

      // If the deleted address is currently selected, safely switch or reset
      if (selectedAddressId === addressToDelete.id) {
        if (remaining.length > 0) {
          const nextAddr = remaining.find(a => a.is_default) || remaining[0];
          applyAddressToForm(nextAddr);
          setAddressConfirmed(true);
          setAddressSwitchNotice(`Switched delivery address to ${nextAddr.full_name} (${nextAddr.city}).`);
          setTimeout(() => setAddressSwitchNotice(''), 4500);
        } else {
          setSelectedAddressId(null);
          setAddressConfirmed(false);
          setCurrentStep(2);
          setAddressSwitchNotice('Selected address was deleted. Please add or select another address.');
          setTimeout(() => setAddressSwitchNotice(''), 4500);
        }
      }

      setAddressToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete address.');
    } finally {
      setIsDeletingAddress(false);
    }
  };

  const handleAddressSaved = (savedAddr: any) => {
    setCustomerAddresses(prev => {
      const idx = prev.findIndex(a => a.id === savedAddr.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = savedAddr;
        return updated;
      }
      return [savedAddr, ...prev];
    });

    handleSelectAddress(savedAddr);
  };

  const handleUpdateItemQty = (item: any, delta: number) => {
    if (isBuyNowMode && buyNowItem) {
      const newQty = buyNowItem.quantity + delta;
      if (newQty <= 0) {
        setBuyNowItem(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('adrizo_buy_now');
        }
      } else {
        const updated = { ...buyNowItem, quantity: newQty };
        setBuyNowItem(updated);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('adrizo_buy_now', JSON.stringify(updated));
        }
      }
      return;
    }

    if (item.quantity + delta <= 0) {
      removeFromCart(item.id);
    } else {
      updateQuantity(item.id, delta);
    }
  };

  const handleRemoveOrderItem = (item: any) => {
    if (item.promoGroupId) {
      setBundleRemovalTarget({ promoGroupId: item.promoGroupId, itemId: item.id });
      return;
    }

    if (isBuyNowMode && buyNowItem) {
      setBuyNowItem(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('adrizo_buy_now');
      }
      return;
    }

    removeFromCart(item.id);
  };

  const handleEditOrderItem = (item: any) => {
    if (item.promoGroupId) {
      openBogoSelectorForBundle(item.promoGroupId);
    } else {
      setItemToEdit(item);
    }
  };

  const handleEditItemSave = (updates: { id: string; size: string; quantity: number }) => {
    if (isBuyNowMode && buyNowItem) {
      const updated = { ...buyNowItem, size: updates.size, quantity: updates.quantity };
      setBuyNowItem(updated);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('adrizo_buy_now', JSON.stringify(updated));
      }
      return;
    }
    editCartItem(updates.id, { size: updates.size, quantity: updates.quantity });
  };

  const handleReplaceItemInitiate = (oldItem: any) => {
    setItemToReplace(oldItem);
    setIsAddModalOpen(true);
  };

  const handleAddItemToOrder = (prod: any) => {
    if (itemToReplace) {
      if (isBuyNowMode && buyNowItem) {
        const rep = {
          productId: prod.productId,
          name: prod.name,
          price: prod.price,
          originalPrice: prod.originalPrice,
          image: prod.image,
          size: prod.size,
          color: prod.color,
          quantity: 1,
          sku: prod.sku,
          maxStock: prod.maxStock,
        };
        setBuyNowItem(rep);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('adrizo_buy_now', JSON.stringify(rep));
        }
      } else {
        removeFromCart(itemToReplace.id);
        addToCart(prod);
      }
      setItemToReplace(null);
      return;
    }

    if (isBuyNowMode && buyNowItem) {
      addToCart({
        id: `${buyNowItem.productId}-${buyNowItem.size}`,
        productId: buyNowItem.productId,
        name: buyNowItem.name,
        price: buyNowItem.price,
        originalPrice: buyNowItem.originalPrice || buyNowItem.price,
        image: buyNowItem.image,
        size: buyNowItem.size,
        color: buyNowItem.color,
        quantity: buyNowItem.quantity,
        sku: buyNowItem.sku,
        maxStock: buyNowItem.maxStock || 10,
        isFree: false,
      });
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('adrizo_buy_now');
      }
      setBuyNowItem(null);
      router.replace('/checkout');
    }
    addToCart(prod);
  };

  // Group checkout items: Promotional bundles vs regular items
  const { promoBundles, regularCheckoutItems } = useMemo(() => {
    const bundlesMap = new Map<string, typeof checkoutItems>();
    const regular: typeof checkoutItems = [];

    checkoutItems.forEach(item => {
      if ((item as any).promoGroupId) {
        const gid = (item as any).promoGroupId;
        if (!bundlesMap.has(gid)) {
          bundlesMap.set(gid, []);
        }
        bundlesMap.get(gid)!.push(item);
      } else {
        regular.push(item);
      }
    });

    return {
      promoBundles: Array.from(bundlesMap.entries()).map(([groupId, items]) => ({
        groupId,
        items,
        paidItem: items.find(i => !i.isFree) || items[0],
        freeItems: items.filter(i => i.isFree),
      })),
      regularCheckoutItems: regular,
    };
  }, [checkoutItems]);

  useEffect(() => {
    if (user) {
      fetch('/api/customer/addresses')
        .then(res => res.json())
        .then(data => {
          if (data && data.success && Array.isArray(data.addresses) && data.addresses.length > 0) {
            setCustomerAddresses(data.addresses);
            const savedSelectedId = typeof window !== 'undefined' ? sessionStorage.getItem('adrizo_selected_address_id') : null;
            const target = data.addresses.find((a: any) => a.id === savedSelectedId)
              || data.addresses.find((a: any) => a.is_default)
              || data.addresses[0];
            if (target) {
              applyAddressToForm(target);
              setAddressConfirmed(true);
            }
          }
        })
        .catch(err => console.warn('[Checkout saved addresses warning]', err));
    }
  }, [user]);

  // Available districts for current state
  const availableDistricts = useMemo(() => {
    return getDistrictsForState(addressForm.state);
  }, [addressForm.state]);

  // Available cities / towns / locations for current district
  const availableLocations = useMemo(() => {
    return getLocationsForDistrict(addressForm.state, addressForm.district);
  }, [addressForm.state, addressForm.district]);

  // Available PIN codes for current location
  const availablePincodes = useMemo(() => {
    return getPincodesForLocation(addressForm.state, addressForm.district, addressForm.city);
  }, [addressForm.state, addressForm.district, addressForm.city]);

  // Live Deliverability Check
  const deliverability = useMemo(() => {
    return checkPinDeliverability(addressForm.pincode, addressForm.state, addressForm.district, addressForm.city);
  }, [addressForm.pincode, addressForm.state, addressForm.district, addressForm.city]);

  // Pre-fill address when user profile loads
  useEffect(() => {
    if (user) {
      setAddressForm(prev => {
        // Sanitize name: NEVER prefill 'Administrator' or 'Admin'
        const rawName = (user.name || '').trim();
        const safeName = (rawName.toLowerCase() === 'administrator' || rawName.toLowerCase() === 'admin' || user.role === 'ADMIN')
          ? ''
          : rawName;

        // Clean phone: accept only 10 numeric digits starting with 6-9
        const rawPhone = (user.phone || '').trim().replace(/\D/g, '').slice(0, 10);
        const safePhone = /^[6-9]\d{9}$/.test(rawPhone) ? rawPhone : '';

        // Safe email: don't leak admin email
        const safeEmail = (user.email && !user.email.toLowerCase().includes('admin@')) ? user.email : (prev.email || '');

        const userState = user.state && allStates.includes(user.state) ? user.state : prev.state;
        const stateDistricts = getDistrictsForState(userState);
        const userDistrict = (user as any).district && stateDistricts.includes((user as any).district) 
          ? (user as any).district 
          : (stateDistricts[0] || prev.district);

        const districtLocations = getLocationsForDistrict(userState, userDistrict);
        const userLocation = user.city && districtLocations.some(l => l.locationName.toLowerCase() === user.city?.toLowerCase()) 
          ? user.city 
          : (districtLocations[0]?.locationName || prev.city);

        const locPins = getPincodesForLocation(userState, userDistrict, userLocation);
        const userPin = (user.pincode && /^\d{6}$/.test(user.pincode)) ? user.pincode : (locPins[0] || prev.pincode);

        // Sanitize and parse existing single-string address into flat and area without duplicating city/state/pin/country
        let parsedFlat = prev.flatHouseBuilding;
        let parsedArea = prev.areaStreetSector;
        if (user.address && !prev.flatHouseBuilding) {
          const rawFragments = user.address.split(',').map((p: string) => p.trim()).filter(Boolean);
          parsedFlat = rawFragments[0] || '';
          
          const filteredFragments = rawFragments.slice(1).filter((part: string) => {
            const low = part.toLowerCase();
            if (low === 'india') return false;
            if (userState && low.includes(userState.toLowerCase())) return false;
            if (userDistrict && low.includes(userDistrict.toLowerCase())) return false;
            if (userLocation && low === userLocation.toLowerCase()) return false;
            if (userPin && low.includes(userPin)) return false;
            if (low.startsWith('landmark:')) return false;
            if (low.startsWith('dist:')) return false;
            return true;
          });
          parsedArea = filteredFragments.join(', ');
        }

        return {
          ...prev,
          fullName: prev.fullName || safeName || '',
          phone: prev.phone || safePhone || '',
          email: prev.email || safeEmail || '',
          flatHouseBuilding: prev.flatHouseBuilding || parsedFlat,
          areaStreetSector: prev.areaStreetSector || parsedArea,
          state: prev.state || userState,
          district: prev.district || userDistrict,
          city: prev.city || userLocation,
          pincode: prev.pincode || userPin,
        };
      });
    }
  }, [user, allStates]);

  // Handle State Change
  const handleStateChange = (newState: string) => {
    const districts = getDistrictsForState(newState);
    const firstDistrict = districts[0] || '';
    const locations = getLocationsForDistrict(newState, firstDistrict);
    const firstLoc = locations[0]?.locationName || '';
    const firstPins = locations[0]?.pincodes || [];
    const firstPin = firstPins[0] || '';
    setAddressForm(prev => ({
      ...prev,
      state: newState,
      district: firstDistrict,
      city: firstLoc,
      pincode: firstPin,
    }));
  };

  // Handle District Change
  const handleDistrictChange = (newDistrict: string) => {
    const locations = getLocationsForDistrict(addressForm.state, newDistrict);
    const firstLoc = locations[0]?.locationName || '';
    const firstPins = locations[0]?.pincodes || [];
    const firstPin = firstPins[0] || '';
    setAddressForm(prev => ({
      ...prev,
      district: newDistrict,
      city: firstLoc,
      pincode: firstPin,
    }));
  };

  // Handle City Change
  const handleCityChange = (newCity: string) => {
    const pins = getPincodesForLocation(addressForm.state, addressForm.district, newCity);
    const firstPin = pins[0] || '';
    setAddressForm(prev => ({
      ...prev,
      city: newCity,
      pincode: firstPin,
    }));
  };

  // Handle PIN input with auto-detection fallback
  const handlePincodeChange = (pin: string) => {
    const clean = pin.replace(/\D/g, '').slice(0, 6);
    setAddressForm(prev => ({ ...prev, pincode: clean }));

    if (clean.length === 6) {
      const match = lookupPincode(clean);
      if (match && allStates.includes(match.state)) {
        setAddressForm(prev => ({
          ...prev,
          state: match.state,
          district: match.district,
          city: match.location,
          pincode: clean,
        }));
      }
    }
  };

  // Confirm and persist address in Supabase customer_profiles
  const handleConfirmAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAddressError('');
    setPhoneError('');

    if (!user) {
      setAddressError('Please sign in first before saving your address.');
      setCurrentStep(1);
      return;
    }

    if (!addressForm.fullName.trim() || addressForm.fullName.trim().length < 2) {
      setAddressError('Please enter the recipient full name.');
      return;
    }

    if (addressForm.fullName.trim().toLowerCase() === 'administrator' || addressForm.fullName.trim().toLowerCase() === 'admin') {
      setAddressError('Please enter your actual full name.');
      return;
    }

    const cleanPhone = addressForm.phone.trim().replace(/\D/g, '');
    if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setPhoneError('Enter a valid 10-digit mobile number.');
      setAddressError('Enter a valid 10-digit mobile number.');
      return;
    }

    if (!addressForm.flatHouseBuilding.trim()) {
      setAddressError('Please enter House, Flat, Building, or Apartment details.');
      return;
    }

    if (!addressForm.areaStreetSector.trim()) {
      setAddressError('Please enter Area, Street, Sector, or Village.');
      return;
    }

    if (!addressForm.state) {
      setAddressError('Please select your delivery State / Union Territory.');
      return;
    }

    if (!addressForm.district) {
      setAddressError('Please select your delivery District.');
      return;
    }

    if (!addressForm.city) {
      setAddressError('Please select your delivery City / Location.');
      return;
    }

    if (!/^\d{6}$/.test(addressForm.pincode.trim())) {
      setAddressError('PIN code must be exactly 6 numeric digits.');
      return;
    }

    if (!deliverability.deliverable) {
      setAddressError(deliverability.courierMessage || deliverability.reason || 'Delivery is currently unavailable to this PIN code.');
      return;
    }

    setSavingAddress(true);
    try {
      // Build full formatted delivery address string
      const fullDeliveryAddress = [
        addressForm.flatHouseBuilding.trim(),
        addressForm.areaStreetSector.trim(),
        addressForm.landmark ? `Near ${addressForm.landmark.trim()}` : null,
      ].filter(Boolean).join(', ');

      // Persist to existing Supabase customer_profiles record (Single Source of Truth)
      await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: addressForm.fullName.trim(),
          phone: cleanPhone,
          delivery_address: fullDeliveryAddress,
          city: addressForm.city.trim(),
          state: addressForm.state.trim(),
          pincode: addressForm.pincode.trim(),
        }),
      });

      setAddressConfirmed(true);
      setCurrentStep(3);
    } catch (err) {
      console.error('Failed to sync profile address', err);
      // Still allow step progression since address is captured for the order
      setAddressConfirmed(true);
      setCurrentStep(3);
    } finally {
      setSavingAddress(false);
    }
  };

  // =========================================================================
  // STEP 3: PAYMENT METHOD & ORDER EXECUTION
  // =========================================================================
  const freeThreshold = POLICY_CONFIG.shipping.freeShippingThreshold; // 599
  const shippingCharge = rawSubtotal >= freeThreshold ? 0 : POLICY_CONFIG.shipping.standardFee; // 39

  const [paymentMethod, setPaymentMethod] = useState<'ONLINE_RAZORPAY' | 'COD'>('ONLINE_RAZORPAY');
  const [onlineCategory, setOnlineCategory] = useState<'UPI' | 'CARD' | 'NETBANKING' | 'WALLET'>('UPI');

  const isCodEligible = rawSubtotal >= POLICY_CONFIG.shipping.codMinOrder && rawSubtotal <= POLICY_CONFIG.shipping.codMaxOrder;
  const codCharge = paymentMethod === 'COD' ? POLICY_CONFIG.shipping.codHandlingFee : 0;

  // Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError('');
    setCouponLoading(true);

    try {
      const res = await fetch('/api/checkout/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: couponInput.trim(),
          subtotal: rawSubtotal,
        }),
      });

      const data = await res.json();
      if (data.valid && data.coupon) {
        setAppliedCoupon(data.coupon);
        setCouponInput('');
      } else {
        setCouponError(data.error || 'Invalid promo code');
      }
    } catch {
      setCouponError('Failed to validate promo code.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  const autoOfferDiscount = useMemo(() => {
    const paidCount = checkoutItems.filter(i => !i.isFree).reduce((s, i) => s + i.quantity, 0);
    const freeCount = checkoutItems.filter(i => i.isFree).reduce((s, i) => s + i.quantity, 0);
    if (paidCount >= 3 && freeCount >= 6) return 200;
    if (paidCount >= 2 && freeCount >= 4) return 100;
    return 0;
  }, [checkoutItems]);

  const discountAmount = (appliedCoupon ? appliedCoupon.discount : 0) + autoOfferDiscount;
  const finalPayable = Math.max(0, rawSubtotal - discountAmount + shippingCharge + codCharge);

  // Terms Consent
  const [consentChecked, setConsentChecked] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [activePolicyModal, setActivePolicyModal] = useState<string | null>(null);

  // Load Razorpay Script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Master Order Placement
  const handlePlaceOrder = async () => {
    if (!consentChecked) {
      setOrderError('You must agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }

    if (!user) {
      setCurrentStep(1);
      setOrderError('Please sign in or create an account to complete checkout.');
      return;
    }

    if (!addressConfirmed) {
      setCurrentStep(2);
      setOrderError('Please confirm your delivery address before proceeding.');
      return;
    }

    if (isSubmittingRef.current || processing) return;
    isSubmittingRef.current = true;
    setProcessing(true);
    setOrderError('');

    const payload = {
      items: checkoutItems.map(it => ({
        productId: it.productId,
        size: it.size,
        color: it.color,
        quantity: it.quantity,
        name: it.name,
        price: it.isFree ? 0 : it.price,
        isFree: Boolean(it.isFree),
        promotionRule: it.promotionRule || (it.isFree ? (bogoPromoConfig?.name || 'SPECIAL OFFER') : undefined),
        parentId: it.parentId,
        promoGroupId: (it as any).promoGroupId,

      })),
      shippingAddress: {
        fullName: addressForm.fullName.trim(),
        phone: addressForm.phone.trim().replace(/\D/g, ''),
        email: addressForm.email.trim(),
        addressLine1: addressForm.flatHouseBuilding.trim(),
        addressLine2: addressForm.areaStreetSector.trim(),
        landmark: addressForm.landmark.trim(),
        district: addressForm.district.trim(),
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        pincode: addressForm.pincode.trim().replace(/\D/g, ''),
        country: 'India',
      },
      paymentMethod,
      couponCode: appliedCoupon ? appliedCoupon.code : undefined,
    };

    try {
      const res = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        setOrderError(data.error || 'Failed to initialize order. Please check your details.');
        isSubmittingRef.current = false;
        setProcessing(false);
        return;
      }

      const normalizedDisplayAddress = [
        addressForm.flatHouseBuilding.trim(),
        addressForm.areaStreetSector.trim(),
        addressForm.landmark ? `Near ${addressForm.landmark.trim().replace(/^(near|landmark:?)\s*/i, '')}` : '',
        addressForm.city.trim(),
        `${addressForm.state.trim()} - ${addressForm.pincode.trim()}`,
        'India'
      ].filter(Boolean).join(', ');

      // 1. CASH ON DELIVERY (COD) -> REQUIRES INSTANT ₹99 RAZORPAY CONFIRMATION PAYMENT
      if (paymentMethod === 'COD') {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          setOrderError('Failed to load secure payment gateway for ₹99 COD confirmation. Please check your network connection.');
          isSubmittingRef.current = false;
          setProcessing(false);
          return;
        }

        const options = {
          key: data.key,
          amount: data.amount, // 9900 paise = ₹99
          currency: data.currency || 'INR',
          name: 'ADRIZO',
          description: `COD Confirmation (₹99) - Order #${data.orderNumber}`,
          image: ADRIZO_LOGO_DATA_URI,
          order_id: data.razorpayOrderId,
          prefill: {
            name: data.customer?.name || addressForm.fullName,
            email: data.customer?.email || addressForm.email,
            contact: data.customer?.phone || addressForm.phone,
          },
          notes: {
            orderNumber: data.orderNumber,
            type: 'COD_CONFIRMATION',
            customerName: data.customer?.name || addressForm.fullName,
            customerPhone: data.customer?.phone || addressForm.phone,
          },
          theme: {
            color: '#09090b',
          },
          handler: async function (response: any) {
            try {
              const verifyRes = await fetch('/api/checkout/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId: data.orderId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });

              const verifyData = await verifyRes.json();

              if (verifyData.success) {
                if (isBuyNowMode && typeof window !== 'undefined') {
                  sessionStorage.removeItem('adrizo_buy_now');
                } else {
                  clearCart();
                }
                setProcessing(false);
                isSubmittingRef.current = false;
                setConfirmedOrder({
                  orderNumber: data.orderNumber || data.orderId,
                  total: data.total || finalPayable,
                  codConfirmationPaid: data.codConfirmationAmount || 99,
                  codRemaining: data.codRemainingAmount !== undefined ? data.codRemainingAmount : Math.max(0, (data.total || finalPayable) - 99),
                  address: normalizedDisplayAddress,
                  paymentMethod: 'COD',
                });
              } else {
                setProcessing(false);
                isSubmittingRef.current = false;
                setOrderError(verifyData.error || 'Payment signature verification failed. Your COD order is NOT confirmed.');
              }
            } catch (err: any) {
              setProcessing(false);
              isSubmittingRef.current = false;
              setOrderError(err.message || 'Verification Error. Please contact support.');
            }
          },
          modal: {
            ondismiss: function () {
              isSubmittingRef.current = false;
              setProcessing(false);
              setOrderError('₹99 COD confirmation payment was not completed. Your COD order was NOT placed.');
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          isSubmittingRef.current = false;
          setProcessing(false);
          const reason = response.error?.description || response.error?.reason || '₹99 COD confirmation payment failed.';
          setOrderError(`${reason} Your COD order was NOT confirmed.`);
        });

        rzp.open();
        return;
      }

      // 2. ONLINE PAYMENT (RAZORPAY)
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setOrderError('Failed to load secure payment gateway. Please check your network connection or try Cash on Delivery.');
        isSubmittingRef.current = false;
        setProcessing(false);
        return;
      }

      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'ADRIZO',
        description: `Order #${data.orderNumber}`,
        image: ADRIZO_LOGO_DATA_URI,
        order_id: data.razorpayOrderId,
        prefill: {
          name: data.customer?.name || addressForm.fullName,
          email: data.customer?.email || addressForm.email,
          contact: data.customer?.phone || addressForm.phone,
        },
        notes: {
          orderNumber: data.orderNumber,
          customerName: data.customer?.name || addressForm.fullName,
          customerPhone: data.customer?.phone || addressForm.phone,
        },
        theme: {
          color: '#09090b',
        },
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/checkout/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: data.orderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              if (isBuyNowMode && typeof window !== 'undefined') {
                sessionStorage.removeItem('adrizo_buy_now');
              } else {
                clearCart();
              }
              setProcessing(false);
              isSubmittingRef.current = false;
              setConfirmedOrder({
                orderNumber: data.orderNumber || data.orderId,
                total: data.amount ? data.amount / 100 : finalPayable,
                address: normalizedDisplayAddress,
                paymentMethod: 'ONLINE_RAZORPAY',
              });
            } else {
              setProcessing(false);
              isSubmittingRef.current = false;
              router.push(`/order-failure?orderId=${data.orderId}&orderNumber=${data.orderNumber}&reason=${encodeURIComponent(verifyData.error || 'Signature Verification Failed')}`);
            }
          } catch (err: any) {
            setProcessing(false);
            isSubmittingRef.current = false;
            router.push(`/order-failure?orderId=${data.orderId}&orderNumber=${data.orderNumber}&reason=${encodeURIComponent(err.message || 'Verification Error')}`);
          }
        },
        modal: {
          ondismiss: function () {
            isSubmittingRef.current = false;
            setProcessing(false);
            setOrderError('Payment was cancelled or closed. You can retry anytime or select Cash on Delivery.');
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        isSubmittingRef.current = false;
        setProcessing(false);
        const reason = response.error?.description || response.error?.reason || 'Payment was unsuccessful or cancelled.';
        router.push(`/order-failure?orderId=${data.orderId}&orderNumber=${data.orderNumber}&reason=${encodeURIComponent(reason)}`);
      });

      rzp.open();

    } catch (err: any) {
      setOrderError(err.message || 'An unexpected error occurred. Please try again.');
      isSubmittingRef.current = false;
      setProcessing(false);
    }
  };

  // Guard against empty checkout
  if (!loadingBuyNow && !authLoading && checkoutItems.length === 0) {
    return (
      <div className="container section-padding" style={{ textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <ShoppingBag size={56} style={{ color: '#d4d4d8', marginBottom: '1.25rem' }} />
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#09090b', marginBottom: '0.5rem' }}>Your Checkout is Empty</h2>
        <p style={{ color: '#71717a', maxWidth: '400px', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          You have no items ready for checkout. Explore our premium menswear collection and add items to your cart.
        </p>
        <Link 
          href="/shop" 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#09090b',
            color: '#fff',
            padding: '0.75rem 1.75rem',
            borderRadius: '8px',
            fontWeight: 700,
            textDecoration: 'none'
          }}
        >
          <span>Explore Shop</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.checkoutContainer}>
      {/* Checkout Header */}
      <div className={styles.checkoutHeader}>
        <div>
          <button
            type="button"
            onClick={handleBackToCart}
            className={styles.blueActionLink}
            style={{ marginBottom: '0.65rem', fontSize: '0.875rem' }}
          >
            ← Back to Cart
          </button>
          <h1 className={styles.checkoutTitle}>Secure Checkout</h1>
          <p style={{ color: '#71717a', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            {isBuyNowMode ? 'Express Buy Now Order' : `Standard Cart Checkout (${checkoutItems.length} item${checkoutItems.length > 1 ? 's' : ''})`}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isBuyNowMode && (
            <span className={styles.buyNowBadge}>
              <ShoppingBag size={13} />
              <span>BUY NOW CHECKOUT</span>
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: '#16a34a', fontWeight: 700 }}>
            <Lock size={15} />
            <span>256-Bit SSL Encrypted</span>
          </div>
        </div>
      </div>

      <div className={styles.checkoutLayout}>
        {/* ============================================================= */}
        {/* LEFT COLUMN: 3-STEP AMAZON/FLIPKART STYLE CHECKOUT STREAM      */}
        {/* ============================================================= */}
        <div>

          {/* ========================================================= */}
          {/* STEP 1: CUSTOMER AUTHENTICATION GATE                      */}
          {/* ========================================================= */}
          <div className={`${styles.stepCard} ${!user ? styles.stepCardActive : ''}`}>
            <div className={styles.stepHeader}>
              <div className={styles.stepHeaderLeft}>
                <span className={`${styles.stepNumber} ${user ? styles.stepNumberComplete : ''}`}>
                  {user ? <Check size={16} /> : '1'}
                </span>
                <div style={{ minWidth: 0 }}>
                  <h2 className={styles.stepTitle}>Account</h2>
                  {user ? (
                    <>
                      <p style={{ margin: '3px 0 1px', fontSize: '0.875rem', fontWeight: 700, color: '#09090b' }}>
                        {user.name || 'Customer'}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#52525b', wordBreak: 'break-all' }}>
                        {user.email}
                      </p>
                    </>
                  ) : (
                    <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#71717a', lineHeight: 1.4 }}>
                      Please sign in or create an account to continue.
                    </p>
                  )}
                </div>
              </div>

              {user && (
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    setCurrentStep(1);
                    setAddressConfirmed(false);
                  }}
                  className={styles.blueActionLink}
                >
                  Switch Account
                </button>
              )}
            </div>

            {/* If NOT logged in: Show Inline Auth Tabs */}
            {!user && (
              <div style={{ marginTop: '1.25rem', borderTop: '1px solid #f4f4f5', paddingTop: '1.25rem' }}>
                <div className={styles.authTabGroup}>
                  <button
                    type="button"
                    className={`${styles.authTabBtn} ${authTab === 'otp' ? styles.authTabBtnActive : ''}`}
                    onClick={() => { setAuthTab('otp'); }}
                  >
                    <Phone size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                    <span>Phone OTP</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.authTabBtn} ${authTab === 'login' ? styles.authTabBtnActive : ''}`}
                    onClick={() => { setAuthTab('login'); setLoginError(''); }}
                  >
                    <LogIn size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                    <span>Email Sign In</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.authTabBtn} ${authTab === 'signup' ? styles.authTabBtnActive : ''}`}
                    onClick={() => { setAuthTab('signup'); setSignupError(''); }}
                  >
                    <UserPlus size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                    <span>Create Account</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.authTabBtn} ${authTab === 'forgot' ? styles.authTabBtnActive : ''}`}
                    onClick={() => { setAuthTab('forgot'); setForgotError(''); setForgotMessage(''); }}
                  >
                    <KeyRound size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                    <span>Reset</span>
                  </button>
                </div>

                {/* PHONE OTP TAB */}
                {authTab === 'otp' && (
                  <div>
                    <PhoneOtpAuth
                      onSuccess={async (authedUser) => {
                        await fetchUser();
                        if (authedUser?.phone) {
                          setAddressForm(prev => ({
                            ...prev,
                            phone: prev.phone && prev.phone.trim() ? prev.phone : authedUser.phone,
                          }));
                        }
                        setCurrentStep(2);
                      }}
                      submitButtonText="Verify & Continue to Address"
                    />
                    <div style={{ marginTop: '0.85rem', textAlign: 'center', fontSize: '0.8rem', color: '#71717a' }}>
                      Prefer email and password?{' '}
                      <button
                        type="button"
                        onClick={() => setAuthTab('login')}
                        style={{ background: 'none', border: 'none', color: '#09090b', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        Sign in with Password
                      </button>
                    </div>
                  </div>
                )}

                {/* SIGN IN TAB */}
                {authTab === 'login' && (
                  <form onSubmit={handleInlineLogin}>
                    {loginError && (
                      <div className={styles.deliveryBadgeError} style={{ marginBottom: '1rem' }}>
                        <AlertCircle size={15} />
                        <span>{loginError}</span>
                      </div>
                    )}
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Email Address *</label>
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={e => setLoginEmail(e.target.value)}
                        placeholder="e.g. rahul.sharma@example.com"
                        className={styles.formInput}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className={styles.formLabel}>Password *</label>
                        <button
                          type="button"
                          onClick={() => setAuthTab('forgot')}
                          style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className={styles.formInput}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loginLoading}
                      className={styles.primaryCtaBtn}
                      style={{ marginTop: '0.5rem', width: '100%' }}
                    >
                      {loginLoading ? 'Signing In...' : 'Sign In & Continue to Address'}
                    </button>
                    <div style={{ marginTop: '0.75rem', textAlign: 'center', fontSize: '0.8rem', color: '#71717a' }}>
                      New customer?{' '}
                      <button
                        type="button"
                        onClick={() => setAuthTab('signup')}
                        style={{ background: 'none', border: 'none', color: '#09090b', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        Create an account
                      </button>
                    </div>
                  </form>
                )}

                {/* CREATE ACCOUNT TAB */}
                {authTab === 'signup' && (
                  <form onSubmit={handleInlineSignup}>
                    {signupError && (
                      <div className={styles.deliveryBadgeError} style={{ marginBottom: '1rem' }}>
                        <AlertCircle size={15} />
                        <span>{signupError}</span>
                      </div>
                    )}
                    <div className={styles.formGrid2}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Full Name *</label>
                        <input
                          type="text"
                          required
                          value={signupName}
                          onChange={e => setSignupName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className={styles.formInput}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Mobile Number (10 Digits) *</label>
                        <div className={styles.phoneInputWrapper}>
                          <span className={styles.phonePrefix}>+91</span>
                          <input
                            type="tel"
                            inputMode="numeric"
                            required
                            maxLength={10}
                            value={signupPhone}
                            onChange={e => setSignupPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="9876543210"
                            className={styles.phoneInput}
                          />
                        </div>
                      </div>
                    </div>
                    <div className={styles.formGrid2}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Email Address *</label>
                        <input
                          type="email"
                          required
                          value={signupEmail}
                          onChange={e => setSignupEmail(e.target.value)}
                          placeholder="e.g. rahul@example.com"
                          className={styles.formInput}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Create Password (Min 6 chars) *</label>
                        <input
                          type="password"
                          required
                          value={signupPassword}
                          onChange={e => setSignupPassword(e.target.value)}
                          placeholder="••••••••"
                          className={styles.formInput}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={signupLoading}
                      className={styles.primaryCtaBtn}
                      style={{ marginTop: '0.5rem', width: '100%' }}
                    >
                      {signupLoading ? 'Creating Account...' : 'Create Account & Continue to Address'}
                    </button>
                    <div style={{ marginTop: '0.75rem', textAlign: 'center', fontSize: '0.8rem', color: '#71717a' }}>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setAuthTab('login')}
                        style={{ background: 'none', border: 'none', color: '#09090b', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        Sign In
                      </button>
                    </div>
                  </form>
                )}

                {/* FORGOT PASSWORD TAB */}
                {authTab === 'forgot' && (
                  <form onSubmit={handleInlineForgotPassword}>
                    {forgotError && (
                      <div className={styles.deliveryBadgeError} style={{ marginBottom: '1rem' }}>
                        <AlertCircle size={15} />
                        <span>{forgotError}</span>
                      </div>
                    )}
                    {forgotMessage && (
                      <div className={styles.deliveryBadgeSuccess} style={{ marginBottom: '1rem' }}>
                        <CheckCircle2 size={15} />
                        <span>{forgotMessage}</span>
                      </div>
                    )}
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Enter your registered email *</label>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        placeholder="e.g. rahul.sharma@example.com"
                        className={styles.formInput}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className={styles.primaryCtaBtn}
                      style={{ marginTop: '0.5rem', width: '100%' }}
                    >
                      {forgotLoading ? 'Sending...' : 'Send Password Reset Link'}
                    </button>
                    <div style={{ marginTop: '0.75rem', textAlign: 'center', fontSize: '0.8rem', color: '#71717a' }}>
                      Remembered your password?{' '}
                      <button
                        type="button"
                        onClick={() => setAuthTab('login')}
                        style={{ background: 'none', border: 'none', color: '#09090b', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        Back to Sign In
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* STEP 2: DELIVERY ADDRESS (CASCADING & PERSISTENT)         */}
          {/* ========================================================= */}
          <div className={`${styles.stepCard} ${currentStep === 2 ? styles.stepCardActive : ''}`}>
            <div className={styles.stepHeader}>
              <div className={styles.stepHeaderLeft}>
                <span className={`${styles.stepNumber} ${addressConfirmed ? styles.stepNumberComplete : ''}`}>
                  {addressConfirmed ? <Check size={16} /> : '2'}
                </span>
                <div style={{ minWidth: 0 }}>
                  <h2 className={styles.stepTitle}>Delivery Address</h2>
                </div>
              </div>

              {user && (
                <div className={styles.step2Actions}>
                  <button
                    type="button"
                    onClick={() => {
                      setAddressToEdit(null);
                      setAddressModalOpen(true);
                    }}
                    className={styles.blueActionLink}
                  >
                    Add New
                  </button>
                  <span className={styles.pipeDivider}>|</span>
                  <button
                    type="button"
                    onClick={() => setIsChangeAddressOpen(prev => !prev)}
                    className={styles.blueActionLink}
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {/* Delivering to status line */}
            {addressConfirmed && (
              <div className={styles.deliveringToStatus} style={{ marginTop: '0.65rem' }}>
                <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                <span>
                  Delivering to: <strong style={{ color: '#16a34a' }}>{addressForm.fullName} ( +91 {addressForm.phone} )</strong>
                </span>
              </div>
            )}

            {/* Selected Inset Address Card (Matches Reference Design) */}
            {addressConfirmed && !isChangeAddressOpen && (
              <div className={styles.addressDetailCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '1rem', color: '#09090b' }}>{addressForm.fullName}</strong>
                    <span className={styles.courierBadge}>Standard Express Courier</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const matched = customerAddresses.find(a => a.id === selectedAddressId) || {
                          id: selectedAddressId || '',
                          full_name: addressForm.fullName,
                          phone: addressForm.phone,
                          address: addressForm.flatHouseBuilding,
                          area: addressForm.areaStreetSector,
                          landmark: addressForm.landmark,
                          state: addressForm.state,
                          district: addressForm.district,
                          city: addressForm.city,
                          pincode: addressForm.pincode,
                        };
                        setAddressToEdit(matched);
                        setAddressModalOpen(true);
                      }}
                      className={styles.blueActionLink}
                    >
                      Edit Address
                    </button>
                    <span className={styles.pipeDivider}>|</span>
                    <button
                      type="button"
                      onClick={() => {
                        const matched = customerAddresses.find(a => a.id === selectedAddressId);
                        if (matched) {
                          setAddressToDelete(matched);
                        } else {
                          setAddressConfirmed(false);
                          setCurrentStep(2);
                        }
                      }}
                      className={styles.blueActionLink}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className={styles.addressLines}>
                  <div>
                    {addressForm.flatHouseBuilding}
                    {addressForm.areaStreetSector ? `, ${addressForm.areaStreetSector}` : ''}
                    {addressForm.landmark ? `, Near ${addressForm.landmark}` : ''},
                  </div>
                  <div>
                    {addressForm.city}{addressForm.district && addressForm.district !== addressForm.city ? `, ${addressForm.district}` : ''},
                  </div>
                  <div>
                    {addressForm.state} - {addressForm.pincode}
                  </div>
                </div>
                <div className={styles.addressContactRow} style={{ marginTop: '0.5rem' }}>
                  <div>Phone: +91 {addressForm.phone}</div>
                  {addressForm.email && <div>Email: {addressForm.email}</div>}
                </div>
              </div>
            )}

            {/* Address Selector or Form (When Change Address is toggled OR when address is not yet confirmed) */}
            {user && (isChangeAddressOpen || !addressConfirmed) && (
              <div style={{ marginTop: '1.25rem', borderTop: '1px solid #f4f4f5', paddingTop: '1.25rem' }}>
                {addressError && (
                  <div className={styles.deliveryBadgeError} style={{ marginBottom: '1.25rem' }}>
                    <AlertCircle size={16} />
                    <span>{addressError}</span>
                  </div>
                )}

                {addressSwitchNotice && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.825rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={16} />
                    <span>{addressSwitchNotice}</span>
                  </div>
                )}

                {/* Saved Address Selector Cards */}
                {customerAddresses.length > 0 && (
                  <div style={{ marginBottom: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.15rem' }}>
                    <div style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <MapPin size={16} color="#09090b" />
                        <span>Saved Delivery Addresses ({customerAddresses.length}):</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAddressToEdit(null);
                          setAddressModalOpen(true);
                        }}
                        style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        + Add Another Address
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                      {customerAddresses.map((addr) => {
                        const isSelected = selectedAddressId === addr.id;
                        const rawLandmark = addr.landmark || '';
                        const tagLabel = rawLandmark.includes('•') ? rawLandmark.split('•')[0].trim() : (rawLandmark || (addr.is_default ? 'Home' : 'Saved'));

                        return (
                          <div
                            key={addr.id}
                            style={{
                              border: isSelected ? '2px solid #09090b' : '1px solid #cbd5e1',
                              borderRadius: '10px',
                              padding: '0.85rem 1rem',
                              background: isSelected ? '#ffffff' : '#f8fafc',
                              boxShadow: isSelected ? '0 3px 10px rgba(0,0,0,0.06)' : 'none',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <strong style={{ fontSize: '0.9rem', color: '#09090b' }}>{addr.full_name}</strong>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  {tagLabel && (
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#f4f4f5', color: '#52525b', padding: '1px 6px', borderRadius: '4px', border: '1px solid #e4e4e7' }}>
                                      {tagLabel}
                                    </span>
                                  )}
                                  {addr.is_default && (
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#ecfdf5', color: '#065f46', padding: '1px 6px', borderRadius: '4px' }}>
                                      Default
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
                                {addr.address}, {addr.area ? `${addr.area}, ` : ''}{addr.city}, {addr.district ? `${addr.district}, ` : ''}{addr.state} - <strong>{addr.pincode}</strong>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#09090b', marginTop: '5px', fontWeight: 600 }}>
                                Mobile: +91 {addr.phone}
                              </div>
                            </div>

                            {/* Address Actions: Select, Edit, Delete */}
                            <div className={styles.addressCardActions}>
                              {isSelected ? (
                                <span className={styles.cardActionSelected}>
                                  <Check size={12} />
                                  <span>Selected</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className={styles.cardActionSelect}
                                  onClick={() => {
                                    handleSelectAddress(addr);
                                    setIsChangeAddressOpen(false);
                                  }}
                                >
                                  Deliver Here
                                </button>
                              )}

                              <button
                                type="button"
                                className={styles.cardActionEdit}
                                onClick={() => {
                                  setAddressToEdit(addr);
                                  setAddressModalOpen(true);
                                }}
                              >
                                <Edit3 size={11} />
                                <span>Edit Address</span>
                              </button>

                              <button
                                type="button"
                                className={styles.cardActionDelete}
                                onClick={() => setAddressToDelete(addr)}
                              >
                                <Trash2 size={11} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Or Enter / Edit Details Form */}
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b', marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                  {customerAddresses.length > 0 ? 'Or Enter / Edit Details for This Order:' : 'Enter Delivery Details:'}
                </div>

                <form onSubmit={(e) => {
                  handleConfirmAddress(e);
                  setIsChangeAddressOpen(false);
                }}>
                  {/* Recipient Information */}
                  <div className={styles.formGrid3}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Recipient Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={addressForm.fullName}
                        onChange={e => setAddressForm({ ...addressForm, fullName: e.target.value })}
                        className={styles.formInput}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Mobile Number *</label>
                      <div className={styles.phoneInputWrapper}>
                        <span className={styles.phonePrefix}>+91</span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          required
                          maxLength={10}
                          placeholder="10-digit number"
                          value={addressForm.phone}
                          onChange={e => {
                            const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setAddressForm(prev => ({ ...prev, phone: onlyDigits }));
                            if (onlyDigits.length === 10 && !/^[6-9]\d{9}$/.test(onlyDigits)) {
                              setPhoneError('Enter a valid 10-digit mobile number.');
                            } else {
                              setPhoneError('');
                            }
                          }}
                          className={styles.phoneInput}
                        />
                      </div>
                      {phoneError && <div className={styles.fieldError}>{phoneError}</div>}
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Email Address *</label>
                      <input
                        type="email"
                        required
                        readOnly={!!user?.email}
                        placeholder="e.g. rahul@example.com"
                        value={addressForm.email}
                        onChange={e => setAddressForm({ ...addressForm, email: e.target.value })}
                        className={`${styles.formInput} ${user?.email ? styles.readOnlyInput : ''}`}
                        title={user?.email ? 'Authenticated account email' : ''}
                      />
                      {user?.email && (
                        <span className={styles.inputHelperText} style={{ color: '#166534', fontWeight: 600 }}>
                          ✓ Account email
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Street Details */}
                  <div className={styles.formGrid2}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>House / Flat / Building / Apartment *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Flat 402, Sunshine Heights"
                        value={addressForm.flatHouseBuilding}
                        onChange={e => setAddressForm({ ...addressForm, flatHouseBuilding: e.target.value })}
                        className={styles.formInput}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Area / Street / Sector / Village *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Linking Road, Bandra West"
                        value={addressForm.areaStreetSector}
                        onChange={e => setAddressForm({ ...addressForm, areaStreetSector: e.target.value })}
                        className={styles.formInput}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Landmark (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Near National College / Opposite Metro Station"
                      value={addressForm.landmark}
                      onChange={e => setAddressForm({ ...addressForm, landmark: e.target.value })}
                      className={styles.formInput}
                    />
                  </div>

                  {/* Cascading Indian Location Selection: State -> District -> City/Location -> PIN */}
                  <div className={styles.formGrid4} style={{ marginTop: '0.5rem' }}>
                    {/* 1. State Dropdown (A -> Z Alphabetical) */}
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>State / UT (A → Z) *</label>
                      <select
                        value={addressForm.state}
                        onChange={e => handleStateChange(e.target.value)}
                        className={styles.formSelect}
                      >
                        {allStates.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    {/* 2. District Dropdown (Filtered by State) */}
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>District *</label>
                      <select
                        value={addressForm.district}
                        onChange={e => handleDistrictChange(e.target.value)}
                        className={styles.formSelect}
                      >
                        {availableDistricts.map(dist => (
                          <option key={dist} value={dist}>{dist}</option>
                        ))}
                      </select>
                    </div>

                    {/* 3. City / Town / Location Dropdown (Filtered by District) */}
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>City / Location *</label>
                      <select
                        value={addressForm.city}
                        onChange={e => handleCityChange(e.target.value)}
                        className={styles.formSelect}
                      >
                        {availableLocations.map(loc => (
                          <option key={loc.locationName} value={loc.locationName}>{loc.locationName}</option>
                        ))}
                      </select>
                    </div>

                    {/* 4. Postal PIN Code Input + Options */}
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Postal PIN Code *</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        maxLength={6}
                        placeholder="6-digit PIN"
                        value={addressForm.pincode}
                        onChange={e => handlePincodeChange(e.target.value)}
                        className={styles.formInput}
                      />
                      {availablePincodes.length > 1 && (
                        <div className={styles.pincodeChips}>
                          <span style={{ fontSize: '0.7rem', color: '#71717a', alignSelf: 'center' }}>Options:</span>
                          {availablePincodes.map(p => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => handlePincodeChange(p)}
                              className={`${styles.pinChip} ${addressForm.pincode === p ? styles.pinChipActive : ''}`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Live Delivery Availability Badge */}
                  {deliverability.deliverable ? (
                    <div className={styles.deliveryBadgeSuccess}>
                      <Truck size={16} />
                      <span>✓ {deliverability.courierMessage}</span>
                    </div>
                  ) : (
                    <div className={styles.deliveryBadgeError}>
                      <AlertCircle size={16} />
                      <span>{deliverability.courierMessage || deliverability.reason}</span>
                    </div>
                  )}

                  <div style={{ marginTop: '1.5rem' }}>
                    <button
                      type="submit"
                      disabled={savingAddress || !deliverability.deliverable}
                      className={styles.primaryCtaBtn}
                    >
                      {savingAddress ? 'Saving Address...' : 'Deliver to This Address & Continue to Payment'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* ORDER SUMMARY CARD (appears before payment on all views)   */}
          {/* ========================================================= */}
          <div className={styles.orderSummaryCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                Order Summary ({checkoutItems.length} item{checkoutItems.length === 1 ? '' : 's'})
              </h3>
              <button
                type="button"
                onClick={() => { setItemToReplace(null); setIsAddModalOpen(true); }}
                className={styles.addItemBtn}
              >
                + Add Item
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1rem', maxHeight: '360px', overflowY: 'auto' }}>
              {/* Promotional Bundles */}
              {promoBundles.map((bundle) => (
                <div key={bundle.groupId} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', paddingBottom: '0.45rem', borderBottom: '1px dashed #fcd34d', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 800, color: '#92400e' }}>
                      <Sparkles size={13} />
                      <span>🎁 {bundle.items[0]?.promotionRule || bogoPromoConfig?.name || 'PROMOTION'} BUNDLE</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button type="button" className={styles.blueActionLink} onClick={() => openBogoSelectorForBundle(bundle.groupId)} style={{ fontSize: '0.75rem' }}>Edit Free Products</button>
                      <span className={styles.pipeDivider}>|</span>
                      <button type="button" className={styles.blueActionLink} onClick={() => setBundleRemovalTarget({ promoGroupId: bundle.groupId, itemId: bundle.items[0]?.id })} style={{ fontSize: '0.75rem', color: '#dc2626' }}>Remove</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {bundle.items.map((item) => (
                      <div key={item.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <div style={{ width: '48px', height: '62px', borderRadius: '4px', overflow: 'hidden', background: '#fff', border: '1px solid #e4e4e7', position: 'relative', flexShrink: 0 }}>
                          {item.image ? <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ShoppingBag size={18} color="#a1a1aa" style={{ margin: '20px auto' }} />}
                          {item.isFree && <span style={{ position: 'absolute', top: 2, left: 2, background: '#FFC800', color: '#000', fontSize: '0.55rem', fontWeight: 900, padding: '0.05rem 0.25rem', borderRadius: '2px' }}>FREE</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#09090b', lineHeight: 1.3, wordBreak: 'break-word' }}>{item.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#71717a', margin: '2px 0' }}>Size: <strong>{item.size}</strong> | Color: <strong>{item.color}</strong></div>
                          <div style={{ fontSize: '0.75rem', color: '#71717a', marginBottom: '4px' }}>Qty: {item.quantity}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button type="button" onClick={() => handleEditOrderItem(item)} className={styles.blueActionLink} style={{ fontSize: '0.75rem' }}>Edit Item</button>
                            <span className={styles.pipeDivider}>|</span>
                            <button type="button" onClick={() => handleRemoveOrderItem(item)} className={styles.blueActionLink} style={{ fontSize: '0.75rem' }}>Remove</button>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {item.isFree ? (
                            <div>
                              <div style={{ fontSize: '0.72rem', color: '#a1a1aa', textDecoration: 'line-through' }}>₹{((item.originalPrice || item.price || 0) * item.quantity).toFixed(2)}</div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16a34a' }}>FREE (₹0)</span>
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#09090b' }}>₹{(item.price * item.quantity).toFixed(2)}</div>
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: '3px' }}>PAID</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Regular Items */}
              {regularCheckoutItems.map((item) => (
                <div key={item.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.65rem 0', borderBottom: '1px solid #f4f4f5' }}>
                  <div style={{ width: '52px', height: '66px', borderRadius: '4px', overflow: 'hidden', background: '#f4f4f5', flexShrink: 0, border: '1px solid #e4e4e7' }}>
                    {item.image ? <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ShoppingBag size={20} color="#a1a1aa" style={{ margin: '22px auto' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#09090b', lineHeight: 1.3, fontSize: '0.85rem', wordBreak: 'break-word' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#71717a', margin: '2px 0' }}>Size: <strong>{item.size}</strong> | Color: <strong>{item.color}</strong></div>
                    <div style={{ fontSize: '0.75rem', color: '#71717a', marginBottom: '4px' }}>Qty: {item.quantity}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button type="button" onClick={() => handleEditOrderItem(item)} className={styles.blueActionLink} style={{ fontSize: '0.75rem' }}>Edit Item</button>
                      <span className={styles.pipeDivider}>|</span>
                      <button type="button" onClick={() => handleRemoveOrderItem(item)} className={styles.blueActionLink} style={{ fontSize: '0.75rem' }}>Remove</button>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, color: '#09090b', fontSize: '0.95rem' }}>₹{(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ========================================================= */}
          {/* STEP 3: PAYMENT METHOD                                     */}
          {/* ========================================================= */}
          <div className={`${styles.stepCard} ${currentStep === 3 ? styles.stepCardActive : ''}`}>
            <div className={styles.stepHeader} style={{ marginBottom: '1rem' }}>
              <div className={styles.stepHeaderLeft}>
                <span className={styles.stepNumber}>3</span>
                <div style={{ minWidth: 0 }}>
                  <h2 className={styles.stepTitle}>Payment Method</h2>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#71717a', lineHeight: 1.4 }}>
                    100% secure payment with instant confirmation.
                  </p>
                </div>
              </div>
            </div>

            {orderError && (
              <div className={styles.deliveryBadgeError} style={{ marginBottom: '1rem' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{orderError}</span>
              </div>
            )}

            {/* Online Payment Tile */}
            <div
              onClick={() => setPaymentMethod('ONLINE_RAZORPAY')}
              className={`${styles.paymentTile} ${paymentMethod === 'ONLINE_RAZORPAY' ? styles.paymentTileSelected : ''}`}
              style={{ border: `1.5px solid ${paymentMethod === 'ONLINE_RAZORPAY' ? '#2563eb' : '#e4e4e7'}` }}
            >
              <div className={styles.radioCircle} style={{ border: `2px solid ${paymentMethod === 'ONLINE_RAZORPAY' ? '#2563eb' : '#cbd5e1'}` }}>
                {paymentMethod === 'ONLINE_RAZORPAY' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }} />}
              </div>
              <div className={styles.paymentDetails}>
                <div className={styles.paymentTileHeader}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={styles.paymentTitle}>Online Payment</div>
                    <div className={styles.paymentSubtitle}>UPI, Cards, NetBanking, Wallets</div>
                  </div>
                  <span className={styles.paymentBadge}>Recommended</span>
                </div>
              </div>
            </div>

            {/* COD Tile */}
            <div
              onClick={() => { if (isCodEligible) setPaymentMethod('COD'); }}
              className={`${styles.paymentTile} ${paymentMethod === 'COD' ? styles.paymentTileSelected : ''} ${!isCodEligible ? styles.paymentTileDisabled : ''}`}
              style={{ border: `1.5px solid ${paymentMethod === 'COD' ? '#2563eb' : '#e4e4e7'}`, marginTop: '0.75rem' }}
            >
              <div className={styles.radioCircle} style={{ border: `2px solid ${paymentMethod === 'COD' ? '#2563eb' : '#cbd5e1'}` }}>
                {paymentMethod === 'COD' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }} />}
              </div>
              <div className={styles.paymentDetails}>
                <div className={styles.paymentTileHeader}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={styles.paymentTitle}>Cash on Delivery (COD)</div>
                    <div className={styles.paymentSubtitle}>Pay ₹99 now to confirm; balance on delivery</div>
                  </div>
                  {!isCodEligible && (
                    <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 700, flexShrink: 0 }}>
                      {rawSubtotal < POLICY_CONFIG.shipping.codMinOrder ? `Min ₹${POLICY_CONFIG.shipping.codMinOrder}` : `Max ₹${POLICY_CONFIG.shipping.codMaxOrder}`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* COD Info Box */}
            {paymentMethod === 'COD' && (
              <div className={styles.codInfoBox}>
                <div className={styles.codInfoTitle}>Cash on Delivery</div>
                <div style={{ marginBottom: '0.5rem', lineHeight: 1.45 }}>
                  Pay ₹99 now to confirm your COD order.<br />
                  The remaining amount will be payable when your order is delivered.
                </div>
                <div style={{ borderTop: '1px solid #fef3c7', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem' }}>
                  <div className={styles.codBreakdownRow} style={{ color: '#52525b' }}>
                    <span>Order Total:</span>
                    <strong>₹{finalPayable.toFixed(2)}</strong>
                  </div>
                  <div className={styles.codBreakdownRow} style={{ color: '#15803d' }}>
                    <span>COD Confirmation Paid:</span>
                    <strong>₹99.00</strong>
                  </div>
                  <div className={styles.codBreakdownRow} style={{ color: '#b45309' }}>
                    <span>Remaining Payable on Delivery:</span>
                    <strong>₹{Math.max(0, finalPayable - 99).toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Primary Payment CTA */}
          <button
            type="button"
            disabled={processing || !addressConfirmed}
            onClick={handlePlaceOrder}
            className={styles.yellowPaymentCta}
          >
            {processing
              ? (paymentMethod === 'ONLINE_RAZORPAY' ? 'CONNECTING TO RAZORPAY…' : 'CONNECTING FOR ₹99 COD…')
              : paymentMethod === 'ONLINE_RAZORPAY'
              ? `Pay ₹${finalPayable.toFixed(2)} Online →`
              : 'Pay ₹99 & Confirm COD Order'}
          </button>
        </div>

        {/* ============================================================= */}
        {/* RIGHT COLUMN: PRICE SUMMARY + COUPON + GUARANTEE (desktop)   */}
        {/* ============================================================= */}
        <div style={{ position: 'sticky', top: '2rem' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', boxSizing: 'border-box' }}>

            {/* Promo / Coupon Code Box */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem' }}>Promo Code</div>
              {appliedCoupon ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', gap: '0.5rem' }}>
                  <div>
                    <strong style={{ color: '#166534' }}>{appliedCoupon.code}</strong> applied (-₹{appliedCoupon.discount})
                  </div>
                  <button type="button" onClick={handleRemoveCoupon} style={{ background: 'none', border: 'none', color: '#991b1b', fontWeight: 700, cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Enter Promo / Coupon Code"
                      value={couponInput}
                      onChange={e => setCouponInput(e.target.value)}
                      style={{ flex: 1, minWidth: 0, height: '40px', padding: '0 0.75rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.825rem', boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      disabled={couponLoading || !couponInput.trim()}
                      onClick={handleApplyCoupon}
                      style={{ height: '40px', padding: '0 1rem', background: '#09090b', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                    >
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                  {couponError && (
                    <div style={{ color: '#dc2626', fontSize: '0.725rem', marginTop: '4px' }}>
                      {couponError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.85rem', borderTop: '1px solid #f4f4f5', paddingTop: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', gap: '0.5rem' }}>
                <span>Subtotal (Catalog Value)</span>
                <span style={{ flexShrink: 0 }}>₹{rawMrpTotal.toFixed(2)}</span>
              </div>

              {checkoutItems.some(i => i.isFree) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 700, gap: '0.5rem' }}>
                  <span>{(checkoutItems.find(i => i.isFree)?.promotionRule || bogoPromoConfig?.name || 'Special Item')} Discount</span>
                  <span style={{ flexShrink: 0 }}>-₹{Math.max(0, rawMrpTotal - rawSubtotal).toFixed(2)}</span>
                </div>
              )}

              {mrpSavings > 0 && !checkoutItems.some(i => i.isFree) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 600, gap: '0.5rem' }}>
                  <span>Special Item Discount</span>
                  <span style={{ flexShrink: 0 }}>-₹{mrpSavings.toFixed(2)}</span>
                </div>
              )}

              {!checkoutItems.some(i => i.isFree) && mrpSavings === 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 600, gap: '0.5rem' }}>
                  <span>Special Item Discount</span>
                  <span style={{ flexShrink: 0 }}>-₹0.00</span>
                </div>
              )}

              {appliedCoupon && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 600, gap: '0.5rem' }}>
                  <span>Coupon Discount</span>
                  <span style={{ flexShrink: 0 }}>-₹{appliedCoupon.discount.toFixed(2)}</span>
                </div>
              )}

              {autoOfferDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 700, background: '#f0fdf4', padding: '0.4rem 0.6rem', borderRadius: '6px', gap: '0.5rem' }}>
                  <span>🎁 Bundle Discount — ₹{autoOfferDiscount} OFF</span>
                  <span style={{ flexShrink: 0 }}>-₹{autoOfferDiscount.toFixed(2)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', gap: '0.5rem' }}>
                <span>Standard Delivery</span>
                <span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>{shippingCharge === 0 ? 'FREE' : `₹${shippingCharge.toFixed(2)}`}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', gap: '0.5rem' }}>
                <span>COD Handling Fee</span>
                {paymentMethod === 'COD' ? (
                  <span style={{ color: '#b45309', fontWeight: 600, flexShrink: 0 }}>₹{codCharge.toFixed(2)}</span>
                ) : (
                  <span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>FREE (₹0)</span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1.2rem', color: '#09090b', borderTop: '1.5px solid #e4e4e7', paddingTop: '0.85rem', marginTop: '0.35rem', gap: '0.5rem' }}>
                <span>Total Amount</span>
                <span style={{ flexShrink: 0 }}>₹{finalPayable.toFixed(2)}</span>
              </div>

              {paymentMethod === 'COD' && (
                <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #d4d4d8', paddingTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 600, gap: '0.5rem' }}>
                    <span>COD Confirmation Paid (Pay Now):</span>
                    <span style={{ flexShrink: 0 }}>₹99.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309', fontWeight: 700, gap: '0.5rem' }}>
                    <span>Remaining Payable on Delivery:</span>
                    <span style={{ flexShrink: 0 }}>₹{Math.max(0, finalPayable - 99).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* ADRIZO Buyer Guarantee Box */}
            <div className={styles.buyerGuaranteeBox}>
              <div className={styles.buyerGuaranteeHeader}>
                <ShieldCheck size={18} color="#16a34a" />
                <span>ADRIZO Buyer Guarantee</span>
              </div>
              <ul className={styles.buyerGuaranteeList}>
                <li className={styles.buyerGuaranteeItem}>
                  <span className={styles.buyerGuaranteeBullet} />
                  <span>7-Day Easy Replacement / Refund</span>
                </li>
                <li className={styles.buyerGuaranteeItem}>
                  <span className={styles.buyerGuaranteeBullet} />
                  <span>100% Genuine Handcrafted Menswear</span>
                </li>
                <li className={styles.buyerGuaranteeItem}>
                  <span className={styles.buyerGuaranteeBullet} />
                  <span>Safe &amp; Secure Payments</span>
                </li>
                <li className={styles.buyerGuaranteeItem}>
                  <span className={styles.buyerGuaranteeBullet} />
                  <span>Dispatched via Express Courier within 24h</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Trust Bar */}
      <div className={styles.bottomTrustBar}>
        <div className={styles.trustBarItem}>
          <Truck size={28} className={styles.trustBarIcon} />
          <div className={styles.trustBarText}>
            <div className={styles.trustBarTitle}>Free Shipping</div>
            <div className={styles.trustBarSub}>above ₹999</div>
          </div>
        </div>
        <div className={styles.trustBarItem}>
          <ShieldCheck size={28} className={styles.trustBarIcon} />
          <div className={styles.trustBarText}>
            <div className={styles.trustBarTitle}>7-Day Easy</div>
            <div className={styles.trustBarSub}>Replacement</div>
          </div>
        </div>
        <div className={styles.trustBarItem}>
          <Award size={28} className={styles.trustBarIcon} />
          <div className={styles.trustBarText}>
            <div className={styles.trustBarTitle}>100% Genuine</div>
            <div className={styles.trustBarSub}>Products</div>
          </div>
        </div>
        <div className={styles.trustBarItem}>
          <Headphones size={28} className={styles.trustBarIcon} />
          <div className={styles.trustBarText}>
            <div className={styles.trustBarTitle}>Dedicated</div>
            <div className={styles.trustBarSub}>Support</div>
          </div>
        </div>
      </div>

      {/* Policy Modal Overlay */}
      {mounted && activePolicyModal && createPortal(
        <div className={styles.modalOverlay} onClick={() => setActivePolicyModal(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeModalBtn} onClick={() => setActivePolicyModal(null)}>
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>
              {activePolicyModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
            </h2>
            <div style={{ fontSize: '0.875rem', color: '#52525b', lineHeight: 1.6 }}>
              {activePolicyModal === 'terms' ? (
                <div>
                  <p>Welcome to ADRIZO. By placing an order, you agree to our standard shopping terms.</p>
                  <p>All garments are subjected to stringent quality checks prior to dispatch. Payments processed via Razorpay are encrypted with 256-bit SSL protocols.</p>
                </div>
              ) : (
                <div>
                  <p>Your privacy is important to us. Customer delivery information is stored securely in our single-source database to fulfill orders and provide updates.</p>
                  <p>We do not share your personal contact or payment details with third parties for marketing.</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Order Confirmed Success Modal */}
      {confirmedOrder && (
        <CodSuccessModal
          isOpen={true}
          orderNumber={confirmedOrder.orderNumber}
          total={confirmedOrder.total}
          codConfirmationPaid={confirmedOrder.codConfirmationPaid}
          codRemaining={confirmedOrder.codRemaining}
          deliveryAddress={confirmedOrder.address}
          paymentMethod={confirmedOrder.paymentMethod}
          onTrackOrder={() => router.push(`/account?track=${confirmedOrder.orderNumber}`)}
          onViewOrder={() => router.push(`/order-success?id=${confirmedOrder.orderNumber}`)}
          onContinueShopping={() => router.push('/shop')}
        />
      )}

      {/* Address Add / Edit Modal */}
      <AddressFormModal
        isOpen={addressModalOpen}
        initialData={addressToEdit}
        onClose={() => {
          setAddressModalOpen(false);
          setAddressToEdit(null);
        }}
        onSuccess={handleAddressSaved}
      />

      {/* Address Delete Confirmation Modal */}
      <ConfirmDeleteAddressModal
        isOpen={Boolean(addressToDelete)}
        address={addressToDelete}
        loading={isDeletingAddress}
        onClose={() => setAddressToDelete(null)}
        onConfirm={handleDeleteAddressConfirm}
      />

      {/* Promotional Bundle Item Removal Modal */}
      <PromoBundleRemovalModal
        isOpen={Boolean(bundleRemovalTarget)}
        onClose={() => setBundleRemovalTarget(null)}
        onChooseAnother={() => {
          if (bundleRemovalTarget) {
            openBogoSelectorForBundle(bundleRemovalTarget.promoGroupId);
            setBundleRemovalTarget(null);
          }
        }}
        onRemoveOffer={() => {
          if (bundleRemovalTarget) {
            dissolvePromoBundle(bundleRemovalTarget.promoGroupId, true);
            setBundleRemovalTarget(null);
          }
        }}
        onRemoveEntireBundle={() => {
          if (bundleRemovalTarget) {
            dissolvePromoBundle(bundleRemovalTarget.promoGroupId, false);
            setBundleRemovalTarget(null);
          }
        }}
      />

      {/* Add Item to Order Modal */}
      <AddCheckoutItemModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setItemToReplace(null);
        }}
        onAddItem={handleAddItemToOrder}
        itemToReplace={itemToReplace}
        existingBundle={promoBundles[0] || null}
      />

      {/* Edit Order Item Modal */}
      <EditCheckoutItemModal
        isOpen={Boolean(itemToEdit)}
        item={itemToEdit}
        onClose={() => setItemToEdit(null)}
        onSave={handleEditItemSave}
        onReplaceWithProduct={() => {
          const item = itemToEdit;
          setItemToEdit(null);
          handleReplaceItemInitiate(item);
        }}
      />
    </div>
  );
}
