"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  AlertTriangle,
  CheckCircle2, 
  ArrowLeftRight, 
  ArrowRight, 
  ArrowLeft,
  ImagePlus,
  Loader2,
  X
} from 'lucide-react';
import { CustomerPhotoItem } from '@/lib/customer-photos-service';
import Portal from '@/components/Portal';
import styles from '../admin.module.css';

interface PreviewItem {
  id: string;
  file: File;
  url: string;
}

export default function CustomerPhotosAdminClient() {
  const [photos, setPhotos] = useState<CustomerPhotoItem[]>([]);
  const [selectedRow, setSelectedRow] = useState<1 | 2>(1);
  const [selectedFiles, setSelectedFiles] = useState<PreviewItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<CustomerPhotoItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | '1' | '2'>('all');
  const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const fetchPhotos = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      if (isRefreshing) return;
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const url = `/api/admin/customer-photos?t=${Date.now()}${isRefresh ? '&refresh=true' : ''}`;
      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPhotos(data.photos || []);
        setBrokenImageIds(new Set());
        if (isRefresh) {
          showNotification('success', 'Customer photos refreshed from database.');
        }
      } else {
        showNotification('error', data.error || 'Failed to load customer photos.');
      }
    } catch {
      showNotification('error', 'Network error while loading customer photos.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  useEffect(() => {
    fetchPhotos(false);
  }, [fetchPhotos]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const newItems: PreviewItem[] = [];
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/jpg'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const isExtValid = Boolean(file.name && file.name.match(/\.(jpg|jpeg|png|webp|avif)$/i));
      const mime = (file.type || '').toLowerCase();

      if (!validMimeTypes.includes(mime) && !isExtValid) {
        showNotification('error', `Skipped "${file.name}": Unsupported format (use JPEG, PNG, WebP, AVIF).`);
        continue;
      }

      if (file.size > maxSize) {
        showNotification('error', `Skipped "${file.name}": File size exceeds 10MB.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        url: previewUrl,
      });
    }

    if (newItems.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newItems]);
    }

    // Reset input value so same files can be re-selected if cleared
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveSingleFile = (idToRemove: string) => {
    setSelectedFiles((prev) => {
      const item = prev.find((p) => p.id === idToRemove);
      if (item) {
        URL.revokeObjectURL(item.url);
      }
      return prev.filter((p) => p.id !== idToRemove);
    });
  };

  const handleClearAllFiles = () => {
    selectedFiles.forEach((item) => URL.revokeObjectURL(item.url));
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      showNotification('error', 'Please choose at least one photo to upload.');
      return;
    }

    if (isUploading) return;

    setIsUploading(true);
    const filesToProcess = [...selectedFiles];
    const totalCount = filesToProcess.length;
    setUploadProgress({ current: 0, total: totalCount });

    const successfulUploads: CustomerPhotoItem[] = [];
    const failedUploads: { name: string; error: string }[] = [];
    let completedCount = 0;
    let nextIndex = 0;

    const runWorker = async () => {
      while (nextIndex < filesToProcess.length) {
        const currentIndex = nextIndex++;
        const item = filesToProcess[currentIndex];

        try {
          const formData = new FormData();
          formData.append('file', item.file);
          formData.append('row', String(selectedRow));

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 45000);

          const res = await fetch('/api/admin/customer-photos', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          const data = await res.json();

          if (res.ok && data.success && data.photo) {
            successfulUploads.push(data.photo);
            // Immediately add to photos state for instant real-time reflection
            setPhotos((prev) => [data.photo, ...prev]);
            // Remove from selected list
            URL.revokeObjectURL(item.url);
            setSelectedFiles((prev) => prev.filter((p) => p.id !== item.id));
          } else {
            failedUploads.push({
              name: item.file.name,
              error: data?.error || 'Upload failed',
            });
          }
        } catch (err: any) {
          failedUploads.push({
            name: item.file.name,
            error: err?.name === 'AbortError' ? 'Upload timed out' : 'Network error',
          });
        } finally {
          completedCount++;
          setUploadProgress({ current: completedCount, total: totalCount });
        }
      }
    };

    try {
      const concurrency = Math.min(2, filesToProcess.length);
      const workers = Array.from({ length: concurrency }, () => runWorker());
      await Promise.all(workers);

      // Show clear completion toast
      if (successfulUploads.length > 0 && failedUploads.length === 0) {
        showNotification(
          'success',
          successfulUploads.length === 1
            ? `Photo successfully added to Row ${selectedRow}!`
            : `All ${successfulUploads.length} photos successfully added to Row ${selectedRow}!`
        );
      } else if (successfulUploads.length > 0 && failedUploads.length > 0) {
        showNotification(
          'success',
          `Added ${successfulUploads.length} photo(s). Failed (${failedUploads.length}): ${failedUploads.map((f) => f.name).join(', ')}`
        );
      } else if (failedUploads.length > 0) {
        showNotification(
          'error',
          failedUploads[0]?.error || 'Failed to upload photo(s). Please try again.'
        );
      }
    } catch {
      showNotification('error', 'Unexpected error occurred during upload.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = (id: string, row: number) => {
    const photo = photos.find((p) => p.id === id);
    if (photo) {
      setPhotoToDelete(photo);
    }
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    const id = photoToDelete.id;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/customer-photos/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showNotification('success', 'Photo permanently deleted from storage and database.');
        setPhotos((prev) => prev.filter((p) => p.id !== id));
      } else {
        showNotification('error', data.error || 'Failed to delete photo.');
      }
    } catch {
      showNotification('error', 'Network error while deleting photo.');
    } finally {
      setDeletingId(null);
      setPhotoToDelete(null);
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
        <Portal>
          <div
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              zIndex: 2500,
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
        </Portal>
      )}

      {/* Floating Upload Progress Indicator */}
      {isUploading && uploadProgress && (
        <Portal>
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 2500,
              backgroundColor: '#09090b',
              color: '#ffffff',
              padding: '14px 20px',
              borderRadius: '10px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              minWidth: '280px',
              border: '1px solid #27272a',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.85rem' }}>
                <Loader2 size={16} className={styles.spin} color="#FFBF00" />
                <span>Uploading to Row {selectedRow}...</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#a1a1aa', fontWeight: 600 }}>
                {uploadProgress.current} / {uploadProgress.total}
              </span>
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: '#27272a', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  backgroundColor: '#FFBF00',
                  borderRadius: '999px',
                  width: `${uploadProgress.total > 0 ? Math.round((uploadProgress.current / uploadProgress.total) * 100) : 0}%`,
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        </Portal>
      )}

      {/* Delete Photo Confirmation Modal */}
      {photoToDelete && (
        <Portal>
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 2000,
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
              border: '1px solid #e4e4e7',
              position: 'relative',
              zIndex: 2100
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
                    Delete Customer Photo?
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5 }}>
                    Are you sure you want to permanently delete this Row {photoToDelete.row} photo? This action removes the file from storage and database and cannot be undone.
                  </p>
                </div>
              </div>

              {/* Photo Preview in Modal */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                padding: '0.75rem',
                marginBottom: '1.25rem'
              }}>
                <img 
                  src={photoToDelete.imageUrl} 
                  alt="Delete preview" 
                  style={{ width: '56px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }} 
                />
                <div style={{ fontSize: '0.8125rem' }}>
                  <div><strong>Showcase Row:</strong> Row {photoToDelete.row} ({photoToDelete.row === 1 ? 'Right → Left' : 'Left → Right'})</div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>
                    Added: {new Date(photoToDelete.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setPhotoToDelete(null)}
                  disabled={deletingId !== null}
                  style={{
                    padding: '0.6rem 1.15rem',
                    background: '#ffffff',
                    border: '1px solid #d4d4d8',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: '#334155',
                    cursor: deletingId ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeletePhoto}
                  disabled={deletingId !== null}
                  id="btn-confirm-delete-photo"
                  style={{
                    padding: '0.6rem 1.25rem',
                    background: '#dc2626',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    cursor: deletingId ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)'
                  }}
                >
                  <Trash2 size={14} />
                  <span>{deletingId ? 'Deleting...' : 'Delete Photo'}</span>
                </button>
              </div>
            </div>
          </div>
        </Portal>
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
          onClick={() => fetchPhotos(true)}
          disabled={loading || isRefreshing}
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
            cursor: loading || isRefreshing ? 'not-allowed' : 'pointer',
            opacity: loading || isRefreshing ? 0.7 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          <RefreshCw size={15} className={isRefreshing ? styles.spin : ''} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Top Grid: Upload Card & Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Upload Form Card */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e4e4e7', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
            <ImagePlus size={20} color="#000000" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#09090b' }}>
              Upload Customer Photos
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
                  disabled={isUploading}
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
                    cursor: isUploading ? 'not-allowed' : 'pointer',
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
                  disabled={isUploading}
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
                    cursor: isUploading ? 'not-allowed' : 'pointer',
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

            {/* File Picker / Multiple Drop area */}
            <div style={{ marginBottom: '1.25rem' }}>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/avif,image/jpg"
                onChange={handleFileChange}
                disabled={isUploading}
                style={{ display: 'none' }}
                id="customer-photo-file-input"
              />

              {selectedFiles.length > 0 ? (
                <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #e4e4e7', backgroundColor: '#f4f4f5', padding: '12px' }}>
                  {/* Single image preview */}
                  {selectedFiles.length === 1 ? (
                    <div style={{ textAlign: 'center' }}>
                      <img
                        src={selectedFiles[0].url}
                        alt="Preview"
                        style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain', borderRadius: '6px', margin: '0 auto', display: 'block' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e4e4e7' }}>
                        <span style={{ fontSize: '0.8rem', color: '#71717a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                          {selectedFiles[0].file.name} ({(selectedFiles[0].file.size / (1024 * 1024)).toFixed(1)}MB)
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <label
                            htmlFor="customer-photo-file-input"
                            style={{ fontSize: '0.8rem', color: '#09090b', cursor: 'pointer', fontWeight: 600 }}
                          >
                            + Add More
                          </label>
                          <button
                            type="button"
                            onClick={handleClearAllFiles}
                            disabled={isUploading}
                            style={{ fontSize: '0.8rem', color: '#ef4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Multiple images preview */
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#18181b' }}>
                          {selectedFiles.length} Photos Selected for Row {selectedRow}
                        </span>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <label
                            htmlFor="customer-photo-file-input"
                            style={{ fontSize: '0.8rem', color: '#09090b', cursor: 'pointer', fontWeight: 600 }}
                          >
                            + Add More
                          </label>
                          <button
                            type="button"
                            onClick={handleClearAllFiles}
                            disabled={isUploading}
                            style={{ fontSize: '0.8rem', color: '#ef4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Clear All
                          </button>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
                          gap: '8px',
                          maxHeight: '180px',
                          overflowY: 'auto',
                          padding: '4px',
                        }}
                      >
                        {selectedFiles.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              position: 'relative',
                              aspectRatio: '1',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              border: '1px solid #e4e4e7',
                              backgroundColor: '#ffffff',
                            }}
                          >
                            <img
                              src={item.url}
                              alt={item.file.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {!isUploading && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSingleFile(item.id)}
                                title={`Remove ${item.file.name}`}
                                style={{
                                  position: 'absolute',
                                  top: '2px',
                                  right: '2px',
                                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '18px',
                                  height: '18px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  <Upload size={32} color="#71717a" style={{ marginBottom: '8px' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#18181b' }}>
                    Click to select photo(s)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '4px' }}>
                    JPEG, PNG, WebP, AVIF (Max 10MB per file) • Multiple selection supported
                  </span>
                </label>
              )}
            </div>

            {/* Upload Button */}
            <button
              type="submit"
              disabled={selectedFiles.length === 0 || isUploading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: selectedFiles.length === 0 || isUploading ? '#e4e4e7' : '#000000',
                color: selectedFiles.length === 0 || isUploading ? '#a1a1aa' : '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: selectedFiles.length === 0 || isUploading ? 'not-allowed' : 'pointer',
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
                  <span>
                    {uploadProgress && uploadProgress.total > 0
                      ? `Uploading ${uploadProgress.current} of ${uploadProgress.total} to Row ${selectedRow}...`
                      : `Uploading to Row ${selectedRow}...`}
                  </span>
                </>
              ) : (
                <>
                  <Upload size={18} />
                  <span>
                    {selectedFiles.length > 1
                      ? `Add ${selectedFiles.length} Photos to Row ${selectedRow}`
                      : `Add Photo to Row ${selectedRow}`}
                  </span>
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
              <li>When deleted, photos are purged from Firebase Storage and database permanently.</li>
              <li>Multiple photo uploads process sequentially with live progress feedback.</li>
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/adrizo-logo-dark.png"
            alt="ADRIZO"
            style={{ width: '120px', height: 'auto', margin: '0 auto 10px auto', display: 'block', opacity: 0.85 }}
          />
          <div style={{ width: '48px', height: '2px', background: '#FFBF00', margin: '0 auto', borderRadius: '999px' }} />
          <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#71717a', marginTop: '10px' }}>Loading customer photos...</p>
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
                  {brokenImageIds.has(photo.id) ? (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f8fafc',
                      color: '#94a3b8',
                      padding: '1rem',
                      textAlign: 'center',
                      gap: '8px',
                    }}>
                      <Camera size={28} color="#cbd5e1" />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Image unavailable</span>
                    </div>
                  ) : (
                    <img
                      src={photo.imageUrl}
                      alt={`Customer Photo Row ${photo.row}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="eager"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (photo.imageUrl.startsWith('/uploads/customer-photos/')) {
                          const filename = photo.imageUrl.replace('/uploads/customer-photos/', '');
                          const altSrc = `/api/customer-photos/image/${filename}`;
                          if (!target.src.includes('/api/customer-photos/image/')) {
                            target.src = altSrc;
                            return;
                          }
                        }
                        setBrokenImageIds((prev) => new Set(prev).add(photo.id));
                      }}
                    />
                  )}
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
                    title="Delete permanently from storage and database"
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

