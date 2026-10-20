"use client";

import { useState, useRef, useMemo } from 'react';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  UploadCloud, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  Image as ImageIcon, 
  Eye,
  RefreshCw,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2
} from 'lucide-react';
import styles from '../admin.module.css';
import { saveResponsiveHeroConfig } from '@/actions/cms';
import { 
  ResponsiveHeroConfig, 
  HeroImageItem, 
  DeviceHeroConfig, 
  getDeterministicHeroImage 
} from '@/lib/hero-config';

interface BannersClientProps {
  initialConfig: ResponsiveHeroConfig;
}

type DeviceTab = 'mobile' | 'tablet' | 'desktop';

export default function BannersClient({ initialConfig }: BannersClientProps) {
  const [config, setConfig] = useState<ResponsiveHeroConfig>(initialConfig);
  const [activeTab, setActiveTab] = useState<DeviceTab>('mobile');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [previewDevice, setPreviewDevice] = useState<DeviceTab>('mobile');

  // Hidden file input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceIndexRef = useRef<number | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const currentDeviceConfig: DeviceHeroConfig = config[activeTab] || {
    rotationEnabled: false,
    rotationIntervalSec: 5,
    dailyMode: true,
    images: []
  };

  // Update current device configuration
  const updateDeviceConfig = (updater: (prev: DeviceHeroConfig) => DeviceHeroConfig) => {
    setConfig(prev => ({
      ...prev,
      [activeTab]: updater(prev[activeTab] || {
        rotationEnabled: false,
        rotationIntervalSec: 5,
        dailyMode: true,
        images: []
      })
    }));
  };

  // Multiple file upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(`Uploading ${files.length} image(s)...`);

    try {
      const isReplace = replaceIndexRef.current !== null;
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds 10MB limit.`);
        }

        setUploadProgress(`Uploading ${i + 1} of ${files.length}: ${file.name}`);
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (data.success && (data.url || data.urls?.[0])) {
          uploadedUrls.push(data.url || data.urls[0]);
        } else {
          throw new Error(data.error || `Upload failed for ${file.name}`);
        }
      }

      if (isReplace && replaceIndexRef.current !== null && uploadedUrls.length > 0) {
        const replaceIdx = replaceIndexRef.current;
        updateDeviceConfig(prev => {
          const newImages = [...prev.images];
          if (newImages[replaceIdx]) {
            newImages[replaceIdx] = {
              ...newImages[replaceIdx],
              url: uploadedUrls[0]
            };
          }
          return { ...prev, images: newImages };
        });
        showToast('success', `${activeTab.toUpperCase()} hero image replaced.`);
      } else if (uploadedUrls.length > 0) {
        updateDeviceConfig(prev => {
          const newItems: HeroImageItem[] = uploadedUrls.map((url, idx) => ({
            id: `hero-${activeTab}-${Date.now()}-${idx}`,
            url,
            altText: `ADRIZO ${activeTab.toUpperCase()} Hero`,
            buttonText: 'SHOP NOW',
            buttonLink: '/shop',
            isActive: true,
            sortOrder: prev.images.length + idx
          }));
          return {
            ...prev,
            images: [...prev.images, ...newItems]
          };
        });
        showToast('success', `${uploadedUrls.length} image(s) added to ${activeTab.toUpperCase()} collection.`);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Image upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(null);
      replaceIndexRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerUpload = () => {
    replaceIndexRef.current = null;
    fileInputRef.current?.click();
  };

  const triggerReplace = (index: number) => {
    replaceIndexRef.current = index;
    fileInputRef.current?.click();
  };

  const toggleImageActive = (index: number) => {
    updateDeviceConfig(prev => {
      const newImages = [...prev.images];
      newImages[index] = {
        ...newImages[index],
        isActive: !newImages[index].isActive
      };
      return { ...prev, images: newImages };
    });
  };

  const deleteImage = (index: number) => {
    if (!confirm('Are you sure you want to remove this hero image?')) return;
    updateDeviceConfig(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index).map((img, i) => ({ ...img, sortOrder: i }))
    }));
    showToast('success', 'Image removed from collection.');
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentDeviceConfig.images.length) return;

    updateDeviceConfig(prev => {
      const newImages = [...prev.images];
      const temp = newImages[index];
      newImages[index] = newImages[targetIdx];
      newImages[targetIdx] = temp;
      return {
        ...prev,
        images: newImages.map((img, i) => ({ ...img, sortOrder: i }))
      };
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const res = await saveResponsiveHeroConfig(config);
      if (res.success) {
        showToast('success', 'Hero Section Manager changes successfully published to live storefront!');
      } else {
        showToast('error', res.error || 'Failed to save hero configuration.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Network error saving configuration.');
    } finally {
      setSaving(false);
    }
  };

  // Preview computation
  const activeDeterministicImage = useMemo(() => {
    return getDeterministicHeroImage(config[previewDevice]);
  }, [config, previewDevice]);

  return (
    <div>
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple={replaceIndexRef.current === null}
        accept="image/jpeg,image/png,image/webp,image/avif,image/jpg"
        style={{ display: 'none' }}
      />

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 18px',
          borderRadius: '8px',
          backgroundColor: toast.type === 'success' ? '#09090b' : '#991b1b',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} color="#FFC800" /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header & Save Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className={styles.pageTitle} style={{ margin: 0 }}>Hero Section Manager</h1>
          <p style={{ fontSize: '0.8125rem', color: '#71717a', margin: '4px 0 0 0' }}>
            Configure device-specific responsive hero banners with deterministic 24-hour daily rotation and Cloudinary persistence.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving || uploading}
          className={styles.primaryBtn}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#000000',
            color: '#FFC800',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 800,
            border: 'none',
            cursor: saving || uploading ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? <Loader2 size={16} className={styles.spin} /> : <Check size={16} />}
          <span>{saving ? 'Saving Changes...' : 'Save & Publish Hero'}</span>
        </button>
      </div>

      {/* Device Section Selector Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        backgroundColor: '#ffffff',
        padding: '6px',
        borderRadius: '10px',
        border: '1px solid #e4e4e7',
        marginBottom: '1.5rem',
        maxWidth: '560px'
      }}>
        <button
          type="button"
          onClick={() => { setActiveTab('mobile'); setPreviewDevice('mobile'); }}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'mobile' ? '#000000' : 'transparent',
            color: activeTab === 'mobile' ? '#FFC800' : '#71717a',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Smartphone size={16} />
          <span>Mobile Hero</span>
          <span style={{
            fontSize: '0.7rem',
            backgroundColor: activeTab === 'mobile' ? '#27272a' : '#f4f4f5',
            color: activeTab === 'mobile' ? '#ffffff' : '#71717a',
            padding: '2px 6px',
            borderRadius: '12px'
          }}>
            {config.mobile?.images?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('tablet'); setPreviewDevice('tablet'); }}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'tablet' ? '#000000' : 'transparent',
            color: activeTab === 'tablet' ? '#FFC800' : '#71717a',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Tablet size={16} />
          <span>Tablet Hero</span>
          <span style={{
            fontSize: '0.7rem',
            backgroundColor: activeTab === 'tablet' ? '#27272a' : '#f4f4f5',
            color: activeTab === 'tablet' ? '#ffffff' : '#71717a',
            padding: '2px 6px',
            borderRadius: '12px'
          }}>
            {config.tablet?.images?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('desktop'); setPreviewDevice('desktop'); }}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'desktop' ? '#000000' : 'transparent',
            color: activeTab === 'desktop' ? '#FFC800' : '#71717a',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Monitor size={16} />
          <span>Desktop Hero</span>
          <span style={{
            fontSize: '0.7rem',
            backgroundColor: activeTab === 'desktop' ? '#27272a' : '#f4f4f5',
            color: activeTab === 'desktop' ? '#ffffff' : '#71717a',
            padding: '2px 6px',
            borderRadius: '12px'
          }}>
            {config.desktop?.images?.length || 0}
          </span>
        </button>
      </div>

      {/* Main Grid: Management Controls + Live Responsive Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(320px, 0.95fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Section Settings & Image Gallery */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Scheduling & Behavior Settings Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e4e4e7', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
              <Clock size={18} color="#FFC800" />
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#09090b' }}>
                {activeTab.toUpperCase()} Hero Rotation &amp; Scheduling
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              
              {/* Daily 24-Hour Rotation Toggle */}
              <div style={{ padding: '0.85rem', backgroundColor: '#fcfcfc', border: '1px solid #e4e4e7', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="daily-rotation-toggle" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#18181b', cursor: 'pointer' }}>
                    24h Daily Rotation Mode
                  </label>
                  <input
                    id="daily-rotation-toggle"
                    type="checkbox"
                    checked={Boolean(currentDeviceConfig.dailyMode)}
                    onChange={e => updateDeviceConfig(prev => ({ ...prev, dailyMode: e.target.checked }))}
                    style={{ width: '18px', height: '18px', accentColor: '#000000', cursor: 'pointer' }}
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: '#71717a', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                  Cycles to the next active image every 24 hours based on calendar date (Indian Standard Time). Consistent for all visitors.
                </p>
              </div>

              {/* Automatic Rotation (Carousel) */}
              <div style={{ padding: '0.85rem', backgroundColor: '#fcfcfc', border: '1px solid #e4e4e7', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="carousel-rotation-toggle" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#18181b', cursor: 'pointer' }}>
                    Autoplay Carousel
                  </label>
                  <input
                    id="carousel-rotation-toggle"
                    type="checkbox"
                    checked={Boolean(currentDeviceConfig.rotationEnabled)}
                    onChange={e => updateDeviceConfig(prev => ({ ...prev, rotationEnabled: e.target.checked }))}
                    style={{ width: '18px', height: '18px', accentColor: '#000000', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#71717a' }}>Interval:</span>
                  <input
                    type="number"
                    min="2"
                    max="60"
                    value={currentDeviceConfig.rotationIntervalSec || 5}
                    onChange={e => updateDeviceConfig(prev => ({ ...prev, rotationIntervalSec: Number(e.target.value) || 5 }))}
                    disabled={!currentDeviceConfig.rotationEnabled}
                    style={{ width: '60px', padding: '4px 6px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #d4d4d8' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#71717a' }}>seconds</span>
                </div>
              </div>
            </div>
          </div>

          {/* Upload & Gallery Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e4e4e7', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={18} color="#FFC800" />
                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#09090b' }}>
                  {activeTab.toUpperCase()} Hero Images ({currentDeviceConfig.images.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={triggerUpload}
                disabled={uploading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: uploading ? 'not-allowed' : 'pointer'
                }}
              >
                {uploading ? <Loader2 size={14} className={styles.spin} /> : <UploadCloud size={14} />}
                <span>{uploading ? (uploadProgress || 'Uploading...') : `+ Upload to ${activeTab}`}</span>
              </button>
            </div>

            {uploading && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.8125rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={16} className={styles.spin} />
                <span>{uploadProgress || 'Uploading images to Cloudinary CDN...'}</span>
              </div>
            )}

            {currentDeviceConfig.images.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                border: '2px dashed #e4e4e7',
                borderRadius: '8px',
                backgroundColor: '#fafafa'
              }}>
                <UploadCloud size={36} color="#a1a1aa" style={{ margin: '0 auto 10px auto', display: 'block' }} />
                <div style={{ fontWeight: 700, color: '#18181b', marginBottom: '4px' }}>
                  No {activeTab} hero images uploaded yet
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#71717a', margin: '0 0 1rem 0' }}>
                  Upload custom high-resolution banner images specifically optimized for {activeTab} screens.
                </p>
                <button
                  type="button"
                  onClick={triggerUpload}
                  style={{
                    backgroundColor: '#000000',
                    color: '#FFC800',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Upload {activeTab.toUpperCase()} Image
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {currentDeviceConfig.images.map((img, index) => {
                  const isScheduledActive = activeDeterministicImage?.id === img.id;
                  return (
                    <div
                      key={img.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        backgroundColor: img.isActive ? '#ffffff' : '#fafafa',
                        border: isScheduledActive ? '2px solid #FFC800' : '1px solid #e4e4e7',
                        borderRadius: '8px',
                        gap: '1rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Thumbnail & Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: '72px',
                          height: '48px',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          backgroundColor: '#f4f4f5',
                          flexShrink: 0,
                          position: 'relative'
                        }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.url}
                            alt={img.altText || 'Hero thumbnail'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#52525b' }}>
                              #{index + 1}
                            </span>
                            {isScheduledActive && (
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                backgroundColor: '#FFC800',
                                color: '#000000',
                                padding: '1px 6px',
                                borderRadius: '4px'
                              }}>
                                ACTIVE NOW
                              </span>
                            )}
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: img.isActive ? '#ecfdf5' : '#f4f4f5',
                              color: img.isActive ? '#047857' : '#71717a',
                              padding: '1px 6px',
                              borderRadius: '4px'
                            }}>
                              {img.isActive ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#71717a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginTop: '2px'
                          }}>
                            {img.url}
                          </div>
                        </div>
                      </div>

                      {/* Controls: Reorder, Replace, Toggle, Delete */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => moveImage(index, 'up')}
                          disabled={index === 0}
                          title="Move Up"
                          style={{
                            padding: '6px',
                            backgroundColor: '#f4f4f5',
                            border: '1px solid #e4e4e7',
                            borderRadius: '4px',
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            opacity: index === 0 ? 0.4 : 1
                          }}
                        >
                          <ArrowUp size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => moveImage(index, 'down')}
                          disabled={index === currentDeviceConfig.images.length - 1}
                          title="Move Down"
                          style={{
                            padding: '6px',
                            backgroundColor: '#f4f4f5',
                            border: '1px solid #e4e4e7',
                            borderRadius: '4px',
                            cursor: index === currentDeviceConfig.images.length - 1 ? 'not-allowed' : 'pointer',
                            opacity: index === currentDeviceConfig.images.length - 1 ? 0.4 : 1
                          }}
                        >
                          <ArrowDown size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => triggerReplace(index)}
                          title="Replace Image File"
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#f4f4f5',
                            border: '1px solid #e4e4e7',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Replace
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleImageActive(index)}
                          title={img.isActive ? 'Disable image' : 'Enable image'}
                          style={{
                            padding: '6px 10px',
                            backgroundColor: img.isActive ? '#09090b' : '#f4f4f5',
                            color: img.isActive ? '#ffffff' : '#71717a',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {img.isActive ? 'Active' : 'Off'}
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteImage(index)}
                          title="Delete Image"
                          style={{
                            padding: '6px',
                            backgroundColor: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Responsive Preview Window */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e4e4e7',
          padding: '1.25rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          position: 'sticky',
          top: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={18} color="#FFC800" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#09090b' }}>
                Live Responsive Preview ({previewDevice.toUpperCase()})
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: previewDevice === 'mobile' ? '1px solid #000' : '1px solid #e4e4e7',
                  backgroundColor: previewDevice === 'mobile' ? '#000' : '#fff',
                  color: previewDevice === 'mobile' ? '#FFC800' : '#71717a',
                  cursor: 'pointer'
                }}
              >
                <Smartphone size={14} />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('tablet')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: previewDevice === 'tablet' ? '1px solid #000' : '1px solid #e4e4e7',
                  backgroundColor: previewDevice === 'tablet' ? '#000' : '#fff',
                  color: previewDevice === 'tablet' ? '#FFC800' : '#71717a',
                  cursor: 'pointer'
                }}
              >
                <Tablet size={14} />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: previewDevice === 'desktop' ? '1px solid #000' : '1px solid #e4e4e7',
                  backgroundColor: previewDevice === 'desktop' ? '#000' : '#fff',
                  color: previewDevice === 'desktop' ? '#FFC800' : '#71717a',
                  cursor: 'pointer'
                }}
              >
                <Monitor size={14} />
              </button>
            </div>
          </div>

          {/* Preview Container Framed for Device */}
          <div style={{
            width: '100%',
            maxWidth: previewDevice === 'mobile' ? '280px' : previewDevice === 'tablet' ? '360px' : '100%',
            margin: '0 auto',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '2px solid #09090b',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            backgroundColor: '#000000',
            aspectRatio: previewDevice === 'mobile' ? '9/16' : previewDevice === 'tablet' ? '4/5' : '16/9',
            position: 'relative'
          }}>
            {activeDeterministicImage?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeDeterministicImage.url}
                alt={activeDeterministicImage.altText || 'Live preview'}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#71717a',
                fontSize: '0.8125rem'
              }}>
                No active image scheduled
              </div>
            )}

            {/* Overlay mockup badge */}
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              right: '12px',
              backgroundColor: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(4px)',
              padding: '8px 12px',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '0.75rem'
            }}>
              <div style={{ fontWeight: 800, color: '#FFC800', textTransform: 'uppercase' }}>
                {config[previewDevice]?.dailyMode ? '📅 Daily Rotation Active' : '▶ Carousel Active'}
              </div>
              <div style={{ fontSize: '0.7rem', opacity: 0.85, marginTop: '2px' }}>
                Showing scheduled image for {previewDevice.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
