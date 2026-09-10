"use client";

import { useState } from 'react';
import { Eye } from 'lucide-react';
import styles from '../admin.module.css';
import { updateEnquiryStatus } from '../../../actions/enquiries';

export default function EnquiriesClient({ initialEnquiries }: { initialEnquiries: any[] }) {
  const [enquiries, setEnquiries] = useState(initialEnquiries);
  const [viewingEnquiry, setViewingEnquiry] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpdateStatus = async (id: string, status: string) => {
    setLoading(true);
    const res = await updateEnquiryStatus(id, status);
    setLoading(false);
    
    if (res.success) {
      setEnquiries(enquiries.map(e => e.id === id ? { ...e, status } : e));
      if (viewingEnquiry?.id === id) {
        setViewingEnquiry({ ...viewingEnquiry, status });
      }
    } else {
      alert(res.error);
    }
  };

  return (
    <div>
      <h1 className={styles.pageTitle}>Customer Enquiries</h1>
      
      {viewingEnquiry ? (
        <div style={{ backgroundColor: 'var(--white)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-gray)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{viewingEnquiry.subject || 'No Subject'}</h2>
              <p style={{ color: 'var(--text-gray)' }}>{new Date(viewingEnquiry.createdAt).toLocaleString()}</p>
            </div>
            <button className="btn-outline" onClick={() => setViewingEnquiry(null)}>Back to List</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Contact Details</h3>
              <p><strong>Name:</strong> {viewingEnquiry.name}</p>
              <p><strong>Email:</strong> <a href={`mailto:${viewingEnquiry.email}`} style={{ color: 'var(--primary)', textDecoration: 'underline' }}>{viewingEnquiry.email}</a></p>
              <p><strong>Phone:</strong> {viewingEnquiry.phone || 'N/A'}</p>
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Status</h3>
              <select 
                className="form-input" 
                style={{ width: 'auto' }}
                value={viewingEnquiry.status}
                onChange={(e) => handleUpdateStatus(viewingEnquiry.id, e.target.value)}
                disabled={loading}
              >
                <option value="NEW">New</option>
                <option value="READ">Read</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Message</h3>
            <div style={{ padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid var(--border-gray)', whiteSpace: 'pre-wrap' }}>
              {viewingEnquiry.message}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor: 'var(--white)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-gray)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-gray)' }}>
                <th style={{ padding: '1rem', color: 'var(--text-gray)' }}>Date</th>
                <th style={{ padding: '1rem', color: 'var(--text-gray)' }}>Name / Email</th>
                <th style={{ padding: '1rem', color: 'var(--text-gray)' }}>Subject</th>
                <th style={{ padding: '1rem', color: 'var(--text-gray)' }}>Status</th>
                <th style={{ padding: '1rem', color: 'var(--text-gray)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-gray)' }}>
                    No enquiries found.
                  </td>
                </tr>
              ) : (
                enquiries.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--border-gray)', backgroundColor: e.status === 'NEW' ? '#fffdf5' : 'transparent' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: e.status === 'NEW' ? 600 : 400 }}>{new Date(e.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: e.status === 'NEW' ? 600 : 400 }}>{e.name}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-gray)' }}>{e.email}</div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: e.status === 'NEW' ? 600 : 400 }}>
                      {e.subject ? (e.subject.length > 30 ? e.subject.substring(0, 30) + '...' : e.subject) : 'No Subject'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.875rem', backgroundColor: e.status === 'NEW' ? 'var(--primary)' : 'var(--border-gray)' }}>
                        {e.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button onClick={() => setViewingEnquiry(e)} className="btn-outline" style={{ padding: '0.25rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Eye size={16} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
