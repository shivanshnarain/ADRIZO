"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { 
  Camera, 
  Upload, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeftRight, 
  ArrowRight, 
  ArrowLeft,
  ImagePlus,
  Loader2
} from 'lucide-react';
import { CustomerPhotoItem } from '@/lib/customer-photos-service';
import styles from '../admin.module.css';

export default function CustomerPhotosAdminClient() {
  const [photos, setPhotos] = useState<CustomerPhotoItem[]>([]);
  const [selectedRow, setSelectedRow] = useState<1 | 2>(1);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | '1' | '2'>('all');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/customer-photos');
      const data = await res.json();
      if (res.ok && data.success) {
        setPhotos(data.photos || []);
      } else {
        showNotification('error', data.error || 'Failed to load customer photos.');
      }
    } catch {
      showNotification('error', 'Network error while loading customer photos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate type
      if (!file.type.match(/^image\/(jpeg|png|webp|avif|jpg)$/i)) {
        showNotification('error', 'Please select a valid image (JPEG, PNG, WebP, AVIF).');
        return;
      }
      // Validate size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        showNotification('error', 'Image size must not exceed 10MB.');
        return;
      }
      setFileToUpload(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleClearSelectedFile = () => {
    setFileToUpload(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) {
      showNotification('error', 'Please choose a photo to upload.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('row', String(selectedRow));

      const res = await fetch('/api/admin/customer-photos', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success && data.photo) {
        showNotification('success', `Photo successfully added to Row ${selectedRow}!`);
        setPhotos((prev) => [data.photo, ...prev]);
        handleClearSelectedFile();
      } else {
        showNotification('error', data.error || 'Failed to upload photo.');
      }
    } catch {
      showNotification('error', 'Network error during photo upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, row: number) => {
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete this Row ${row} photo? This removes the file from Firebase Storage and Firestore.`);
    if (!confirmDelete) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/customer-photos/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showNotification('success', 'Photo permanently deleted from Firebase Storage and Firestore.');
        setPhotos((prev) => prev.filter((p) => p.id !== id));
      } else {
        showNotification('error', data.error || 'Failed to delete photo from storage.');
      }
    } catch {
      showNotification('error', 'Network error while deleting photo.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPhotos = photos.filter((p) => {
    if (activeFilter === '1') return p.row === 1;
    if (activeFilter === '2') return p.row === 2;
    return true;
  });

  const row1Count = photos.filter((p) => p.row === 1).length;
  const row2Count = photos.filter((p) => p.row === 2).length;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: notification.type === 'success' ? '#10B981' : '#EF4444',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Camera size={26} color="#000000" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: '#09090b' }}>
              Customer Photos
            </h1>
          </div>
          <p style={{ color: '#71717a', fontSize: '0.9rem', margin: 0 }}>
            Manage the continuous photo showcase on the website. Row 1 moves Right → Left; Row 2 moves Left → Right.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchPhotos()}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ffffff',
            border: '1px solid #e4e4e7',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#18181b',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={15} className={loading ? styles.spin : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Top Grid: Upload Card & Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Upload Form Card */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e4e4e7', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
            <ImagePlus size={20} color="#000000" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#09090b' }}>
              Upload Customer Photo
            </h2>
          </div>

          <form onSubmit={handleUploadSubmit}>
            {/* Row Selection */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#3f3f46', marginBottom: '8px' }}>
                Select Showcase Row:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedRow(1)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '12px',
                    borderRadius: '8px',
                    border: selectedRow === 1 ? '2px solid #000000' : '1px solid #e4e4e7',
                    backgroundColor: selectedRow === 1 ? '#09090b' : '#fafafa',
                    color: selectedRow === 1 ? '#ffffff' : '#18181b',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ArrowLeft size={16} />
                    <span>Row 1</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>Right → Left</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRow(2)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '12px',
                    borderRadius: '8px',
                    border: selectedRow === 2 ? '2px solid #000000' : '1px solid #e4e4e7',
                    backgroundColor: selectedRow === 2 ? '#09090b' : '#fafafa',
                    color: selectedRow === 2 ? '#ffffff' : '#18181b',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Row 2</span>
                    <ArrowRight size={16} />
                  </div>
                  <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>Left → Right</span>
                </button>
              </div>
            </div>

            {/* File Picker / Drop area */}
            <div style={{ marginBottom: '1.25rem' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="customer-photo-file-input"
              />

              {previewUrl ? (
                <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e4e4e7', backgroundColor: '#f4f4f5', textAlign: 'center', padding: '10px' }}>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{ maxHeight: '220px', maxWidth: '100%', objectFit: 'contain', borderRadius: '6px', margin: '0 auto', display: 'block' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e4e4e7' }}>
                    <span style={{ fontSize: '0.8rem', color: '#71717a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                      {fileToUpload?.name}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearSelectedFile}
                      style={{ fontSize: '0.8rem', color: '#ef4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Change Photo
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="customer-photo-file-input"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem 1rem',
                    border: '2px dashed #d4d4d8',
                    borderRadius: '8px',
                    backgroundColor: '#fafafa',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  <Upload size={32} color="#71717a" style={{ marginBottom: '8px' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#18181b' }}>
                    Click to select photo
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '4px' }}>
                    JPEG, PNG, WebP, AVIF (Max 10MB)
                  </span>
                </label>
              )}
            </div>

            {/* Upload Button */}
            <button
              type="submit"
              disabled={!fileToUpload || isUploading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: !fileToUpload || isUploading ? '#e4e4e7' : '#000000',
                color: !fileToUpload || isUploading ? '#a1a1aa' : '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: !fileToUpload || isUploading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.15s ease',
              }}
            >
              {isUploading ? (
                <>
                  <Loader2 size={18} className={styles.spin} />
                  <span>Uploading to Firebase Storage...</span>
                </>
              ) : (
                <>
                  <Upload size={18} />
                  <span>Add Photo to Row {selectedRow}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Info & Stats Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e4e4e7', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#09090b' }}>
              Showcase Summary
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
              <div style={{ padding: '12px 8px', backgroundColor: '#f4f4f5', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#09090b' }}>{photos.length}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#71717a', textTransform: 'uppercase' }}>Total Photos</div>
              </div>
              <div style={{ padding: '12px 8px', backgroundColor: '#f4f4f5', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#09090b' }}>{row1Count}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#71717a', textTransform: 'uppercase' }}>Row 1 (R → L)</div>
              </div>
              <div style={{ padding: '12px 8px', backgroundColor: '#f4f4f5', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#09090b' }}>{row2Count}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#71717a', textTransform: 'uppercase' }}>Row 2 (L → R)</div>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e4e4e7', padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ArrowLeftRight size={18} color="#FFBF00" />
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#18181b' }}>
                Showcase Rules &amp; Directions
              </h4>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#52525b', lineHeight: 1.6 }}>
              <li><strong>Row 1</strong> automatically moves continuously from <strong>Right → Left</strong>.</li>
              <li><strong>Row 2</strong> automatically moves continuously from <strong>Left → Right</strong>.</li>
              <li>When deleted, photos are purged from Firebase Storage and Firestore permanently.</li>
              <li>No text, names, or captions appear on public cards (pure images only).</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeFilter === 'all' ? '#09090b' : 'transparent',
              color: activeFilter === 'all' ? '#ffffff' : '#71717a',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            All Photos ({photos.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('1')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeFilter === '1' ? '#09090b' : 'transparent',
              color: activeFilter === '1' ? '#ffffff' : '#71717a',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Row 1 (R → L) ({row1Count})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('2')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeFilter === '2' ? '#09090b' : 'transparent',
              color: activeFilter === '2' ? '#ffffff' : '#71717a',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Row 2 (L → R) ({row2Count})
          </button>
        </div>
      </div>

      {/* Photos Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#71717a' }}>
          <Loader2 size={32} className={styles.spin} style={{ margin: '0 auto 12px auto' }} />
          <p style={{ fontWeight: 600 }}>Loading customer photos...</p>
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e4e4e7' }}>
          <Camera size={44} color="#d4d4d8" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px 0', color: '#18181b' }}>
            No photos found in this view
          </h3>
          <p style={{ color: '#71717a', fontSize: '0.875rem', margin: 0 }}>
            Upload customer photos using the form above to display them in the website showcase.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' }}>
          {filteredPhotos.map((photo) => {
            const isDeleting = deletingId === photo.id;
            return (
              <div
                key={photo.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  position: 'relative',
                }}
              >
                {/* Image Container with portrait ratio */}
                <div style={{ position: 'relative', width: '100%', aspectRatio: '3/4', backgroundColor: '#f4f4f5' }}>
                  <img
                    src={photo.imageUrl}
                    alt={`Customer Photo Row ${photo.row}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                  {/* Row Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      backgroundColor: photo.row === 1 ? '#09090b' : '#FFBF00',
                      color: photo.row === 1 ? '#ffffff' : '#000000',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                  >
                    {photo.row === 1 ? 'Row 1 (R → L)' : 'Row 2 (L → R)'}
                  </div>
                </div>

                {/* Footer with Actions */}
                <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderTop: '1px solid #f4f4f5' }}>
                  <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>
                    {new Date(photo.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleDelete(photo.id, photo.row)}
                    disabled={isDeleting}
                    title="Delete permanently from Firebase Storage & Firestore"
                    style={{
                      backgroundColor: isDeleting ? '#f4f4f5' : '#fee2e2',
                      color: isDeleting ? '#a1a1aa' : '#ef4444',
                      border: 'none',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      cursor: isDeleting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isDeleting ? (
                      <Loader2 size={13} className={styles.spin} />
                    ) : (
                      <Trash2 size={13} />
                    )}
                    <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
