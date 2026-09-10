"use client";

import { useState, useRef } from 'react';
import { 
  Globe, 
  UploadCloud, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  Image as ImageIcon, 
  ExternalLink,
  Eye,
  AlertTriangle
} from 'lucide-react';
import styles from '../admin.module.css';
import { HeroSlide, saveHeroBanners } from '@/actions/cms';

export default function BannersClient({ initialSlides }: { initialSlides: HeroSlide[] }) {
  const [slides, setSlides] = useState<HeroSlide[]>(initialSlides);
  const [loading, setLoading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [successToast, setSuccessToast] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadSlideIndex, setActiveUploadSlideIndex] = useState<number | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  const handleAddSlide = () => {
    const newSlide: HeroSlide = {
      id: `hero-slide-${Date.now()}`,
      imageUrl: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&q=80&w=1200',
      badge: 'NEW COLLECTION',
      heading: 'NEW SEASON HERO BANNER',
      subheading: 'Premium crafted menswear designed for contemporary everyday living.',
      buttonText: 'SHOP NOW',
      buttonLink: '/shop',
      isActive: true,
      sortOrder: slides.length
    };
    setSlides([...slides, newSlide]);
  };

  const handleUpdateSlide = (index: number, field: keyof HeroSlide, value: any) => {
    const updated = [...slides];
    updated[index] = { ...updated[index], [field]: value };
    setSlides(updated);
  };

  const handleDeleteSlide = (index: number) => {
    if (slides.length <= 1) {
      alert('You must keep at least one hero banner slide.');
      return;
    }
    if (!confirm('Are you sure you want to remove this hero slide?')) return;
    setSlides(slides.filter((_, i) => i !== index));
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;
    const updated = [...slides];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setSlides(updated.map((s, i) => ({ ...s, sortOrder: i })));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeUploadSlideIndex === null) return;

    setUploadingIndex(activeUploadSlideIndex);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success && data.urls?.[0]) {
        handleUpdateSlide(activeUploadSlideIndex, 'imageUrl', data.urls[0]);
        showToast('Hero image uploaded successfully');
      } else {
        setErrorMessage(data.error || 'Failed to upload image');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Image upload failed');
    } finally {
      setUploadingIndex(null);
      setActiveUploadSlideIndex(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerUploadForSlide = (index: number) => {
    setActiveUploadSlideIndex(index);
    fileInputRef.current?.click();
  };

  const handleSaveAll = async () => {
    setLoading(true);
    setErrorMessage('');
    const res = await saveHeroBanners(slides);
    setLoading(false);

    if (res.success) {
      showToast('Hero banner CMS saved & published to website!');
    } else {
      setErrorMessage(res.error || 'Failed to save hero banners');
    }
  };

  return (
    <div>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*" 
        style={{ display: 'none' }} 
      />

      {/* Success Toast */}
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

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className={styles.pageTitle} style={{ margin: 0 }}>CMS / Hero Banners</h1>
          <p style={{ fontSize: '0.8125rem', color: '#71717a', margin: '4px 0 0 0' }}>
            Manage and publish homepage hero carousel slides, promotional banners, and campaign links.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            type="button" 
            onClick={handleAddSlide}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.55rem 1.15rem', background: '#fff', color: '#09090b', fontWeight: 700, fontSize: '0.8125rem', borderRadius: '6px', border: '1px solid #d4d4d8', cursor: 'pointer' }}
          >
            <Plus size={16} />
            <span>Add Slide</span>
          </button>
          <button 
            type="button" 
            onClick={handleSaveAll}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.35rem', background: '#FFC800', color: '#000000', fontWeight: 800, fontSize: '0.8125rem', borderRadius: '6px', border: '1px solid #eab308', cursor: 'pointer' }}
          >
            <Check size={16} />
            <span>{loading ? 'Saving & Publishing...' : 'Save & Publish Changes'}</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>
          <AlertTriangle size={16} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Slides List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {slides.map((slide, index) => (
          <div 
            key={slide.id} 
            style={{ 
              backgroundColor: '#ffffff', 
              borderRadius: '8px', 
              border: slide.isActive ? '1px solid #e4e4e7' : '1px dashed #d4d4d8', 
              padding: '1.25rem', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              opacity: slide.isActive ? 1 : 0.7
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ 
                  background: index === 0 ? '#FFC800' : '#f4f4f5', 
                  color: '#000', 
                  fontWeight: 900, 
                  fontSize: '0.75rem', 
                  padding: '0.2rem 0.6rem', 
                  borderRadius: '4px' 
                }}>
                  SLIDE #{index + 1} {index === 0 ? '• PRIMARY' : ''}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                  {slide.heading || 'Untitled Slide'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Active Switch */}
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', marginRight: '0.5rem' }}>
                  <input 
                    type="checkbox" 
                    checked={slide.isActive} 
                    onChange={e => handleUpdateSlide(index, 'isActive', e.target.checked)} 
                  />
                  <span>{slide.isActive ? 'Active' : 'Disabled'}</span>
                </label>

                {/* Move Up */}
                <button 
                  type="button" 
                  disabled={index === 0} 
                  onClick={() => handleMoveSlide(index, 'up')}
                  style={{ padding: '0.35rem', background: '#fff', border: '1px solid #d4d4d8', borderRadius: 4, cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.4 : 1 }}
                  title="Move Up"
                >
                  <ArrowUp size={14} />
                </button>

                {/* Move Down */}
                <button 
                  type="button" 
                  disabled={index === slides.length - 1} 
                  onClick={() => handleMoveSlide(index, 'down')}
                  style={{ padding: '0.35rem', background: '#fff', border: '1px solid #d4d4d8', borderRadius: 4, cursor: index === slides.length - 1 ? 'not-allowed' : 'pointer', opacity: index === slides.length - 1 ? 0.4 : 1 }}
                  title="Move Down"
                >
                  <ArrowDown size={14} />
                </button>

                {/* Delete Slide */}
                <button 
                  type="button" 
                  onClick={() => handleDeleteSlide(index)}
                  style={{ padding: '0.35rem', background: '#fff', border: '1px solid #d4d4d8', borderRadius: 4, cursor: 'pointer', color: '#ef4444' }}
                  title="Delete Slide"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Slide Configuration Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {/* Image Preview & Upload */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#09090b', marginBottom: '0.35rem' }}>
                  Banner Image *
                </label>
                <div style={{ position: 'relative', width: '100%', height: '160px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e4e4e7', background: '#09090b' }}>
                  <img 
                    src={slide.imageUrl} 
                    alt={slide.heading} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                  <div style={{ position: 'absolute', bottom: '8px', right: '8px', display: 'flex', gap: '0.35rem' }}>
                    <button 
                      type="button"
                      onClick={() => triggerUploadForSlide(index)}
                      disabled={uploadingIndex === index}
                      style={{ padding: '0.35rem 0.65rem', background: '#FFC800', color: '#000', fontWeight: 800, fontSize: '0.75rem', borderRadius: 4, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <UploadCloud size={13} />
                      <span>{uploadingIndex === index ? 'Uploading...' : 'Replace Image'}</span>
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: '0.4rem' }}>
                  <input 
                    type="text" 
                    placeholder="Or enter direct Image URL..."
                    value={slide.imageUrl}
                    onChange={e => handleUpdateSlide(index, 'imageUrl', e.target.value)}
                    style={{ width: '100%', height: '32px', padding: '0 0.65rem', border: '1px solid #d4d4d8', borderRadius: '4px', fontSize: '0.75rem', color: '#71717a' }}
                  />
                </div>
              </div>

              {/* Text & Action Settings */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#09090b', marginBottom: '0.25rem' }}>Badge Tag</label>
                    <input 
                      type="text" 
                      placeholder="e.g. NEW SEASON ARRIVAL"
                      value={slide.badge || ''}
                      onChange={e => handleUpdateSlide(index, 'badge', e.target.value)}
                      style={{ width: '100%', height: '36px', padding: '0 0.65rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.8125rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#09090b', marginBottom: '0.25rem' }}>Button Text</label>
                    <input 
                      type="text" 
                      placeholder="e.g. SHOP THE COLLECTION"
                      value={slide.buttonText}
                      onChange={e => handleUpdateSlide(index, 'buttonText', e.target.value)}
                      style={{ width: '100%', height: '36px', padding: '0 0.65rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 700 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#09090b', marginBottom: '0.25rem' }}>Main Headline *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. ELEVATE YOUR EVERYDAY ESSENTIALS"
                    value={slide.heading}
                    onChange={e => handleUpdateSlide(index, 'heading', e.target.value)}
                    style={{ width: '100%', height: '36px', padding: '0 0.65rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 800 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#09090b', marginBottom: '0.25rem' }}>Subheading Description</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Premium Lycra & Heavyweight Cotton Polos engineered for the modern aesthetic."
                    value={slide.subheading}
                    onChange={e => handleUpdateSlide(index, 'subheading', e.target.value)}
                    style={{ width: '100%', height: '36px', padding: '0 0.65rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.8125rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#09090b', marginBottom: '0.25rem' }}>Button Destination URL</label>
                  <input 
                    type="text" 
                    placeholder="/shop or /category/polo-t-shirts"
                    value={slide.buttonLink}
                    onChange={e => handleUpdateSlide(index, 'buttonLink', e.target.value)}
                    style={{ width: '100%', height: '36px', padding: '0 0.65rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.8125rem' }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
