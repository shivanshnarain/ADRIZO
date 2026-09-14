"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Settings, 
  Layers, 
  Palette, 
  Ruler, 
  Hash, 
  Sliders, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  AlertTriangle,
  FolderTree,
  CheckCircle2,
  RefreshCw,
  Copy,
  Percent,
  Tag,
  Sparkles,
  Gift,
  X
} from 'lucide-react';
import Portal from '@/components/Portal';
import styles from '../admin.module.css';
import { 
  createCategory, 
  updateCategory, 
  deleteCategory,
  createProductType,
  updateProductType,
  deleteProductType,
  createColor,
  updateColor,
  deleteColor,
  createSize,
  updateSize,
  deleteSize,
  updateStoreSetting,
  saveAdminPromotionOffers
} from '@/actions/config';

import { 
  INITIAL_PREDEFINED_COLORS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCT_TYPES,
  INITIAL_GARMENT_SIZES
} from '@/lib/catalogueDefaults';

export default function SettingsClient({
  initialCategories,
  initialProductTypes,
  initialColors,
  initialSizes,
  initialSettings
}: {
  initialCategories: any[];
  initialProductTypes: any[];
  initialColors: any[];
  initialSizes: any[];
  initialSettings: Record<string, string>;
}) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'categories' | 'types' | 'colors' | 'sizes' | 'sku' | 'discounts' | 'general'>('categories');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['categories', 'types', 'colors', 'sizes', 'sku', 'discounts', 'general'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  const [categories, setCategories] = useState<any[]>(initialCategories);
  const [productTypes, setProductTypes] = useState<any[]>(initialProductTypes);
  const [colors, setColors] = useState<any[]>(initialColors);
  const [sizes, setSizes] = useState<any[]>(initialSizes);
  const [settings, setSettings] = useState<Record<string, string>>(initialSettings);

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage('');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage('');
    setTimeout(() => setErrorMessage(''), 4000);
  };

  // ==========================================================================
  // TAB 1: CATEGORIES MANAGEMENT
  // ==========================================================================
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catCode, setCatCode] = useState('');
  const [catStatus, setCatStatus] = useState('ACTIVE');
  const [catOrder, setCatOrder] = useState('0');

  const handleOpenAddCat = () => {
    setEditingCatId(null);
    setCatName('');
    setCatSlug('');
    setCatCode('');
    setCatStatus('ACTIVE');
    setCatOrder((categories.length + 1).toString());
    setIsCatModalOpen(true);
  };

  const handleOpenEditCat = (c: any) => {
    setEditingCatId(c.id);
    setCatName(c.name);
    setCatSlug(c.slug);
    setCatCode(c.code || '');
    setCatStatus(c.status || 'ACTIVE');
    setCatOrder(c.sortOrder !== undefined ? c.sortOrder.toString() : '0');
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('name', catName);
    formData.append('slug', catSlug || catName.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    formData.append('code', catCode);
    formData.append('status', catStatus);
    formData.append('sortOrder', catOrder);

    let res;
    if (editingCatId) {
      res = await updateCategory(editingCatId, formData);
    } else {
      res = await createCategory(formData);
    }
    setLoading(false);

    if (res.success && res.category) {
      if (editingCatId) {
        setCategories(prev => prev.map(c => c.id === editingCatId ? res.category : c));
      } else {
        setCategories(prev => [...prev, res.category]);
      }
      setIsCatModalOpen(false);
      showSuccess(editingCatId ? 'Category updated' : 'Category created');
    } else {
      showError(res.error || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    const res = await deleteCategory(id);
    if (res.success) {
      setCategories(prev => prev.filter(c => c.id !== id));
      showSuccess('Category deleted');
    } else {
      showError(res.error || 'Failed to delete category');
    }
  };

  // ==========================================================================
  // TAB 2: PRODUCT TYPES MANAGEMENT
  // ==========================================================================
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [typeCatId, setTypeCatId] = useState(categories[0]?.id || '');
  const [typeName, setTypeName] = useState('');
  const [typeCode, setTypeCode] = useState('');
  const [typeStatus, setTypeStatus] = useState('ACTIVE');
  const [typeOrder, setTypeOrder] = useState('0');

  const handleOpenAddType = () => {
    setEditingTypeId(null);
    setTypeCatId(categories[0]?.id || '');
    setTypeName('');
    setTypeCode('');
    setTypeStatus('ACTIVE');
    setTypeOrder((productTypes.length + 1).toString());
    setIsTypeModalOpen(true);
  };

  const handleOpenEditType = (pt: any) => {
    setEditingTypeId(pt.id);
    setTypeCatId(pt.categoryId || categories[0]?.id || '');
    setTypeName(pt.name);
    setTypeCode(pt.code || '');
    setTypeStatus(pt.status || 'ACTIVE');
    setTypeOrder(pt.sortOrder !== undefined ? pt.sortOrder.toString() : '0');
    setIsTypeModalOpen(true);
  };

  const handleSaveProductType = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('categoryId', typeCatId);
    formData.append('name', typeName);
    formData.append('code', typeCode);
    formData.append('status', typeStatus);
    formData.append('sortOrder', typeOrder);

    let res;
    if (editingTypeId) {
      res = await updateProductType(editingTypeId, formData);
    } else {
      res = await createProductType(formData);
    }
    setLoading(false);

    if (res.success && res.productType) {
      if (editingTypeId) {
        setProductTypes(prev => prev.map(pt => pt.id === editingTypeId ? res.productType : pt));
      } else {
        setProductTypes(prev => [...prev, res.productType]);
      }
      setIsTypeModalOpen(false);
      showSuccess(editingTypeId ? 'Product Type updated' : 'Product Type created');
    } else {
      showError(res.error || 'Failed to save product type');
    }
  };

  const handleDeleteProductType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product type?')) return;
    const res = await deleteProductType(id);
    if (res.success) {
      setProductTypes(prev => prev.filter(pt => pt.id !== id));
      showSuccess('Product Type deleted');
    } else {
      showError(res.error || 'Failed to delete product type');
    }
  };

  // ==========================================================================
  // TAB 3: COLORS MANAGEMENT
  // ==========================================================================
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [colorName, setColorName] = useState('');
  const [colorCode, setColorCode] = useState('');
  const [colorHex, setColorHex] = useState('#111111');
  const [colorStatus, setColorStatus] = useState('ACTIVE');

  const handleOpenAddColor = () => {
    setEditingColorId(null);
    setColorName('');
    setColorCode('');
    setColorHex('#64748B');
    setColorStatus('ACTIVE');
    setIsColorModalOpen(true);
  };

  const handleOpenEditColor = (col: any) => {
    setEditingColorId(col.id);
    setColorName(col.name);
    setColorCode(col.code || '');
    setColorHex(col.hex || '#64748B');
    setColorStatus(col.status || 'ACTIVE');
    setIsColorModalOpen(true);
  };

  const handleSaveColor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('name', colorName);
    formData.append('code', colorCode);
    formData.append('hex', colorHex);
    formData.append('status', colorStatus);
    formData.append('isCustom', 'true');

    let res;
    if (editingColorId) {
      res = await updateColor(editingColorId, formData);
    } else {
      res = await createColor(formData);
    }
    setLoading(false);

    if (res.success && res.color) {
      if (editingColorId) {
        setColors(prev => prev.map(c => c.id === editingColorId ? res.color : c));
      } else {
        setColors(prev => [...prev, res.color]);
      }
      setIsColorModalOpen(false);
      showSuccess(editingColorId ? 'Color updated' : 'Color created');
    } else {
      showError(res.error || 'Failed to save color');
    }
  };

  const handleDeleteColor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this color?')) return;
    const res = await deleteColor(id);
    if (res.success) {
      setColors(prev => prev.filter(c => c.id !== id));
      showSuccess('Color removed');
    } else {
      showError(res.error || 'Failed to delete color');
    }
  };

  // ==========================================================================
  // TAB 4: SIZES MANAGEMENT
  // ==========================================================================
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [editingSizeId, setEditingSizeId] = useState<string | null>(null);
  const [sizeName, setSizeName] = useState('');
  const [sizeCode, setSizeCode] = useState('');
  const [sizeOrder, setSizeOrder] = useState('0');

  const handleOpenAddSize = () => {
    setEditingSizeId(null);
    setSizeName('');
    setSizeCode('');
    setSizeOrder((sizes.length + 1).toString());
    setIsSizeModalOpen(true);
  };

  const handleOpenEditSize = (s: any) => {
    setEditingSizeId(s.id);
    setSizeName(s.name);
    setSizeCode(s.code || s.name);
    setSizeOrder(s.sortOrder !== undefined ? s.sortOrder.toString() : '0');
    setIsSizeModalOpen(true);
  };

  const handleSaveSize = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('name', sizeName);
    formData.append('code', sizeCode || sizeName);
    formData.append('sortOrder', sizeOrder);
    formData.append('status', 'ACTIVE');

    let res;
    if (editingSizeId) {
      res = await updateSize(editingSizeId, formData);
    } else {
      res = await createSize(formData);
    }
    setLoading(false);

    if (res.success && res.size) {
      if (editingSizeId) {
        setSizes(prev => prev.map(s => s.id === editingSizeId ? res.size : s));
      } else {
        setSizes(prev => [...prev, res.size]);
      }
      setIsSizeModalOpen(false);
      showSuccess(editingSizeId ? 'Size updated' : 'Size added');
    } else {
      showError(res.error || 'Failed to save size');
    }
  };

  const handleDeleteSize = async (id: string) => {
    if (!confirm('Are you sure you want to delete this size?')) return;
    const res = await deleteSize(id);
    if (res.success) {
      setSizes(prev => prev.filter(s => s.id !== id));
      showSuccess('Size removed');
    } else {
      showError(res.error || 'Failed to delete size');
    }
  };


  // ==========================================================================
  // TAB 7: DISCOUNTS & PROMOTIONS MANAGEMENT
  // ==========================================================================
  const [coupons, setCoupons] = useState<any[]>(() => {
    try {
      if (initialSettings.store_discounts) {
        return JSON.parse(initialSettings.store_discounts);
      }
    } catch {}
    return [
      { id: 'disc-1', code: 'WELCOME10', type: 'PERCENT', value: 10, minSpend: 999, status: 'ACTIVE' },
      { id: 'disc-2', code: 'ADRIZO50', type: 'PERCENT', value: 50, minSpend: 1999, status: 'ACTIVE' },
      { id: 'disc-3', code: 'FLAT200', type: 'FLAT', value: 200, minSpend: 1499, status: 'ACTIVE' }
    ];
  });

  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState('PERCENT');
  const [couponValue, setCouponValue] = useState('10');
  const [couponMinSpend, setCouponMinSpend] = useState('500');

  const handleSaveCoupons = async (updatedList: any[]) => {
    setLoading(true);
    const res = await updateStoreSetting('store_discounts', JSON.stringify(updatedList));
    setLoading(false);
    if (res.success) {
      setCoupons(updatedList);
      showSuccess('Discount coupons updated');
    } else {
      showError(res.error || 'Failed to save discount coupons');
    }
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    const newCoupon = {
      id: `disc-${Date.now()}`,
      code: couponCode.trim().toUpperCase(),
      type: couponType,
      value: parseFloat(couponValue) || 0,
      minSpend: parseFloat(couponMinSpend) || 0,
      status: 'ACTIVE'
    };
    const updated = [newCoupon, ...coupons];
    await handleSaveCoupons(updated);
    setIsCouponModalOpen(false);
    setCouponCode('');
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount coupon?')) return;
    const updated = coupons.filter(c => c.id !== id);
    await handleSaveCoupons(updated);
  };

  const handleToggleCoupon = async (id: string) => {
    const updated = coupons.map(c => c.id === id ? { ...c, status: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : c);
    await handleSaveCoupons(updated);
  };

  // ==========================================================================
  // BUY X GET Y Offers Management State & Handlers
  // ==========================================================================
  const defaultOffers = [
    {
      id: 'offer-b1g2',
      name: 'BUY 1 GET 2 FREE',
      type: 'Buy X Get Y',
      buyQuantity: 1,
      freeQuantity: 2,
      applicableCategories: ['all'],
      applicableProducts: [],
      allowSameProduct: true,
      allowDifferentProducts: true,
      status: 'ACTIVE',
      priority: 10,
    }
  ];

  const [promotionOffers, setPromotionOffers] = useState<any[]>(() => {
    try {
      if (initialSettings.promotions_offers) {
        const parsed = JSON.parse(initialSettings.promotions_offers);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      if (initialSettings.bogo_promotion) {
        const parsedBogo = JSON.parse(initialSettings.bogo_promotion);
        return [{
          id: parsedBogo.id || 'offer-b1g2',
          name: parsedBogo.name || 'BUY 1 GET 2 FREE',
          type: parsedBogo.type || 'Buy X Get Y',
          buyQuantity: parsedBogo.buyQuantity || 1,
          freeQuantity: parsedBogo.freeQuantity || 2,
          applicableCategories: parsedBogo.eligibleCategories || parsedBogo.applicableCategories || ['all'],
          applicableProducts: parsedBogo.eligibleProducts || parsedBogo.applicableProducts || [],
          allowSameProduct: parsedBogo.allowSameProduct !== false,
          allowDifferentProducts: parsedBogo.allowDifferentProducts !== false,
          status: parsedBogo.status || 'ACTIVE',
          priority: 10,
        }];
      }
    } catch {}
    return defaultOffers;
  });

  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [savingOffers, setSavingOffers] = useState(false);
  const [offerForm, setOfferForm] = useState<any>({
    name: 'BUY 1 GET 2 FREE',
    buyQuantity: 1,
    freeQuantity: 2,
    applicableCategories: ['all'],
    priority: 10,
    status: 'ACTIVE',
    startDate: '',
    endDate: '',
    maxBundlesPerOrder: '',
  });

  const handleSaveOffers = async (updatedList: any[]) => {
    setSavingOffers(true);
    const res = await saveAdminPromotionOffers(updatedList);
    setSavingOffers(false);
    if (res.success) {
      setPromotionOffers(updatedList);
      showSuccess('Promotional offers updated successfully');
    } else {
      showError(res.error || 'Failed to save promotional offers');
    }
  };

  const handleOpenCreateOffer = () => {
    setEditingOfferId(null);
    setOfferForm({
      name: 'BUY 1 GET 1 FREE',
      buyQuantity: 1,
      freeQuantity: 1,
      applicableCategories: ['all'],
      priority: 10,
      status: 'ACTIVE',
      startDate: '',
      endDate: '',
      maxBundlesPerOrder: '',
    });
    setIsOfferModalOpen(true);
  };

  const handleOpenEditOffer = (offer: any) => {
    setEditingOfferId(offer.id);
    setOfferForm({
      name: offer.name || '',
      buyQuantity: offer.buyQuantity || 1,
      freeQuantity: offer.freeQuantity || 1,
      applicableCategories: offer.applicableCategories || offer.eligibleCategories || ['all'],
      priority: offer.priority || 10,
      status: offer.status || 'ACTIVE',
      startDate: offer.startDate || '',
      endDate: offer.endDate || '',
      maxBundlesPerOrder: offer.maxBundlesPerOrder ? String(offer.maxBundlesPerOrder) : '',
    });
    setIsOfferModalOpen(true);
  };

  const handleToggleOfferCategoryInForm = (catSlug: string) => {
    setOfferForm((prev: any) => {
      let curr = prev.applicableCategories || ['all'];
      if (catSlug === 'all') {
        return { ...prev, applicableCategories: ['all'] };
      }
      curr = curr.filter((c: string) => c !== 'all');
      if (curr.includes(catSlug)) {
        const next = curr.filter((c: string) => c !== catSlug);
        return { ...prev, applicableCategories: next.length === 0 ? ['all'] : next };
      } else {
        return { ...prev, applicableCategories: [...curr, catSlug] };
      }
    });
  };

  const handleSubmitOfferForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = offerForm.name.trim();
    if (!cleanName) {
      showError('Please enter an offer name');
      return;
    }

    const buyQty = Math.max(1, parseInt(String(offerForm.buyQuantity), 10) || 1);
    const freeQty = Math.max(1, parseInt(String(offerForm.freeQuantity), 10) || 1);

    const offerObj = {
      id: editingOfferId || `offer-${Date.now()}`,
      name: cleanName,
      type: 'Buy X Get Y',
      buyQuantity: buyQty,
      freeQuantity: freeQty,
      applicableCategories: offerForm.applicableCategories && offerForm.applicableCategories.length > 0 ? offerForm.applicableCategories : ['all'],
      applicableProducts: [],
      allowSameProduct: true,
      allowDifferentProducts: true,
      status: offerForm.status || 'ACTIVE',
      priority: parseInt(String(offerForm.priority), 10) || 10,
      startDate: offerForm.startDate || undefined,
      endDate: offerForm.endDate || undefined,
      maxBundlesPerOrder: offerForm.maxBundlesPerOrder ? parseInt(String(offerForm.maxBundlesPerOrder), 10) : undefined,
      updatedAt: new Date().toISOString(),
    };

    let updatedList: any[];
    if (editingOfferId) {
      updatedList = promotionOffers.map(o => o.id === editingOfferId ? { ...o, ...offerObj } : o);
    } else {
      updatedList = [offerObj, ...promotionOffers];
    }

    await handleSaveOffers(updatedList);
    setIsOfferModalOpen(false);
  };

  const handleToggleOfferStatus = async (id: string) => {
    const updated = promotionOffers.map(o => o.id === id ? { ...o, status: o.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : o);
    await handleSaveOffers(updated);
  };

  const handleDeleteOffer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotional offer?')) return;
    const updated = promotionOffers.filter(o => o.id !== id);
    await handleSaveOffers(updated);
  };


  return (
    <div>
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className={styles.pageTitle} style={{ margin: 0 }}>Product Configuration & Settings</h1>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
            Manage categories, product types, colors, sizes, SKU rules, and promotional discounts.
          </p>
        </div>
      </div>

      {/* TOAST ALERTS */}
      {(successMessage || errorMessage) && (
        <Portal>
          <div
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              zIndex: 'var(--z-toast, 2500)' as any,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {successMessage && (
              <div style={{ padding: '0.75rem 1.25rem', background: '#dcfce7', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '8px', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} />
                <span>{successMessage}</span>
              </div>
            )}
            {errorMessage && (
              <div style={{ padding: '0.75rem 1.25rem', background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                <AlertTriangle size={18} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </Portal>
      )}

      {/* NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '2px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          style={{
            padding: '0.65rem 1rem',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'categories' ? '2.5px solid #FFC800' : '2.5px solid transparent',
            color: activeTab === 'categories' ? '#0f172a' : '#64748b',
            fontWeight: activeTab === 'categories' ? 700 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap'
          }}
        >
          <FolderTree size={16} /> Categories
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('types')}
          style={{
            padding: '0.65rem 1rem',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'types' ? '2.5px solid #FFC800' : '2.5px solid transparent',
            color: activeTab === 'types' ? '#0f172a' : '#64748b',
            fontWeight: activeTab === 'types' ? 700 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap'
          }}
        >
          <Layers size={16} /> Product Types / Styles
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('colors')}
          style={{
            padding: '0.65rem 1rem',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'colors' ? '2.5px solid #FFC800' : '2.5px solid transparent',
            color: activeTab === 'colors' ? '#0f172a' : '#64748b',
            fontWeight: activeTab === 'colors' ? 700 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap'
          }}
        >
          <Palette size={16} /> Colors Library
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sizes')}
          style={{
            padding: '0.65rem 1rem',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'sizes' ? '2.5px solid #FFC800' : '2.5px solid transparent',
            color: activeTab === 'sizes' ? '#0f172a' : '#64748b',
            fontWeight: activeTab === 'sizes' ? 700 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap'
          }}
        >
          <Ruler size={16} /> Sizes
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sku')}
          style={{
            padding: '0.65rem 1rem',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'sku' ? '2.5px solid #FFC800' : '2.5px solid transparent',
            color: activeTab === 'sku' ? '#0f172a' : '#64748b',
            fontWeight: activeTab === 'sku' ? 700 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap'
          }}
        >
          <Hash size={16} /> SKU Configuration
        </button>



        <button
          type="button"
          onClick={() => setActiveTab('discounts')}
          style={{
            padding: '0.65rem 1rem',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'discounts' ? '2.5px solid #FFC800' : '2.5px solid transparent',
            color: activeTab === 'discounts' ? '#0f172a' : '#64748b',
            fontWeight: activeTab === 'discounts' ? 700 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap'
          }}
        >
          <Percent size={16} /> Discounts &amp; Coupons
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('general')}
          style={{
            padding: '0.65rem 1rem',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'general' ? '2.5px solid #FFC800' : '2.5px solid transparent',
            color: activeTab === 'general' ? '#0f172a' : '#64748b',
            fontWeight: activeTab === 'general' ? 700 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap'
          }}
        >
          <Settings size={16} /> General Settings
        </button>
      </div>

      {/* ================================================================== */}
      {/* TAB 1: CATEGORIES CONTENT                                          */}
      {/* ================================================================== */}
      {activeTab === 'categories' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Categories ({categories.length})</h2>
            <button 
              type="button" 
              className="btn-primary" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#FFC800', color: '#000000', border: '1px solid #eab308', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
              onClick={handleOpenAddCat}
            >
              <Plus size={16} /> Add Category
            </button>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Order</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Category Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Short Code</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Slug</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c, i) => (
                  <tr key={c.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#64748b' }}>{c.sortOrder ?? i + 1}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>{c.name}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, background: '#f1f5f9', padding: '0.2rem 0.45rem', borderRadius: '4px' }}>
                        {c.code || 'TSH'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{c.slug}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, background: c.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9', color: c.status === 'ACTIVE' ? '#166534' : '#64748b' }}>
                        {c.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <button 
                        type="button" 
                        onClick={() => handleOpenEditCat(c)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', marginRight: '0.5rem' }}
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteCategory(c.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add / Edit Category Modal */}
          {isCatModalOpen && (
            <Portal>
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 'var(--z-modal-backdrop, 2000)' as any, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div style={{ background: '#fff', borderRadius: '8px', width: '100%', maxWidth: '450px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)' }}>
                  <h3 style={{ margin: '0 0 1rem 0' }}>{editingCatId ? 'Edit Category' : 'Add Category'}</h3>
                  <form onSubmit={handleSaveCategory}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Category Name *</label>
                      <input 
                        type="text" 
                        required 
                        value={catName} 
                        onChange={e => setCatName(e.target.value)} 
                        style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Short Code (for SKU, e.g. TSH) *</label>
                      <input 
                        type="text" 
                        required 
                        maxLength={4}
                        value={catCode} 
                        onChange={e => setCatCode(e.target.value.toUpperCase())} 
                        style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', textTransform: 'uppercase' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Sort Order</label>
                        <input 
                          type="number" 
                          value={catOrder} 
                          onChange={e => setCatOrder(e.target.value)} 
                          style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Status</label>
                        <select 
                          value={catStatus} 
                          onChange={e => setCatStatus(e.target.value)}
                          style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                      <button type="button" onClick={() => setIsCatModalOpen(false)} style={{ padding: '0.55rem 1rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                      <button type="submit" disabled={loading} style={{ padding: '0.55rem 1.25rem', background: '#FFC800', color: '#000000', fontWeight: 700, border: '1px solid #eab308', borderRadius: '6px', cursor: 'pointer' }}>Save</button>
                    </div>
                  </form>
                </div>
              </div>
            </Portal>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 2: PRODUCT TYPES / STYLES CONTENT                              */}
      {/* ================================================================== */}
      {activeTab === 'types' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Product Types / Styles ({productTypes.length})</h2>
            <button 
              type="button" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#FFC800', color: '#000000', border: '1px solid #eab308', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
              onClick={handleOpenAddType}
            >
              <Plus size={16} /> Add Product Type
            </button>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Style Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Assigned Category</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Short Code (SKU)</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Order</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {productTypes.map((pt, i) => {
                  const cat = categories.find(c => c.id === pt.categoryId) || { name: 'Category' };
                  return (
                    <tr key={pt.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>{pt.name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ padding: '0.2rem 0.5rem', background: '#f1f5f9', borderRadius: '4px', fontWeight: 600 }}>
                          {cat.name}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.2rem 0.45rem', borderRadius: '4px' }}>
                          {pt.code || 'PO'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{pt.sortOrder ?? i + 1}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, background: pt.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9', color: pt.status === 'ACTIVE' ? '#166534' : '#64748b' }}>
                          {pt.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <button 
                          type="button" 
                          onClick={() => handleOpenEditType(pt)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', marginRight: '0.5rem' }}
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleDeleteProductType(pt.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add / Edit Product Type Modal */}
          {isTypeModalOpen && (
            <Portal>
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 'var(--z-modal-backdrop, 2000)' as any, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div style={{ background: '#fff', borderRadius: '8px', width: '100%', maxWidth: '450px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)' }}>
                  <h3 style={{ margin: '0 0 1rem 0' }}>{editingTypeId ? 'Edit Product Type' : 'Add Product Type'}</h3>
                  <form onSubmit={handleSaveProductType}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Assign Category *</label>
                      <select
                        value={typeCatId}
                        onChange={e => setTypeCatId(e.target.value)}
                        style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                      >
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Style Name (e.g. Henley T-Shirt) *</label>
                      <input 
                        type="text" 
                        required 
                        value={typeName} 
                        onChange={e => setTypeName(e.target.value)} 
                        style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Short Code (for SKU, e.g. HEN, ZP) *</label>
                      <input 
                        type="text" 
                        required 
                        maxLength={4}
                        value={typeCode} 
                        onChange={e => setTypeCode(e.target.value.toUpperCase())} 
                        style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', textTransform: 'uppercase' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Sort Order</label>
                        <input 
                          type="number" 
                          value={typeOrder} 
                          onChange={e => setTypeOrder(e.target.value)} 
                          style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Status</label>
                        <select 
                          value={typeStatus} 
                          onChange={e => setTypeStatus(e.target.value)}
                          style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                      <button type="button" onClick={() => setIsTypeModalOpen(false)} style={{ padding: '0.55rem 1rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                      <button type="submit" disabled={loading} style={{ padding: '0.55rem 1.25rem', background: '#FFC800', color: '#000000', fontWeight: 700, border: '1px solid #eab308', borderRadius: '6px', cursor: 'pointer' }}>Save</button>
                    </div>
                  </form>
                </div>
              </div>
            </Portal>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 3: EXACT COLORS LIBRARY CONTENT                                */}
      {/* ================================================================== */}
      {activeTab === 'colors' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Exact Colors Library ({colors.length})</h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                Predefined 16 exact catalogue colors + admin custom colors with unique codes.
              </p>
            </div>
            <button 
              type="button" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#FFC800', color: '#000000', border: '1px solid #eab308', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
              onClick={handleOpenAddColor}
            >
              <Plus size={16} /> Add Custom Color
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {colors.map((c, i) => (
              <div 
                key={c.name + i} 
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span 
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: c.hex || '#64748B',
                      border: '1px solid rgba(0,0,0,0.15)',
                      flexShrink: 0
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>{c.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>Code: {c.code || 'DFT'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button 
                    type="button" 
                    onClick={() => handleOpenEditColor(c)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '0.2rem' }}
                  >
                    <Edit size={14} />
                  </button>
                  {c.isCustom && (
                    <button 
                      type="button" 
                      onClick={() => handleDeleteColor(c.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.2rem' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add / Edit Color Modal */}
          {isColorModalOpen && (
            <Portal>
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 'var(--z-modal-backdrop, 2000)' as any, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div style={{ background: '#fff', borderRadius: '8px', width: '100%', maxWidth: '400px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)' }}>
                  <h3 style={{ margin: '0 0 1rem 0' }}>{editingColorId ? 'Edit Color' : 'Add Custom Color'}</h3>
                  <form onSubmit={handleSaveColor}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Color Name *</label>
                      <input 
                        type="text" 
                        required 
                        value={colorName} 
                        onChange={e => setColorName(e.target.value.toUpperCase())} 
                        placeholder="e.g. SAGE GREEN"
                        style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', textTransform: 'uppercase' }}
                      />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Short Code (for SKU, e.g. SGR) *</label>
                      <input 
                        type="text" 
                        required 
                        maxLength={4}
                        value={colorCode} 
                        onChange={e => setColorCode(e.target.value.toUpperCase())} 
                        placeholder="e.g. SGR"
                        style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', textTransform: 'uppercase' }}
                      />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Hex Color Value</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input 
                          type="color" 
                          value={colorHex} 
                          onChange={e => setColorHex(e.target.value)} 
                          style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                        />
                        <input 
                          type="text" 
                          value={colorHex} 
                          onChange={e => setColorHex(e.target.value)} 
                          style={{ flex: 1, padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                      <button type="button" onClick={() => setIsColorModalOpen(false)} style={{ padding: '0.55rem 1rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                      <button type="submit" disabled={loading} style={{ padding: '0.55rem 1.25rem', background: '#FFC800', color: '#000000', fontWeight: 700, border: '1px solid #eab308', borderRadius: '6px', cursor: 'pointer' }}>Save</button>
                    </div>
                  </form>
                </div>
              </div>
            </Portal>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 4: SIZES CONTENT                                               */}
      {/* ================================================================== */}
      {activeTab === 'sizes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Garment Sizes ({sizes.length})</h2>
            <button 
              type="button" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#FFC800', color: '#000000', border: '1px solid #eab308', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
              onClick={handleOpenAddSize}
            >
              <Plus size={16} /> Add Size
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {sizes.map((s, i) => (
              <div 
                key={s.name + i}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '0.65rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{s.name}</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button 
                    type="button" 
                    onClick={() => handleOpenEditSize(s)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}
                  >
                    <Edit size={13} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleDeleteSize(s.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add / Edit Size Modal */}
          {isSizeModalOpen && (
            <Portal>
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 'var(--z-modal-backdrop, 2000)' as any, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div style={{ background: '#fff', borderRadius: '8px', width: '100%', maxWidth: '380px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)' }}>
                  <h3 style={{ margin: '0 0 1rem 0' }}>{editingSizeId ? 'Edit Size' : 'Add Size'}</h3>
                  <form onSubmit={handleSaveSize}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Size Label *</label>
                      <input 
                        type="text" 
                        required 
                        value={sizeName} 
                        onChange={e => setSizeName(e.target.value.toUpperCase())} 
                        placeholder="e.g. 6XL or 34"
                        style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Sort Order</label>
                      <input 
                        type="number" 
                        value={sizeOrder} 
                        onChange={e => setSizeOrder(e.target.value)} 
                        style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                      <button type="button" onClick={() => setIsSizeModalOpen(false)} style={{ padding: '0.55rem 1rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                      <button type="submit" disabled={loading} style={{ padding: '0.55rem 1.25rem', background: '#FFC800', color: '#000000', fontWeight: 700, border: '1px solid #eab308', borderRadius: '6px', cursor: 'pointer' }}>Save</button>
                    </div>
                  </form>
                </div>
              </div>
            </Portal>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 5: SKU CONFIGURATION OVERVIEW                                  */}
      {/* ================================================================== */}
      {activeTab === 'sku' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Deterministic SKU Identity System</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1.5rem 0' }}>
            Product configuration is uniquely defined by: <code>CATEGORY + PRODUCT TYPE + COLOR</code>.
            Each configuration maps to exactly ONE deterministic SKU identity in the format: <code>CATEGORY-COLOR-TYPE</code>.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '0.925rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Deterministic Formula</h3>
              <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', background: '#fff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '0.5rem' }}>
                TSH-JBL-ZP
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8125rem', color: '#475569' }}>
                <li><strong>TSH</strong>: Category Code (e.g. T-Shirts)</li>
                <li><strong>JBL</strong>: Color Code (e.g. Jet Black)</li>
                <li><strong>ZP</strong>: Product Type Code (e.g. Zipper Polo T-Shirt)</li>
                <li><strong>Deterministic</strong>: No random suffixes or UUIDs; duplicates are blocked at the database level.</li>
              </ul>
            </div>

            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '0.925rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Configuration Uniqueness Rule</h3>
              <p style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                Changing price, description, images, or available sizes never changes the product SKU. Only a genuine configuration change results in a different SKU. Duplicate configurations cannot be created.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 7: DISCOUNTS & PROMOTIONS                                      */}
      {/* ================================================================== */}
      {activeTab === 'discounts' && (
        <div>
          {/* BUY X GET Y Promotional Offers Management Section */}
          <div style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '1rem' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.725rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '4px', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  🎁 Promotion Engine
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#09090b', letterSpacing: '-0.01em' }}>
                  Buy X Get Y Promotional Offers ({promotionOffers.length})
                </h2>
                <p style={{ fontSize: '0.8125rem', color: '#71717a', margin: '4px 0 0 0' }}>
                  Configure active promotions (e.g. BUY 1 GET 1 FREE, BUY 1 GET 2 FREE, BUY 2 GET 1 FREE). Customer pays strictly for the highest current selling-price item.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateOffer}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#FFC800',
                  color: '#000000',
                  border: '1px solid #eab308',
                  padding: '0.5rem 1.15rem',
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <Plus size={16} /> Create New Offer
              </button>
            </div>

            {/* Offers Table */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e4e4e7', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Offer Name</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Rule Formula</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Applicable Categories</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Priority</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promotionOffers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#71717a' }}>
                        No promotional offers configured. Click &quot;Create New Offer&quot; above to add one.
                      </td>
                    </tr>
                  ) : (
                    promotionOffers.map((offer) => {
                      const isStorewide = (offer.applicableCategories || []).includes('all');
                      const isActive = offer.status === 'ACTIVE';

                      return (
                        <tr key={offer.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#09090b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Sparkles size={14} color="#eab308" />
                              <span>{offer.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#0f172a' }}>
                            <span style={{ display: 'inline-block', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.775rem' }}>
                              Buy {offer.buyQuantity} Get {offer.freeQuantity} FREE
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>
                            {isStorewide ? (
                              <span style={{ background: '#09090b', color: '#ffffff', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.725rem', fontWeight: 700 }}>
                                ★ All Categories (Storewide)
                              </span>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                {(offer.applicableCategories || []).map((catSlug: string) => {
                                  const catObj = categories.find((c: any) => (c.slug || c.name.toLowerCase()) === catSlug);
                                  return (
                                    <span key={catSlug} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
                                      {catObj ? catObj.name : catSlug}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#64748b' }}>
                            #{offer.priority ?? 10}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleOfferStatus(offer.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '9999px',
                                fontSize: '0.725rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                background: isActive ? '#dcfce7' : '#f4f4f5',
                                border: isActive ? '1px solid #86efac' : '1px solid #d4d4d8',
                                color: isActive ? '#166534' : '#71717a',
                              }}
                            >
                              <span>{isActive ? '● ACTIVE' : '○ INACTIVE'}</span>
                            </button>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditOffer(offer)}
                                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700 }}
                                title="Edit Offer"
                              >
                                <Edit size={13} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteOffer(offer.id)}
                                style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700 }}
                                title="Delete Offer"
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>


          {/* Existing Discount Coupons Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: '#09090b' }}>Discount Coupons &amp; Promo Codes ({coupons.length})</h2>
              <p style={{ fontSize: '0.8125rem', color: '#71717a', margin: '4px 0 0 0' }}>
                Create and manage customer promo discount codes and minimum cart requirements.
              </p>
            </div>
            <button 
              type="button" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#FFC800', color: '#000000', border: '1px solid #eab308', padding: '0.5rem 1.15rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.8125rem', cursor: 'pointer' }}
              onClick={() => setIsCouponModalOpen(true)}
            >
              <Plus size={16} /> Add Promo Code
            </button>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e4e4e7', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Coupon Code</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Discount Value</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Min Spend</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#71717a' }}>
                      No active discount coupons found. Click &quot;Add Promo Code&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  coupons.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 900, background: '#fffbeb', color: '#000000', border: '1px solid #fde68a', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                          {c.code}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#dc2626' }}>
                        {c.type === 'PERCENT' ? `${c.value}% OFF` : `₹${c.value} FLAT OFF`}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#71717a' }}>
                        {c.minSpend > 0 ? `₹${c.minSpend}` : 'No Minimum'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleCoupon(c.id)}
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            background: c.status === 'ACTIVE' ? '#fffbeb' : '#f4f4f5',
                            border: c.status === 'ACTIVE' ? '1px solid #FFC800' : '1px solid #d4d4d8',
                            color: c.status === 'ACTIVE' ? '#000' : '#71717a',
                            cursor: 'pointer'
                          }}
                        >
                          {c.status === 'ACTIVE' ? '● Active' : '○ Inactive'}
                        </button>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button 
                          type="button" 
                          onClick={() => handleDeleteCoupon(c.id)} 
                          style={{ padding: '0.35rem', background: '#fff', border: '1px solid #d4d4d8', borderRadius: 4, cursor: 'pointer', color: '#ef4444' }}
                          title="Delete Coupon"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Add Coupon Modal */}
          {isCouponModalOpen && (
            <Portal>
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 'var(--z-modal-backdrop, 2000)' as any, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div style={{ background: '#fff', borderRadius: '8px', width: '100%', maxWidth: '420px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800 }}>Create Promo Discount</h3>
                  <form onSubmit={handleAddCoupon}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.25rem' }}>Promo Code *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. SUMMER25"
                        value={couponCode} 
                        onChange={e => setCouponCode(e.target.value.toUpperCase())} 
                        style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #d4d4d8', borderRadius: '6px', textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.25rem' }}>Discount Type</label>
                        <select 
                          value={couponType} 
                          onChange={e => setCouponType(e.target.value)}
                          style={{ width: '100%', height: '38px', padding: '0 0.5rem', border: '1px solid #d4d4d8', borderRadius: '6px', background: '#fff', fontSize: '0.8125rem', fontWeight: 700 }}
                        >
                          <option value="PERCENT">Percentage (% OFF)</option>
                          <option value="FLAT">Flat Amount (₹ OFF)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.25rem' }}>Value ({couponType === 'PERCENT' ? '%' : '₹'})</label>
                        <input 
                          type="number" 
                          required 
                          min="1"
                          value={couponValue} 
                          onChange={e => setCouponValue(e.target.value)} 
                          style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700 }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.25rem' }}>Minimum Cart Spend (₹)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={couponMinSpend} 
                        onChange={e => setCouponMinSpend(e.target.value)} 
                        style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button type="button" onClick={() => setIsCouponModalOpen(false)} style={{ padding: '0.5rem 1rem', border: '1px solid #d4d4d8', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                      <button type="submit" disabled={loading} style={{ padding: '0.55rem 1.25rem', background: '#FFC800', color: '#000000', fontWeight: 800, border: '1px solid #eab308', borderRadius: '6px', cursor: 'pointer' }}>Create Coupon</button>
                    </div>
                  </form>
                </div>
              </div>
            </Portal>
          )}

          {/* Create / Edit Promotional Offer Modal */}
          {isOfferModalOpen && (
            <Portal>
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 'var(--z-modal-backdrop, 2000)' as any, padding: '1rem' }}>
              <div style={{ background: '#fff', borderRadius: '12px', padding: '1.75rem', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #e4e4e7', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={18} color="#eab308" />
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#09090b' }}>
                      {editingOfferId ? 'Edit Promotional Offer' : 'Create New Promotional Offer'}
                    </h3>
                  </div>
                  <button type="button" onClick={() => setIsOfferModalOpen(false)} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: '4px' }}>
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSubmitOfferForm}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                        Offer Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. BUY 1 GET 2 FREE or BUY 1 GET 1 FREE"
                        value={offerForm.name}
                        onChange={(e) => setOfferForm({ ...offerForm, name: e.target.value })}
                        required
                        style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700 }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                        Buy Quantity (X Paid) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={offerForm.buyQuantity}
                        onChange={(e) => setOfferForm({ ...offerForm, buyQuantity: e.target.value })}
                        required
                        style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                        Free Quantity (Y Free) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={offerForm.freeQuantity}
                        onChange={(e) => setOfferForm({ ...offerForm, freeQuantity: e.target.value })}
                        required
                        style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                        Offer Status
                      </label>
                      <select
                        value={offerForm.status}
                        onChange={(e) => setOfferForm({ ...offerForm, status: e.target.value })}
                        style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.85rem', background: '#fff' }}
                      >
                        <option value="ACTIVE">ACTIVE (Visible on Store)</option>
                        <option value="INACTIVE">INACTIVE (Disabled)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                        Offer Priority
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={offerForm.priority}
                        onChange={(e) => setOfferForm({ ...offerForm, priority: e.target.value })}
                        placeholder="10"
                        style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                        Start Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={offerForm.startDate}
                        onChange={(e) => setOfferForm({ ...offerForm, startDate: e.target.value })}
                        style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                        End Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={offerForm.endDate}
                        onChange={(e) => setOfferForm({ ...offerForm, endDate: e.target.value })}
                        style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  {/* Applicable Categories Selection */}
                  <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                      Applicable Categories
                    </label>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.75rem 0' }}>
                      Choose &quot;All Categories&quot; to apply storewide, or select specific categories (e.g. T-Shirts, Hoodies).
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleOfferCategoryInForm('all')}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: (offerForm.applicableCategories || []).includes('all') ? '#09090b' : '#ffffff',
                          color: (offerForm.applicableCategories || []).includes('all') ? '#ffffff' : '#334155',
                          border: (offerForm.applicableCategories || []).includes('all') ? '1px solid #09090b' : '1px solid #cbd5e1',
                        }}
                      >
                        ★ All Categories (Storewide)
                      </button>

                      {categories.map((c: any) => {
                        const isSelected = !(offerForm.applicableCategories || []).includes('all') && (offerForm.applicableCategories || []).includes(c.slug || c.name.toLowerCase());
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleToggleOfferCategoryInForm(c.slug || c.name.toLowerCase())}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: isSelected ? '#FFC800' : '#ffffff',
                              color: isSelected ? '#000000' : '#334155',
                              border: isSelected ? '1px solid #eab308' : '1px solid #cbd5e1',
                            }}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setIsOfferModalOpen(false)}
                      style={{ padding: '0.55rem 1.15rem', border: '1px solid #d4d4d8', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingOffers}
                      style={{ padding: '0.55rem 1.35rem', background: '#FFC800', color: '#000000', fontWeight: 800, border: '1px solid #eab308', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      {savingOffers ? 'Saving...' : editingOfferId ? 'Update Offer' : 'Create Offer'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
            </Portal>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 8: GENERAL STORE & INFRASTRUCTURE SETTINGS                     */}
      {/* ================================================================== */}
      {activeTab === 'general' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#09090b' }}>
            General Store &amp; Infrastructure Settings
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#f8fafc', padding: '1.15rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Store Identity</div>
              <div style={{ fontSize: '0.875rem', color: '#09090b' }}>
                <div><strong>Store Brand:</strong> ADRIZO Luxury Menswear</div>
                <div style={{ marginTop: '4px' }}><strong>Support Email:</strong> support@adrizo.com</div>
                <div style={{ marginTop: '4px' }}><strong>Support Phone:</strong> +91 98765 43210</div>
                <div style={{ marginTop: '4px' }}><strong>Base Currency:</strong> Indian Rupee (INR ₹)</div>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1.15rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Shipping &amp; Fulfillment Thresholds</div>
              <div style={{ fontSize: '0.875rem', color: '#09090b' }}>
                <div><strong>Free Shipping Threshold:</strong> ₹599 and above</div>
                <div style={{ marginTop: '4px' }}><strong>Standard Shipping Fee:</strong> ₹39 for orders under ₹599</div>
                <div style={{ marginTop: '4px' }}><strong>Cash on Delivery Limits:</strong> ₹699 to ₹2,999</div>
                <div style={{ marginTop: '4px' }}><strong>Delivery Serviceability:</strong> Active nationwide coverage</div>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1.15rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Database &amp; Storage Architecture</div>
              <div style={{ fontSize: '0.875rem', color: '#09090b' }}>
                <div><strong>Customer &amp; Orders:</strong> Supabase PostgreSQL (Single Source of Truth)</div>
                <div style={{ marginTop: '4px' }}><strong>Products &amp; Catalogue:</strong> MongoDB Atlas Cluster</div>
                <div style={{ marginTop: '4px' }}><strong>Garment Media:</strong> Cloudinary Global CDN</div>
                <div style={{ marginTop: '4px' }}><strong>Duplicate Storage:</strong> 0 bytes (Zero secondary mirroring)</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
