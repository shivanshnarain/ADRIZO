"use client";

import { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Search, Check, AlertTriangle, FolderTree } from 'lucide-react';
import styles from '../admin.module.css';
import { createCategory, updateCategory, deleteCategory } from '../../../actions/categories';

export default function CategoriesClient({ initialCategories }: { initialCategories: any[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    code: '',
    description: '',
    image: '',
    status: 'ACTIVE',
    sortOrder: '0'
  });
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ name: '', slug: '', code: '', description: '', image: '', status: 'ACTIVE', sortOrder: '0' });
    setError('');
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      name: '',
      slug: '',
      code: '',
      description: '',
      image: '',
      status: 'ACTIVE',
      sortOrder: (categories.length + 1).toString()
    });
    setIsEditing(true);
  };

  const handleEdit = (cat: any) => {
    setIsEditing(true);
    setEditingId(cat.id);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      code: cat.code || '',
      description: cat.description || '',
      image: cat.image || '',
      status: cat.status,
      sortOrder: (cat.sortOrder || 0).toString()
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?\nExisting products in this category will safely become uncategorized.`)) return;
    
    setLoading(true);
    const res = await deleteCategory(id);
    setLoading(false);
    
    if (res.success) {
      setCategories(categories.filter(c => c.id !== id));
      showToast('Category deleted successfully');
    } else {
      alert(res.error || 'Failed to delete category');
    }
  };

  const handleNameChange = (nameVal: string) => {
    const slugVal = nameVal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const codeVal = nameVal.slice(0, 3).toUpperCase();
    setFormData(prev => ({
      ...prev,
      name: nameVal,
      slug: editingId ? prev.slug : slugVal,
      code: editingId ? prev.code : (prev.code || codeVal)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Category Name is required.');
      return;
    }
    setLoading(true);
    setError('');
    
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => data.append(key, value));

    let res;
    if (editingId) {
      res = await updateCategory(editingId, data);
    } else {
      res = await createCategory(data);
    }

    setLoading(false);

    if (res.success && res.category) {
      if (editingId) {
        setCategories(categories.map(c => c.id === editingId ? res.category : c));
        showToast('Category updated successfully');
      } else {
        setCategories([res.category, ...categories]);
        showToast('Category created successfully');
      }
      resetForm();
    } else {
      setError(res.error || 'Something went wrong');
    }
  };

  const filteredCategories = useMemo(() => {
    return categories.filter(c => {
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (c.name || '').toLowerCase().includes(q);
        const matchesCode = (c.code || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode) return false;
      }
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      return true;
    });
  }, [categories, searchQuery, statusFilter]);

  return (
    <div>
      {/* Toast Notification */}
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className={styles.pageTitle} style={{ margin: 0 }}>Product Categories</h1>
          <p style={{ fontSize: '0.8125rem', color: '#71717a', margin: '4px 0 0 0' }}>
            Manage garment categories and prefix short codes used for SKU generation.
          </p>
        </div>
        {!isEditing && (
          <button 
            type="button" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.25rem', background: '#FFC800', color: '#000000', fontWeight: 800, fontSize: '0.8125rem', borderRadius: '6px', border: '1px solid #eab308', cursor: 'pointer' }} 
            onClick={handleOpenAdd}
          >
            <Plus size={16} />
            <span>Add Category</span>
          </button>
        )}
      </div>

      {isEditing && (
        <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e4e4e7', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', marginBottom: '1.25rem' }}>
            {editingId ? 'Edit Category' : 'Add New Category'}
          </h2>
          
          {error && (
            <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>
              <AlertTriangle size={16} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} />
              <span>{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#09090b', marginBottom: '0.35rem' }}>Category Name *</label>
                <input 
                  type="text" 
                  style={{ width: '100%', height: '40px', padding: '0 0.85rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.875rem' }} 
                  required 
                  placeholder="e.g. T-Shirt"
                  value={formData.name} 
                  onChange={e => handleNameChange(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#09090b', marginBottom: '0.35rem' }}>Category Code (for SKU) *</label>
                <input 
                  type="text" 
                  style={{ width: '100%', height: '40px', padding: '0 0.85rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.875rem', textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }} 
                  required 
                  placeholder="e.g. TSH"
                  maxLength={5}
                  value={formData.code} 
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#09090b', marginBottom: '0.35rem' }}>Slug *</label>
                <input 
                  type="text" 
                  style={{ width: '100%', height: '40px', padding: '0 0.85rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.875rem' }} 
                  required 
                  placeholder="t-shirt"
                  value={formData.slug} 
                  onChange={e => setFormData({ ...formData, slug: e.target.value })} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#09090b', marginBottom: '0.35rem' }}>Status</label>
                <select 
                  style={{ width: '100%', height: '40px', padding: '0 0.85rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.875rem', background: '#fff' }} 
                  value={formData.status} 
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#09090b', marginBottom: '0.35rem' }}>Description</label>
              <textarea 
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.875rem' }} 
                rows={2} 
                placeholder="Category description..."
                value={formData.description} 
                onChange={e => setFormData({ ...formData, description: e.target.value })} 
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid #f4f4f5', paddingTop: '1rem' }}>
              <button 
                type="button" 
                style={{ padding: '0.55rem 1.15rem', background: '#fff', color: '#09090b', fontWeight: 600, fontSize: '0.8125rem', borderRadius: '6px', border: '1px solid #d4d4d8', cursor: 'pointer' }} 
                onClick={resetForm} 
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                style={{ padding: '0.55rem 1.25rem', background: '#FFC800', color: '#000000', fontWeight: 800, fontSize: '0.8125rem', borderRadius: '6px', border: '1px solid #eab308', cursor: 'pointer' }} 
                disabled={loading}
              >
                {loading ? 'Saving...' : editingId ? 'Save Changes' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {!isEditing && (
        <div>
          {/* Search & Filter Bar */}
          <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '8px', padding: '0.85rem 1.15rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Search categories or code..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', height: '38px', padding: '0 0.85rem 0 2.25rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.85rem' }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ height: '38px', padding: '0 0.85rem', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.85rem', background: '#fff' }}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e4e4e7', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Category Name</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Code</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Slug</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#71717a' }}>
                      No categories found. Click &quot;Add Category&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map(cat => (
                    <tr key={cat.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#09090b' }}>{cat.name}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, background: '#fffbeb', color: '#000000', border: '1px solid #fde68a', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          {cat.code || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#71717a' }}>{cat.slug}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          background: cat.status === 'ACTIVE' ? '#fffbeb' : '#f4f4f5',
                          border: cat.status === 'ACTIVE' ? '1px solid #FFC800' : '1px solid #d4d4d8',
                          color: cat.status === 'ACTIVE' ? '#000' : '#71717a'
                        }}>
                          {cat.status === 'ACTIVE' ? '● Active' : '○ Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button 
                            type="button"
                            onClick={() => handleEdit(cat)} 
                            style={{ padding: '0.35rem', background: '#fff', border: '1px solid #d4d4d8', borderRadius: 4, cursor: 'pointer' }} 
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDelete(cat.id, cat.name)} 
                            style={{ padding: '0.35rem', background: '#fff', border: '1px solid #d4d4d8', borderRadius: 4, cursor: 'pointer', color: '#ef4444' }} 
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
